import { useSupabaseTable } from './useSupabaseTable'

const table = useSupabaseTable('todos')

// filters: { contextId?, done?, parentTodoId? | 'top-level', archived? }
// archived defaults to false so active views never show archived items;
// pass archived: true explicitly (e.g. the Archive view) to see those instead.
export function useTodos(filters = {}) {
  const archived = filters.archived ?? false
  return table.useList((q) => {
    q = q.order('due_date', { ascending: true, nullsFirst: false }).eq('archived', archived)
    if (filters.contextId) q = q.eq('context_id', filters.contextId)
    if (filters.done !== undefined) q = q.eq('done', filters.done)
    if (filters.parentTodoId === 'top-level') q = q.is('parent_todo_id', null)
    else if (filters.parentTodoId) q = q.eq('parent_todo_id', filters.parentTodoId)
    return q
  }, [filters.contextId ?? null, filters.done ?? null, filters.parentTodoId ?? null, archived])
}

// Analytics needs every todo regardless of archived state — a todo can be
// done with a real completed_at before the next archive-cron run marks it
// archived. Small dataset for a single-user app, so no server-side
// aggregation needed.
export function useAllTodosForAnalytics() {
  return table.useList(undefined, ['analytics-all'])
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
