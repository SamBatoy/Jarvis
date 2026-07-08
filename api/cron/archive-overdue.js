import { supabaseAdmin } from '../../server/supabaseAdmin.js'
import { logAction } from '../../server/actionLog.js'

// Runs once daily via Vercel Cron (see vercel.json). Archives every
// still-incomplete todo whose due_date has passed, so the active list
// starts each day clean — tagged 'missed'. Completed todos are archived
// the instant they're marked done, by a DB trigger (todos_set_completed_at
// in schema.sql / 010_instant_archive_on_complete.sql), entirely
// independent of due_date — this cron never sees them, since a completed
// todo already has archived=true by the time this query runs. This is the
// one place archiving happens with no confirm step, because it's
// inherently automatic; the manual path (propose_archive_todo) always
// goes through a real confirm.
export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const nowISO = new Date().toISOString()

  const { data: overdue, error } = await supabaseAdmin
    .from('todos')
    .select('id, title')
    .eq('archived', false)
    .eq('done', false)
    .not('due_date', 'is', null)
    .lt('due_date', nowISO)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  let archivedCount = 0
  for (const todo of overdue) {
    const { error: updateError } = await supabaseAdmin
      .from('todos')
      .update({ archived: true, archived_at: nowISO, archive_reason: 'missed' })
      .eq('id', todo.id)
    if (updateError) continue
    archivedCount++
    await logAction({
      action: 'archive_todo',
      summary: `Auto-archived "${todo.title}" (missed)`,
      source: 'auto',
      entityType: 'todo',
      entityId: todo.id,
    })
  }

  res.status(200).json({ archivedCount })
}
