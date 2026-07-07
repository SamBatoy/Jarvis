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
      <div className="grid grid-cols-7 text-center text-xs font-medium text-neutral-500 dark:text-neutral-400">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800">
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
                'flex h-20 flex-col items-start gap-1 bg-white p-1.5 text-left dark:bg-neutral-900',
                !inMonth && 'text-neutral-300 dark:text-neutral-600',
                isToday(day) && 'ring-2 ring-inset ring-blue-500'
              )}
            >
              <span className="text-xs">{format(day, 'd')}</span>
              {count > 0 && (
                <span className="rounded-full bg-blue-100 px-1.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
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
