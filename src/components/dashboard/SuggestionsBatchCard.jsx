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
      <div className="hud-panel !p-3">
        <p className="text-sm font-medium text-hud-good">✓ Suggestions applied</p>
      </div>
    )
  }

  return (
    <div className="hud-panel !border-hud-warn/40 !p-3 text-sm [box-shadow:0_0_18px_rgba(255,180,84,0.08)]">
      <p className="hud-label mb-2 !text-hud-warn">
        Detected from Gmail — review before adding
      </p>
      <ul className="space-y-2">
        {suggestions.map((s) => (
          <li key={s.id} className="flex items-start gap-2">
            <label className="relative mt-1.5 flex h-4 w-4 shrink-0 cursor-pointer before:absolute before:-inset-1.5 before:content-['']">
              <input
                type="checkbox"
                checked={s.accepted}
                onChange={() => toggleAccepted(s.id)}
                aria-label={`Accept "${s.title}"`}
                className="h-4 w-4 accent-hud-accent"
              />
            </label>
            <div className="min-w-0 flex-1 space-y-1">
              <input
                value={s.title}
                onChange={(e) => updateField(s.id, 'title', e.target.value)}
                className="hud-input w-full !px-2 !py-1"
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-hud-muted">
                <span className="capitalize">{s.suggestedType}</span>
                <input
                  type="datetime-local"
                  value={toLocalInputValue(s.dueDate)}
                  onChange={(e) => updateField(s.id, 'dueDate', fromLocalInputValue(e.target.value))}
                  className="hud-input !px-1.5 !py-0.5 !text-xs"
                />
              </div>
              {s.notes && <p className="truncate text-xs text-hud-muted">{s.notes}</p>}
            </div>
          </li>
        ))}
      </ul>
      {errorMsg && (
        <p role="alert" className="mt-2 text-xs text-hud-crit">
          {errorMsg}
        </p>
      )}
      <button
        onClick={handleConfirm}
        disabled={phase === 'applying'}
        className="hud-btn-primary mt-3"
      >
        {phase === 'applying' ? 'Applying…' : 'Confirm Selected'}
      </button>
    </div>
  )
}
