import { useRef, useState } from 'react'
import { useSpeechToText } from '../../lib/speechToText'

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

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('')
  // Snapshot of whatever was already typed when listening starts, so
  // recognized speech appends after it rather than overwriting it.
  const baseTextRef = useRef('')

  const { supported: speechSupported, listening, error: speechError, start, stop } = useSpeechToText({
    onResult: ({ transcript }) => {
      setText(baseTextRef.current ? `${baseTextRef.current} ${transcript}` : transcript)
    },
  })

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
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

  return (
    <div className="border-t border-hud-accent/20">
      {speechError && (
        <p role="alert" className="px-3 pt-2 text-xs text-hud-crit">
          {speechError}
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
