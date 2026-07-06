import { addDays, format as formatDate } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { supabaseAdmin } from './supabaseAdmin.js'
import { appTimezone, nowInAppTz } from './timezone.js'

const DUE_HOUR_LOCAL = 18 // subtasks default to an end-of-day due time in the app timezone

function dayKey(zonedDate) {
  return formatDate(zonedDate, 'yyyy-MM-dd')
}

// How "full" each day in [rangeStart, rangeEnd] already is, so we can bias
// subtask placement away from days that already have class/events/deadlines.
async function buildBusyMap(contextId, rangeStartZoned, rangeEndZoned) {
  const busy = new Map()
  const bump = (key, weight) => busy.set(key, (busy.get(key) ?? 0) + weight)

  if (contextId) {
    const { data: context } = await supabaseAdmin
      .from('contexts')
      .select('class_schedule')
      .eq('id', contextId)
      .single()
    if (context?.class_schedule?.length) {
      let cursor = rangeStartZoned
      while (cursor <= rangeEndZoned) {
        const dow = cursor.getDay()
        for (const slot of context.class_schedule) {
          if (slot.day_of_week === dow) bump(dayKey(cursor), 1)
        }
        cursor = addDays(cursor, 1)
      }
    }
  }

  const rangeStartISO = fromZonedTime(rangeStartZoned, appTimezone()).toISOString()
  const rangeEndISO = fromZonedTime(rangeEndZoned, appTimezone()).toISOString()

  const [eventsRes, deadlinesRes, todosRes] = await Promise.all([
    supabaseAdmin.from('events').select('start_at').gte('start_at', rangeStartISO).lte('start_at', rangeEndISO),
    supabaseAdmin.from('deadlines').select('due_at').gte('due_at', rangeStartISO).lte('due_at', rangeEndISO),
    supabaseAdmin.from('todos').select('due_date').not('due_date', 'is', null).gte('due_date', rangeStartISO).lte('due_date', rangeEndISO),
  ])

  for (const e of eventsRes.data ?? []) bump(dayKey(toZonedTime(new Date(e.start_at), appTimezone())), 1)
  for (const d of deadlinesRes.data ?? []) bump(dayKey(toZonedTime(new Date(d.due_at), appTimezone())), 2)
  for (const t of todosRes.data ?? []) bump(dayKey(toZonedTime(new Date(t.due_date), appTimezone())), 1)

  return busy
}

function atDueHour(zonedDay) {
  const d = new Date(zonedDay)
  d.setHours(DUE_HOUR_LOCAL, 0, 0, 0)
  return fromZonedTime(d, appTimezone()).toISOString()
}

// Splits `days` (sorted, ascending) into `count` contiguous buckets and picks
// the least-busy day in each bucket — spreads steps across the whole window
// while still avoiding the busiest days locally, and preserves step order
// since bucket N's days are all >= bucket N-1's days.
function pickOneDayPerBucket(days, count, busy) {
  const bucketSize = days.length / count
  const picks = []
  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * bucketSize)
    const end = Math.max(start + 1, Math.floor((i + 1) * bucketSize))
    const bucket = days.slice(start, end)
    let best = bucket[0]
    for (const day of bucket) {
      if ((busy.get(dayKey(day)) ?? 0) < (busy.get(dayKey(best)) ?? 0)) best = day
    }
    picks.push(best)
  }
  return picks
}

export async function computeScaffoldDates({ steps, dueDate, contextId }) {
  const now = nowInAppTz()
  const due = toZonedTime(new Date(dueDate), appTimezone())

  const rangeStart = now < due ? now : due
  const rangeEnd = due

  const days = []
  for (let d = rangeStart; dayKey(d) <= dayKey(rangeEnd); d = addDays(d, 1)) {
    days.push(d)
  }
  if (days.length === 0) days.push(rangeEnd)

  const busy = await buildBusyMap(contextId, days[0], days[days.length - 1])

  let assignedDays
  if (days.length >= steps.length) {
    assignedDays = pickOneDayPerBucket(days, steps.length, busy)
  } else {
    // Not enough distinct days — compress, multiple steps per day, still
    // ending on the due day, still preserving order.
    assignedDays = steps.map((_, i) => {
      const dayIndex = Math.min(days.length - 1, Math.floor((i * days.length) / steps.length))
      return days[dayIndex]
    })
  }

  // The fixed end-of-day due-hour can land after the parent's actual due
  // instant when the parent's own due time-of-day is earlier (e.g. a 9am
  // deadline) — never let a subtask's computed due time exceed the true
  // parent due instant.
  const dueInstant = new Date(dueDate).getTime()
  return assignedDays.map(atDueHour).map((iso) => (new Date(iso).getTime() > dueInstant ? dueDate : iso))
}
