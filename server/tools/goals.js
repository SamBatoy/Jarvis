import { supabaseAdmin } from '../supabaseAdmin.js'

export async function listGoals(args) {
  let query = supabaseAdmin.from('goals').select('*').order('target_date', { ascending: true, nullsFirst: false })
  if (args.status) query = query.eq('status', args.status)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function updateGoal({ id, fields }) {
  const { data, error } = await supabaseAdmin.from('goals').update(fields).eq('id', id).select().single()
  if (error) throw error
  return data
}

// Preview is just the fields as-is — the goals table defaults status to
// 'active', so there's nothing to compute here.
export async function proposeCreateGoal(fields) {
  return fields
}

export async function commitCreateGoal(fields) {
  const { data, error } = await supabaseAdmin.from('goals').insert(fields).select().single()
  if (error) throw error
  return data
}
