import { supabaseAdmin } from '../supabaseAdmin.js'
import { computePriorityScore, suggestedPriorityLabel } from '../../src/lib/priorityScore.js'

export async function listTodos(args) {
  let query = supabaseAdmin.from('todos').select('*').order('due_date', { ascending: true, nullsFirst: false })
  if (!args.includeArchived) query = query.eq('archived', false)
  if (args.contextId) query = query.eq('context_id', args.contextId)
  if (args.done !== undefined) query = query.eq('done', args.done)
  if (args.goalId) query = query.eq('goal_id', args.goalId)
  if (args.taskType) query = query.eq('task_type', args.taskType)
  if (args.topLevelOnly) query = query.is('parent_todo_id', null)
  if (args.dueBefore) query = query.lte('due_date', args.dueBefore)
  if (args.dueAfter) query = query.gte('due_date', args.dueAfter)
  const { data, error } = await query
  if (error) throw error

  // Smart Priority Engine: a passive suggestion attached to each row so the
  // model can reference it naturally — chat never acts on this by itself.
  // No parent/child join here (unlike the dashboard, which already has the
  // full set loaded), so effort falls back to the task_type-based proxy.
  return data.map((todo) => ({
    ...todo,
    suggested_priority: suggestedPriorityLabel(computePriorityScore(todo)),
  }))
}

export async function updateTodo({ id, fields }) {
  const { data, error } = await supabaseAdmin.from('todos').update(fields).eq('id', id).select().single()
  if (error) throw error
  return data
}

// propose_create_todo: the preview IS the row to insert — nothing to compute.
export async function proposeCreateTodo(fields) {
  return fields
}

export async function commitCreateTodo(fields) {
  const { data, error } = await supabaseAdmin.from('todos').insert(fields).select().single()
  if (error) throw error
  return data
}

export async function proposeArchiveTodo({ id }) {
  const { data, error } = await supabaseAdmin.from('todos').select('id, title, due_date').eq('id', id).single()
  if (error) throw error
  return data
}

export async function commitArchiveTodo({ id }) {
  const { data, error } = await supabaseAdmin
    .from('todos')
    .update({ archived: true, archived_at: new Date().toISOString(), archive_reason: 'manual' })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
