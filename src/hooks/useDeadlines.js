import { useSupabaseTable } from './useSupabaseTable'

const table = useSupabaseTable('deadlines')

// filters: { contextId?, status? }
export function useDeadlines(filters = {}) {
  return table.useList((q) => {
    q = q.order('due_at', { ascending: true })
    if (filters.contextId) q = q.eq('context_id', filters.contextId)
    if (filters.status) q = q.eq('status', filters.status)
    return q
  }, [filters.contextId ?? null, filters.status ?? null])
}

export function useCreateDeadline() {
  return table.useCreate()
}

export function useUpdateDeadline() {
  return table.useUpdate()
}

export function useDeleteDeadline() {
  return table.useDelete()
}
