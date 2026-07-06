import { useSupabaseTable } from './useSupabaseTable'

const table = useSupabaseTable('goals')

export function useGoals(filters = {}) {
  return table.useList((q) => {
    q = q.order('target_date', { ascending: true, nullsFirst: false })
    if (filters.status) q = q.eq('status', filters.status)
    return q
  }, [filters.status ?? null])
}

export function useCreateGoal() {
  return table.useCreate()
}

export function useUpdateGoal() {
  return table.useUpdate()
}

export function useDeleteGoal() {
  return table.useDelete()
}
