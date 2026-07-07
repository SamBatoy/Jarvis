import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLearningPaths, useUpdateLearningPath } from '../../hooks/useLearningPaths'
import { useContexts } from '../../hooks/useContexts'
import ProposalCard from '../chat/ProposalCard'
import ConfirmDeleteButton from './forms/ConfirmDeleteButton'
import TurnSkillIntoTodosModal from './TurnSkillIntoTodosModal'
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
          className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        />
        <button
          type="submit"
          disabled={loading || !topic.trim()}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {loading ? 'Generating…' : 'Generate'}
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
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
    <section aria-labelledby="learning-paths-heading">
      <h2 id="learning-paths-heading" className="mb-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
        Learning Paths
      </h2>

      <GeneratePathForm />

      {isLoading && <p className="text-sm text-neutral-500">Loading learning paths…</p>}
      {error && <p className="text-sm text-red-600">Couldn’t load learning paths: {error.message}</p>}
      {!isLoading && !error && (!paths || paths.length === 0) && (
        <p className="text-sm text-neutral-500">None yet — generate one above, or ask Jarvis in chat.</p>
      )}
      {!isLoading && paths?.length > 0 && (
        <ul className="max-h-[360px] space-y-3 overflow-y-auto">
          {paths.map((path) => {
            const stuck =
              path.status === 'active' &&
              !dismissedStuckIds.has(path.id) &&
              isStuck({ lastActivityAt: path.updated_at ?? path.created_at, isComplete: path.skills.every((s) => s.done) })
            return (
            <li key={path.id} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{path.topic}</h3>
                <ConfirmDeleteButton
                  label="Delete path"
                  onConfirm={() => proposeAndCommitDelete('learning_path', path.id, queryClient)}
                />
              </div>
              {stuck && (
                <div className="mt-1.5 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
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
                <div className="mt-1.5 flex items-center gap-2 text-xs text-neutral-500">
                  <span>Paused</span>
                  <button
                    onClick={() => updatePath.mutate({ id: path.id, fields: { status: 'active' } })}
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
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
                          className="mt-0.5 h-4 w-4 shrink-0 accent-neutral-900 dark:accent-neutral-100"
                        />
                        <span className={skill.done ? 'text-neutral-400 line-through' : ''}>
                          <span className="font-medium">{skill.name}</span>
                          {skill.description && <span className="text-neutral-500"> — {skill.description}</span>}
                        </span>
                      </label>
                      <button
                        onClick={() => setTurnIntoTodosTarget({ skill, path })}
                        className="shrink-0 text-xs text-blue-600 hover:underline dark:text-blue-400"
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
                              className="text-xs text-blue-600 underline hover:no-underline dark:text-blue-400"
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
