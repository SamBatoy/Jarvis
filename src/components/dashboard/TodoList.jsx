import { useMemo, useState } from 'react'
import TodoItem, { MarkDoneStrip } from './TodoItem'
import LoadingState from '../LoadingState'
import { useTodos, useAllTodosForAnalytics } from '../../hooks/useTodos'
import { missedRateByContext } from '../../lib/analytics'

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
  const { data: allTodosForAnalytics } = useAllTodosForAnalytics()
  const contextMissedRateMap = useMemo(() => missedRateByContext(allTodosForAnalytics ?? []), [allTodosForAnalytics])

  // Completing a todo now archives it instantly (independent of due_date —
  // see 010_instant_archive_on_complete.sql), so it vanishes from `todos`
  // (archived: false is the default filter) on the very next refetch,
  // before the user gets a chance to log actual time via MarkDoneStrip.
  // Track "just completed this session, still awaiting a time log" here as
  // a local snapshot instead, independent of whether the todo is still in
  // the fetched list.
  const [pendingTimeLog, setPendingTimeLog] = useState([]) // { id, title, estimated_minutes }[]
  function handleMarkedDone(todo) {
    setPendingTimeLog((prev) =>
      prev.some((t) => t.id === todo.id)
        ? prev
        : [...prev, { id: todo.id, title: todo.title, estimated_minutes: todo.estimated_minutes }]
    )
  }
  function dismissTimeLog(id) {
    setPendingTimeLog((prev) => prev.filter((t) => t.id !== id))
  }

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

  if (isLoading) return <LoadingState label="Loading todos…" />
  if (error) return <p className="text-sm text-hud-crit">Couldn’t load todos: {error.message}</p>

  return (
    <section aria-labelledby="todos-heading" className="hud-panel">
      <h2 id="todos-heading" className="hud-label mb-2.5">
        Todos
      </h2>
      {pendingTimeLog.length > 0 && (
        <ul className="mb-2 space-y-1 rounded-lg border border-hud-accent/15 px-3 py-2">
          {pendingTimeLog.map((todo) => (
            <li key={todo.id}>
              <p className="text-sm font-medium text-hud-muted line-through">{todo.title}</p>
              <MarkDoneStrip todo={todo} onDismiss={() => dismissTimeLog(todo.id)} />
            </li>
          ))}
        </ul>
      )}
      {filtered.length === 0 ? (
        <p className="text-sm text-hud-muted">Nothing here — you’re clear.</p>
      ) : (
        <ul className="max-h-[360px] overflow-y-auto">
          {filtered.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              context={contextsById.get(todo.context_id)}
              contextsById={contextsById}
              childTodos={childrenByParent.get(todo.id) ?? []}
              onEdit={onEditTodo}
              onMarkedDone={handleMarkedDone}
              contextMissedRateMap={contextMissedRateMap}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
