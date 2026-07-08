import { differenceInHours } from 'date-fns'
import { completionRate } from './analytics'

// Everything System View needs to derive from the same two queries
// (all todos, upcoming deadlines) that Analytics and the Dashboard already
// fetch — no new data-fetching pattern, just a different presentation.

// null when there's no archived history yet (completionRate's own
// convention) — callers treat that as "not enough data" rather than 0%.
export function systemCompletionRate(allTodos) {
  return completionRate(allTodos)
}

export function activeTodoCount(allTodos) {
  return allTodos.filter((t) => !t.archived && !t.done).length
}

// Radar horizon: deadlines further out than this are clamped to the rim
// rather than pushed off it entirely — a distant deadline should still
// read as "distant," not disappear.
const RADAR_HORIZON_HOURS = 30 * 24

export function radarBlips(upcomingDeadlines, contextsById, now = new Date()) {
  return upcomingDeadlines
    .map((d) => {
      const hoursUntil = differenceInHours(new Date(d.due_at), now)
      const context = d.context_id ? contextsById.get(d.context_id) : null
      return {
        id: d.id,
        title: d.title,
        hoursUntil,
        // 0 = due now/overdue (center), 1 = at or past the horizon (rim)
        proximity: Math.min(Math.max(hoursUntil, 0) / RADAR_HORIZON_HOURS, 1),
        color: context?.color ?? '#38e1ff',
        contextName: context?.name ?? null,
      }
    })
    .sort((a, b) => a.hoursUntil - b.hoursUntil)
}

export function nextDeadlineLabel(upcomingDeadlines, now = new Date()) {
  if (upcomingDeadlines.length === 0) return null
  const sorted = [...upcomingDeadlines].sort((a, b) => new Date(a.due_at) - new Date(b.due_at))
  const next = sorted[0]
  const hours = differenceInHours(new Date(next.due_at), now)
  if (hours < 0) return { title: next.title, text: 'overdue' }
  if (hours < 24) return { title: next.title, text: `${hours}h` }
  return { title: next.title, text: `${Math.round(hours / 24)}d` }
}
