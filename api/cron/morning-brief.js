import { supabaseAdmin } from '../../server/supabaseAdmin.js'
import { chatCompletion } from '../../server/llm/index.js'
import { logAction } from '../../server/actionLog.js'
import { todayRangeInAppTz, todayDateStringInAppTz } from '../../server/timezone.js'
import { computePriorityScore } from '../../src/lib/priorityScore.js'
import { missedRateByContext } from '../../src/lib/analytics.js'

const DEFAULT_FOCUS = `Look at today's due items and pick one to start with.`

// Runs once daily via Vercel Cron (see vercel.json), before the user is
// likely to check the dashboard. Deterministically gathers today's due
// items and top-priority tasks (Smart Priority Engine's scorer); only the
// one-sentence suggestedFocus comes from an LLM call, same "deterministic
// data + one small LLM call for prose" pattern as scaffold.js.
export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { startISO, endISO } = todayRangeInAppTz()
  const briefDate = todayDateStringInAppTz()

  const [dueTodosRes, dueDeadlinesRes, activeTodosRes, archivedTodosRes] = await Promise.all([
    supabaseAdmin.from('todos').select('id, title').eq('archived', false).eq('done', false).gte('due_date', startISO).lte('due_date', endISO),
    supabaseAdmin.from('deadlines').select('id, title').eq('status', 'upcoming').gte('due_at', startISO).lte('due_at', endISO),
    supabaseAdmin.from('todos').select('*').eq('archived', false).eq('done', false),
    supabaseAdmin.from('todos').select('context_id, archive_reason').eq('archived', true),
  ])
  for (const r of [dueTodosRes, dueDeadlinesRes, activeTodosRes, archivedTodosRes]) {
    if (r.error) {
      res.status(500).json({ error: r.error.message })
      return
    }
  }

  const dueToday = [...dueTodosRes.data, ...dueDeadlinesRes.data]

  const childCountByParent = new Map()
  for (const t of activeTodosRes.data) {
    if (t.parent_todo_id) childCountByParent.set(t.parent_todo_id, (childCountByParent.get(t.parent_todo_id) ?? 0) + 1)
  }
  const contextMissedRateMap = missedRateByContext(archivedTodosRes.data.map((t) => ({ ...t, archived: true })))
  const now = new Date()
  const topPriorities = activeTodosRes.data
    .filter((t) => !t.parent_todo_id)
    .map((t) => ({
      id: t.id,
      title: t.title,
      score: computePriorityScore(t, {
        childCount: childCountByParent.get(t.id) ?? 0,
        now,
        contextMissedRate: contextMissedRateMap.get(t.context_id) ?? 0,
      }),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ id, title }) => ({ id, title }))

  const prompt = `You are Jarvis writing a short morning brief for a student/builder.
Due today: ${dueToday.map((d) => d.title).join(', ') || 'nothing'}
Top priorities right now: ${topPriorities.map((t) => t.title).join(', ') || 'nothing urgent'}
Write ONE encouraging, concrete sentence suggesting what to focus on first today. No preamble, no quotes, just the sentence.`

  let suggestedFocus = DEFAULT_FOCUS
  try {
    const response = await chatCompletion({ messages: [{ role: 'user', content: prompt }], tools: [] })
    if (response.content?.trim()) suggestedFocus = response.content.trim()
  } catch {
    // graceful degrade — the brief still saves with a sensible default focus line
  }

  const content = { topPriorities, dueToday, suggestedFocus }

  const { error: upsertError } = await supabaseAdmin
    .from('daily_briefs')
    .upsert({ brief_date: briefDate, type: 'morning', content }, { onConflict: 'brief_date,type' })
  if (upsertError) {
    res.status(500).json({ error: upsertError.message })
    return
  }

  await logAction({
    action: 'morning_brief',
    summary: `Generated morning brief for ${briefDate}`,
    source: 'auto',
  })

  res.status(200).json({ ok: true, content })
}
