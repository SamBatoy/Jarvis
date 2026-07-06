// Mirrors src/lib/colorPalette.js. Kept as a separate small copy rather than
// a shared import — this file runs server-side (Vercel function) and that
// one is bundled into the browser; duplicating an 8-line constant is cheaper
// than wiring a cross-boundary shared module for it.
export const CONTEXT_COLOR_PALETTE = [
  '#3b82f6', '#8b5cf6', '#22c55e', '#f97316', '#ec4899', '#14b8a6', '#ef4444', '#eab308',
]

export async function nextContextColor(supabaseAdmin) {
  const { count } = await supabaseAdmin.from('contexts').select('*', { count: 'exact', head: true })
  return CONTEXT_COLOR_PALETTE[(count ?? 0) % CONTEXT_COLOR_PALETTE.length]
}
