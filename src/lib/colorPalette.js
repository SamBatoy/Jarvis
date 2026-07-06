// Fixed categorical palette for auto-assigning context colors on creation.
// Cycles through in order; the user can override any context's color afterward.
export const CONTEXT_COLOR_PALETTE = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#22c55e', // green
  '#f97316', // orange
  '#ec4899', // pink
  '#14b8a6', // teal
  '#ef4444', // red
  '#eab308', // amber
]

export function nextContextColor(existingContexts) {
  const usedCount = existingContexts?.length ?? 0
  return CONTEXT_COLOR_PALETTE[usedCount % CONTEXT_COLOR_PALETTE.length]
}
