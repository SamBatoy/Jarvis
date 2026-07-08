import { useEffect, useRef, useState } from 'react'

// Browser-native speech-to-text via the Web Speech API — no server, no new
// API key, no paid transcription service. Chrome/Edge/Safari support it;
// Firefox never shipped it at all, so callers must check `supported` and
// hide the mic entirely rather than show a disabled button (see
// ChatInput.jsx). `continuous: false` means a session ends automatically
// after a pause in speech, matching "stop on pause" without any manual
// silence-detection logic of our own.
const SpeechRecognitionClass =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

// Most SpeechRecognitionErrorEvent.error values map to a message worth
// showing; 'no-speech' (paused too long / said nothing) and 'aborted' (we
// called stop() ourselves) are routine, not failures — surfacing them as
// an alert would be alarming for something that happens constantly.
const SILENT_ERRORS = new Set(['no-speech', 'aborted'])

function describeError(code) {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access was denied — check your browser’s site permissions and try again.'
    case 'audio-capture':
      return 'No microphone found.'
    case 'network':
      return 'Speech recognition needs a network connection.'
    default:
      return 'Speech recognition failed — try again.'
  }
}

// DEBUG: temporary, timestamped tracing for diagnosing the mic-flicker
// report — remove once confirmed fixed. Toggle by setting
// window.__wakeWordDebug = true in the console before reproducing (shared
// flag with wakeWord.js, since both matter for the same symptom).
function debugLog(...args) {
  if (typeof window !== 'undefined' && window.__wakeWordDebug) {
    console.log(`[speechToText ${performance.now().toFixed(0)}ms]`, ...args)
  }
}

export function useSpeechToText({ onResult } = {}) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)

  function start() {
    // Guard on the ref, not the `listening` state — state updates are
    // deferred to the next render, so two start() calls in the same tick
    // (e.g. wake word firing twice in quick succession before a guard
    // fix elsewhere) would both see the same stale `listening: false` and
    // both proceed, creating two simultaneous recognition sessions. The
    // ref is set synchronously below, so it closes this race the same way
    // wakeWord.js's own recognitionRef guard does.
    if (!SpeechRecognitionClass || recognitionRef.current) return
    setError(null)

    const recognition = new SpeechRecognitionClass()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = navigator.language || 'en-US'

    recognition.onstart = () => debugLog('onstart')
    recognition.onresult = (event) => {
      let transcript = ''
      let isFinal = false
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
        if (event.results[i].isFinal) isFinal = true
      }
      debugLog('onresult', transcript, 'isFinal', isFinal)
      onResult?.({ transcript, isFinal })
    }
    recognition.onerror = (event) => {
      debugLog('onerror', event.error)
      if (!SILENT_ERRORS.has(event.error)) setError(describeError(event.error))
    }
    recognition.onend = () => {
      debugLog('onend')
      setListening(false)
      recognitionRef.current = null
    }

    recognition.start()
    recognitionRef.current = recognition
    setListening(true)
    debugLog('start() created new session')
  }

  function stop() {
    recognitionRef.current?.stop()
  }

  useEffect(() => () => recognitionRef.current?.stop(), [])

  return { supported: !!SpeechRecognitionClass, listening, error, start, stop }
}
