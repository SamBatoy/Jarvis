import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useLatestBrief } from '../../hooks/useDailyBriefs'
import { useAllTodosForAnalytics, useUpdateTodo } from '../../hooks/useTodos'

function formatBriefDate(dateStr) {
  return format(new Date(`${dateStr}T00:00:00`), 'EEE MMM d')
}

function MorningBriefCard() {
  const { data, isLoading } = useLatestBrief('morning')
  const brief = data?.[0]

  if (isLoading || !brief) return null
  const { topPriorities, dueToday, suggestedFocus } = brief.content

  return (
    <div className="hud-panel">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="hud-label">Morning Brief</h2>
        <span className="font-mono text-xs text-hud-muted">{formatBriefDate(brief.brief_date)}</span>
      </div>
      <p className="text-sm font-medium">{suggestedFocus}</p>
      {dueToday?.length > 0 && (
        <p className="mt-2 text-xs text-hud-muted">
          Due today: {dueToday.map((d) => d.title).join(', ')}
        </p>
      )}
      {topPriorities?.length > 0 && (
        <p className="mt-1 text-xs text-hud-muted">
          Top priorities: {topPriorities.map((t) => t.title).join(', ')}
        </p>
      )}
    </div>
  )
}

const REASON_OPTIONS = [
  { value: 'too_hard', label: 'Too hard' },
  { value: 'forgot', label: 'Forgot' },
  { value: 'poor_estimate', label: 'Poor time estimate' },
  { value: 'other', label: 'Other' },
]

// One interaction covering the whole day's missed items, not one popup per
// item. The brief's stored `content.slipped` is a frozen cron-time snapshot,
// so live missed_reason state must be checked separately to avoid re-asking
// about items already answered on a prior visit.
function MissedReasonPicker({ slipped }) {
  const { data: allTodos } = useAllTodosForAnalytics()
  const updateTodo = useUpdateTodo()
  const [selections, setSelections] = useState({})
  const [saved, setSaved] = useState(false)

  const todosById = useMemo(() => new Map((allTodos ?? []).map((t) => [t.id, t])), [allTodos])
  const unanswered = slipped.filter((s) => {
    const live = todosById.get(s.id)
    return live && !live.missed_reason
  })

  if (unanswered.length === 0 || saved) return null

  function handleSave() {
    for (const item of unanswered) {
      const reason = selections[item.id]
      if (reason) updateTodo.mutate({ id: item.id, fields: { missed_reason: reason } })
    }
    setSaved(true)
  }

  return (
    <div className="mt-3 border-t border-hud-accent/15 pt-2">
      <p className="text-xs font-medium text-hud-muted">Why were these missed?</p>
      <ul className="mt-1 space-y-1.5">
        {unanswered.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-xs">
            <span className="min-w-0 flex-1 truncate">{item.title}</span>
            <select
              value={selections[item.id] ?? ''}
              onChange={(e) => setSelections((prev) => ({ ...prev, [item.id]: e.target.value }))}
              className="hud-input !px-1.5 !py-0.5 !text-xs"
            >
              <option value="">Choose…</option>
              {REASON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      <button onClick={handleSave} className="hud-btn-primary mt-2 !px-2 !py-1">
        SAVE
      </button>
    </div>
  )
}

function NightReviewCard() {
  const { data, isLoading } = useLatestBrief('night')
  const brief = data?.[0]

  if (isLoading || !brief) return null
  const { completed, slipped, reflection } = brief.content

  return (
    <div className="hud-panel">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="hud-label">Night Review</h2>
        <span className="font-mono text-xs text-hud-muted">{formatBriefDate(brief.brief_date)}</span>
      </div>
      <p className="text-sm">{reflection}</p>
      {completed?.length > 0 && (
        <p className="mt-2 text-xs text-hud-good">Completed: {completed.map((c) => c.title).join(', ')}</p>
      )}
      {slipped?.length > 0 && (
        <>
          <p className="mt-1 text-xs text-hud-crit">Slipped: {slipped.map((s) => s.title).join(', ')}</p>
          <MissedReasonPicker slipped={slipped} />
        </>
      )}
    </div>
  )
}

export default function DailyBriefCards() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <MorningBriefCard />
      <NightReviewCard />
    </div>
  )
}
