import { format } from 'date-fns'
import ContextBadge from '../dashboard/ContextBadge'
import { groupByDay } from '../../lib/dateUtils'

const TYPE_LABELS = { todo: 'Due', deadline: 'Deadline' }

export default function AgendaList({ items }) {
  const grouped = groupByDay(items, 'date', { ascending: true })

  if (grouped.length === 0) return <p className="text-sm text-neutral-500">Nothing scheduled in this range.</p>

  return (
    <div className="space-y-4">
      {grouped.map((day) => (
        <div key={day.label}>
          <h3 className="mb-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400">{day.label}</h3>
          <ul className="space-y-1.5">
            {[...day.items]
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800"
                >
                  <span className="w-20 shrink-0 text-xs text-neutral-500">{format(new Date(item.date), 'h:mm a')}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {TYPE_LABELS[item.type] && <span className="text-neutral-500">{TYPE_LABELS[item.type]}: </span>}
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
