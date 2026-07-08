import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { formatDateTime } from '../../lib/dateUtils'
import LoadingState from '../LoadingState'

const QUERY_KEY_BY_TOOL = {
  propose_scaffold: ['todos'],
  propose_create_todo: ['todos'],
  propose_create_event: ['events'],
  propose_create_deadline: ['deadlines'],
  propose_create_goal: ['goals'],
  propose_create_context: ['contexts'],
  propose_learning_path: ['learning_paths'],
}

const TABLE_BY_ENTITY_TYPE = {
  todo: 'todos',
  event: 'events',
  deadline: 'deadlines',
  goal: 'goals',
  context: 'contexts',
  learning_path: 'learning_paths',
}

// Returns an array of query keys to invalidate — a batch can touch several
// tables at once (e.g. todos + deadlines in one confirm), unlike every other
// proposal type which only ever touches one.
function invalidatedQueryKeys(toolName, preview) {
  if (toolName === 'propose_delete') return [[TABLE_BY_ENTITY_TYPE[preview.entityType]]]
  if (toolName === 'propose_batch_update') {
    const uniqueTables = [...new Set(preview.changes.map((c) => TABLE_BY_ENTITY_TYPE[c.entityType]))]
    return uniqueTables.map((table) => [table])
  }
  const key = QUERY_KEY_BY_TOOL[toolName]
  return key ? [key] : []
}

function ScaffoldPreview({ preview }) {
  return (
    <div>
      <p className="font-medium">{preview.parent.title}</p>
      <p className="text-xs text-neutral-500">Due {formatDateTime(preview.parent.due_date)} · {preview.children.length} subtasks</p>
      <ol className="mt-2 space-y-1 text-xs">
        {preview.children.map((c, i) => (
          <li key={i} className="flex justify-between gap-2">
            <span>{i + 1}. {c.title}</span>
            <span className="shrink-0 text-neutral-500">{formatDateTime(c.due_date)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function LearningPathPreview({ preview }) {
  return (
    <div>
      <p className="font-medium">{preview.topic}</p>
      <ol className="mt-2 space-y-1 text-xs">
        {preview.skills.map((s, i) => (
          <li key={i}>
            <span className="font-medium">{i + 1}. {s.name}</span>
            <span className="text-neutral-500"> — {s.description}</span>
            {s.resources?.length > 0 && (
              <span className="text-neutral-500"> ({s.resources.length} resource{s.resources.length > 1 ? 's' : ''})</span>
            )}
          </li>
        ))}
      </ol>
      {preview.resourcesAvailable === false && (
        <p className="mt-2 text-xs italic text-neutral-500">
          Web search isn’t configured, so resources aren’t included — set TAVILY_API_KEY to enable them.
        </p>
      )}
    </div>
  )
}

function DeletePreview({ preview }) {
  return (
    <div>
      <p className="font-medium">Delete this {preview.entityType}?</p>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{preview.row.title ?? preview.row.name}</p>
    </div>
  )
}

const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

function formatFieldValue(value) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string' && ISO_DATETIME_RE.test(value)) return formatDateTime(value)
  return String(value)
}

function BatchUpdatePreview({ preview }) {
  return (
    <div>
      <p className="font-medium">{preview.summary}</p>
      <ul className="mt-2 space-y-1.5 text-xs">
        {preview.changes.map((change, i) => (
          <li key={i}>
            <span className="font-medium">{change.title}</span>
            <ul className="ml-3 text-neutral-500">
              {Object.entries(change.fields).map(([field, newValue]) => (
                <li key={field}>
                  {field.replace(/_/g, ' ')}: {formatFieldValue(change.before[field])} → {formatFieldValue(newValue)}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}

function GenericPreview({ preview }) {
  return (
    <dl className="space-y-0.5 text-xs">
      {Object.entries(preview)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([key, value]) => (
          <div key={key} className="flex gap-2">
            <dt className="shrink-0 font-medium capitalize">{key.replace(/_/g, ' ')}:</dt>
            <dd className="truncate text-neutral-600 dark:text-neutral-400">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </dd>
          </div>
        ))}
    </dl>
  )
}

const TOOL_LABELS = {
  propose_scaffold: 'Create task breakdown',
  propose_create_todo: 'Create todo',
  propose_create_event: 'Create event',
  propose_create_deadline: 'Create deadline',
  propose_create_goal: 'Create goal',
  propose_create_context: 'Create subject/project',
  propose_delete: 'Delete',
  propose_learning_path: 'Save learning path',
  propose_batch_update: 'Batch update',
}

const CUSTOM_PREVIEW_TOOLS = ['propose_scaffold', 'propose_delete', 'propose_learning_path', 'propose_batch_update']

export default function ProposalCard({ proposal, source = 'dashboard' }) {
  const [status, setStatus] = useState('pending') // pending | confirming | confirmed | cancelled | error
  const [error, setError] = useState(null)
  const queryClient = useQueryClient()
  const { toolName, preview } = proposal

  async function handleConfirm() {
    setStatus('confirming')
    setError(null)
    try {
      const res = await fetch('/api/commit-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName, payload: preview, source }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      for (const key of invalidatedQueryKeys(toolName, preview)) {
        queryClient.invalidateQueries({ queryKey: key })
      }
      setStatus('confirmed')
    } catch (e) {
      setError(e.message)
      setStatus('pending')
    }
  }

  function handleCancel() {
    setStatus('cancelled')
  }

  return (
    <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
        {TOOL_LABELS[toolName] ?? toolName}
      </p>

      {toolName === 'propose_scaffold' && <ScaffoldPreview preview={preview} />}
      {toolName === 'propose_delete' && <DeletePreview preview={preview} />}
      {toolName === 'propose_learning_path' && <LearningPathPreview preview={preview} />}
      {toolName === 'propose_batch_update' && <BatchUpdatePreview preview={preview} />}
      {!CUSTOM_PREVIEW_TOOLS.includes(toolName) && <GenericPreview preview={preview} />}

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {status === 'pending' && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleConfirm}
            className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white transition-colors duration-150 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            Confirm
          </button>
          <button
            onClick={handleCancel}
            className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium transition-colors duration-150 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
        </div>
      )}
      <div aria-live="polite">
        {status === 'confirming' && (
          <div className="mt-3">
            <LoadingState label="Applying…" />
          </div>
        )}
        {status === 'confirmed' && (
          <p className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">✓ Done</p>
        )}
        {status === 'cancelled' && <p className="mt-3 text-xs text-neutral-500">Cancelled — nothing was changed.</p>}
      </div>
    </div>
  )
}
