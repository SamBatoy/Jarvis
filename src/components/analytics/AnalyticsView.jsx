import { useMemo } from 'react'
import { useAllTodosForAnalytics } from '../../hooks/useTodos'
import { useContexts } from '../../hooks/useContexts'
import ContextBadge from '../dashboard/ContextBadge'
import LoadingState from '../LoadingState'
import { bestProductivityTime, completionRate, mostDelayedSubjects, weeklyTrends } from '../../lib/analytics'

function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="mb-3 text-sm font-semibold text-neutral-500 dark:text-neutral-400">{title}</h2>
      {children}
    </section>
  )
}

function EmptyState({ message }) {
  return <p className="text-sm text-neutral-500">{message}</p>
}

function ProductivityTimeSection({ todos }) {
  const result = useMemo(() => bestProductivityTime(todos), [todos])
  if (!result) return <Section title="Best Productivity Time"><EmptyState message="Not enough completed tasks yet." /></Section>

  const max = Math.max(...result.buckets.map((b) => b.count), 1)
  return (
    <Section title="Best Productivity Time">
      <p className="mb-3 text-sm font-medium">You complete the most tasks in the {result.topLabel}.</p>
      <div className="space-y-1.5">
        {result.buckets.map((b) => (
          <div key={b.key} className="flex items-center gap-2 text-xs">
            <span className="w-36 shrink-0 text-neutral-500">{b.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(b.count / max) * 100}%` }} />
            </div>
            <span className="w-6 shrink-0 text-right text-neutral-500">{b.count}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

function CompletionRateSection({ todos }) {
  const result = useMemo(() => completionRate(todos), [todos])
  if (!result) return <Section title="Completion Rate"><EmptyState message="No archived tasks yet." /></Section>

  return (
    <Section title="Completion Rate">
      <p className="text-3xl font-bold">{result.rate}%</p>
      <p className="mt-1 text-xs text-neutral-500">
        {result.completed} completed · {result.missed} missed (of {result.total} archived)
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-red-100 dark:bg-red-950">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${result.rate}%` }} />
      </div>
    </Section>
  )
}

function MostDelayedSubjectsSection({ todos, contextsById }) {
  const ranked = useMemo(() => mostDelayedSubjects(todos, contextsById), [todos, contextsById])
  if (!ranked) return <Section title="Most-Delayed Subjects"><EmptyState message="No missed tasks yet — nothing to report." /></Section>

  const max = Math.max(...ranked.map((r) => r.count), 1)
  return (
    <Section title="Most-Delayed Subjects">
      <ul className="space-y-1.5">
        {ranked.map((r) => (
          <li key={r.contextId} className="flex items-center gap-2 text-xs">
            <span className="w-32 shrink-0 truncate">
              {r.color ? <ContextBadge context={{ name: r.name, color: r.color }} /> : r.name}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div className="h-full rounded-full bg-red-500" style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
            <span className="w-6 shrink-0 text-right text-neutral-500">{r.count}</span>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function WeeklyTrendsSection({ todos }) {
  const weeks = useMemo(() => weeklyTrends(todos), [todos])
  const hasData = weeks.some((w) => w.total > 0)
  if (!hasData) return <Section title="Weekly Trends"><EmptyState message="No archived tasks in the last 8 weeks yet." /></Section>

  const max = Math.max(...weeks.map((w) => w.total), 1)
  return (
    <Section title="Weekly Trends">
      <div className="flex items-end gap-2" style={{ height: 120 }}>
        {weeks.map((w) => (
          <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 flex-col justify-end overflow-hidden rounded-t bg-neutral-100 dark:bg-neutral-800" style={{ height: 96 }}>
              {w.total > 0 && (
                <>
                  {/* Diagonal hatch on top of the solid red fill — a
                      non-color indicator alongside the red/green contrast,
                      since color alone doesn't distinguish these two
                      segments for colorblind users. */}
                  <div
                    className="w-full bg-red-400"
                    style={{
                      height: `${(w.late / max) * 96}px`,
                      backgroundImage:
                        'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.4) 3px, rgba(255,255,255,0.4) 6px)',
                    }}
                  />
                  <div className="w-full bg-emerald-500" style={{ height: `${(w.onTime / max) * 96}px` }} />
                </>
              )}
            </div>
            <span className="text-[10px] text-neutral-500">{w.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500">
        <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" aria-hidden="true" /> on-time
        <span
          className="ml-2 inline-block h-2.5 w-2.5 rounded-sm bg-red-400"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)',
          }}
          aria-hidden="true"
        />{' '}
        late/missed
      </p>
    </Section>
  )
}

export default function AnalyticsView() {
  const { data: todosRaw, isLoading, error } = useAllTodosForAnalytics()
  const { data: contexts } = useContexts()
  const contextsById = useMemo(() => new Map((contexts ?? []).map((c) => [c.id, c])), [contexts])
  const todos = todosRaw ?? []

  if (isLoading) return <div className="p-6"><LoadingState label="Loading analytics…" /></div>
  if (error) return <p className="p-6 text-sm text-red-600">Couldn’t load analytics: {error.message}</p>

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ProductivityTimeSection todos={todos} />
        <CompletionRateSection todos={todos} />
        <MostDelayedSubjectsSection todos={todos} contextsById={contextsById} />
        <WeeklyTrendsSection todos={todos} />
      </div>
    </div>
  )
}
