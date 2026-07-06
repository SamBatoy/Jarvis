import { supabaseAdmin } from '../supabaseAdmin.js'

export async function listDeadlines(args) {
  let query = supabaseAdmin.from('deadlines').select('*').order('due_at', { ascending: true })
  if (args.contextId) query = query.eq('context_id', args.contextId)
  if (args.status) query = query.eq('status', args.status)
  if (args.dueBefore) query = query.lte('due_at', args.dueBefore)
  if (args.dueAfter) query = query.gte('due_at', args.dueAfter)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function updateDeadline({ id, fields }) {
  const { data, error } = await supabaseAdmin.from('deadlines').update(fields).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function proposeCreateDeadline(fields) {
  return fields
}

export async function commitCreateDeadline(fields) {
  const { data, error } = await supabaseAdmin.from('deadlines').insert(fields).select().single()
  if (error) throw error
  return data
}
