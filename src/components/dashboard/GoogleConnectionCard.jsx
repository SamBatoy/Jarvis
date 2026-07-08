import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useGoogleConnectionStatus } from '../../hooks/useGoogleConnection'

// Handles the one-time redirect-back message from api/auth/google/callback.js
// (?google_connect=success|error&reason=...), then strips it from the URL so
// refreshing the page doesn't re-show it.
function useRedirectMessage() {
  const [message, setMessage] = useState(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const result = params.get('google_connect')
    if (!result) return

    if (result === 'success') setMessage({ type: 'success', text: 'Google connected.' })
    else setMessage({ type: 'error', text: params.get('reason') || 'Something went wrong connecting Google.' })

    queryClient.invalidateQueries({ queryKey: ['google-connection-status'] })

    params.delete('google_connect')
    params.delete('reason')
    const rest = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (rest ? `?${rest}` : ''))
  }, [queryClient])

  return message
}

export default function GoogleConnectionCard() {
  const { data, isLoading } = useGoogleConnectionStatus()
  const message = useRedirectMessage()

  if (isLoading) return null

  return (
    <div className="space-y-2">
      {message && (
        <p
          className={
            message.type === 'success'
              ? 'text-xs font-medium text-hud-good'
              : 'text-xs font-medium text-hud-crit'
          }
        >
          {message.text}
        </p>
      )}

      {!data?.connected && (
        <div className="hud-panel !p-3 text-sm">
          <p className="mb-2 text-hud-muted">
            Connect Gmail to detect assignment deadlines automatically.
          </p>
          <a
            href="/api/auth/google/start"
            className="hud-btn-primary inline-block"
          >
            Connect Google
          </a>
        </div>
      )}

      {data?.connected && data.needsReauth && (
        <div className="hud-panel !border-hud-warn/40 !p-3 text-sm [box-shadow:0_0_18px_rgba(255,180,84,0.08)]">
          <p className="mb-2 text-hud-warn">
            Your Google connection ({data.googleEmail}) needs to be refreshed — this happens roughly weekly
            since the app isn't publicly verified with Google.
          </p>
          <a
            href="/api/auth/google/start"
            className="hud-btn-primary inline-block"
          >
            Reconnect
          </a>
        </div>
      )}

      {data?.connected && !data.needsReauth && (
        <p className="font-mono text-xs text-hud-muted">Google connected: {data.googleEmail}</p>
      )}
    </div>
  )
}
