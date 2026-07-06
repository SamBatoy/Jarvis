import { useSupabaseTable } from './useSupabaseTable'

const table = useSupabaseTable('contexts')

export function useContexts() {
  return table.useList((q) => q.order('created_at', { ascending: true }))
}

export function useCreateContext() {
  return table.useCreate()
}

export function useUpdateContext() {
  return table.useUpdate()
}

export function useDeleteContext() {
  return table.useDelete()
}
