import { useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  addMonths,
  addWeeks,
  addDays,
  isWithinInterval,
} from 'date-fns'
import clsx from 'clsx'
import MonthGrid from './MonthGrid'
import AgendaList from './AgendaList'
import LoadingState from '../LoadingState'
import { useTodos } from '../../hooks/useTodos'
import { useDeadlines } from '../../hooks/useDeadlines'
import { useEvents } from '../../hooks/useEvents'
import { useContexts } from '../../hooks/useContexts'
import { useUrlState } from '../../hooks/useUrlState'
import { classesInRange } from '../../lib/dateUtils'

const MODES = [
  { key: 'month', label: 'Month' },
  { key: 'week', label: 'Week' },
  { key: 'day', label: 'Day' },
]

function computeRange(mode, cursorDate) {
  if (mode === 'month') return { start: startOfWeek(startOfMonth(cursorDate)), end: endOfWeek(endOfMonth(cursorDate)) }
  if (mode === 'week') return { start: startOfWeek(cursorDate), end: endOfWeek(cursorDate) }
  return { start: startOfDay(cursorDate), end: endOfDay(cursorDate) }
}

function combineDateAndTime(date, hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export default function CalendarView() {
  const [mode, setMode] = useUrlState('calMode', 'month')
  const [dateParam, setDateParam] = useUrlState('calDate', format(new Date(), 'yyyy-MM-dd'))
  const cursorDate = useMemo(() => new Date(`${dateParam}T00:00:00`), [dateParam])

  const { data: todos, isLoading: todosLoading } = useTodos()
  const { data: deadlines, isLoading: deadlinesLoading } = useDeadlines()
  const { data: events, isLoading: eventsLoading } = useEvents()
  const { data: contexts, isLoading: contextsLoading } = useContexts()
  const isLoading = todosLoading || deadlinesLoading || eventsLoading || contextsLoading

  const contextsById = useMemo(() => new Map((contexts ?? []).map((c) => [c.id, c])), [contexts])
  const range = useMemo(() => computeRange(mode, cursorDate), [mode, cursorDate])

  const items = useMemo(() => {
    const list = []
    for (const t of todos ?? []) {
      if (!t.due_date) continue
      list.push({ id: `t-${t.id}`, type: 'todo', date: t.due_date, title: t.title, context: contextsById.get(t.context_id) })
    }
    for (const d of deadlines ?? []) {
      list.push({ id: `d-${d.id}`, type: 'deadline', date: d.due_at, title: d.title, context: contextsById.get(d.context_id) })
    }
    for (const e of events ?? []) {
      list.push({ id: `e-${e.id}`, type: 'event', date: e.start_at, title: e.title, context: contextsById.get(e.context_id) })
    }
    for (const c of classesInRange(contexts ?? [], range.start, range.end)) {
      list.push({
        id: `c-${c.context.id}-${c.date.toISOString()}`,
        type: 'class',
        date: combineDateAndTime(c.date, c.start_time),
        title: `${c.context.name} class`,
        context: c.context,
      })
    }
    return list.filter((item) => isWithinInterval(new Date(item.date), range))
  }, [todos, deadlines, events, contexts, contextsById, range])

  const itemsByDay = useMemo(() => {
    const map = new Map()
    for (const item of items) {
      const key = format(new Date(item.date), 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    }
    return map
  }, [items])

  function navigate(delta) {
    if (mode === 'month') setDateParam(format(addMonths(cursorDate, delta), 'yyyy-MM-dd'))
    else if (mode === 'week') setDateParam(format(addWeeks(cursorDate, delta), 'yyyy-MM-dd'))
    else setDateParam(format(addDays(cursorDate, delta), 'yyyy-MM-dd'))
  }

  function selectDay(day) {
    setDateParam(format(day, 'yyyy-MM-dd'))
    setMode('day')
  }

  const title =
    mode === 'month'
      ? format(cursorDate, 'MMMM yyyy')
      : mode === 'week'
        ? `Week of ${format(range.start, 'MMM d')}`
        : format(cursorDate, 'EEEE, MMMM d')

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-800">
            {MODES.map((m) => (
              <button
                key={m.key}
                aria-pressed={mode === m.key}
                onClick={() => setMode(m.key)}
                className={clsx(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150',
                  mode === m.key
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => navigate(-1)}
            aria-label="Previous"
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm transition-colors duration-150 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            ‹
          </button>
          <button
            onClick={() => setDateParam(format(new Date(), 'yyyy-MM-dd'))}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium transition-colors duration-150 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Today
          </button>
          <button
            onClick={() => navigate(1)}
            aria-label="Next"
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm transition-colors duration-150 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            ›
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading calendar…" />
      ) : mode === 'month' ? (
        <MonthGrid cursorDate={cursorDate} itemsByDay={itemsByDay} onSelectDay={selectDay} />
      ) : (
        <AgendaList items={items} />
      )}
    </div>
  )
}
