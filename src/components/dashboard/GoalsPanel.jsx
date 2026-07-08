import { useMemo } from 'react'
import { useGoals } from '../../hooks/useGoals'
import { useAllTodosForAnalytics } from '../../hooks/useTodos'
import LoadingState from '../LoadingState'
import { formatDate } from '../../lib/dateUtils'
import { computeGoalHealth, formatMinutes } from '../../lib/goalHealth'

const MOMENTUM_STYLES = {
  dropped: 'text-amber-700 dark:text-amber-400',
  stale: 'text-red-600 dark:text-red-400',
}
const MOMENTUM_LABELS = { dropped: 'Momentum dropped', stale: 'Gone stale' }

export default function GoalsPanel() {
  const { data: goals, isLoading, error } = useGoals({ status: 'active' })
  // All todos regardless of archived state — a completed-then-archived
  // todo should still count toward this goal's progress and time invested.
  const { data: todos } = useAllTodosForAnalytics()

  const todosByGoal = useMemo(() => {
    const map = new Map()
    for (const t of todos ?? []) {
      if (!t.goal_id) continue
      if (!map.has(t.goal_id)) map.set(t.goal_id, [])
      map.get(t.goal_id).push(t)
    }
    return map
  }, [todos])

  if (isLoading) return <LoadingState label="Loading goals…" />
  if (error) return <p className="text-sm text-red-600">Couldn’t load goals: {error.message}</p>

  return (
    <section aria-labelledby="goals-heading">
      <h2 id="goals-heading" className="mb-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
        Goals
      </h2>
      {(!goals || goals.length === 0) ? (
        <p className="text-sm text-neutral-500">No active goals yet.</p>
      ) : (
        <ul className="max-h-[320px] space-y-3 overflow-y-auto">
          {goals.map((g) => {
            const linkedTodos = todosByGoal.get(g.id) ?? []
            const health = computeGoalHealth(g, linkedTodos)
            const pct = health.total > 0 ? Math.round((health.completed / health.total) * 100) : 0
            const timeLabel = formatMinutes(health.timeInvestedMinutes)
            return (
              <li key={g.id} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{g.title}</h3>
                  {g.target_date && <span className="text-xs text-neutral-500">by {formatDate(g.target_date)}</span>}
                </div>
                {g.why_it_matters && <p className="mt-1 text-xs text-neutral-500">{g.why_it_matters}</p>}
                {health.total > 0 && (
                  <div className="mt-2">
                    <div
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${g.title} progress`}
                      className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"
                    >
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
                      {health.completed}/{health.total} tasks done
                      {timeLabel && ` · ${timeLabel} invested`}
                    </p>
                    {MOMENTUM_LABELS[health.momentum] && (
                      <p className={`mt-1 text-xs font-medium ${MOMENTUM_STYLES[health.momentum]}`}>
                        {MOMENTUM_LABELS[health.momentum]}
                      </p>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
