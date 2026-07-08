import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Modal from '../Modal'
import { useDeleteTodo } from '../../hooks/useTodos'
import { formatDateTime } from '../../lib/dateUtils'

async function proposeTool(toolName, args) {
  const res = await fetch('/api/propose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toolName, args }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed')
  return (await res.json()).preview
}

async function commitTool(toolName, payload) {
  const res = await fetch('/api/commit-proposal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toolName, payload, source: 'dashboard' }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed')
  return (await res.json()).result
}

function defaultDueDate(todo) {
  return todo.due_date ?? new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
}

// Mirrors TurnSkillIntoTodosModal.jsx's propose-then-commit shape. No
// "choose" step needed — the stuck todo already carries everything the
// scaffold needs (title/context/goal/task_type), so the preview fetches
// automatically on open.
export default function BreakTodoIntoStepsModal({ todo, onClose }) {
  const queryClient = useQueryClient()
  const deleteTodo = useDeleteTodo()
  const [phase, setPhase] = useState('previewing') // previewing | preview | applying | done | error
  const [preview, setPreview] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    let cancelled = false
    proposeTool('propose_scaffold', {
      title: todo.title,
      taskType: todo.task_type ?? 'general',
      contextId: todo.context_id ?? null,
      goalId: todo.goal_id ?? null,
      dueDate: defaultDueDate(todo),
    })
      .then((p) => {
        if (!cancelled) {
          setPreview(p)
          setPhase('preview')
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setErrorMsg(e.message)
          setPhase('error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [todo])

  async function handleConfirm() {
    setPhase('applying')
    setErrorMsg(null)
    try {
      await commitTool('propose_scaffold', preview)
      // Superseded by the new parent+children scaffold — remove the
      // original stuck todo, same precedent as TurnSkillIntoTodosModal
      // removing the source skill after its scaffold commits.
      await deleteTodo.mutateAsync(todo.id)
      queryClient.invalidateQueries({ queryKey: ['todos'] })
      setPhase('done')
    } catch (e) {
      setErrorMsg(e.message)
      setPhase('preview')
    }
  }

  return (
    <Modal title={`Break "${todo.title}" into steps`} onClose={onClose}>
      {phase === 'previewing' && <p className="text-sm text-neutral-500">Generating breakdown…</p>}
      {phase === 'error' && <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>}
      {preview && (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">{preview.parent.title}</p>
            <p className="text-xs text-neutral-500">
              Due {formatDateTime(preview.parent.due_date)} · {preview.children.length} subtasks
            </p>
            <ol className="mt-2 space-y-1 text-xs">
              {preview.children.map((c, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>
                    {i + 1}. {c.title}
                  </span>
                  <span className="shrink-0 text-neutral-500">{formatDateTime(c.due_date)}</span>
                </li>
              ))}
            </ol>
          </div>
          {errorMsg && <p className="text-xs text-red-600 dark:text-red-400">{errorMsg}</p>}
          {phase === 'done' ? (
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">✓ Created — original task replaced</p>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={phase === 'applying'}
              className="w-full rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            >
              {phase === 'applying' ? 'Creating…' : 'Confirm'}
            </button>
          )}
        </div>
      )}
    </Modal>
  )
}
