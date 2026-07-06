import { useState } from 'react'
import Modal from '../../Modal'
import ConfirmDeleteButton from './ConfirmDeleteButton'
import { useCreateTodo, useUpdateTodo, useDeleteTodo } from '../../../hooks/useTodos'
import { toLocalInputValue, fromLocalInputValue } from '../../../lib/dateUtils'

const TASK_TYPES = [
  '', 'study', 'presentation', 'problem-set', 'exam-prep', 'reading',
  'build-feature', 'design', 'debug', 'deploy', 'ship', 'general',
]

export default function TodoForm({ todo, contexts, goals, onClose }) {
  const isEdit = !!todo
  const [title, setTitle] = useState(todo?.title ?? '')
  const [notes, setNotes] = useState(todo?.notes ?? '')
  const [priority, setPriority] = useState(todo?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(toLocalInputValue(todo?.due_date))
  const [contextId, setContextId] = useState(todo?.context_id ?? '')
  const [goalId, setGoalId] = useState(todo?.goal_id ?? '')
  const [taskType, setTaskType] = useState(todo?.task_type ?? '')

  const createTodo = useCreateTodo()
  const updateTodo = useUpdateTodo()
  const deleteTodo = useDeleteTodo()
  const saving = createTodo.isPending || updateTodo.isPending
  const saveError = createTodo.error || updateTodo.error

  function handleSubmit(e) {
    e.preventDefault()
    const fields = {
      title: title.trim(),
      notes: notes.trim() || null,
      priority,
      due_date: fromLocalInputValue(dueDate),
      context_id: contextId || null,
      goal_id: goalId || null,
      task_type: taskType || null,
    }
    if (!fields.title) return
    if (isEdit) {
      updateTodo.mutate({ id: todo.id, fields }, { onSuccess: onClose })
    } else {
      createTodo.mutate(fields, { onSuccess: onClose })
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Todo' : 'New Todo'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input
            autoFocus
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Due</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Context</label>
            <select
              value={contextId}
              onChange={(e) => setContextId(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option value="">None</option>
              {contexts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Goal</label>
            <select
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option value="">None</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Task type</label>
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t || 'None'}
              </option>
            ))}
          </select>
        </div>
        {saveError && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {saveError.message}
          </p>
        )}
        <div className="flex items-center justify-between pt-2">
          {isEdit ? (
            <ConfirmDeleteButton
              pending={deleteTodo.isPending}
              onConfirm={() => deleteTodo.mutate(todo.id, { onSuccess: onClose })}
            />
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {isEdit ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
