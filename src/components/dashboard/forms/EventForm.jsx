import { useState } from 'react'
import Modal from '../../Modal'
import ConfirmDeleteButton from './ConfirmDeleteButton'
import { useCreateEvent, useUpdateEvent, useDeleteEvent } from '../../../hooks/useEvents'
import { toLocalInputValue, fromLocalInputValue } from '../../../lib/dateUtils'

export default function EventForm({ event, contexts, onClose }) {
  const isEdit = !!event
  const [title, setTitle] = useState(event?.title ?? '')
  const [notes, setNotes] = useState(event?.notes ?? '')
  const [location, setLocation] = useState(event?.location ?? '')
  const [startAt, setStartAt] = useState(toLocalInputValue(event?.start_at))
  const [endAt, setEndAt] = useState(toLocalInputValue(event?.end_at))
  const [contextId, setContextId] = useState(event?.context_id ?? '')

  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()
  const deleteEvent = useDeleteEvent()
  const saving = createEvent.isPending || updateEvent.isPending
  const saveError = createEvent.error || updateEvent.error

  function handleSubmit(e) {
    e.preventDefault()
    const fields = {
      title: title.trim(),
      notes: notes.trim() || null,
      location: location.trim() || null,
      start_at: fromLocalInputValue(startAt),
      end_at: fromLocalInputValue(endAt),
      context_id: contextId || null,
    }
    if (!fields.title || !fields.start_at || !fields.end_at) return
    if (isEdit) {
      updateEvent.mutate({ id: event.id, fields }, { onSuccess: onClose })
    } else {
      createEvent.mutate(fields, { onSuccess: onClose })
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Event' : 'New Event'} onClose={onClose}>
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Start</label>
            <input
              type="datetime-local"
              required
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">End</label>
            <input
              type="datetime-local"
              required
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Location</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
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
        {saveError && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {saveError.message}
          </p>
        )}
        <div className="flex items-center justify-between pt-2">
          {isEdit ? (
            <ConfirmDeleteButton
              pending={deleteEvent.isPending}
              onConfirm={() => deleteEvent.mutate(event.id, { onSuccess: onClose })}
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
