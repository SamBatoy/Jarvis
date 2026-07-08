import { accessibleBadgeText } from '../../lib/colorContrast'

export default function ContextBadge({ context, size = 'sm' }) {
  if (!context) return null
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
  // The raw context color fails 4.5:1 as text-on-its-own-10%-tint in light
  // mode for every color in the default palette (and violet fails in dark
  // mode too) — darken/lighten just enough per mode rather than using the
  // brand hue at full strength as text color. See lib/colorContrast.js.
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${padding} text-[var(--badge-text-light)] dark:text-[var(--badge-text-dark)]`}
      style={{
        backgroundColor: `${context.color}1a`,
        '--badge-text-light': accessibleBadgeText(context.color, 'light'),
        '--badge-text-dark': accessibleBadgeText(context.color, 'dark'),
      }}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: context.color }} />
      {context.name}
    </span>
  )
}
