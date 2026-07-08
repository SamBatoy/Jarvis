import clsx from 'clsx'
import ContextBadge from './ContextBadge'

const DOMAIN_OPTIONS = [
  { key: 'all', label: 'Everything' },
  { key: 'subject', label: 'Just School' },
  { key: 'project', label: 'Just Projects' },
]

export default function FilterBar({ contexts, domain, onDomainChange, contextId, onContextChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-lg border border-hud-accent/20 p-0.5">
        {DOMAIN_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            aria-pressed={domain === opt.key && !contextId}
            onClick={() => {
              onDomainChange(opt.key)
              onContextChange(null)
            }}
            className={clsx(
              'cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150',
              domain === opt.key && !contextId
                ? 'bg-hud-accent text-hud-bg [box-shadow:0_0_12px_rgba(56,225,255,0.4)]'
                : 'text-hud-muted hover:bg-hud-accent/10 hover:text-hud-text'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {contexts
          .filter((c) => domain === 'all' || c.type === domain)
          .map((c) => (
            <button
              key={c.id}
              aria-pressed={contextId === c.id}
              onClick={() => onContextChange(contextId === c.id ? null : c.id)}
              className={clsx(
                'cursor-pointer rounded-full opacity-90 ring-offset-2 ring-offset-hud-bg transition-opacity duration-150 hover:opacity-100',
                contextId === c.id && 'ring-2 opacity-100'
              )}
              style={contextId === c.id ? { '--tw-ring-color': c.color } : undefined}
            >
              <ContextBadge context={c} />
            </button>
          ))}
      </div>
    </div>
  )
}
