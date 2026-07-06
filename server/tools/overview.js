import { supabaseAdmin } from '../supabaseAdmin.js'
import { todayRangeInAppTz, dayOfWeekInAppTz } from '../timezone.js'

export async function getTodayOverview() {
  const { startISO, endISO } = todayRangeInAppTz()
  const today = dayOfWeekInAppTz()

  const [contextsRes, eventsRes, todosRes, deadlinesRes] = await Promise.all([
    supabaseAdmin.from('contexts').select('*').eq('type', 'subject'),
    supabaseAdmin.from('events').select('*').gte('start_at', startISO).lte('start_at', endISO),
    supabaseAdmin.from('todos').select('*').eq('done', false).gte('due_date', startISO).lte('due_date', endISO),
    supabaseAdmin.from('deadlines').select('*').eq('status', 'upcoming').gte('due_at', startISO).lte('due_at', endISO),
  ])
  for (const res of [contextsRes, eventsRes, todosRes, deadlinesRes]) {
    if (res.error) throw res.error
  }

  const classesToday = (contextsRes.data ?? []).flatMap((ctx) =>
    (ctx.class_schedule ?? [])
      .filter((slot) => slot.day_of_week === today)
      .map((slot) => ({ context_id: ctx.id, context_name: ctx.name, ...slot }))
  )

  return {
    classesToday,
    eventsToday: eventsRes.data,
    todosDueToday: todosRes.data,
    deadlinesDueToday: deadlinesRes.data,
  }
}
