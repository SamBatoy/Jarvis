import clsx from 'clsx'

const VIEWS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'archive', label: 'Archive' },
  { key: 'analytics', label: 'Analytics' },
]

export default function ViewTabs({ view, onViewChange }) {
  // overflow-x-auto + shrink-0: the mono uppercase labels are wider than
  // the old proportional ones, and at 375px flex otherwise shrinks the
  // last tab until its text clips. Scrolling inside the nav keeps every
  // tab reachable without the page itself scrolling sideways.
  return (
    <nav aria-label="Views" className="flex gap-1 overflow-x-auto border-b border-hud-accent/20 px-4 pt-3 sm:px-6">
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
    </nav>
  )
}
