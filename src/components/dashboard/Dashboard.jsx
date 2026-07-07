import { useMemo, useState } from 'react'
import FilterBar from './FilterBar'
import DailyBriefCards from './DailyBriefCards'
import TodayStrip from './TodayStrip'
import TodoList from './TodoList'
import DeadlinesList from './DeadlinesList'
import GoalsPanel from './GoalsPanel'
import LearningPathsPanel from './LearningPathsPanel'
import ContextBadge from './ContextBadge'
import TodoForm from './forms/TodoForm'
import EventForm from './forms/EventForm'
import DeadlineForm from './forms/DeadlineForm'
import GoalForm from './forms/GoalForm'
import ContextForm from './forms/ContextForm'
import FocusMode from '../focus/FocusMode'
import ProposalCard from '../chat/ProposalCard'
import { useContexts } from '../../hooks/useContexts'
import { useEvents } from '../../hooks/useEvents'
import { useGoals } from '../../hooks/useGoals'
import { useUrlState } from '../../hooks/useUrlState'

export default function Dashboard() {
  const { data: contexts, isLoading: contextsLoading, error: contextsError } = useContexts()
  const { data: events } = useEvents()
  const { data: goals } = useGoals()

  const [domain, setDomain] = useUrlState('domain', 'all')
  const [contextId, setContextId] = useUrlState('context', null)
  const [modal, setModal] = useState(null) // { type: 'todo'|'event'|'deadline'|'goal'|'context', item? }
  const [focusModeOpen, setFocusModeOpen] = useState(false)
  const [rebalance, setRebalance] = useState(null) // null | 'loading' | { proposal } | { message }

  const contextsById = useMemo(() => new Map((contexts ?? []).map((c) => [c.id, c])), [contexts])

  function closeModal() {
    setModal(null)
  }

  async function handleBalanceWeek() {
    setRebalance('loading')
    try {
      const res = await fetch('/api/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName: 'propose_weekly_rebalance', args: {} }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        // A "no changes needed" week is good news, not a failure — show it
        // the same friendly way either way.
        setRebalance({ message: body.error || 'Request failed' })
        return
      }
      setRebalance({ proposal: { toolName: 'propose_weekly_rebalance', preview: body.preview } })
    } catch (e) {
      setRebalance({ message: e.message })
    }
  }

  if (contextsLoading) return <p className="p-6 text-sm text-neutral-500">Loading dashboard…</p>
  if (contextsError) return <p className="p-6 text-sm text-red-600">Couldn’t load contexts: {contextsError.message}</p>

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Jarvis</h1>
        <div className="flex flex-wrap gap-2">
          <QuickAddButton label="+ Todo" onClick={() => setModal({ type: 'todo' })} />
          <QuickAddButton label="+ Event" onClick={() => setModal({ type: 'event' })} />
          <QuickAddButton label="+ Deadline" onClick={() => setModal({ type: 'deadline' })} />
          <QuickAddButton label="+ Goal" onClick={() => setModal({ type: 'goal' })} />
          <QuickAddButton label="+ Subject/Project" onClick={() => setModal({ type: 'context' })} />
          <button
            onClick={() => setFocusModeOpen(true)}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            Focus Mode
          </button>
          <button
            onClick={handleBalanceWeek}
            disabled={rebalance === 'loading'}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {rebalance === 'loading' ? 'Checking week…' : 'Balance my week'}
          </button>
        </div>
      </header>

      {rebalance && rebalance !== 'loading' && (
        <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          {rebalance.message && <p className="text-sm text-neutral-600 dark:text-neutral-400">{rebalance.message}</p>}
          {rebalance.proposal && <ProposalCard proposal={rebalance.proposal} source="dashboard" />}
        </div>
      )}

      <FilterBar
        contexts={contexts ?? []}
        domain={domain}
        onDomainChange={setDomain}
        contextId={contextId}
        onContextChange={setContextId}
      />

      <DailyBriefCards />

      <TodayStrip contexts={contexts ?? []} events={events ?? []} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <TodoList
            contextsById={contextsById}
            domain={domain}
            contextId={contextId}
            onEditTodo={(todo) => setModal({ type: 'todo', item: todo })}
          />
          <DeadlinesList contextsById={contextsById} domain={domain} contextId={contextId} />
        </div>
        <div className="space-y-6">
          <GoalsPanel />
          <LearningPathsPanel />
          <section aria-labelledby="contexts-heading">
            <h2 id="contexts-heading" className="mb-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
              Subjects & Projects
            </h2>
            <ul className="flex flex-wrap gap-1.5">
              {(contexts ?? []).map((c) => (
                <li key={c.id}>
                  <button onClick={() => setModal({ type: 'context', item: c })}>
                    <ContextBadge context={c} size="md" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {modal?.type === 'todo' && (
        <TodoForm todo={modal.item} contexts={contexts ?? []} goals={goals ?? []} onClose={closeModal} />
      )}
      {modal?.type === 'event' && <EventForm event={modal.item} contexts={contexts ?? []} onClose={closeModal} />}
      {modal?.type === 'deadline' && (
        <DeadlineForm deadline={modal.item} contexts={contexts ?? []} goals={goals ?? []} onClose={closeModal} />
      )}
      {modal?.type === 'goal' && <GoalForm goal={modal.item} onClose={closeModal} />}
      {modal?.type === 'context' && (
        <ContextForm context={modal.item} allContexts={contexts ?? []} onClose={closeModal} />
      )}
      {focusModeOpen && <FocusMode onClose={() => setFocusModeOpen(false)} />}
    </div>
  )
}

function QuickAddButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
    >
      {label}
    </button>
  )
}
