import { useCallback, useState } from 'react'

function readParam(key, fallback) {
  const params = new URLSearchParams(window.location.search)
  return params.get(key) ?? fallback
}

// Syncs a single piece of state to a URL query param (no router needed for
// this one case) so filters/tabs survive a refresh or a shared link.
export function useUrlState(key, fallback) {
  const [value, setValue] = useState(() => readParam(key, fallback))

  const setAndSync = useCallback(
    (newValue) => {
      setValue(newValue)
      const params = new URLSearchParams(window.location.search)
      if (newValue === null || newValue === undefined || newValue === fallback) {
        params.delete(key)
      } else {
        params.set(key, newValue)
      }
      const search = params.toString()
      window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}`)
    },
    [key, fallback]
  )

  return [value, setAndSync]
}
