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
              ? 'text-xs font-medium text-emerald-700 dark:text-emerald-400'
              : 'text-xs font-medium text-red-600 dark:text-red-400'
          }
        >
          {message.text}
        </p>
      )}

      {!data?.connected && (
        <div className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
          <p className="mb-2 text-neutral-600 dark:text-neutral-400">
            Connect Gmail to detect assignment deadlines automatically.
          </p>
          <a
            href="/api/auth/google/start"
            className="inline-block rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            Connect Google
          </a>
        </div>
      )}

      {data?.connected && data.needsReauth && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
          <p className="mb-2 text-amber-800 dark:text-amber-300">
            Your Google connection ({data.googleEmail}) needs to be refreshed — this happens roughly weekly
            since the app isn't publicly verified with Google.
          </p>
          <a
            href="/api/auth/google/start"
            className="inline-block rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            Reconnect
          </a>
        </div>
      )}

      {data?.connected && !data.needsReauth && (
        <p className="text-xs text-neutral-500">Google connected: {data.googleEmail}</p>
      )}
    </div>
  )
}
