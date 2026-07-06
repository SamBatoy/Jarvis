import { format, isToday as dfIsToday, isPast } from 'date-fns'

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

export function todaysClasses(contexts) {
  const today = new Date().getDay()
  const result = []
  for (const ctx of contexts) {
    if (ctx.type !== 'subject' || !ctx.class_schedule) continue
    for (const slot of ctx.class_schedule) {
      if (slot.day_of_week === today) {
        result.push({ context: ctx, ...slot })
      }
    }
  }
  return result.sort((a, b) => a.start_time.localeCompare(b.start_time))
}
