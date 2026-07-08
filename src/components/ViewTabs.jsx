import clsx from 'clsx'

const VIEWS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'archive', label: 'Archive' },
  { key: 'analytics', label: 'Analytics' },
]

function SystemViewIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="2.5" />
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <ellipse cx="12" cy="12" rx="4" ry="10" transform="rotate(30 12 12)" />
    </svg>
  )
}

export default function ViewTabs({ view, onViewChange, onOpenSystemView }) {
  // overflow-x-auto + shrink-0: the mono uppercase labels are wider than
  // the old proportional ones, and at 375px flex otherwise shrinks the
  // last tab until its text clips. Scrolling inside the nav keeps every
  // tab reachable without the page itself scrolling sideways.
  return (
    <nav aria-label="Views" className="flex items-center gap-1 overflow-x-auto border-b border-hud-accent/20 px-4 pt-3 sm:px-6">
      {VIEWS.map((v) => (
        <button
          key={v.key}
          aria-current={view === v.key ? 'page' : undefined}
          onClick={() => onViewChange(v.key)}
          className={clsx(
            'shrink-0 rounded-t-md px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] transition-colors duration-150',
            view === v.key
              ? 'border-b-2 border-hud-accent text-hud-accent [text-shadow:0_0_12px_rgba(56,225,255,0.5)]'
              : 'text-hud-muted hover:text-hud-text'
          )}
        >
          {v.label}
        </button>
      ))}
      {/* Deliberately not one of the tabs above — System View is a
          full-viewport takeover, not a peer page, so it gets its own
          distinct entry point rather than "current page" tab semantics. */}
      <button
        onClick={onOpenSystemView}
        aria-label="Open System View"
        title="System View"
        className="ml-auto mb-2 shrink-0 rounded border border-hud-accent/30 p-1.5 text-hud-muted transition-all duration-150 hover:border-hud-accent hover:text-hud-accent hover:[box-shadow:0_0_14px_rgba(56,225,255,0.35)]"
      >
        <SystemViewIcon />
      </button>
    </nav>
  )
}
