import { useSupabaseTable } from './useSupabaseTable'

const table = useSupabaseTable('todos')

// Raw read, deliberately not scoped by archived — completed todos are
// usually archived by the next day's cron, but this should still see
// today's completions immediately. Feeds src/lib/estimateBias.js.
export function useEstimateHistory() {
  return table.useList(
    (q) => q.not('estimated_minutes', 'is', null).not('actual_minutes', 'is', null),
    ['estimate-history']
  )
}
