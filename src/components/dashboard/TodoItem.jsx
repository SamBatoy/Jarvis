import { useState } from 'react'
import clsx from 'clsx'
import ContextBadge from './ContextBadge'
import BreakTodoIntoStepsModal from './BreakTodoIntoStepsModal'
import { formatDate } from '../../lib/dateUtils'
import { useUpdateTodo } from '../../hooks/useTodos'
import { computePriorityScore, suggestedPriorityLabel } from '../../lib/priorityScore'
import { isStuck } from '../../lib/stuckDetection'

const PRIORITY_STYLES = {
  high: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  low: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
}

const SUGGESTION_ARROW = { high: '↑', medium: '·', low: '↓' }

// Not a blocking modal — done:true has already been written by the checkbox
// itself by the time this shows, so Dismiss loses nothing. Only asks for
// what's missing: actual minutes always, plus a retroactive estimate if the
// task never got one.
function MarkDoneStrip({ todo, onDismiss }) {
  const updateTodo = useUpdateTodo()
  const [actualMinutes, setActualMinutes] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState('')

  function handleSave() {
    const fields = {}
    if (actualMinutes !== '') fields.actual_minutes = Number(actualMinutes)
    if (estimatedMinutes !== '') fields.estimated_minutes = Number(estimatedMinutes)
    if (Object.keys(fields).length > 0) updateTodo.mutate({ id: todo.id, fields })
    onDismiss()
  }

  return (
    <div className="ml-7 flex flex-wrap items-center gap-2 pb-2 text-xs text-neutral-500">
      <span>How long did it take?</span>
      <input
        type="number"
        min="1"
        placeholder="Actual min"
        value={actualMinutes}
        onChange={(e) => setActualMinutes(e.target.value)}
        className="w-24 rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
      />
      {!todo.estimated_minutes && (
        <input
          type="number"
          min="1"
          placeholder="Estimated min"
          value={estimatedMinutes}
          onChange={(e) => setEstimatedMinutes(e.target.value)}
          className="w-28 rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
        />
      )}
      <button
        onClick={handleSave}
        className="rounded bg-neutral-900 px-2 py-1 font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
      >
        Save
      </button>
      <button onClick={onDismiss} className="rounded px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800">
        Dismiss
      </button>
    </div>
  )
}

// Both actions are user-initiated from the badge, never automatic.
function StuckActions({ todo }) {
  const [breakingIntoSteps, setBreakingIntoSteps] = useState(false)
  const [quickStart, setQuickStart] = useState(null) // null | 'loading' | string

  async function handleQuickStart() {
    setQuickStart('loading')
    try {
      const res = await fetch('/api/quick-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: todo.title, notes: todo.notes, taskType: todo.task_type }),
      })
      const { suggestion } = await res.json()
      setQuickStart(suggestion)
    } catch {
      setQuickStart('Could not get a suggestion right now — try again in a moment.')
    }
  }

  return (
    <div className="ml-7 pb-2 text-xs">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
        <span>⚠ No activity in a while —</span>
        <button onClick={() => setBreakingIntoSteps(true)} className="font-medium hover:underline">
          Break into steps
        </button>
        <span>·</span>
        <button onClick={handleQuickStart} className="font-medium hover:underline">
          Quick-start suggestion
        </button>
      </div>
      {quickStart === 'loading' && <p className="mt-1 text-neutral-500">Thinking…</p>}
      {quickStart && quickStart !== 'loading' && <p className="mt-1 text-neutral-600 dark:text-neutral-400">{quickStart}</p>}
      {breakingIntoSteps && <BreakTodoIntoStepsModal todo={todo} onClose={() => setBreakingIntoSteps(false)} />}
    </div>
  )
}

function Row({ todo, context, onEdit, childCount = 0 }) {
  const updateTodo = useUpdateTodo()
  const [showMarkDonePrompt, setShowMarkDonePrompt] = useState(false)
  const suggested = suggestedPriorityLabel(computePriorityScore(todo, { childCount }))
  const showSuggestion = !todo.done && suggested !== todo.priority
  const stuck = isStuck({ lastActivityAt: todo.updated_at ?? todo.created_at, isComplete: todo.done })

  return (
    <div>
      <div className="flex items-center gap-3 py-2">
        <input
          type="checkbox"
          checked={todo.done}
          onChange={(e) => {
            const checked = e.target.checked
            updateTodo.mutate({ id: todo.id, fields: { done: checked } })
            if (checked) setShowMarkDonePrompt(true)
          }}
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
      {showMarkDonePrompt && <MarkDoneStrip todo={todo} onDismiss={() => setShowMarkDonePrompt(false)} />}
      {stuck && !showMarkDonePrompt && <StuckActions todo={todo} />}
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
