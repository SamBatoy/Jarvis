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
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Morning Brief</h2>
        <span className="text-xs text-neutral-400">{formatBriefDate(brief.brief_date)}</span>
      </div>
      <p className="text-sm font-medium">{suggestedFocus}</p>
      {dueToday?.length > 0 && (
        <p className="mt-2 text-xs text-neutral-500">
          Due today: {dueToday.map((d) => d.title).join(', ')}
        </p>
      )}
      {topPriorities?.length > 0 && (
        <p className="mt-1 text-xs text-neutral-500">
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
    <div className="mt-3 border-t border-neutral-200 pt-2 dark:border-neutral-800">
      <p className="text-xs font-medium text-neutral-500">Why were these missed?</p>
      <ul className="mt-1 space-y-1.5">
        {unanswered.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-xs">
            <span className="min-w-0 flex-1 truncate">{item.title}</span>
            <select
              value={selections[item.id] ?? ''}
              onChange={(e) => setSelections((prev) => ({ ...prev, [item.id]: e.target.value }))}
              className="rounded border border-neutral-300 px-1.5 py-0.5 dark:border-neutral-700 dark:bg-neutral-800"
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
      <button
        onClick={handleSave}
        className="mt-2 rounded bg-neutral-900 px-2 py-1 text-xs font-medium text-white transition-colors duration-150 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
      >
        Save
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
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Night Review</h2>
        <span className="text-xs text-neutral-400">{formatBriefDate(brief.brief_date)}</span>
      </div>
      <p className="text-sm">{reflection}</p>
      {completed?.length > 0 && (
        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">Completed: {completed.map((c) => c.title).join(', ')}</p>
      )}
      {slipped?.length > 0 && (
        <>
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">Slipped: {slipped.map((s) => s.title).join(', ')}</p>
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
