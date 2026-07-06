export default function ContextBadge({ context, size = 'sm' }) {
  if (!context) return null
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${padding}`}
      style={{ backgroundColor: `${context.color}1a`, color: context.color }}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: context.color }} />
      {context.name}
    </span>
  )
}
