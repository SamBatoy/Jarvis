import { useRef, useState } from 'react'
import { useSpeechToText } from '../../lib/speechToText'
import { useWakeWord } from '../../lib/wakeWord'

function MicIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}

// Small "always listening" glyph — a mic with two radiating arcs, distinct
// from the plain mic icon used for the momentary push-to-talk button.
function WakeWordIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a2.5 2.5 0 00-2.5 2.5v5a2.5 2.5 0 005 0v-5A2.5 2.5 0 0012 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 10.5a3.5 3.5 0 01-7 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 8a6 6 0 000 5M18 8a6 6 0 010 5" opacity="0.6" />
    </svg>
  )
}

export default function ChatInput({ onSend, disabled, onWakeWordActivity }) {
  const [text, setText] = useState('')
  // On by default per explicit request — listening starts the moment the
  // app loads, no manual toggle-on step required.
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true)
  const [justWoke, setJustWoke] = useState(false)
  // Snapshot of whatever was already typed when listening starts, so
  // recognized speech appends after it rather than overwriting it.
  const baseTextRef = useRef('')
  // Sticky until the next send: marks that send as wake-word-originated so
  // ChatPanel can force-speak the reply and keep the widget expanded,
  // without changing manual-mic or typed-message behavior at all.
  const wakeTriggeredRef = useRef(false)

  const { supported: speechSupported, listening, error: speechError, start, stop } = useSpeechToText({
    onResult: ({ transcript }) => {
      setText(baseTextRef.current ? `${baseTextRef.current} ${transcript}` : transcript)
    },
  })

  // Wake-word listening is suspended by the same `listening` flag the
  // manual mic button uses — whether a command capture started from the
  // button or from the wake word itself, only one recognition session runs
  // at a time, and wake-word listening resumes automatically once it ends.
  const { supported: wakeWordSupported, listening: wakeWordListening, tabHidden, error: wakeWordError } = useWakeWord({
    enabled: wakeWordEnabled,
    suspended: listening,
    onWake: () => {
      setJustWoke(true)
      wakeTriggeredRef.current = true
      baseTextRef.current = text.trim()
      start()
      onWakeWordActivity?.()
      setTimeout(() => setJustWoke(false), 2000)
    },
  })

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    const fromWakeWord = wakeTriggeredRef.current
    wakeTriggeredRef.current = false
    onSend(trimmed, { fromWakeWord })
    setText('')
  }

  function handleMicClick() {
    if (listening) {
      stop()
    } else {
      baseTextRef.current = text.trim()
      start()
    }
  }

  const wakeWordStatus = !wakeWordEnabled
    ? null
    : tabHidden
      ? 'Wake word paused — tab inactive'
      : justWoke
        ? 'Heard "Hey Jarvis" — listening…'
        : listening
          ? null // the mic's own "listening" state already shows below
          : wakeWordListening
            ? 'Listening for "Hey Jarvis"…'
            : null

  return (
    <div className="border-t border-hud-accent/20">
      {speechError && (
        <p role="alert" className="px-3 pt-2 text-xs text-hud-crit">
          {speechError}
        </p>
      )}
      {wakeWordError && (
        <p role="alert" className="px-3 pt-2 text-xs text-hud-crit">
          {wakeWordError}
        </p>
      )}
      {wakeWordStatus && (
        <p className="px-3 pt-2 font-mono text-xs text-hud-accent" aria-live="polite">
          {justWoke ? '▸ ' : '○ '}
          {wakeWordStatus}
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
          rows={1}
          placeholder="Message Jarvis…"
          aria-label="Message Jarvis"
          className="hud-input flex-1 resize-none rounded-lg !py-2"
        />
        {wakeWordSupported && (
          <button
            type="button"
            onClick={() => setWakeWordEnabled((v) => !v)}
            aria-pressed={wakeWordEnabled}
            aria-label={wakeWordEnabled ? 'Turn off "Hey Jarvis" wake word' : 'Turn on "Hey Jarvis" wake word'}
            title={wakeWordEnabled ? 'Wake word on' : 'Wake word off'}
            className={
              wakeWordEnabled
                ? 'rounded-lg border border-hud-accent bg-hud-accent/15 px-3 py-2 text-hud-accent transition-all duration-150 hover:[box-shadow:0_0_14px_rgba(56,225,255,0.35)]'
                : 'rounded-lg border border-hud-accent/30 px-3 py-2 text-hud-muted transition-all duration-150 hover:border-hud-accent hover:text-hud-text'
            }
          >
            <WakeWordIcon />
          </button>
        )}
        {speechSupported && (
          <button
            type="button"
            onClick={handleMicClick}
            aria-pressed={listening}
            aria-label={listening ? 'Stop voice input' : 'Start voice input'}
            className={
              listening
                ? 'animate-pulse rounded-lg border border-hud-crit bg-hud-crit/20 px-3 py-2 text-hud-crit transition-colors duration-150 [box-shadow:0_0_14px_rgba(255,107,107,0.4)] hover:bg-hud-crit/30'
                : 'rounded-lg border border-hud-accent/30 px-3 py-2 text-hud-muted transition-all duration-150 hover:border-hud-accent hover:text-hud-text hover:[box-shadow:0_0_14px_rgba(56,225,255,0.35)]'
            }
          >
            {listening ? <StopIcon /> : <MicIcon />}
          </button>
        )}
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="hud-btn-primary rounded-lg !py-2"
        >
          Send
        </button>
      </form>
    </div>
  )
}
