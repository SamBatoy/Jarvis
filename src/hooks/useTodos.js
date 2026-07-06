import { useSupabaseTable } from './useSupabaseTable'

const table = useSupabaseTable('todos')

// filters: { contextId?, done?, parentTodoId? | 'top-level' }
export function useTodos(filters = {}) {
  return table.useList((q) => {
    q = q.order('due_date', { ascending: true, nullsFirst: false })
    if (filters.contextId) q = q.eq('context_id', filters.contextId)
    if (filters.done !== undefined) q = q.eq('done', filters.done)
    if (filters.parentTodoId === 'top-level') q = q.is('parent_todo_id', null)
    else if (filters.parentTodoId) q = q.eq('parent_todo_id', filters.parentTodoId)
    return q
  }, [filters.contextId ?? null, filters.done ?? null, filters.parentTodoId ?? null])
}

export function useCreateTodo() {
  return table.useCreate()
}

export function useCreateTodos() {
  return table.useCreateMany()
}

export function useUpdateTodo() {
  return table.useUpdate()
}

export function useDeleteTodo() {
  return table.useDelete()
}
