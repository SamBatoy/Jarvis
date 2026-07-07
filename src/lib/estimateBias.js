// Passive bias-correction suggestion: how much longer/shorter tasks of a
// given task_type actually take vs. their estimate. Purely informational —
// never auto-adjusts what the user enters, same spirit as Smart Priority.
const MIN_SAMPLE = 5 // enough to not be extrapolating from 1-2 data points

export function computeEstimateBias(historicalTodos, taskType) {
  if (!taskType) return null
  const matches = historicalTodos.filter(
    (t) => t.task_type === taskType && t.estimated_minutes > 0 && t.actual_minutes > 0
  )
  if (matches.length < MIN_SAMPLE) return null

  const avgRatio = matches.reduce((sum, t) => sum + t.actual_minutes / t.estimated_minutes, 0) / matches.length
  const rounded = Math.round(avgRatio * 10) / 10

  if (rounded >= 0.95 && rounded <= 1.05) {
    return { sampleSize: matches.length, ratio: rounded, message: `Estimates for this task type are usually accurate (${matches.length} completed).` }
  }
  const direction = rounded > 1 ? 'longer' : 'shorter'
  const factor = rounded > 1 ? rounded : Math.round((1 / rounded) * 10) / 10
  return {
    sampleSize: matches.length,
    ratio: rounded,
    message: `Tasks like this have taken ~${factor}x ${direction} than estimated (${matches.length} completed).`,
  }
}
