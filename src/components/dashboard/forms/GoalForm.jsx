import { useState } from 'react'
import Modal from '../../Modal'
import ConfirmDeleteButton from './ConfirmDeleteButton'
import { useCreateGoal, useUpdateGoal, useDeleteGoal } from '../../../hooks/useGoals'

export default function GoalForm({ goal, onClose }) {
  const isEdit = !!goal
  const [title, setTitle] = useState(goal?.title ?? '')
  const [description, setDescription] = useState(goal?.description ?? '')
  const [whyItMatters, setWhyItMatters] = useState(goal?.why_it_matters ?? '')
  const [targetDate, setTargetDate] = useState(goal?.target_date ?? '')
  const [status, setStatus] = useState(goal?.status ?? 'active')

  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()
  const saving = createGoal.isPending || updateGoal.isPending
  const saveError = createGoal.error || updateGoal.error

  function handleSubmit(e) {
    e.preventDefault()
    const fields = {
      title: title.trim(),
      description: description.trim() || null,
      why_it_matters: whyItMatters.trim() || null,
      target_date: targetDate || null,
      status,
    }
    if (!fields.title) return
    if (isEdit) {
      updateGoal.mutate({ id: goal.id, fields }, { onSuccess: onClose })
    } else {
      createGoal.mutate(fields, { onSuccess: onClose })
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Goal' : 'New Goal'} onClose={onClose}>
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
        <div>
          <label className="mb-1 block text-sm font-medium">Why it matters</label>
          <textarea
            value={whyItMatters}
            onChange={(e) => setWhyItMatters(e.target.value)}
            rows={2}
            className="hud-input w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="hud-input w-full"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Target date</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="hud-input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="hud-input w-full"
            >
              <option value="active">Active</option>
              <option value="achieved">Achieved</option>
              <option value="abandoned">Abandoned</option>
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
              pending={deleteGoal.isPending}
              onConfirm={() => deleteGoal.mutate(goal.id, { onSuccess: onClose })}
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
