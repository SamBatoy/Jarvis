function Stat({ label, value }) {
  return (
    // min-w-0: without it, a grid/flex item's default min-width is its
    // content's natural width, so a wide value (a long word like "overdue",
    // not just a short number) pushes past its own column and out of the
    // panel — truncate below only works once min-w-0 lets the box actually
    // shrink to the available space.
    <div className="min-w-0">
      <p className="hud-label truncate">{label}</p>
      <p className="truncate font-mono text-2xl font-bold text-hud-accent [text-shadow:0_0_14px_rgba(56,225,255,0.4)]">
        {value}
      </p>
    </div>
  )
}

// completionResult: return value of lib/analytics's completionRate (or
// null). nextDeadline: return value of lib/systemMetrics's
// nextDeadlineLabel (or null).
export default function StatsReadout({ activeCount, completionResult, nextDeadline }) {
  return (
    <div className="hud-panel space-y-3">
      {/* Active/Completion are always short (a count, a percentage) — a
          2-up row suits them. Next Deadline's value can be a word
          ("overdue") or a longer countdown, so it gets a full-width row of
          its own instead of competing for a cramped third of the panel. */}
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Active" value={activeCount} />
        <Stat label="Completion" value={completionResult ? `${completionResult.rate}%` : '—'} />
      </div>
      <div className="border-t border-hud-accent/15 pt-3">
        <Stat label="Next Deadline" value={nextDeadline ? nextDeadline.text : '—'} />
        {nextDeadline && <p className="mt-1 truncate text-xs text-hud-muted">{nextDeadline.title}</p>}
      </div>
    </div>
  )
}
