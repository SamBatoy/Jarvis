import { useSupabaseTable } from './useSupabaseTable'

const table = useSupabaseTable('daily_briefs')

// Always the latest of a given type that exists — no "is it morning or
// evening right now" logic, per the simplification the user suggested.
export function useLatestBrief(type) {
  return table.useList((q) => q.eq('type', type).order('brief_date', { ascending: false }).limit(1), [type])
}
