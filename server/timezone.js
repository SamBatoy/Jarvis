import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { startOfDay, endOfDay, getDay, format } from 'date-fns'

// Single fixed timezone for the whole app (single-user, per README/.env).
export function appTimezone() {
  return process.env.APP_TIMEZONE || 'America/Los_Angeles'
}

export function nowInAppTz() {
  return toZonedTime(new Date(), appTimezone())
}

// [start, end) of "today" in the app timezone, returned as UTC ISO strings
// so they can be used directly in Supabase timestamptz comparisons.
export function todayRangeInAppTz() {
  const zonedNow = nowInAppTz()
  const start = fromZonedTime(startOfDay(zonedNow), appTimezone())
  const end = fromZonedTime(endOfDay(zonedNow), appTimezone())
  return { startISO: start.toISOString(), endISO: end.toISOString() }
}

export function dayOfWeekInAppTz() {
  return getDay(nowInAppTz())
}

// Plain 'yyyy-MM-dd' for the app's "today," used as daily_briefs.brief_date.
export function todayDateStringInAppTz() {
  return format(nowInAppTz(), 'yyyy-MM-dd')
}
