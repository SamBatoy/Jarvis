import { useState } from 'react'
import clsx from 'clsx'
import ContextBadge from './ContextBadge'
import BreakTodoIntoStepsModal from './BreakTodoIntoStepsModal'
import { formatDate } from '../../lib/dateUtils'
import { useUpdateTodo } from '../../hooks/useTodos'
import { computePriorityScore, suggestedPriorityLabel } from '../../lib/priorityScore'
import { isStuck } from '../../lib/stuckDetection'

const PRIORITY_STYLES = {
  high: 'border border-hud-crit/40 text-hud-crit',
  medium: 'border border-hud-warn/40 text-hud-warn',
  low: 'border border-hud-muted/35 text-hud-muted',
}

const SUGGESTION_ARROW = { high: '↑', medium: '·', low: '↓' }

// Not a blocking modal — done:true has already been written by the checkbox
// itself by the time this shows, so Dismiss loses nothing. Only asks for
// what's missing: actual minutes always, plus a retroactive estimate if the
// task never got one.
//
// Rendered by TodoList, not here: completing a todo now archives it
// instantly (see 010_instant_archive_on_complete.sql), so by the time this
// would show, the todo has already vanished from TodoList's fetched
// results (archived: false is the default filter) and Row/TodoItem would
// have already unmounted. TodoList tracks "just completed, awaiting a time
// log" as its own local state — a small snapshot, not a live query row —
// and renders this independently of whether the todo is still in the list.
export function MarkDoneStrip({ todo, onDismiss }) {
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
    <div className="ml-7 flex flex-wrap items-center gap-2 pb-2 text-xs text-hud-muted">
      <span>How long did it take?</span>
      <input
        type="number"
        min="1"
        placeholder="Actual min"
        value={actualMinutes}
        onChange={(e) => setActualMinutes(e.target.value)}
        className="hud-input w-24 !px-2 !py-1 !text-xs"
      />
      {!todo.estimated_minutes && (
        <input
          type="number"
          min="1"
          placeholder="Estimated min"
          value={estimatedMinutes}
          onChange={(e) => setEstimatedMinutes(e.target.value)}
          className="hud-input w-28 !px-2 !py-1 !text-xs"
        />
      )}
      <button onClick={handleSave} className="hud-btn-primary !px-2 !py-1">
        SAVE
      </button>
      <button
        onClick={onDismiss}
        className="rounded px-2 py-1 transition-colors duration-150 hover:bg-hud-accent/10 hover:text-hud-text"
      >
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
      <div className="flex items-center gap-2 text-hud-warn">
        <span>⚠ No activity in a while —</span>
        <button onClick={() => setBreakingIntoSteps(true)} className="font-medium hover:underline">
          Break into steps
        </button>
        <span>·</span>
        <button onClick={handleQuickStart} className="font-medium hover:underline">
          Quick-start suggestion
        </button>
      </div>
      {quickStart === 'loading' && <p className="mt-1 text-hud-muted">Thinking…</p>}
      {quickStart && quickStart !== 'loading' && <p className="mt-1 text-hud-muted">{quickStart}</p>}
      {breakingIntoSteps && <BreakTodoIntoStepsModal todo={todo} onClose={() => setBreakingIntoSteps(false)} />}
    </div>
  )
}

function Row({ todo, context, onEdit, childCount = 0, onMarkedDone, contextMissedRateMap }) {
  const updateTodo = useUpdateTodo()
  const contextMissedRate = contextMissedRateMap?.get(todo.context_id) ?? 0
  const suggested = suggestedPriorityLabel(computePriorityScore(todo, { childCount, contextMissedRate }))
  const showSuggestion = !todo.done && suggested !== todo.priority
  const stuck = isStuck({ lastActivityAt: todo.updated_at ?? todo.created_at, isComplete: todo.done })

  return (
    <div>
      <div className="flex items-center gap-3 py-2">
        {/* Invisible before: pseudo-element expands the click/tap target
            without affecting layout (absolute positioning, out of flow) —
            the visible checkbox itself stays 16x16, unchanged. */}
        <label className="relative flex h-4 w-4 shrink-0 cursor-pointer before:absolute before:-inset-2 before:content-['']">
          <input
            type="checkbox"
            checked={todo.done}
            onChange={(e) => {
              const checked = e.target.checked
              updateTodo.mutate({ id: todo.id, fields: { done: checked } })
              if (checked) onMarkedDone?.(todo)
            }}
            aria-label={`Mark "${todo.title}" ${todo.done ? 'not done' : 'done'}`}
            className="h-4 w-4 rounded accent-hud-accent"
          />
        </label>
        <button
          onClick={() => onEdit?.(todo)}
          className={clsx(
            'min-w-0 flex-1 truncate text-left text-sm transition-colors duration-150 hover:text-hud-accent',
            todo.done && 'text-hud-muted line-through hover:text-hud-muted'
          )}
        >
          {todo.title}
        </button>
        {showSuggestion && (
          <span
            title={`Smart Priority suggests: ${suggested}`}
            className="shrink-0 text-xs font-medium text-hud-accent"
          >
            {SUGGESTION_ARROW[suggested]} suggested: {suggested}
          </span>
        )}
        {todo.priority && (
          <span className={clsx('rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider', PRIORITY_STYLES[todo.priority])}>
            {todo.priority}
          </span>
        )}
        {todo.due_date && <span className="shrink-0 font-mono text-xs text-hud-muted">{formatDate(todo.due_date)}</span>}
        <ContextBadge context={context} />
      </div>
      {stuck && <StuckActions todo={todo} />}
    </div>
  )
}

export default function TodoItem({ todo, context, childTodos = [], contextsById, onEdit, onMarkedDone, contextMissedRateMap }) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = childTodos.length > 0
  const doneCount = childTodos.filter((c) => c.done).length

  return (
    <li className="border-b border-hud-accent/10 last:border-0">
      <div className="flex items-center">
        {hasChildren ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse subtasks' : 'Expand subtasks'}
            className="mr-1 shrink-0 rounded p-1 text-hud-muted transition-colors duration-150 hover:bg-hud-accent/10 hover:text-hud-text"
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="mr-1 w-6 shrink-0" />
        )}
        <div className="flex-1">
          <Row
            todo={todo}
            context={context}
            onEdit={onEdit}
            childCount={childTodos.length}
            onMarkedDone={onMarkedDone}
            contextMissedRateMap={contextMissedRateMap}
          />
        </div>
        {hasChildren && (
          <span className="ml-2 shrink-0 font-mono text-xs text-hud-muted">
            {doneCount}/{childTodos.length}
          </span>
        )}
      </div>
      {hasChildren && expanded && (
        <ul className="ml-7 border-l border-hud-accent/15 pl-3">
          {childTodos.map((child) => (
            <li key={child.id}>
              <Row
                todo={child}
                context={contextsById.get(child.context_id)}
                onEdit={onEdit}
                onMarkedDone={onMarkedDone}
                contextMissedRateMap={contextMissedRateMap}
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
