import { useState } from 'react'
import Modal from '../../Modal'
import ConfirmDeleteButton from './ConfirmDeleteButton'
import { useCreateDeadline, useUpdateDeadline, useDeleteDeadline } from '../../../hooks/useDeadlines'
import { toLocalInputValue, fromLocalInputValue } from '../../../lib/dateUtils'

export default function DeadlineForm({ deadline, contexts, goals, onClose }) {
  const isEdit = !!deadline
  const [title, setTitle] = useState(deadline?.title ?? '')
  const [notes, setNotes] = useState(deadline?.notes ?? '')
  const [dueAt, setDueAt] = useState(toLocalInputValue(deadline?.due_at))
  const [contextId, setContextId] = useState(deadline?.context_id ?? '')
  const [goalId, setGoalId] = useState(deadline?.goal_id ?? '')
  const [status, setStatus] = useState(deadline?.status ?? 'upcoming')

  const createDeadline = useCreateDeadline()
  const updateDeadline = useUpdateDeadline()
  const deleteDeadline = useDeleteDeadline()
  const saving = createDeadline.isPending || updateDeadline.isPending
  const saveError = createDeadline.error || updateDeadline.error

  function handleSubmit(e) {
    e.preventDefault()
    const fields = {
      title: title.trim(),
      notes: notes.trim() || null,
      due_at: fromLocalInputValue(dueAt),
      context_id: contextId || null,
      goal_id: goalId || null,
      status,
    }
    if (!fields.title || !fields.due_at) return
    if (isEdit) {
      updateDeadline.mutate({ id: deadline.id, fields }, { onSuccess: onClose })
    } else {
      createDeadline.mutate(fields, { onSuccess: onClose })
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Deadline' : 'New Deadline'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input
            autoFocus
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="hud-input w-full"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Due</label>
            <input
              type="datetime-local"
              required
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="hud-input w-full"
            />
          </div>
          {isEdit && (
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="hud-input w-full"
              >
                <option value="upcoming">Upcoming</option>
                <option value="met">Met</option>
                <option value="missed">Missed</option>
              </select>
            </div>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="hud-input w-full"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Context</label>
            <select
              value={contextId}
              onChange={(e) => setContextId(e.target.value)}
              className="hud-input w-full"
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
              className="hud-input w-full"
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
        {saveError && (
          <p role="alert" className="text-xs text-hud-crit">
            {saveError.message}
          </p>
        )}
        <div className="flex items-center justify-between pt-2">
          {isEdit ? (
            <ConfirmDeleteButton
              pending={deleteDeadline.isPending}
              onConfirm={() => deleteDeadline.mutate(deadline.id, { onSuccess: onClose })}
            />
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={saving}
            className="hud-btn-primary !px-4"
          >
            {isEdit ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
