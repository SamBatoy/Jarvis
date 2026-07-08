import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, format } from 'date-fns'
import clsx from 'clsx'

const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function MonthGrid({ cursorDate, itemsByDay, onSelectDay }) {
  const monthStart = startOfMonth(cursorDate)
  const monthEnd = endOfMonth(cursorDate)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  return (
    <div>
      <div className="grid grid-cols-7 text-center font-mono text-[10px] uppercase tracking-widest text-hud-muted">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-hud-accent/25 bg-hud-accent/15">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const count = itemsByDay.get(key)?.length ?? 0
          const inMonth = isSameMonth(day, cursorDate)
          return (
            <button
              key={key}
              onClick={() => onSelectDay(day)}
              aria-label={`${format(day, 'MMMM d, yyyy')}${count > 0 ? `, ${count} item${count > 1 ? 's' : ''}` : ''}`}
              className={clsx(
                'flex h-20 flex-col items-start gap-1 bg-hud-bg p-1.5 text-left transition-colors duration-150 hover:bg-hud-accent/10',
                // Plain hud-muted, not an opacity-reduced variant: /40
                // measured 1.98:1 against the cell background — failing
                // WCAG badly. In-month days use the default near-white
                // text (15.7:1), so muted (6.7:1) still reads clearly as
                // "not this month" while staying legible.
                !inMonth && 'text-hud-muted',
                isToday(day) && 'ring-2 ring-inset ring-hud-accent'
              )}
            >
              <span className="font-mono text-xs">{format(day, 'd')}</span>
              {count > 0 && (
                <span className="rounded-full bg-hud-accent/15 px-1.5 font-mono text-[10px] font-medium text-hud-accent">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
