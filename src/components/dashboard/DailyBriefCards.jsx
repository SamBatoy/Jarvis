import { format } from 'date-fns'
import { useLatestBrief } from '../../hooks/useDailyBriefs'

function formatBriefDate(dateStr) {
  return format(new Date(`${dateStr}T00:00:00`), 'EEE MMM d')
}

function MorningBriefCard() {
  const { data, isLoading } = useLatestBrief('morning')
  const brief = data?.[0]

  if (isLoading || !brief) return null
  const { topPriorities, dueToday, suggestedFocus } = brief.content

  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Morning Brief</h2>
        <span className="text-xs text-neutral-400">{formatBriefDate(brief.brief_date)}</span>
      </div>
      <p className="text-sm font-medium">{suggestedFocus}</p>
      {dueToday?.length > 0 && (
        <p className="mt-2 text-xs text-neutral-500">
          Due today: {dueToday.map((d) => d.title).join(', ')}
        </p>
      )}
      {topPriorities?.length > 0 && (
        <p className="mt-1 text-xs text-neutral-500">
          Top priorities: {topPriorities.map((t) => t.title).join(', ')}
        </p>
      )}
    </div>
  )
}

function NightReviewCard() {
  const { data, isLoading } = useLatestBrief('night')
  const brief = data?.[0]

  if (isLoading || !brief) return null
  const { completed, slipped, reflection } = brief.content

  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Night Review</h2>
        <span className="text-xs text-neutral-400">{formatBriefDate(brief.brief_date)}</span>
      </div>
      <p className="text-sm">{reflection}</p>
      {completed?.length > 0 && (
        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">Completed: {completed.map((c) => c.title).join(', ')}</p>
      )}
      {slipped?.length > 0 && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">Slipped: {slipped.map((s) => s.title).join(', ')}</p>
      )}
    </div>
  )
}

export default function DailyBriefCards() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <MorningBriefCard />
      <NightReviewCard />
    </div>
  )
}
