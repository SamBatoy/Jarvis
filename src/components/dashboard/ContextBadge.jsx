import { accessibleBadgeText } from '../../lib/colorContrast'

export default function ContextBadge({ context, size = 'sm' }) {
  if (!context) return null
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
  // HUD is dark-only, so only the dark-mode variant of the computed
  // accessible text color is needed now (the raw context color fails 4.5:1
  // as text-on-its-own-10%-tint for some hues — see lib/colorContrast.js).
  const textColor = accessibleBadgeText(context.color, 'dark', '#060a14')
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${padding}`}
      style={{ backgroundColor: `${context.color}1a`, color: textColor }}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: context.color, boxShadow: `0 0 6px ${context.color}` }}
      />
      {context.name}
    </span>
  )
}
