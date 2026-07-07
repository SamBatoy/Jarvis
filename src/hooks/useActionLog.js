import { useSupabaseTable } from './useSupabaseTable'

const table = useSupabaseTable('action_log')

export function useActionLog(limit = 30) {
  return table.useList((q) => q.order('created_at', { ascending: false }).limit(limit), [limit])
}
