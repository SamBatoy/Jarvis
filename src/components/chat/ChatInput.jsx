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
    <div className="border-t border-neutral-200 dark:border-neutral-800">
      {speechError && (
        <p role="alert" className="px-3 pt-2 text-xs text-red-600 dark:text-red-400">
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
          className="flex-1 resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        />
        {speechSupported && (
          <button
            type="button"
            onClick={handleMicClick}
            aria-pressed={listening}
            aria-label={listening ? 'Stop voice input' : 'Start voice input'}
            className={
              listening
                ? 'animate-pulse rounded-lg bg-red-600 px-3 py-2 text-white transition-colors duration-150 hover:bg-red-700'
                : 'rounded-lg border border-neutral-300 px-3 py-2 text-neutral-600 transition-colors duration-150 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800'
            }
          >
            {listening ? <StopIcon /> : <MicIcon />}
          </button>
        )}
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-neutral-700 disabled:pointer-events-none disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          Send
        </button>
      </form>
    </div>
  )
}
