import { useSupabaseTable } from './useSupabaseTable'

const table = useSupabaseTable('events')

// filters: { contextId?, from?, to? } (from/to are ISO datetime strings)
export function useEvents(filters = {}) {
  return table.useList((q) => {
    q = q.order('start_at', { ascending: true })
    if (filters.contextId) q = q.eq('context_id', filters.contextId)
    if (filters.from) q = q.gte('start_at', filters.from)
    if (filters.to) q = q.lte('start_at', filters.to)
    return q
  }, [filters.contextId ?? null, filters.from ?? null, filters.to ?? null])
}

export function useCreateEvent() {
  return table.useCreate()
}

export function useUpdateEvent() {
  return table.useUpdate()
}

export function useDeleteEvent() {
  return table.useDelete()
}
