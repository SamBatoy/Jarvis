import { useEffect, useRef, useState } from 'react'
import { useChat } from '../../hooks/useChat'
import { useTextToSpeech } from '../../lib/textToSpeech'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import LoadingState from '../LoadingState'

function SpeakerOnIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 9v6h4l5 5V4L8 9H4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.5a5 5 0 010 7M19 6a9 9 0 010 12" />
    </svg>
  )
}

function SpeakerOffIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 9v6h4l5 5V4L8 9H4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 9l5 6M21 9l-5 6" />
    </svg>
  )
}

// onExpandRequest: lets a wake-word-triggered command force the floating
// widget open (App.jsx owns the collapsed/expanded state) — undefined when
// ChatPanel is used somewhere that isn't behind the floating widget.
export default function ChatPanel({ onExpandRequest }) {
  const { displayMessages, sendMessage, sending, error } = useChat()
  const { supported: ttsSupported, speaking, speak, stop } = useTextToSpeech()
  const [voiceMode, setVoiceMode] = useState(false)
  const spokenCountRef = useRef(0)
  // Set per-send by handleSend, consumed once the matching reply arrives —
  // only affects THAT reply, not voice mode's persistent on/off state.
  const forceSpeakNextReplyRef = useRef(false)

  // Speak each new assistant reply as it arrives — always while voice mode
  // is on, or just this once if the send that produced it came from the
  // wake word (regardless of voice mode). Tracks a count rather than
  // reacting to the array reference so a message edited in place (there
  // isn't one today, but defensively) can't cause a re-speak, and so
  // toggling voice mode on doesn't replay history.
  useEffect(() => {
    if (displayMessages.length <= spokenCountRef.current) return
    const latest = displayMessages[displayMessages.length - 1]
    // Advance regardless of role — the user's own message lands in this
    // same array immediately on send, well before the assistant reply
    // arrives, and firing this effect for it must not consume the
    // force-speak flag that's waiting for that later reply.
    spokenCountRef.current = displayMessages.length
    if (latest.role !== 'assistant' || !latest.content) return
    const shouldSpeak = voiceMode || forceSpeakNextReplyRef.current
    forceSpeakNextReplyRef.current = false
    if (shouldSpeak) speak(latest.content)
  }, [displayMessages, voiceMode, speak])

  function handleSend(text, { fromWakeWord } = {}) {
    if (fromWakeWord) forceSpeakNextReplyRef.current = true
    sendMessage(text)
  }

  function toggleVoiceMode() {
    if (voiceMode) stop()
    setVoiceMode((v) => !v)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-hud-accent/20 p-3">
        <h2 className="font-mono text-sm font-semibold tracking-[0.22em] [text-shadow:0_0_12px_rgba(56,225,255,0.45)]">
          JAR<span className="text-hud-accent">VIS</span>
        </h2>
        {ttsSupported && (
          <button
            onClick={toggleVoiceMode}
            aria-pressed={voiceMode}
            aria-label={voiceMode ? 'Turn off voice replies' : 'Turn on voice replies'}
            title={voiceMode ? 'Voice replies on' : 'Voice replies off'}
            className={
              voiceMode
                ? 'rounded border border-hud-accent p-1.5 text-hud-accent transition-all duration-150 hover:[box-shadow:0_0_14px_rgba(56,225,255,0.35)]'
                : 'rounded border border-hud-accent/30 p-1.5 text-hud-muted transition-all duration-150 hover:text-hud-text'
            }
          >
            {voiceMode ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
          </button>
        )}
      </div>
      <MessageList messages={displayMessages} />
      <div aria-live="polite">
        {error && (
          <p role="alert" className="px-4 pb-2 text-xs text-hud-crit">
            {error}
          </p>
        )}
        {sending && (
          <div className="px-4 pb-2">
            <LoadingState label="Thinking…" />
          </div>
        )}
        {/* Not gated on voiceMode — this should show whenever Jarvis is
            actually speaking, including a wake-word-forced reply with
            voice mode otherwise off. */}
        {speaking && <p className="px-4 pb-2 font-mono text-xs text-hud-accent">▸ Speaking…</p>}
      </div>
      <ChatInput onSend={handleSend} disabled={sending} onWakeWordActivity={onExpandRequest} />
    </div>
  )
}
