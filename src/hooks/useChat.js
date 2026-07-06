import { useCallback, useState } from 'react'

// Keeps the full OpenAI-shaped message history so /api/chat can continue the
// conversation with tool-call context, plus a lightweight display list the
// UI actually renders (assistant/user turns only, with any attached proposal).
export function useChat() {
  const [history, setHistory] = useState([])
  const [displayMessages, setDisplayMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const sendMessage = useCallback(
    async (text) => {
      const userMessage = { role: 'user', content: text }
      const nextHistory = [...history, userMessage]
      setDisplayMessages((d) => [...d, { role: 'user', content: text }])
      setSending(true)
      setError(null)

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: nextHistory }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Request failed (${res.status})`)
        }
        const { message, proposal } = await res.json()
        setHistory([...nextHistory, message])
        setDisplayMessages((d) => [...d, { role: 'assistant', content: message.content, proposal }])
      } catch (e) {
        setError(e.message)
      } finally {
        setSending(false)
      }
    },
    [history]
  )

  return { displayMessages, sendMessage, sending, error }
}
