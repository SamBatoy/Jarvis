import { useChat } from '../../hooks/useChat'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import LoadingState from '../LoadingState'

export default function ChatPanel() {
  const { displayMessages, sendMessage, sending, error } = useChat()

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 p-3 dark:border-neutral-800">
        <h2 className="font-semibold">Jarvis</h2>
      </div>
      <MessageList messages={displayMessages} />
      <div aria-live="polite">
        {error && (
          <p role="alert" className="px-4 pb-2 text-xs text-red-600 dark:text-red-400">
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
