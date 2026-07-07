import { useMemo } from 'react'
import TodoItem from './TodoItem'
import { useTodos } from '../../hooks/useTodos'

const PRIORITY_WEIGHT = { high: 0, medium: 1, low: 2 }

function compareTodos(a, b) {
  const pw = (PRIORITY_WEIGHT[a.priority] ?? 1) - (PRIORITY_WEIGHT[b.priority] ?? 1)
  if (pw !== 0) return pw
  if (!a.due_date && !b.due_date) return 0
  if (!a.due_date) return 1
  if (!b.due_date) return -1
  return new Date(a.due_date) - new Date(b.due_date)
}

export default function TodoList({ contextsById, domain, contextId, onEditTodo }) {
  const { data: todos, isLoading, error } = useTodos()

  const { topLevel, childrenByParent } = useMemo(() => {
    const all = todos ?? []
    const childrenByParent = new Map()
    const topLevel = []
    for (const t of all) {
      if (t.parent_todo_id) {
        if (!childrenByParent.has(t.parent_todo_id)) childrenByParent.set(t.parent_todo_id, [])
        childrenByParent.get(t.parent_todo_id).push(t)
      } else {
        topLevel.push(t)
      }
    }
    return { topLevel, childrenByParent }
  }, [todos])

  const filtered = useMemo(() => {
    return topLevel
      .filter((t) => {
        if (contextId) return t.context_id === contextId
        if (domain === 'all') return true
        return contextsById.get(t.context_id)?.type === domain
      })
      .sort(compareTodos)
  }, [topLevel, domain, contextId, contextsById])

  if (isLoading) return <p className="text-sm text-neutral-500">Loading todos…</p>
  if (error) return <p className="text-sm text-red-600">Couldn’t load todos: {error.message}</p>

  return (
    <section aria-labelledby="todos-heading">
      <h2 id="todos-heading" className="mb-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
        Todos
      </h2>
      {filtered.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing here — you’re clear.</p>
      ) : (
        <ul className="max-h-[360px] overflow-y-auto rounded-xl border border-neutral-200 px-3 dark:border-neutral-800">
          {filtered.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              context={contextsById.get(todo.context_id)}
              contextsById={contextsById}
              childTodos={childrenByParent.get(todo.id) ?? []}
              onEdit={onEditTodo}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
