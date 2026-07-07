import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { useTodos, useUpdateTodo } from '../../hooks/useTodos'
import { computePriorityScore } from '../../lib/priorityScore'
import { useAmbientNoise } from '../../lib/ambientNoise'

function formatElapsed(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// A minimal, distraction-reduced overlay over existing task data — no new
// task-tracking model. Defaults to the top-priority active task (reusing
// Phase 2's Smart Priority Engine scorer), lets the user override to any
// other active task, and feeds the timer's elapsed time into actual_minutes
// if the task is finished from here.
export default function FocusMode({ onClose }) {
  const { data: activeTodosRaw, isLoading } = useTodos({ done: false })
  const activeTodos = activeTodosRaw ?? []
  const updateTodo = useUpdateTodo()
  const { on: soundOn, toggle: toggleSound } = useAmbientNoise()

  const childCountByParent = useMemo(() => {
    const map = new Map()
    for (const t of activeTodos) {
      if (t.parent_todo_id) map.set(t.parent_todo_id, (map.get(t.parent_todo_id) ?? 0) + 1)
    }
    return map
  }, [activeTodos])

  const defaultTodoId = useMemo(() => {
    const scored = activeTodos
      .filter((t) => !t.parent_todo_id)
      .map((t) => ({ id: t.id, score: computePriorityScore(t, { childCount: childCountByParent.get(t.id) ?? 0 }) }))
      .sort((a, b) => b.score - a.score)
    return scored[0]?.id ?? null
  }, [activeTodos, childCountByParent])

  const [selectedId, setSelectedId] = useState(null)

  // If the selected task disappears (e.g. just marked done), fall through to
  // re-pick a default — lets the user chain through Focus Mode without
  // reopening it for the next task.
  useEffect(() => {
    if (selectedId && !activeTodos.some((t) => t.id === selectedId)) setSelectedId(null)
  }, [activeTodos, selectedId])
  useEffect(() => {
    if (!selectedId && defaultTodoId) setSelectedId(defaultTodoId)
  }, [defaultTodoId, selectedId])

  const selectedTodo = activeTodos.find((t) => t.id === selectedId) ?? null

  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [running])
  useEffect(() => {
    setElapsedSeconds(0)
    setRunning(false)
  }, [selectedId])

  const [notes, setNotes] = useState('')
  useEffect(() => {
    setNotes(selectedTodo?.notes ?? '')
  }, [selectedTodo?.id])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleNotesBlur() {
    if (selectedTodo && notes !== (selectedTodo.notes ?? '')) {
      updateTodo.mutate({ id: selectedTodo.id, fields: { notes: notes.trim() || null } })
    }
  }

  function handleMarkDone() {
    if (!selectedTodo) return
    const fields = { done: true }
    if (elapsedSeconds >= 60) fields.actual_minutes = Math.round(elapsedSeconds / 60)
    updateTodo.mutate({ id: selectedTodo.id, fields })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Focus Mode"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-2xl dark:bg-neutral-900">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Focus Mode
          </h2>
          <button
            onClick={onClose}
            aria-label="Close Focus Mode"
            className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <p className="text-center text-sm text-neutral-500">Loading tasks…</p>
        ) : !selectedTodo ? (
          <p className="text-center text-sm text-neutral-500">No active tasks — nothing to focus on right now.</p>
        ) : (
          <>
            <label className="sr-only" htmlFor="focus-task-picker">
              Task
            </label>
            <select
              id="focus-task-picker"
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mb-4 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              {activeTodos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>

            <h1 className="mb-6 text-center text-2xl font-bold">{selectedTodo.title}</h1>

            <div className="mb-6 text-center font-mono text-5xl tabular-nums" aria-live="polite">
              {formatElapsed(elapsedSeconds)}
            </div>

            <div className="mb-6 flex justify-center gap-2">
              <button
                onClick={() => setRunning((r) => !r)}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
              >
                {running ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={() => {
                  setElapsedSeconds(0)
                  setRunning(false)
                }}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
              >
                Reset
              </button>
              <button
                onClick={toggleSound}
                aria-pressed={soundOn}
                className={clsx(
                  'rounded-md border px-4 py-2 text-sm font-medium',
                  soundOn
                    ? 'border-neutral-900 dark:border-neutral-100'
                    : 'border-neutral-300 dark:border-neutral-700'
                )}
              >
                {soundOn ? 'Sound: On' : 'Sound: Off'}
              </button>
            </div>

            <label className="mb-1 block text-sm font-medium" htmlFor="focus-notes">
              Notes
            </label>
            <textarea
              id="focus-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              rows={3}
              className="mb-6 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />

            <button
              onClick={handleMarkDone}
              className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Mark Done
            </button>
          </>
        )}
      </div>
    </div>
  )
}
