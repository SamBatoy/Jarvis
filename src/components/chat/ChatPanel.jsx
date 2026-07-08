import { useChat } from '../../hooks/useChat'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import LoadingState from '../LoadingState'

export default function ChatPanel() {
  const { displayMessages, sendMessage, sending, error } = useChat()

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-hud-accent/20 p-3">
        <h2 className="font-mono text-sm font-semibold tracking-[0.22em] [text-shadow:0_0_12px_rgba(56,225,255,0.45)]">
          JAR<span className="text-hud-accent">VIS</span>
        </h2>
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
      </div>
      <ChatInput onSend={sendMessage} disabled={sending} />
    </div>
  )
}
