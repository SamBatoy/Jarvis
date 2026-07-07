import { useState } from 'react'
import clsx from 'clsx'
import ContextBadge from './ContextBadge'
import { formatDate } from '../../lib/dateUtils'
import { useUpdateTodo } from '../../hooks/useTodos'
import { computePriorityScore, suggestedPriorityLabel } from '../../lib/priorityScore'

const PRIORITY_STYLES = {
  high: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  low: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
}

const SUGGESTION_ARROW = { high: '↑', medium: '·', low: '↓' }

function Row({ todo, context, onEdit, childCount = 0 }) {
  const updateTodo = useUpdateTodo()
  const suggested = suggestedPriorityLabel(computePriorityScore(todo, { childCount }))
  const showSuggestion = !todo.done && suggested !== todo.priority

  return (
    <div className="flex items-center gap-3 py-2">
      <input
        type="checkbox"
        checked={todo.done}
        onChange={(e) => updateTodo.mutate({ id: todo.id, fields: { done: e.target.checked } })}
        aria-label={`Mark "${todo.title}" ${todo.done ? 'not done' : 'done'}`}
        className="h-4 w-4 shrink-0 rounded border-neutral-300 accent-neutral-900 dark:accent-neutral-100"
      />
      <button
        onClick={() => onEdit?.(todo)}
        className={clsx('min-w-0 flex-1 truncate text-left text-sm', todo.done && 'text-neutral-400 line-through')}
      >
        {todo.title}
      </button>
      {showSuggestion && (
        <span
          title={`Smart Priority suggests: ${suggested}`}
          className="shrink-0 text-xs font-medium text-blue-600 dark:text-blue-400"
        >
          {SUGGESTION_ARROW[suggested]} suggested: {suggested}
        </span>
      )}
      {todo.priority && (
        <span className={clsx('rounded px-1.5 py-0.5 text-xs font-medium', PRIORITY_STYLES[todo.priority])}>
          {todo.priority}
        </span>
      )}
      {todo.due_date && <span className="shrink-0 text-xs text-neutral-500">{formatDate(todo.due_date)}</span>}
      <ContextBadge context={context} />
    </div>
  )
}

export default function TodoItem({ todo, context, childTodos = [], contextsById, onEdit }) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = childTodos.length > 0
  const doneCount = childTodos.filter((c) => c.done).length

  return (
    <li className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
      <div className="flex items-center">
        {hasChildren ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse subtasks' : 'Expand subtasks'}
            className="mr-1 shrink-0 rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="mr-1 w-6 shrink-0" />
        )}
        <div className="flex-1">
          <Row todo={todo} context={context} onEdit={onEdit} childCount={childTodos.length} />
        </div>
        {hasChildren && (
          <span className="ml-2 shrink-0 text-xs text-neutral-500">
            {doneCount}/{childTodos.length}
          </span>
        )}
      </div>
      {hasChildren && expanded && (
        <ul className="ml-7 border-l border-neutral-200 pl-3 dark:border-neutral-800">
          {childTodos.map((child) => (
            <li key={child.id}>
              <Row todo={child} context={contextsById.get(child.context_id)} onEdit={onEdit} />
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
