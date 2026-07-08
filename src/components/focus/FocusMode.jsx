import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { useTodos, useUpdateTodo } from '../../hooks/useTodos'
import { computePriorityScore } from '../../lib/priorityScore'
import { useAmbientNoise } from '../../lib/ambientNoise'
import LoadingState from '../LoadingState'

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="hud-panel w-full max-w-xl !bg-hud-panel p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="hud-label !text-xs">
            Focus Mode
          </h2>
          <button
            onClick={onClose}
            aria-label="Close Focus Mode"
            className="rounded-md p-1 text-hud-muted transition-colors duration-150 hover:bg-hud-accent/10 hover:text-hud-text"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center">
            <LoadingState label="Loading tasks…" />
          </div>
        ) : !selectedTodo ? (
          <p className="text-center text-sm text-hud-muted">No active tasks — nothing to focus on right now.</p>
        ) : (
          <>
            <label className="sr-only" htmlFor="focus-task-picker">
              Task
            </label>
            <select
              id="focus-task-picker"
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(e.target.value)}
              className="hud-input mb-4 w-full"
            >
              {activeTodos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>

            <h1 className="mb-6 text-center text-2xl font-bold">{selectedTodo.title}</h1>

            {/* Breathing glow only while the timer is actually running —
                motion as a state indicator, not decoration. Static glow
                when paused/stopped. */}
            <div
              className={clsx(
                'mb-6 text-center font-mono text-5xl tabular-nums text-hud-accent',
                running ? 'hud-text-pulse' : '[text-shadow:0_0_16px_rgba(56,225,255,0.35)]'
              )}
              aria-live="polite"
            >
              {formatElapsed(elapsedSeconds)}
            </div>

            <div className="mb-6 flex justify-center gap-2">
              <button
                onClick={() => setRunning((r) => !r)}
                className="hud-btn-primary !px-4 !py-2"
              >
                {running ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={() => {
                  setElapsedSeconds(0)
                  setRunning(false)
                }}
                className="hud-btn !px-4 !py-2"
              >
                Reset
              </button>
              <button
                onClick={toggleSound}
                aria-pressed={soundOn}
                className={clsx(
                  'rounded border px-4 py-2 font-mono text-xs tracking-wide transition-all duration-150 hover:[box-shadow:0_0_14px_rgba(56,225,255,0.35)]',
                  soundOn
                    ? 'border-hud-accent text-hud-accent'
                    : 'border-hud-accent/30 text-hud-muted'
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
              className="hud-input mb-6 w-full !py-2"
            />

            <button
              onClick={handleMarkDone}
              className="w-full rounded border border-hud-good bg-hud-good/15 px-4 py-2 font-mono text-xs tracking-wide text-hud-good transition-all duration-150 hover:bg-hud-good/25 hover:[box-shadow:0_0_18px_rgba(61,214,140,0.4)]"
            >
              Mark Done
            </button>
          </>
        )}
      </div>
    </div>
  )
}
