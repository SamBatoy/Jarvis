import { supabaseAdmin } from '../supabaseAdmin.js'
import { ENTITY_TABLES } from './schemas.js'
import { updateTodo } from './todos.js'
import { updateEvent } from './events.js'
import { updateDeadline } from './deadlines.js'
import { updateGoal } from './goals.js'

const UPDATE_FN = { todo: updateTodo, event: updateEvent, deadline: updateDeadline, goal: updateGoal }

// One combined preview for many changes, one Confirm/Cancel — not N separate
// proposals. execute() fetches each row's current state (both for the
// title/before-values shown in the preview, and as a defense against a
// hallucinated id: a missing row throws here, before anything is shown).
export async function proposeBatchUpdate({ summary, changes }) {
  const enriched = []
  for (const change of changes) {
    const table = ENTITY_TABLES[change.entityType]
    const { data, error } = await supabaseAdmin.from(table).select('*').eq('id', change.id).single()
    if (error) throw new Error(`Could not find ${change.entityType} "${change.id}": ${error.message}`)
    const before = Object.fromEntries(Object.keys(change.fields).map((key) => [key, data[key] ?? null]))
    enriched.push({ ...change, title: data.title, before })
  }
  return { summary, changes: enriched }
}

export async function commitBatchUpdate({ summary, changes }) {
  const results = []
  for (const change of changes) {
    const updated = await UPDATE_FN[change.entityType]({ id: change.id, fields: change.fields })
    results.push({ entityType: change.entityType, id: change.id, updated })
  }
  return { summary, updated: results }
}
