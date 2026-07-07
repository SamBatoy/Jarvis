import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toLocalInputValue, fromLocalInputValue } from '../../lib/dateUtils'

async function proposeTool(toolName, args) {
  const res = await fetch('/api/propose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toolName, args }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed')
  return (await res.json()).preview
}

async function commitTool(toolName, payload) {
  const res = await fetch('/api/commit-proposal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toolName, payload, source: 'dashboard' }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed')
  return (await res.json()).result
}

// Unlike every other propose/commit flow in this app (all-or-nothing), this
// one supports partial selection — accept some suggestions, decline others,
// in a single Confirm. Local state holds an editable copy of the preview;
// commit gets sent back exactly what's shown, same principle as every other
// propose/commit tool, just with an `accepted` flag and edits per row.
export default function SuggestionsBatchCard() {
  const [phase, setPhase] = useState('loading') // loading | idle | reviewing | applying | done | error
  const [suggestions, setSuggestions] = useState([])
  const [errorMsg, setErrorMsg] = useState(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    let cancelled = false
    proposeTool('propose_suggestions', {})
      .then((preview) => {
        if (!cancelled) {
          setSuggestions(preview.suggestions)
          setPhase('reviewing')
        }
      })
      .catch(() => {
        if (!cancelled) setPhase('idle') // no pending suggestions is a normal quiet state, not an error
      })
    return () => {
      cancelled = true
    }
  }, [])

  function toggleAccepted(id) {
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, accepted: !s.accepted } : s)))
  }

  function updateField(id, field, value) {
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
  }

  async function handleConfirm() {
    setPhase('applying')
    setErrorMsg(null)
    try {
      await commitTool('propose_suggestions', { suggestions })
      queryClient.invalidateQueries({ queryKey: ['todos'] })
      queryClient.invalidateQueries({ queryKey: ['deadlines'] })
      setPhase('done')
    } catch (e) {
      setErrorMsg(e.message)
      setPhase('reviewing')
    }
  }

  if (phase === 'loading' || phase === 'idle') return null

  if (phase === 'done') {
    return (
      <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">✓ Suggestions applied</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
        Detected from Gmail — review before adding
      </p>
      <ul className="space-y-2">
        {suggestions.map((s) => (
          <li key={s.id} className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={s.accepted}
              onChange={() => toggleAccepted(s.id)}
              aria-label={`Accept "${s.title}"`}
              className="mt-1.5 h-4 w-4 shrink-0 accent-neutral-900 dark:accent-neutral-100"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <input
                value={s.title}
                onChange={(e) => updateField(s.id, 'title', e.target.value)}
                className="w-full rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                <span className="capitalize">{s.suggestedType}</span>
                <input
                  type="datetime-local"
                  value={toLocalInputValue(s.dueDate)}
                  onChange={(e) => updateField(s.id, 'dueDate', fromLocalInputValue(e.target.value))}
                  className="rounded border border-neutral-300 bg-white px-1.5 py-0.5 dark:border-neutral-700 dark:bg-neutral-800"
                />
              </div>
              {s.notes && <p className="truncate text-xs text-neutral-500">{s.notes}</p>}
            </div>
          </li>
        ))}
      </ul>
      {errorMsg && (
        <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
          {errorMsg}
        </p>
      )}
      <button
        onClick={handleConfirm}
        disabled={phase === 'applying'}
        className="mt-3 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {phase === 'applying' ? 'Applying…' : 'Confirm Selected'}
      </button>
    </div>
  )
}
