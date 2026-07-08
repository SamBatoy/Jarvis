import { useMemo } from 'react'
import clsx from 'clsx'
import ContextBadge from './ContextBadge'
import LoadingState from '../LoadingState'
import { formatDateTime, isOverdue } from '../../lib/dateUtils'
import { useDeadlines } from '../../hooks/useDeadlines'

export default function DeadlinesList({ contextsById, domain, contextId }) {
  const { data: deadlines, isLoading, error } = useDeadlines()

  const filtered = useMemo(() => {
    return (deadlines ?? []).filter((d) => {
      if (contextId) return d.context_id === contextId
      if (domain === 'all') return true
      return contextsById.get(d.context_id)?.type === domain
    })
  }, [deadlines, domain, contextId, contextsById])

  if (isLoading) return <LoadingState label="Loading deadlines…" />
  if (error) return <p className="text-sm text-hud-crit">Couldn’t load deadlines: {error.message}</p>

  return (
    <section aria-labelledby="deadlines-heading" className="hud-panel">
      <h2 id="deadlines-heading" className="hud-label mb-2.5">
        Deadlines
      </h2>
      {filtered.length === 0 ? (
        <p className="text-sm text-hud-muted">No deadlines in view.</p>
      ) : (
        <ul className="max-h-[280px] space-y-1.5 overflow-y-auto">
          {filtered.map((d) => {
            const overdue = isOverdue(d.due_at, d.status)
            return (
              <li
                key={d.id}
                className={clsx(
                  'flex items-center gap-3 rounded border px-3 py-2 text-sm',
                  overdue
                    ? 'border-hud-crit/50 [box-shadow:0_0_14px_rgba(255,107,107,0.12)]'
                    : 'border-hud-accent/15'
                )}
              >
                <span className={clsx('min-w-0 flex-1 truncate font-medium', d.status !== 'upcoming' && 'text-hud-muted line-through')}>
                  {d.title}
                </span>
                <span className={clsx('shrink-0 font-mono text-xs', overdue ? 'font-semibold text-hud-crit' : 'text-hud-muted')}>
                  {overdue ? 'OVERDUE — ' : ''}
                  {formatDateTime(d.due_at)}
                </span>
                <ContextBadge context={contextsById.get(d.context_id)} />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
