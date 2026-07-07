import { useQuery } from '@tanstack/react-query'

export function useGoogleConnectionStatus() {
  return useQuery({
    queryKey: ['google-connection-status'],
    queryFn: async () => {
      const res = await fetch('/api/google-connection-status')
      if (!res.ok) throw new Error('Failed to load Google connection status')
      return res.json()
    },
  })
}
