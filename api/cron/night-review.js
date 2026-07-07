import { supabaseAdmin } from '../../server/supabaseAdmin.js'
import { chatCompletion } from '../../server/llm/index.js'
import { logAction } from '../../server/actionLog.js'
import { todayRangeInAppTz, todayDateStringInAppTz } from '../../server/timezone.js'

// Runs once daily via Vercel Cron (see vercel.json), in the evening.
// Reuses Phase 1's archive_reason field directly: 'completed'/'manual'
// archived-today todos are what got done, 'missed' ones are what slipped.
// Only the reflection paragraph comes from an LLM call.
export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { startISO, endISO } = todayRangeInAppTz()
  const briefDate = todayDateStringInAppTz()

  const { data: archivedToday, error } = await supabaseAdmin
    .from('todos')
    .select('id, title, archive_reason')
    .eq('archived', true)
    .gte('archived_at', startISO)
    .lte('archived_at', endISO)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  const completed = archivedToday
    .filter((t) => t.archive_reason === 'completed' || t.archive_reason === 'manual')
    .map(({ id, title }) => ({ id, title }))
  const slipped = archivedToday.filter((t) => t.archive_reason === 'missed').map(({ id, title }) => ({ id, title }))

  const prompt = `You are Jarvis writing a short night review for a student/builder.
Completed today: ${completed.map((c) => c.title).join(', ') || 'nothing'}
Slipped/missed today: ${slipped.map((s) => s.title).join(', ') || 'nothing'}
Write ONE short, honest, encouraging reflection (2-3 sentences) about today's progress. No preamble, no quotes, just the reflection.`

  let reflection = `${completed.length} completed, ${slipped.length} missed today.`
  try {
    const response = await chatCompletion({ messages: [{ role: 'user', content: prompt }], tools: [] })
    if (response.content?.trim()) reflection = response.content.trim()
  } catch {
    // graceful degrade — the review still saves with a plain factual summary
  }

  const content = { completed, slipped, reflection }

  const { error: upsertError } = await supabaseAdmin
    .from('daily_briefs')
    .upsert({ brief_date: briefDate, type: 'night', content }, { onConflict: 'brief_date,type' })
  if (upsertError) {
    res.status(500).json({ error: upsertError.message })
    return
  }

  await logAction({
    action: 'night_review',
    summary: `Generated night review for ${briefDate}`,
    source: 'auto',
  })

  res.status(200).json({ ok: true, content })
}
