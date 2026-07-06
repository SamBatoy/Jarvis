import { useState } from 'react'
import Modal from '../../Modal'
import ConfirmDeleteButton from './ConfirmDeleteButton'
import { useCreateContext, useUpdateContext, useDeleteContext } from '../../../hooks/useContexts'
import { nextContextColor } from '../../../lib/colorPalette'
import { dayName } from '../../../lib/dateUtils'

const DAY_OPTIONS = [0, 1, 2, 3, 4, 5, 6]

export default function ContextForm({ context, allContexts, onClose }) {
  const isEdit = !!context
  const [type, setType] = useState(context?.type ?? 'subject')
  const [name, setName] = useState(context?.name ?? '')
  const [color, setColor] = useState(context?.color ?? nextContextColor(allContexts))
  const [instructor, setInstructor] = useState(context?.instructor ?? '')
  const [schedule, setSchedule] = useState(context?.class_schedule ?? [])
  const [description, setDescription] = useState(context?.description ?? '')
  const [status, setStatus] = useState(context?.status ?? 'active')

  const createContext = useCreateContext()
  const updateContext = useUpdateContext()
  const deleteContext = useDeleteContext()
  const saving = createContext.isPending || updateContext.isPending
  const saveError = createContext.error || updateContext.error

  function addSlot() {
    setSchedule((s) => [...s, { day_of_week: 1, start_time: '09:00', end_time: '10:00' }])
  }

  function updateSlot(i, patch) {
    setSchedule((s) => s.map((slot, idx) => (idx === i ? { ...slot, ...patch } : slot)))
  }

  function removeSlot(i) {
    setSchedule((s) => s.filter((_, idx) => idx !== i))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const fields =
      type === 'subject'
        ? {
            name: name.trim(),
            type,
            color,
            instructor: instructor.trim() || null,
            class_schedule: schedule.length > 0 ? schedule : null,
            description: null,
            status: null,
          }
        : {
            name: name.trim(),
            type,
            color,
            instructor: null,
            class_schedule: null,
            description: description.trim() || null,
            status,
          }
    if (!fields.name) return
    if (isEdit) {
      updateContext.mutate({ id: context.id, fields }, { onSuccess: onClose })
    } else {
      createContext.mutate(fields, { onSuccess: onClose })
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Context' : 'New Subject / Project'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {!isEdit && (
          <div>
            <label className="mb-1 block text-sm font-medium">Type</label>
            <div className="flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-800">
              {['subject', 'project'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-md py-1.5 text-sm font-medium ${
                    type === t
                      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {t === 'subject' ? 'Subject' : 'Project'}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          {isEdit && (
            <div>
              <label className="mb-1 block text-sm font-medium">Color</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-12 rounded border border-neutral-300 dark:border-neutral-700"
              />
            </div>
          )}
        </div>

        {type === 'subject' ? (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">Instructor (optional)</label>
              <input
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium">Class schedule</label>
                <button type="button" onClick={addSlot} className="text-xs text-blue-600 hover:underline dark:text-blue-400">
                  + add time
                </button>
              </div>
              <div className="space-y-2">
                {schedule.map((slot, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={slot.day_of_week}
                      onChange={(e) => updateSlot(i, { day_of_week: Number(e.target.value) })}
                      className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                    >
                      {DAY_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {dayName(d)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="time"
                      value={slot.start_time}
                      onChange={(e) => updateSlot(i, { start_time: e.target.value })}
                      className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                    />
                    <span className="text-sm text-neutral-500">to</span>
                    <input
                      type="time"
                      value={slot.end_time}
                      onChange={(e) => updateSlot(i, { end_time: e.target.value })}
                      className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                    />
                    <button
                      type="button"
                      onClick={() => removeSlot(i)}
                      aria-label="Remove time slot"
                      className="ml-auto text-neutral-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              >
                <option value="active">Active</option>
                <option value="shipped">Shipped</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </>
        )}

        {saveError && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {saveError.message}
          </p>
        )}
        <div className="flex items-center justify-between pt-2">
          {isEdit ? (
            <ConfirmDeleteButton
              pending={deleteContext.isPending}
              onConfirm={() => deleteContext.mutate(context.id, { onSuccess: onClose })}
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
