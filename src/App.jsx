import { lazy, Suspense, useEffect, useState } from 'react'
import clsx from 'clsx'
import Dashboard from './components/dashboard/Dashboard'
import CalendarView from './components/calendar/CalendarView'
import ArchiveView from './components/archive/ArchiveView'
import AnalyticsView from './components/analytics/AnalyticsView'
import ChatPanel from './components/chat/ChatPanel'
import ViewTabs from './components/ViewTabs'
import LoadingState from './components/LoadingState'
import { useUrlState } from './hooks/useUrlState'

// Code-split: three.js is a real amount of weight, and only visitors who
// actually open System View should pay for downloading it.
const SystemView = lazy(() => import('./components/system/SystemView'))

export default function App() {
  const [chatOpen, setChatOpen] = useState(false)
  const [view, setView] = useUrlState('view', 'dashboard')

  useEffect(() => {
    if (!chatOpen) return
    function onKeyDown(e) {
      if (e.key === 'Escape') setChatOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [chatOpen])

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:border focus:border-hud-accent focus:bg-hud-panel focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-hud-accent"
      >
        Skip to main content
      </a>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* System View is a full-viewport takeover — no ViewTabs, no shared
            nav chrome, its own small exit control instead — rather than one
            more peer tab, matching how it was scoped as an immersive,
            ambient centerpiece rather than another dashboard page. */}
        {view === 'system' ? (
          <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-center">
                <LoadingState label="Loading System View…" />
              </div>
            }
          >
            <SystemView onExit={() => setView('dashboard')} />
          </Suspense>
        ) : (
          <>
            <ViewTabs view={view} onViewChange={setView} onOpenSystemView={() => setView('system')} />
            {/* pb-24: the floating chat widget (fixed bottom-4) has no
                reserved space in the document at any breakpoint now, so
                without this the last row of whatever's scrolled to the
                bottom sits underneath it. */}
            <div id="main-content" className="flex-1 overflow-y-auto pb-24">
              {view === 'dashboard' && <Dashboard />}
              {view === 'calendar' && <CalendarView />}
              {view === 'archive' && <ArchiveView />}
              {view === 'analytics' && <AnalyticsView />}
            </div>
          </>
        )}
      </main>

      {/* Floating chat widget, one pattern at every breakpoint (replaces the
          old docked-desktop-aside + separate-mobile-drawer split). Anchored
          bottom-right in both states so width/height can actually transition
          instead of jumping between unrelated box models.
          ChatPanel is ALWAYS mounted — collapsed state hides it with the
          `hidden` class, not a conditional {chatOpen && ...} render, because
          useChat()'s message history is local component state; unmounting on
          every collapse would silently reset the conversation each time. */}
      <div
        className={clsx(
          'fixed bottom-4 right-4 z-50 flex flex-col overflow-hidden transition-all duration-300',
          chatOpen
            ? 'hud-panel !bg-hud-panel h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] sm:h-[600px] sm:w-96'
            : 'h-14 w-32 rounded-full border border-hud-accent bg-hud-accent/20 shadow-lg'
        )}
      >
        <button
          onClick={() => setChatOpen(true)}
          aria-label="Open chat"
          className={clsx(
            'h-full w-full items-center justify-center font-mono text-xs tracking-wide text-hud-accent transition-colors duration-150 hover:bg-hud-accent/10',
            chatOpen ? 'hidden' : 'flex'
          )}
        >
          CHAT
        </button>

        <div className={clsx('flex h-full flex-col', !chatOpen && 'hidden')}>
          <div className="flex items-center justify-between border-b border-hud-accent/20 p-3">
            <span className="hud-label">Jarvis Chat</span>
            <button
              onClick={() => setChatOpen(false)}
              aria-label="Collapse chat"
              className="rounded-md p-1 text-hud-muted transition-colors duration-150 hover:bg-hud-accent/10 hover:text-hud-text"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ChatPanel onExpandRequest={() => setChatOpen(true)} />
          </div>
        </div>
      </div>
    </div>
  )
}
