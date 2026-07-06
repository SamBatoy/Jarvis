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
      <div className="flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-800">
        {DOMAIN_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            aria-pressed={domain === opt.key && !contextId}
            onClick={() => {
              onDomainChange(opt.key)
              onContextChange(null)
            }}
            className={clsx(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              domain === opt.key && !contextId
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
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
                'rounded-full ring-offset-2 dark:ring-offset-neutral-950',
                contextId === c.id && 'ring-2'
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
