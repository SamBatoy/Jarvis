// Computed on read, same philosophy as Smart Priority and Stuck Detection —
// nothing persisted. linkedTodos should be ALL todos for the goal
// regardless of archived state (a completed-then-archived todo still
// counts), which is why callers must use useAllTodosForAnalytics(), not
// the default-active-only useTodos().
const RECENT_WINDOW_DAYS = 14
const STALE_WINDOW_DAYS = 28

export function computeGoalHealth(goal, linkedTodos, { now = new Date() } = {}) {
  const total = linkedTodos.length
  const completed = linkedTodos.filter((t) => t.completed_at).length
  const timeInvestedMinutes = linkedTodos.reduce((sum, t) => sum + (t.actual_minutes ?? 0), 0)

  let momentum = 'steady'
  if (total > 0 && completed < total) {
    const recentCutoff = now - RECENT_WINDOW_DAYS * 86400000
    const priorCutoff = now - 2 * RECENT_WINDOW_DAYS * 86400000
    const recentCompletions = linkedTodos.filter((t) => t.completed_at && new Date(t.completed_at) >= recentCutoff).length
    const priorCompletions = linkedTodos.filter(
      (t) => t.completed_at && new Date(t.completed_at) >= priorCutoff && new Date(t.completed_at) < recentCutoff
    ).length

    if (priorCompletions > 0 && recentCompletions < priorCompletions * 0.5) {
      momentum = 'dropped'
    } else if (priorCompletions === 0 && recentCompletions === 0) {
      const goalAgeDays = (now - new Date(goal.created_at)) / 86400000
      if (goalAgeDays > STALE_WINDOW_DAYS) momentum = 'stale'
    }
  }

  return { total, completed, timeInvestedMinutes, momentum }
}

export function formatMinutes(minutes) {
  if (minutes <= 0) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
