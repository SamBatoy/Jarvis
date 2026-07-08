import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Modal from '../Modal'
import { useUpdateLearningPath } from '../../hooks/useLearningPaths'
import { formatDateTime, toLocalInputValue, fromLocalInputValue } from '../../lib/dateUtils'

function defaultDueDate() {
  return toLocalInputValue(new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString())
}

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

export default function TurnSkillIntoTodosModal({ skill, path, contexts, onClose }) {
  const queryClient = useQueryClient()
  const updatePath = useUpdateLearningPath()
  const [mode, setMode] = useState(contexts.length > 0 ? 'existing' : 'new')
  const [selectedContextId, setSelectedContextId] = useState(contexts[0]?.id ?? '')
  const [newContextName, setNewContextName] = useState(path.topic)
  const [dueDate, setDueDate] = useState(defaultDueDate())
  const [phase, setPhase] = useState('choose') // choose | previewing | preview | applying | done | error
  const [contextPreview, setContextPreview] = useState(null)
  const [scaffoldPreview, setScaffoldPreview] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  async function handlePreview() {
    setPhase('previewing')
    setErrorMsg(null)
    try {
      let ctxPreview = null
      if (mode === 'new') {
        ctxPreview = await proposeTool('propose_create_context', { type: 'project', name: newContextName })
        setContextPreview(ctxPreview)
      }
      const preview = await proposeTool('propose_scaffold', {
        title: `Learn: ${skill.name}`,
        taskType: 'study',
        topic: skill.name,
        contextId: mode === 'existing' ? selectedContextId : null,
        dueDate: fromLocalInputValue(dueDate),
      })
      setScaffoldPreview(preview)
      setPhase('preview')
    } catch (e) {
      setErrorMsg(e.message)
      setPhase('choose')
    }
  }

  async function handleConfirm() {
    setPhase('applying')
    setErrorMsg(null)
    try {
      let contextId = mode === 'existing' ? selectedContextId : null
      if (mode === 'new') {
        const created = await commitTool('propose_create_context', contextPreview)
        contextId = created.id
      }
      const patched = {
        parent: { ...scaffoldPreview.parent, context_id: contextId },
        children: scaffoldPreview.children.map((c) => ({ ...c, context_id: contextId })),
      }
      await commitTool('propose_scaffold', patched)
      // It's now a tracked task, not a pending skill — remove it from the
      // learning path so it doesn't linger checked-off-but-visible.
      const remainingSkills = path.skills.filter((s) => s.name !== skill.name)
      await updatePath.mutateAsync({ id: path.id, fields: { skills: remainingSkills } })
      queryClient.invalidateQueries({ queryKey: ['todos'] })
      queryClient.invalidateQueries({ queryKey: ['contexts'] })
      setPhase('done')
    } catch (e) {
      setErrorMsg(e.message)
      setPhase('preview')
    }
  }

  return (
    <Modal title={`Turn "${skill.name}" into todos`} onClose={onClose}>
      {phase === 'choose' || phase === 'previewing' ? (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Attach to</label>
            <div className="space-y-2">
              {contexts.length > 0 && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={mode === 'existing'} onChange={() => setMode('existing')} />
                  Existing context:
                  <select
                    value={selectedContextId}
                    onChange={(e) => setSelectedContextId(e.target.value)}
                    disabled={mode !== 'existing'}
                    className="hud-input !px-2 !py-1"
                  >
                    {contexts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={mode === 'new'} onChange={() => setMode('new')} />
                New project:
                <input
                  value={newContextName}
                  onChange={(e) => setNewContextName(e.target.value)}
                  disabled={mode !== 'new'}
                  className="hud-input flex-1 !px-2 !py-1"
                />
              </label>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Target due date</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="hud-input w-full"
            />
          </div>
          {errorMsg && <p className="text-xs text-hud-crit">{errorMsg}</p>}
          <button
            onClick={handlePreview}
            disabled={phase === 'previewing'}
            className="w-full hud-btn-primary !px-4"
          >
            {phase === 'previewing' ? 'Generating breakdown…' : 'Preview'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {mode === 'new' && (
            <p className="text-sm">
              Will create project <span className="font-medium">“{contextPreview.name}”</span>
            </p>
          )}
          <div>
            <p className="text-sm font-medium">{scaffoldPreview.parent.title}</p>
            <p className="text-xs text-hud-muted">
              Due {formatDateTime(scaffoldPreview.parent.due_date)} · {scaffoldPreview.children.length} subtasks
            </p>
            <ol className="mt-2 space-y-1 text-xs">
              {scaffoldPreview.children.map((c, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>{i + 1}. {c.title}</span>
                  <span className="shrink-0 font-mono text-hud-muted">{formatDateTime(c.due_date)}</span>
                </li>
              ))}
            </ol>
          </div>
          {errorMsg && <p className="text-xs text-hud-crit">{errorMsg}</p>}
          {phase === 'done' ? (
            <p className="text-sm font-medium text-hud-good">✓ Created</p>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={phase === 'applying'}
                className="hud-btn-primary !px-4"
              >
                {phase === 'applying' ? 'Creating…' : 'Confirm'}
              </button>
              <button
                onClick={() => setPhase('choose')}
                disabled={phase === 'applying'}
                className="hud-btn !px-4"
              >
                Back
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
