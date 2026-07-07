import { format, isToday as dfIsToday, isPast, addDays, startOfDay } from 'date-fns'

export function formatDateTime(iso) {
  if (!iso) return null
  return format(new Date(iso), 'EEE MMM d, h:mm a')
}

export function formatDate(iso) {
  if (!iso) return null
  return format(new Date(iso), 'EEE MMM d')
}

export function formatTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return format(d, 'h:mm a')
}

export function isToday(iso) {
  return iso ? dfIsToday(new Date(iso)) : false
}

export function isOverdue(iso, status) {
  if (!iso) return false
  if (status && status !== 'upcoming') return false
  return isPast(new Date(iso)) && !dfIsToday(new Date(iso))
}

// datetime-local <input> helpers: that input's value has no timezone info,
// so round-tripping through the browser's local time is the pragmatic choice
// for dashboard forms (the fixed-timezone scheduler is what matters for
// server-side scaffolding, not this local edit UI).
export function toLocalInputValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalInputValue(value) {
  if (!value) return null
  return new Date(value).toISOString()
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function dayName(dayOfWeek) {
  return DAY_NAMES[dayOfWeek]
}

// Groups a list of items into { label, items } buckets keyed by the
// calendar day of `item[dateField]`. Defaults to most-recent-day-first (the
// Archive view's "what happened when"); pass ascending:true for chronological
// order (the calendar's agenda view).
export function groupByDay(items, dateField, { ascending = false } = {}) {
  const buckets = new Map()
  for (const item of items) {
    const value = item[dateField]
    if (!value) continue
    const key = format(new Date(value), 'yyyy-MM-dd')
    if (!buckets.has(key)) buckets.set(key, { label: format(new Date(value), 'EEEE, MMMM d'), items: [] })
    buckets.get(key).items.push(item)
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => (ascending ? (a < b ? -1 : 1) : a < b ? 1 : -1))
    .map(([, bucket]) => bucket)
}

// Expands recurring weekly class_schedule entries into concrete occurrences
// (one per matching day-of-week) across [rangeStart, rangeEnd].
export function classesInRange(contexts, rangeStart, rangeEnd) {
  const result = []
  const end = startOfDay(new Date(rangeEnd))
  let cursor = startOfDay(new Date(rangeStart))
  while (cursor <= end) {
    const dow = cursor.getDay()
    for (const ctx of contexts) {
      if (ctx.type !== 'subject' || !ctx.class_schedule) continue
      for (const slot of ctx.class_schedule) {
        if (slot.day_of_week === dow) result.push({ context: ctx, date: new Date(cursor), ...slot })
      }
    }
    cursor = addDays(cursor, 1)
  }
  return result.sort((a, b) => a.date - b.date || a.start_time.localeCompare(b.start_time))
}

export function todaysClasses(contexts) {
  const today = new Date()
  return classesInRange(contexts, today, today)
}
