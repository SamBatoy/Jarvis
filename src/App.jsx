import { useEffect, useState } from 'react'
import Dashboard from './components/dashboard/Dashboard'
import CalendarView from './components/calendar/CalendarView'
import ArchiveView from './components/archive/ArchiveView'
import AnalyticsView from './components/analytics/AnalyticsView'
import ChatPanel from './components/chat/ChatPanel'
import ViewTabs from './components/ViewTabs'
import { useUrlState } from './hooks/useUrlState'

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
    <div className="flex h-screen flex-col overflow-hidden lg:flex-row">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:border focus:border-hud-accent focus:bg-hud-panel focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-hud-accent"
      >
        Skip to main content
      </a>

      {/* Fixed-height shell: main and the chat aside each scroll internally
          via their own overflow, instead of the browser scrolling the whole
          page (which used to drag the chat pane along with the dashboard). */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <ViewTabs view={view} onViewChange={setView} />
        {/* pb-20 below lg only: the floating Chat button (fixed bottom-4,
            lg:hidden) has no reserved space in the document, so without
            this the last row of whatever's scrolled to the bottom can sit
            underneath it. */}
        <div id="main-content" className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {view === 'dashboard' && <Dashboard />}
          {view === 'calendar' && <CalendarView />}
          {view === 'archive' && <ArchiveView />}
          {view === 'analytics' && <AnalyticsView />}
        </div>
      </main>

      {/* Desktop: docked side panel. Breakpoint is lg (1024), not md (768) —
          at 768 the fixed w-96 panel left too little room for main content,
          crowding cards like Morning/Night Review into awkward text wraps. */}
      <aside className="hidden w-96 shrink-0 flex-col overflow-hidden border-l border-hud-accent/20 lg:flex">
        <ChatPanel />
      </aside>

      {/* Mobile/tablet: collapsible drawer, up through lg */}
      <button
        onClick={() => setChatOpen(true)}
        className="hud-btn-primary fixed bottom-4 right-4 z-40 rounded-full px-4 py-3 shadow-lg lg:hidden"
      >
        CHAT
      </button>
      {chatOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Jarvis Chat"
          className="fixed inset-0 z-50 flex flex-col overscroll-contain bg-hud-bg lg:hidden"
        >
          <div className="flex items-center justify-between border-b border-hud-accent/20 p-3">
            <span className="hud-label">Jarvis Chat</span>
            <button
              onClick={() => setChatOpen(false)}
              aria-label="Close chat"
              className="rounded-md p-1 text-hud-muted transition-colors duration-150 hover:bg-hud-accent/10 hover:text-hud-text"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ChatPanel />
          </div>
        </div>
      )}
    </div>
  )
}
