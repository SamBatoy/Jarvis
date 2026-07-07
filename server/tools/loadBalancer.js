import { addDays, format as formatDate } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { supabaseAdmin } from '../supabaseAdmin.js'
import { appTimezone, nowInAppTz } from '../timezone.js'
import { proposeBatchUpdate } from './batchUpdate.js'

const DAILY_CAPACITY_MINUTES = 240 // ~4 hours of task work/day — a reasonable non-class-time budget, not a literal 24h one
const DEFAULT_MINUTES_PER_TASK = 30 // fallback for todos with no estimate, so the heuristic still works with partial Phase-3 adoption
const WINDOW_DAYS = 7
const PRIORITY_RANK = { low: 0, medium: 1, high: 2 }

function dayKey(zonedDate) {
  return formatDate(zonedDate, 'yyyy-MM-dd')
}

// Same time-of-day the todo's original due_date had, just moved to a
// different zoned calendar day — same "zoned date" convention as
// scheduler.js's atDueHour, generalized to preserve the source hour
// instead of a fixed one.
function atSameHour(zonedDay, sourceZonedDateTime) {
  const d = new Date(zonedDay)
  d.setHours(sourceZonedDateTime.getHours(), sourceZonedDateTime.getMinutes(), 0, 0)
  return fromZonedTime(d, appTimezone()).toISOString()
}

// Best-effort, not optimal scheduling: greedily moves the least-important,
// most-flexible (smallest-estimate) items off overloaded days onto the
// least-loaded day within the same 7-day window. If the whole week is
// genuinely full, some overload may remain unresolved.
export async function proposeWeeklyRebalance() {
  const now = nowInAppTz()
  const windowDays = Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(now, i))
  const windowStartISO = fromZonedTime(windowDays[0], appTimezone()).toISOString()
  const windowEndISO = fromZonedTime(addDays(windowDays[WINDOW_DAYS - 1], 1), appTimezone()).toISOString()

  const { data: todos, error } = await supabaseAdmin
    .from('todos')
    .select('id, title, priority, due_date, estimated_minutes')
    .eq('archived', false)
    .eq('done', false)
    .not('due_date', 'is', null)
    .gte('due_date', windowStartISO)
    .lt('due_date', windowEndISO)

  if (error) throw error

  const days = windowDays.map((zonedDay) => ({ zonedDay, key: dayKey(zonedDay), todos: [], load: 0 }))
  const dayByKey = new Map(days.map((d) => [d.key, d]))

  for (const todo of todos) {
    const zonedDue = toZonedTime(new Date(todo.due_date), appTimezone())
    const day = dayByKey.get(dayKey(zonedDue))
    if (!day) continue
    day.todos.push({ ...todo, zonedDue })
    day.load += todo.estimated_minutes ?? DEFAULT_MINUTES_PER_TASK
  }

  const overloaded = days.filter((d) => d.load > DAILY_CAPACITY_MINUTES)
  if (overloaded.length === 0) {
    throw new Error('Your week already looks well-balanced — no changes needed.')
  }

  const changes = []
  for (const day of overloaded) {
    const candidates = [...day.todos].sort((a, b) => {
      const pa = PRIORITY_RANK[a.priority] ?? 1
      const pb = PRIORITY_RANK[b.priority] ?? 1
      if (pa !== pb) return pa - pb
      return (a.estimated_minutes ?? DEFAULT_MINUTES_PER_TASK) - (b.estimated_minutes ?? DEFAULT_MINUTES_PER_TASK)
    })

    for (const todo of candidates) {
      if (day.load <= DAILY_CAPACITY_MINUTES) break
      const target = days.filter((d) => d.key !== day.key && d.load < DAILY_CAPACITY_MINUTES).sort((a, b) => a.load - b.load)[0]
      if (!target) break

      const minutes = todo.estimated_minutes ?? DEFAULT_MINUTES_PER_TASK
      day.load -= minutes
      target.load += minutes

      changes.push({ entityType: 'todo', id: todo.id, fields: { due_date: atSameHour(target.zonedDay, todo.zonedDue) } })
    }
  }

  if (changes.length === 0) {
    throw new Error('Your week already looks well-balanced — no changes needed.')
  }

  const summary = `Redistribute ${changes.length} task${changes.length === 1 ? '' : 's'} to balance an overloaded week`
  return proposeBatchUpdate({ summary, changes })
}
