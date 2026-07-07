import clsx from 'clsx'

const VIEWS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'archive', label: 'Archive' },
]

export default function ViewTabs({ view, onViewChange }) {
  return (
    <nav aria-label="Views" className="flex gap-1 border-b border-neutral-200 px-6 pt-3 dark:border-neutral-800">
      {VIEWS.map((v) => (
        <button
          key={v.key}
          aria-current={view === v.key ? 'page' : undefined}
          onClick={() => onViewChange(v.key)}
          className={clsx(
            'rounded-t-md px-3 py-2 text-sm font-medium',
            view === v.key
              ? 'border-b-2 border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
          )}
        >
          {v.label}
        </button>
      ))}
    </nav>
  )
}
