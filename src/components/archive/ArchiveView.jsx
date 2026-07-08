import { useMemo } from 'react'
import clsx from 'clsx'
import { useTodos, useUpdateTodo } from '../../hooks/useTodos'
import { useGoals } from '../../hooks/useGoals'
import { useActionLog } from '../../hooks/useActionLog'
import { useContexts } from '../../hooks/useContexts'
import ContextBadge from '../dashboard/ContextBadge'
import LoadingState from '../LoadingState'
import { formatDate, formatDateTime, groupByDay } from '../../lib/dateUtils'

const REASON_STYLES = {
  completed: 'border border-hud-good/40 text-hud-good',
  missed: 'border border-hud-crit/40 text-hud-crit',
  manual: 'border border-hud-accent/40 text-hud-accent',
}

const REASON_LABELS = { completed: 'Completed', missed: 'Missed', manual: 'Archived early' }

function ArchivedTodoRow({ todo, context }) {
  const updateTodo = useUpdateTodo()
  return (
    <li className="flex items-center gap-3 rounded border border-hud-accent/15 px-3 py-2 text-sm">
      <span className={clsx('min-w-0 flex-1 truncate', todo.done && 'line-through')}>{todo.title}</span>
      <span className={clsx('shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider', REASON_STYLES[todo.archive_reason])}>
        {REASON_LABELS[todo.archive_reason] ?? todo.archive_reason}
      </span>
      <ContextBadge context={context} />
      <button
        onClick={() => updateTodo.mutate({ id: todo.id, fields: { archived: false } })}
        className="shrink-0 text-xs text-hud-accent transition-colors duration-150 hover:underline"
      >
        Unarchive
      </button>
    </li>
  )
}

function CompletedAndMissedSection({ contextsById }) {
  const { data: todos, isLoading, error } = useTodos({ archived: true })

  const grouped = useMemo(() => groupByDay(todos ?? [], 'archived_at'), [todos])

  if (isLoading) return <LoadingState label="Loading archive…" />
  if (error) return <p className="text-sm text-hud-crit">Couldn’t load archive: {error.message}</p>
  if (grouped.length === 0) return <p className="text-sm text-hud-muted">Nothing archived yet.</p>

  return (
    <div className="space-y-4">
      {grouped.map((day) => (
        <div key={day.label}>
          <h3 className="hud-label mb-1.5">{day.label}</h3>
          <ul className="space-y-1.5">
            {day.items.map((todo) => (
              <ArchivedTodoRow key={todo.id} todo={todo} context={contextsById.get(todo.context_id)} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function AchievedGoalsSection() {
  const { data: goals, isLoading, error } = useGoals({ status: 'achieved' })

  const sorted = useMemo(
    () => [...(goals ?? [])].sort((a, b) => new Date(b.achieved_at ?? 0) - new Date(a.achieved_at ?? 0)),
    [goals]
  )

  if (isLoading) return <LoadingState label="Loading achieved goals…" />
  if (error) return <p className="text-sm text-hud-crit">Couldn’t load goals: {error.message}</p>
  if (sorted.length === 0) return <p className="text-sm text-hud-muted">No achieved goals yet.</p>

  return (
    <ul className="space-y-2">
      {sorted.map((g) => (
        <li key={g.id} className="rounded border border-hud-accent/15 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">{g.title}</span>
            {g.achieved_at && <span className="font-mono text-xs text-hud-muted">{formatDate(g.achieved_at)}</span>}
          </div>
          {g.why_it_matters && <p className="mt-0.5 text-xs text-hud-muted">{g.why_it_matters}</p>}
        </li>
      ))}
    </ul>
  )
}

function RecentActivitySection() {
  const { data: entries, isLoading, error } = useActionLog(30)

  if (isLoading) return <LoadingState label="Loading activity…" />
  if (error) return <p className="text-sm text-hud-crit">Couldn’t load activity: {error.message}</p>
  if (!entries || entries.length === 0) return <p className="text-sm text-hud-muted">No activity yet.</p>

  return (
    <ul className="space-y-1 text-sm">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-center gap-3">
          <span className="w-32 shrink-0 font-mono text-xs text-hud-muted">{formatDateTime(entry.created_at)}</span>
          <span className="min-w-0 flex-1 truncate">{entry.summary}</span>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-hud-muted">{entry.source}</span>
        </li>
      ))}
    </ul>
  )
}

export default function ArchiveView() {
  const { data: contexts } = useContexts()
  const contextsById = useMemo(() => new Map((contexts ?? []).map((c) => [c.id, c])), [contexts])

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <h1 className="text-2xl font-bold">Archive</h1>

      <section aria-labelledby="completed-missed-heading" className="hud-panel">
        <h2 id="completed-missed-heading" className="hud-label mb-2.5">
          Completed & Missed
        </h2>
        <CompletedAndMissedSection contextsById={contextsById} />
      </section>

      <section aria-labelledby="achieved-goals-heading" className="hud-panel">
        <h2 id="achieved-goals-heading" className="hud-label mb-2.5">
          Achieved Goals
        </h2>
        <AchievedGoalsSection />
      </section>

      <section aria-labelledby="activity-heading" className="hud-panel">
        <h2 id="activity-heading" className="hud-label mb-2.5">
          Recent Activity
        </h2>
        <RecentActivitySection />
      </section>
    </div>
  )
}
