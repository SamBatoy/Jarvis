import { todaysClasses, formatTime, formatDateTime } from '../../lib/dateUtils'
import ContextBadge from './ContextBadge'

export default function TodayStrip({ contexts, events }) {
  const classes = todaysClasses(contexts)
  const todayEvents = events.filter((e) => new Date(e.start_at).toDateString() === new Date().toDateString())

  const items = [
    ...classes.map((c) => ({
      key: `class-${c.context.id}-${c.start_time}`,
      time: formatTime(c.start_time),
      title: `${c.context.name} class`,
      context: c.context,
    })),
    ...todayEvents.map((e) => ({
      key: `event-${e.id}`,
      time: formatDateTime(e.start_at).split(', ')[1],
      title: e.title,
      context: contexts.find((c) => c.id === e.context_id),
    })),
  ]

  return (
    <section aria-labelledby="today-heading" className="hud-panel">
      <h2 id="today-heading" className="hud-label mb-3">
        Today
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-hud-muted">Nothing scheduled today.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-3 text-sm">
              <span className="w-20 shrink-0 font-mono text-xs text-hud-accent">{item.time}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{item.title}</span>
              <ContextBadge context={item.context} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
