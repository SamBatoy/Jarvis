import { useEffect, useRef, useState } from 'react'

// "Hey Jarvis" wake-word detection: continuous SpeechRecognition, matching
// transcripts against a fixed phrase, with auto-restart (Chrome's
// continuous sessions don't actually stay alive indefinitely — they can
// stop on their own after a silence gap or around the ~60s mark, so
// "always listening" requires restarting in onend, not just calling
// start() once) and Page Visibility-driven pause/resume (mic access is
// unreliable in backgrounded tabs, so this stops deterministically on
// hide rather than trusting whatever the browser does on its own).
//
// Deliberately narrow matching to start (exact phrase, tolerant of a comma/
// pause after "hey") rather than fuzzy-matching variants — loosening this
// risks false positives from unrelated speech; tightening a too-loose
// match later is the harder direction.
const WAKE_PATTERN = /\bhey,?\s+jarvis\b/i

// If a restart is needed after an unexpected end, wait this long first —
// without it, a session that keeps ending itself immediately (e.g. an
// environment where every fresh session hits 'no-speech' right away)
// restarts in a tight loop with no gap at all, which is exactly what
// looked like UI flicker: every restart briefly toggles this hook's own
// `listening` state.
const RESTART_BACKOFF_MS = 400

// A session that ends within this long of starting is "failing fast" —
// something (an error, a conflict, a permission issue) is preventing it
// from ever actually listening, as opposed to a normal end after genuinely
// running for a while (silence timeout, the ~60s continuous-mode cap).
const FAST_FAILURE_THRESHOLD_MS = 2000

// After this many consecutive fast failures, stop retrying automatically
// instead of hammering the mic API forever — a real environmental problem
// (mic held by another tab/app, a permission flake, browser policy) won't
// resolve itself by trying again every 400ms indefinitely, and doing so
// anyway is what turns one underlying issue into constant visible flicker.
const MAX_CONSECUTIVE_FAST_FAILURES = 5

// DEBUG: verbose per-event tracing, opt-in via window.__wakeWordDebug = true.
function debugLog(...args) {
  if (typeof window !== 'undefined' && window.__wakeWordDebug) {
    console.log(`[wakeWord ${performance.now().toFixed(0)}ms]`, ...args)
  }
}

// DEBUG: unconditional entry-point tracing — always on, not gated by the
// flag above, specifically to answer "is this code even running at all."
// Remove once the flicker report is confirmed fixed.
function traceLog(...args) {
  console.log(`[wakeWord TRACE ${performance.now().toFixed(0)}ms]`, ...args)
}

const SpeechRecognitionClass =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

// DEBUG: log actual microphone permission state once, on module load —
// don't assume it's granted just because the UI shows a "listening" state.
if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
  navigator.permissions
    .query({ name: 'microphone' })
    .then((status) => {
      traceLog('microphone permission state:', status.state)
      status.onchange = () => traceLog('microphone permission CHANGED to:', status.state)
    })
    .catch((e) => traceLog('microphone permission query failed (browser may not support querying it):', e.message))
}

