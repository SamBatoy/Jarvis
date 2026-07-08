import { format } from 'date-fns'
import ContextBadge from '../dashboard/ContextBadge'
import { groupByDay } from '../../lib/dateUtils'

const TYPE_LABELS = { todo: 'Due', deadline: 'Deadline' }

export default function AgendaList({ items }) {
  const grouped = groupByDay(items, 'date', { ascending: true })

  if (grouped.length === 0) return <p className="text-sm text-hud-muted">Nothing scheduled in this range.</p>

  return (
    <div className="space-y-4">
      {grouped.map((day) => (
        <div key={day.label}>
          <h3 className="hud-label mb-1.5">{day.label}</h3>
          <ul className="space-y-1.5">
            {[...day.items]
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded border border-hud-accent/15 px-3 py-2 text-sm"
                >
                  <span className="w-20 shrink-0 font-mono text-xs text-hud-accent">{format(new Date(item.date), 'h:mm a')}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {TYPE_LABELS[item.type] && <span className="text-hud-muted">{TYPE_LABELS[item.type]}: </span>}
                    {item.title}
                  </span>
                  <ContextBadge context={item.context} />
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
