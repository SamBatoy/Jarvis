// Passive, computed-on-read signal — same philosophy as Smart Priority
// (src/lib/priorityScore.js): nothing is persisted, nothing is written
// automatically. Shared between todos and learning paths since both need
// the same "no real activity in a while" check.
export const STUCK_THRESHOLD_DAYS = 5 // long enough to not nag on normal batching, short enough to matter

export function isStuck({ lastActivityAt, isComplete }, { now = new Date(), thresholdDays = STUCK_THRESHOLD_DAYS } = {}) {
  if (isComplete || !lastActivityAt) return false
  return now - new Date(lastActivityAt) > thresholdDays * 86400000
}