// suspended: true while some other recognition session (the manual mic
// button, or the post-wake-word command capture itself) needs the one
// mic session a tab can reliably run at a time. This hook stops itself
// while suspended and resumes when it clears, rather than trying to run
// two SpeechRecognition instances at once.
export function useWakeWord({ enabled, suspended, onWake }) {
  const [listening, setListening] = useState(false)
  const [tabHidden, setTabHidden] = useState(typeof document !== 'undefined' && document.hidden)
  const [giveUpError, setGiveUpError] = useState(null)
  const recognitionRef = useRef(null)
  const intentionalStopRef = useRef(false)
  const restartTimerRef = useRef(null)
  const sessionStartedAtRef = useRef(0)
  const consecutiveFastFailuresRef = useRef(0)
  const prevEnabledRef = useRef(enabled)
  const onWakeRef = useRef(onWake)
  onWakeRef.current = onWake

  function stop() {
    traceLog('stop() called')
    intentionalStopRef.current = true
    clearTimeout(restartTimerRef.current)
    // Clear synchronously rather than waiting for the async onend to do
    // it — start()'s guard below checks this ref, and onend firing (a real
    // browser's or React 18 StrictMode's deliberate double-invoke of this
    // effect in dev, mount->cleanup->remount, all within one tick) can
    // otherwise land after a subsequent start() already ran, leaving that
    // guard blocked on a stale reference to an instance that's already
    // being torn down and silently killing the "always listening" state.
    recognitionRef.current?.stop()
    recognitionRef.current = null
  }

  function start() {
    traceLog('start() called — SpeechRecognitionClass exists:', !!SpeechRecognitionClass, ', already have a session:', !!recognitionRef.current)
    if (!SpeechRecognitionClass || recognitionRef.current || giveUpError) return
    intentionalStopRef.current = false
    // Once this specific instance has matched the wake phrase, ignore any
    // further onresult events it fires — a single utterance is recognized
    // progressively (interim, interim, final), and every one of those
    // events still contains "hey jarvis" once it's been heard once, so
    // without this an already-firing onWake() could fire again for the
    // very same utterance before recognition.stop() actually takes effect.
    let matched = false

    const recognition = new SpeechRecognitionClass()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = navigator.language || 'en-US'

    // DEBUG: onstart/onerror/onend promoted to unconditional traceLog for
    // now — the flag-gated debugLog was hiding exactly the events needed
    // to see why sessions keep ending. onresult stays flag-gated since
    // real speech would make it fire continuously and flood the console.
    recognition.onstart = () => traceLog('onstart — session actually began')
    recognition.onresult = (event) => {
      debugLog('onresult', event.results[event.results.length - 1]?.[0]?.transcript)
      if (matched) return
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (WAKE_PATTERN.test(event.results[i][0].transcript)) {
          matched = true
          intentionalStopRef.current = true
          recognition.stop()
          onWakeRef.current?.()
          return
        }
      }
    }
    // Swallow errors from the caller's perspective ('no-speech' fires
    // constantly during genuinely idle listening and isn't a real
    // failure) but still log which one fired, for diagnosing whether
    // restarts are being driven by a specific recurring error.
    recognition.onerror = (event) => traceLog('onerror:', event.error)
    recognition.onend = () => {
      const ranForMs = performance.now() - sessionStartedAtRef.current
      traceLog('onend, intentional:', intentionalStopRef.current, ', ran for', ranForMs.toFixed(0), 'ms')
      recognitionRef.current = null
      setListening(false)
      if (intentionalStopRef.current || !enabled || suspended || document.hidden) return

      if (ranForMs < FAST_FAILURE_THRESHOLD_MS) {
        consecutiveFastFailuresRef.current += 1
      } else {
        consecutiveFastFailuresRef.current = 0
      }

      if (consecutiveFastFailuresRef.current >= MAX_CONSECUTIVE_FAST_FAILURES) {
        traceLog(`giving up after ${consecutiveFastFailuresRef.current} consecutive fast failures — not retrying automatically`)
        setGiveUpError('Wake word keeps failing to start — check that no other tab or app is using the microphone.')
        return
      }

      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = setTimeout(start, RESTART_BACKOFF_MS)
    }

    // recognition.start() can throw synchronously (most commonly
    // InvalidStateError, e.g. if a session is somehow already active) —
    // previously uncaught, which meant NONE of the logging below it, and
    // not even the browser's own onstart, would ever fire: exactly what
    // "zero events logged" would look like from the outside, with the UI
    // still visually toggling because setListening(true) never ran either
    // but some other render still made the button look like it changed.
    try {
      recognition.start()
    } catch (e) {
      traceLog('recognition.start() THREW synchronously:', e.name, e.message)
      return
    }
    recognitionRef.current = recognition
    sessionStartedAtRef.current = performance.now()
    setListening(true)
    debugLog('start() created new session')
  }

  useEffect(() => {
    traceLog('controlling effect ran — enabled:', enabled, ', suspended:', suspended, ', tabHidden:', tabHidden)
    // Only a genuine off->on transition (the user re-enabling the feature,
    // not this effect re-running because suspended/tabHidden changed while
    // already enabled — that happens routinely, e.g. every time a command
    // capture starts and ends) gets a clean slate. Otherwise an ongoing
    // environmental problem would just get retried again after every
    // normal suspend/resume cycle instead of staying given-up-on.
    if (enabled && !prevEnabledRef.current) {
      consecutiveFastFailuresRef.current = 0
      setGiveUpError(null)
    }
    prevEnabledRef.current = enabled
    if (enabled && !suspended && !tabHidden) start()
    else stop()
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, suspended, tabHidden])

  useEffect(() => {
    function onVisibilityChange() {
      setTabHidden(document.hidden)
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  return { supported: !!SpeechRecognitionClass, listening, tabHidden, error: giveUpError }
}
