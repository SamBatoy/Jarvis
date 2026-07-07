import { useMemo } from 'react'
import clsx from 'clsx'
import { useTodos, useUpdateTodo } from '../../hooks/useTodos'
import { useGoals } from '../../hooks/useGoals'
import { useActionLog } from '../../hooks/useActionLog'
import { useContexts } from '../../hooks/useContexts'
import ContextBadge from '../dashboard/ContextBadge'
import { formatDate, formatDateTime, groupByDay } from '../../lib/dateUtils'

const REASON_STYLES = {
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  missed: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  manual: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
}

const REASON_LABELS = { completed: 'Completed', missed: 'Missed', manual: 'Archived early' }

function ArchivedTodoRow({ todo, context }) {
  const updateTodo = useUpdateTodo()
  return (
    <li className="flex items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
      <span className={clsx('min-w-0 flex-1 truncate', todo.done && 'line-through')}>{todo.title}</span>
      <span className={clsx('shrink-0 rounded px-1.5 py-0.5 text-xs font-medium', REASON_STYLES[todo.archive_reason])}>
        {REASON_LABELS[todo.archive_reason] ?? todo.archive_reason}
      </span>
      <ContextBadge context={context} />
      <button
        onClick={() => updateTodo.mutate({ id: todo.id, fields: { archived: false } })}
        className="shrink-0 text-xs text-blue-600 hover:underline dark:text-blue-400"
      >
        Unarchive
      </button>
    </li>
  )
}

function CompletedAndMissedSection({ contextsById }) {
  const { data: todos, isLoading, error } = useTodos({ archived: true })

  const grouped = useMemo(() => groupByDay(todos ?? [], 'archived_at'), [todos])

  if (isLoading) return <p className="text-sm text-neutral-500">Loading archive…</p>
  if (error) return <p className="text-sm text-red-600">Couldn’t load archive: {error.message}</p>
  if (grouped.length === 0) return <p className="text-sm text-neutral-500">Nothing archived yet.</p>

  return (
    <div className="space-y-4">
      {grouped.map((day) => (
        <div key={day.label}>
          <h3 className="mb-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400">{day.label}</h3>
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

  if (isLoading) return <p className="text-sm text-neutral-500">Loading achieved goals…</p>
  if (error) return <p className="text-sm text-red-600">Couldn’t load goals: {error.message}</p>
  if (sorted.length === 0) return <p className="text-sm text-neutral-500">No achieved goals yet.</p>

  return (
    <ul className="space-y-2">
      {sorted.map((g) => (
        <li key={g.id} className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="font-medium">{g.title}</span>
            {g.achieved_at && <span className="text-xs text-neutral-500">{formatDate(g.achieved_at)}</span>}
          </div>
          {g.why_it_matters && <p className="mt-0.5 text-xs text-neutral-500">{g.why_it_matters}</p>}
        </li>
      ))}
    </ul>
  )
}

function RecentActivitySection() {
  const { data: entries, isLoading, error } = useActionLog(30)

  if (isLoading) return <p className="text-sm text-neutral-500">Loading activity…</p>
  if (error) return <p className="text-sm text-red-600">Couldn’t load activity: {error.message}</p>
  if (!entries || entries.length === 0) return <p className="text-sm text-neutral-500">No activity yet.</p>

  return (
    <ul className="space-y-1 text-sm">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-center gap-3">
          <span className="w-32 shrink-0 text-xs text-neutral-500">{formatDateTime(entry.created_at)}</span>
          <span className="min-w-0 flex-1 truncate">{entry.summary}</span>
          <span className="shrink-0 text-xs capitalize text-neutral-400">{entry.source}</span>
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

      <section aria-labelledby="completed-missed-heading">
        <h2 id="completed-missed-heading" className="mb-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          Completed & Missed
        </h2>
        <CompletedAndMissedSection contextsById={contextsById} />
      </section>

      <section aria-labelledby="achieved-goals-heading">
        <h2 id="achieved-goals-heading" className="mb-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          Achieved Goals
        </h2>
        <AchievedGoalsSection />
      </section>

      <section aria-labelledby="activity-heading">
        <h2 id="activity-heading" className="mb-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          Recent Activity
        </h2>
        <RecentActivitySection />
      </section>
    </div>
  )
}
