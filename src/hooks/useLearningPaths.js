import { useSupabaseTable } from './useSupabaseTable'

const table = useSupabaseTable('learning_paths')

export function useLearningPaths() {
  return table.useList((q) => q.order('created_at', { ascending: false }))
}

export function useCreateLearningPath() {
  return table.useCreate()
}

export function useUpdateLearningPath() {
  return table.useUpdate()
}

export function useDeleteLearningPath() {
  return table.useDelete()
}
