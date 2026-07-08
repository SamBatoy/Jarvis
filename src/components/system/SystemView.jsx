import { useMemo } from 'react'
import { useAllTodosForAnalytics } from '../../hooks/useTodos'
import { useDeadlines } from '../../hooks/useDeadlines'
import { useContexts } from '../../hooks/useContexts'
import { systemCompletionRate, activeTodoCount, radarBlips, nextDeadlineLabel } from '../../lib/systemMetrics'
import { useWakeWordStatus } from '../../lib/wakeWord'
import ParticleSphere from './ParticleSphere'
import DeadlineRadar from './DeadlineRadar'
import StatsReadout from './StatsReadout'
import LoadingState from '../LoadingState'

// Wake word itself lives inside ChatInput (mounted once, for the whole
// app), which keeps listening across every view including this one —
// there's no separate instance to start here. This just surfaces that
// already-running status, since without it there's no visible confirmation
// on this page that "Hey Jarvis" is live short of opening the chat widget.
function wakeWordIndicator({ supported, enabled, listening, tabHidden, error }) {
  if (!supported || !enabled) return null
  if (error) return { text: 'HEY JARVIS: UNAVAILABLE', tone: 'text-hud-crit' }
  if (tabHidden) return { text: 'HEY JARVIS: PAUSED', tone: 'text-hud-muted' }
  if (listening) return { text: 'HEY JARVIS: LISTENING', tone: 'text-hud-accent' }
  return { text: 'HEY JARVIS: RECONNECTING…', tone: 'text-hud-muted' }
}

export default function SystemView({ onExit }) {
  const { data: allTodos, isLoading: todosLoading } = useAllTodosForAnalytics()
  const { data: upcomingDeadlines, isLoading: deadlinesLoading } = useDeadlines({ status: 'upcoming' })
  const { data: contexts, isLoading: contextsLoading } = useContexts()
  const wakeWordStatus = useWakeWordStatus()
  const indicator = wakeWordIndicator(wakeWordStatus)

  const contextsById = useMemo(() => new Map((contexts ?? []).map((c) => [c.id, c])), [contexts])
  const completionResult = useMemo(() => systemCompletionRate(allTodos ?? []), [allTodos])
  const activeCount = useMemo(() => activeTodoCount(allTodos ?? []), [allTodos])
  const blips = useMemo(
    () => radarBlips(upcomingDeadlines ?? [], contextsById),
    [upcomingDeadlines, contextsById]
  )
  const nextDeadline = useMemo(() => nextDeadlineLabel(upcomingDeadlines ?? []), [upcomingDeadlines])

  const loading = todosLoading || deadlinesLoading || contextsLoading

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between px-6 pt-5">
        <div>
          <h1 className="font-mono text-sm font-semibold tracking-[0.3em] text-hud-accent [text-shadow:0_0_14px_rgba(56,225,255,0.5)]">
            SYSTEM VIEW
          </h1>
          {indicator && (
            <p className={`mt-1 font-mono text-[10px] tracking-[0.18em] ${indicator.tone}`} aria-live="polite">
              {indicator.tone === 'text-hud-accent' ? '● ' : '○ '}
              {indicator.text}
            </p>
          )}
        </div>
        <button onClick={onExit} className="hud-btn">
          ← Exit
        </button>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <LoadingState label="Loading system data…" />
        </div>
      ) : (
        // Below sm: normal stacked flow (stats, sphere, radar), scrollable —
        // absolute-overlaying all three over a narrow, short viewport just
        // collides them (the centered sphere and the bottom-corner radar
        // panel overlap with no room to spare). At sm and up, the wrapper
        // becomes `contents` (removed from layout, but present in the DOM)
        // so each child's sm:absolute positions against this container
        // instead, giving the full HUD-overlay layout back.
        <div className="relative flex-1 overflow-y-auto sm:overflow-hidden">
          {/* pb-24: on mobile, clears the floating chat widget's fixed
              footprint so the scrolled-to-bottom radar panel isn't hidden
              under it — meaningless once sm:contents drops this box. */}
          <div className="flex flex-col gap-4 p-4 pb-24 sm:contents">
            <div className="order-1 sm:pointer-events-none sm:absolute sm:left-6 sm:top-6 sm:order-none sm:w-72 sm:max-w-[80vw]">
              <div className="sm:pointer-events-auto">
                <StatsReadout
                  activeCount={activeCount}
                  completionResult={completionResult}
                  nextDeadline={nextDeadline}
                />
              </div>
            </div>

            {/* Particle sphere — the ambient centerpiece. Sized off the
                viewport's smaller dimension at sm+ so it stays roughly
                square and never crowds the surrounding readout panels;
                fixed and modest on mobile, where it's one stacked block
                among others rather than a background centerpiece. */}
            <div className="order-2 flex h-64 items-center justify-center sm:absolute sm:inset-0 sm:order-none sm:h-auto">
              <div className="h-56 w-56 sm:h-[min(60vh,60vw)] sm:w-[min(60vh,60vw)]">
                <ParticleSphere completionRate={completionResult ? completionResult.rate / 100 : null} />
              </div>
            </div>

            {/* sm:bottom-24 not sm:bottom-6: clears the floating chat
                widget's collapsed footprint (fixed bottom-4, h-14), which
                otherwise sits directly under this panel's corner. */}
            <div className="order-3 flex flex-col items-center gap-3 sm:pointer-events-none sm:absolute sm:bottom-24 sm:right-6 sm:order-none sm:items-end">
              <div className="hud-panel flex w-full flex-col items-center gap-3 sm:pointer-events-auto sm:w-auto">
                <p className="hud-label self-start">Deadline Radar</p>
                <div className="h-40 w-40 sm:h-48 sm:w-48">
                  <DeadlineRadar blips={blips} />
                </div>
                {/* Real accessible data — the canvas above is aria-hidden
                    and purely visual; this list is what a screen reader
                    (or a sighted user who'd rather read than decode blips)
                    uses. */}
                <ul className="w-full space-y-1 text-xs text-hud-muted">
                  {blips.length === 0 && <li>No upcoming deadlines.</li>}
                  {blips.slice(0, 4).map((blip) => (
                    <li key={blip.id} className="truncate">
                      <span style={{ color: blip.color }}>●</span> {blip.title}
                      {blip.contextName ? ` — ${blip.contextName}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
