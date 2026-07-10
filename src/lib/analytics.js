import { startOfWeek, format } from 'date-fns'

// Pure aggregation over todos already being collected — no new writes, no
// external analytics service. All in browser-local time, consistent with
// the rest of the dashboard's date handling (dateUtils.js never converts
// timezone client-side either).

const DAYPARTS = [
  { key: 'morning', label: 'Morning (5am–12pm)', test: (h) => h >= 5 && h < 12 },
  { key: 'afternoon', label: 'Afternoon (12–5pm)', test: (h) => h >= 12 && h < 17 },
  { key: 'evening', label: 'Evening (5–9pm)', test: (h) => h >= 17 && h < 21 },
  { key: 'night', label: 'Night (9pm–5am)', test: (h) => h >= 21 || h < 5 },
]

export function bestProductivityTime(todos) {
  const counts = DAYPARTS.map((d) => ({ ...d, count: 0 }))
  let total = 0
  for (const t of todos) {
    if (!t.completed_at) continue
    const hour = new Date(t.completed_at).getHours()
    const bucket = counts.find((d) => d.test(hour))
    if (bucket) {
      bucket.count++
      total++
    }
  }
  if (total === 0) return null
  const top = counts.reduce((a, b) => (b.count > a.count ? b : a))
  return { buckets: counts.map(({ key, label, count }) => ({ key, label, count })), total, topLabel: top.label }
}

// completed_at (not archive_reason alone) is the authoritative "was this
// actually completed" signal — propose_archive_todo's 'manual' reason
// doesn't strictly require done:true, a pre-existing Phase 1 looseness this
// works around rather than changes.
export function completionRate(todos) {
  const archived = todos.filter((t) => t.archived)
  if (archived.length === 0) return null
  const completed = archived.filter((t) => t.completed_at).length
  const missed = archived.length - completed
  return { completed, missed, total: archived.length, rate: Math.round((completed / archived.length) * 100) }
}

// archive_reason specifically here, since 'missed' is the cron-driven
// signal that exists precisely for this purpose.
export function mostDelayedSubjects(todos, contextsById) {
  const counts = new Map()
  for (const t of todos) {
    if (t.archive_reason !== 'missed') continue
    const key = t.context_id ?? 'none'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const ranked = Array.from(counts.entries())
    .map(([contextId, count]) => ({
      contextId,
      name: contextId === 'none' ? 'No subject/project' : (contextsById.get(contextId)?.name ?? 'Unknown'),
      color: contextId === 'none' ? null : (contextsById.get(contextId)?.color ?? null),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  return ranked.length > 0 ? ranked : null
}

// Chronic-miss signal per subject/project, feeding priorityScore.js's
// contextMissedRate boost. Same MIN_SAMPLE guard as estimateBias.js — a
// context needs at least 5 archived todos before its miss rate is trusted,
// so a brand-new subject's first bad week can't dominate the score.
const MIN_SAMPLE = 5

export function missedRateByContext(todos) {
  const totals = new Map()
  const missed = new Map()
  for (const t of todos) {
    if (!t.archived || t.context_id == null) continue
    totals.set(t.context_id, (totals.get(t.context_id) ?? 0) + 1)
    if (t.archive_reason === 'missed') missed.set(t.context_id, (missed.get(t.context_id) ?? 0) + 1)
  }
  const rateByContext = new Map()
  for (const [contextId, total] of totals) {
    if (total < MIN_SAMPLE) continue
    rateByContext.set(contextId, (missed.get(contextId) ?? 0) / total)
  }
  return rateByContext
}

export function weeklyTrends(todos, weeks = 8) {
  const now = new Date()
  const weekBuckets = []
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = startOfWeek(new Date(now.getTime() - i * 7 * 86400000))
    weekBuckets.push({ weekStart, label: format(weekStart, 'MMM d'), total: 0, onTime: 0, late: 0 })
  }

  function bucketFor(date) {
    return weekBuckets.find((bucket, i) => {
      const nextStart = weekBuckets[i + 1]?.weekStart
      return date >= bucket.weekStart && (!nextStart || date < nextStart)
    })
  }

  for (const t of todos) {
    if (!t.archived) continue
    const eventDate = new Date(t.completed_at ?? t.archived_at)
    const bucket = bucketFor(eventDate)
    if (!bucket) continue
    bucket.total++
    const late = !t.completed_at || (t.due_date && new Date(t.completed_at) > new Date(t.due_date))
    if (late) bucket.late++
    else bucket.onTime++
  }

  return weekBuckets
}
