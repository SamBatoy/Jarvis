import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLearningPaths, useUpdateLearningPath } from '../../hooks/useLearningPaths'
import { useContexts } from '../../hooks/useContexts'
import ProposalCard from '../chat/ProposalCard'
import ConfirmDeleteButton from './forms/ConfirmDeleteButton'
import TurnSkillIntoTodosModal from './TurnSkillIntoTodosModal'
import LoadingState from '../LoadingState'
import { isStuck } from '../../lib/stuckDetection'

function GeneratePathForm() {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [proposal, setProposal] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!topic.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName: 'propose_learning_path', args: { topic: topic.trim() } }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed')
      const { preview } = await res.json()
      setProposal({ toolName: 'propose_learning_path', preview })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="I want to learn…"
          aria-label="Topic to learn"
          autoComplete="off"
          className="hud-input flex-1"
        />
        <button
          type="submit"
          disabled={loading || !topic.trim()}
          className="hud-btn-primary"
        >
          {loading ? 'Generating…' : 'Generate'}
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-hud-crit">{error}</p>}
      {proposal && <ProposalCard proposal={proposal} />}
    </div>
  )
}

async function proposeAndCommitDelete(entityType, id, queryClient) {
  const proposeRes = await fetch('/api/propose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toolName: 'propose_delete', args: { entityType, id } }),
  })
  if (!proposeRes.ok) throw new Error((await proposeRes.json().catch(() => ({}))).error || 'Request failed')
  const { preview } = await proposeRes.json()

  const commitRes = await fetch('/api/commit-proposal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toolName: 'propose_delete', payload: preview, source: 'dashboard' }),
  })
  if (!commitRes.ok) throw new Error((await commitRes.json().catch(() => ({}))).error || 'Request failed')
  queryClient.invalidateQueries({ queryKey: ['learning_paths'] })
}

export default function LearningPathsPanel() {
  const { data: paths, isLoading, error } = useLearningPaths()
  const { data: contexts } = useContexts()
  const updatePath = useUpdateLearningPath()
  const queryClient = useQueryClient()
  const [turnIntoTodosTarget, setTurnIntoTodosTarget] = useState(null) // { skill, path }
  const [dismissedStuckIds, setDismissedStuckIds] = useState(() => new Set())

  function toggleSkill(path, skillIndex) {
    const skills = path.skills.map((s, i) => (i === skillIndex ? { ...s, done: !s.done } : s))
    updatePath.mutate({ id: path.id, fields: { skills } })
  }

  function deleteSkill(path, skillIndex) {
    const skills = path.skills.filter((_, i) => i !== skillIndex)
    updatePath.mutate({ id: path.id, fields: { skills } })
  }

  return (
    <section aria-labelledby="learning-paths-heading" className="hud-panel">
      <h2 id="learning-paths-heading" className="hud-label mb-2.5">
        Learning Paths
      </h2>

      <GeneratePathForm />

      {isLoading && <LoadingState label="Loading learning paths…" />}
      {error && <p className="text-sm text-hud-crit">Couldn’t load learning paths: {error.message}</p>}
      {!isLoading && !error && (!paths || paths.length === 0) && (
        <p className="text-sm text-hud-muted">None yet — generate one above, or ask Jarvis in chat.</p>
      )}
      {!isLoading && paths?.length > 0 && (
        <ul className="max-h-[360px] space-y-3 overflow-y-auto">
          {paths.map((path) => {
            const stuck =
              path.status === 'active' &&
              !dismissedStuckIds.has(path.id) &&
              isStuck({ lastActivityAt: path.updated_at ?? path.created_at, isComplete: path.skills.every((s) => s.done) })
            return (
            <li key={path.id} className="rounded border border-hud-accent/15 p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{path.topic}</h3>
                <ConfirmDeleteButton
                  label="Delete path"
                  onConfirm={() => proposeAndCommitDelete('learning_path', path.id, queryClient)}
                />
              </div>
              {stuck && (
                <div className="mt-1.5 flex items-center gap-2 text-xs text-hud-warn">
                  <span>⚠ No progress in a while —</span>
                  <button
                    onClick={() => setDismissedStuckIds((prev) => new Set(prev).add(path.id))}
                    className="font-medium hover:underline"
                  >
                    Continue
                  </button>
                  <span>·</span>
                  <button
                    onClick={() => updatePath.mutate({ id: path.id, fields: { status: 'paused' } })}
                    className="font-medium hover:underline"
                  >
                    Pause
                  </button>
                  <span>·</span>
                  <button
                    onClick={() => proposeAndCommitDelete('learning_path', path.id, queryClient)}
                    className="font-medium hover:underline"
                  >
                    Delete
                  </button>
                </div>
              )}
              {path.status === 'paused' && (
                <div className="mt-1.5 flex items-center gap-2 text-xs text-hud-muted">
                  <span>Paused</span>
                  <button
                    onClick={() => updatePath.mutate({ id: path.id, fields: { status: 'active' } })}
                    className="font-medium text-hud-accent hover:underline"
                  >
                    Resume
                  </button>
                </div>
              )}
              <ul className="mt-2 space-y-1.5">
                {path.skills.map((skill, i) => (
                  <li key={skill.name} className="text-sm">
                    <div className="flex items-start gap-2">
                      <label className="flex flex-1 items-start gap-2">
                        <input
                          type="checkbox"
                          checked={!!skill.done}
                          onChange={() => toggleSkill(path, i)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-hud-accent"
                        />
                        <span className={skill.done ? 'text-hud-muted line-through' : ''}>
                          <span className="font-medium">{skill.name}</span>
                          {skill.description && <span className="text-hud-muted"> — {skill.description}</span>}
                        </span>
                      </label>
                      <button
                        onClick={() => setTurnIntoTodosTarget({ skill, path })}
                        className="shrink-0 text-xs text-hud-accent hover:underline"
                      >
                        Turn into todos
                      </button>
                      <ConfirmDeleteButton label="Delete" onConfirm={() => deleteSkill(path, i)} />
                    </div>
                    {skill.resources?.length > 0 && (
                      <ul className="ml-6 mt-0.5 space-y-0.5">
                        {skill.resources.map((r) => (
                          <li key={r.url}>
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-hud-accent underline hover:no-underline"
                            >
                              {r.title} ({r.type})
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </li>
            )
          })}
        </ul>
      )}

      {turnIntoTodosTarget && (
        <TurnSkillIntoTodosModal
          skill={turnIntoTodosTarget.skill}
          path={turnIntoTodosTarget.path}
          contexts={contexts ?? []}
          onClose={() => setTurnIntoTodosTarget(null)}
        />
      )}
    </section>
  )
}
