import { supabaseAdmin } from '../../server/supabaseAdmin.js'
import { logAction } from '../../server/actionLog.js'

// Runs once daily via Vercel Cron (see vercel.json). Archives every todo
// whose due_date has passed, regardless of done status, so the active list
// starts each day clean — tagged 'completed' or 'missed' so the Archive
// view can tell the difference. This is the one place archiving happens
// with no confirm step, because it's inherently automatic; the manual path
// (propose_archive_todo) always goes through a real confirm.
export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const nowISO = new Date().toISOString()

  const { data: overdue, error } = await supabaseAdmin
    .from('todos')
    .select('id, title, done')
    .eq('archived', false)
    .not('due_date', 'is', null)
    .lt('due_date', nowISO)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  let archivedCount = 0
  for (const todo of overdue) {
    const reason = todo.done ? 'completed' : 'missed'
    const { error: updateError } = await supabaseAdmin
      .from('todos')
      .update({ archived: true, archived_at: nowISO, archive_reason: reason })
      .eq('id', todo.id)
    if (updateError) continue
    archivedCount++
    await logAction({
      action: 'archive_todo',
      summary: `Auto-archived "${todo.title}" (${reason})`,
      source: 'auto',
      entityType: 'todo',
      entityId: todo.id,
    })
  }

  res.status(200).json({ archivedCount })
}
