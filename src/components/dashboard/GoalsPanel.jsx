import { useMemo } from 'react'
import { useGoals } from '../../hooks/useGoals'
import { useTodos } from '../../hooks/useTodos'
import { formatDate } from '../../lib/dateUtils'

export default function GoalsPanel() {
  const { data: goals, isLoading, error } = useGoals({ status: 'active' })
  const { data: todos } = useTodos()

  const progressByGoal = useMemo(() => {
    const map = new Map()
    for (const t of todos ?? []) {
      if (!t.goal_id) continue
      const entry = map.get(t.goal_id) ?? { done: 0, total: 0 }
      entry.total += 1
      if (t.done) entry.done += 1
      map.set(t.goal_id, entry)
    }
    return map
  }, [todos])

  if (isLoading) return <p className="text-sm text-neutral-500">Loading goals…</p>
  if (error) return <p className="text-sm text-red-600">Couldn’t load goals: {error.message}</p>

  return (
    <section aria-labelledby="goals-heading">
      <h2 id="goals-heading" className="mb-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
        Goals
      </h2>
      {(!goals || goals.length === 0) ? (
        <p className="text-sm text-neutral-500">No active goals yet.</p>
      ) : (
        <ul className="space-y-3">
          {goals.map((g) => {
            const progress = progressByGoal.get(g.id)
            const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
            return (
              <li key={g.id} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{g.title}</h3>
                  {g.target_date && <span className="text-xs text-neutral-500">by {formatDate(g.target_date)}</span>}
                </div>
                {g.why_it_matters && <p className="mt-1 text-xs text-neutral-500">{g.why_it_matters}</p>}
                {progress && progress.total > 0 && (
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
                      {progress.done}/{progress.total} tasks done
                    </p>
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
