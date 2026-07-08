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
import GoogleConnectionCard from './GoogleConnectionCard'
import SuggestionsBatchCard from './SuggestionsBatchCard'
import LoadingState from '../LoadingState'
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

  if (contextsLoading) return <div className="p-6"><LoadingState label="Loading dashboard…" /></div>
  if (contextsError) return <p className="p-6 text-sm text-hud-crit">Couldn’t load contexts: {contextsError.message}</p>

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-mono text-2xl font-bold tracking-[0.28em] [text-shadow:0_0_18px_rgba(56,225,255,0.55)]">
          JAR<span className="text-hud-accent">VIS</span>
        </h1>
        <div className="flex flex-wrap gap-2">
          <QuickAddButton label="+ TODO" onClick={() => setModal({ type: 'todo' })} />
          <QuickAddButton label="+ EVENT" onClick={() => setModal({ type: 'event' })} />
          <QuickAddButton label="+ DEADLINE" onClick={() => setModal({ type: 'deadline' })} />
          <QuickAddButton label="+ GOAL" onClick={() => setModal({ type: 'goal' })} />
          <QuickAddButton label="+ SUBJECT/PROJECT" onClick={() => setModal({ type: 'context' })} />
          <button onClick={() => setFocusModeOpen(true)} className="hud-btn-primary hud-pulse">
            FOCUS MODE
          </button>
          <button onClick={handleBalanceWeek} disabled={rebalance === 'loading'} className="hud-btn">
            {rebalance === 'loading' ? 'CHECKING WEEK…' : 'BALANCE MY WEEK'}
          </button>
        </div>
      </header>

      {rebalance && rebalance !== 'loading' && (
        <div className="hud-panel !p-3">
          {rebalance.message && <p className="text-sm text-hud-muted">{rebalance.message}</p>}
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

      <GoogleConnectionCard />
      <SuggestionsBatchCard />

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
          <section aria-labelledby="contexts-heading" className="hud-panel">
            <h2 id="contexts-heading" className="hud-label mb-2.5">
              Subjects & Projects
            </h2>
            {(contexts ?? []).length === 0 && (
              <p className="text-sm text-hud-muted">
                No subjects or projects yet — use + Subject/Project above to add one.
              </p>
            )}
            <ul className="flex flex-wrap gap-1.5">
              {(contexts ?? []).map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setModal({ type: 'context', item: c })}
                    className="rounded-full opacity-90 transition-opacity duration-150 hover:opacity-100"
                  >
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
    <button onClick={onClick} className="hud-btn">
      {label}
    </button>
  )
}
