// Smart Priority Engine: a passive, computed-on-read score — nothing is
// persisted, nothing is written automatically. It's purely a signal the
// dashboard/chat can surface as a suggestion; the user always acts through
// the normal UI (or chat's confirm-guarded update) to actually change a
// todo's stored priority.
//
// Shared (not duplicated) between the dashboard and server/tools/todos.js —
// unlike the trivial colorPalette.js constant, this is a real formula, and
// two independent copies would risk drifting out of sync. Zero DOM/Node
// dependencies, so it's safe to import from both a Vite bundle and a Node
// server function.

const EFFORT_BY_TASK_TYPE = {
  'exam-prep': 0.6,
  ship: 0.6,
  deploy: 0.5,
  'build-feature': 0.5,
  presentation: 0.45,
  'problem-set': 0.35,
  design: 0.35,
  debug: 0.3,
  study: 0.3,
  reading: 0.15,
  general: 0.15,
}

const DAY_MS = 86400000

// Effort is the flagged proxy-until-Phase-3 signal: real subtask count if
// the todo has children, else a fixed weight per task_type.
function effortProxy(todo, childCount) {
  if (childCount > 0) return Math.min(1, childCount / 5)
  return EFFORT_BY_TASK_TYPE[todo.task_type] ?? 0.15
}

export function computePriorityScore(todo, { childCount = 0, now = new Date() } = {}) {
  const proximity = !todo.due_date ? 0 : Math.max(0, 1 - (new Date(todo.due_date) - now) / (14 * DAY_MS))
  const goalLinked = todo.goal_id ? 1 : 0
  const age = todo.created_at ? Math.min(1, (now - new Date(todo.created_at)) / (30 * DAY_MS)) : 0
  const effort = effortProxy(todo, childCount)
  return proximity * 0.4 + goalLinked * 0.2 + age * 0.2 + effort * 0.2 // 0..1
}

export function suggestedPriorityLabel(score) {
  if (score >= 0.66) return 'high'
  if (score >= 0.33) return 'medium'
  return 'low'
}
