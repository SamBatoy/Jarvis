import { supabaseAdmin } from '../supabaseAdmin.js'

export async function listEvents(args) {
  let query = supabaseAdmin.from('events').select('*').order('start_at', { ascending: true })
  if (args.contextId) query = query.eq('context_id', args.contextId)
  if (args.from) query = query.gte('start_at', args.from)
  if (args.to) query = query.lte('start_at', args.to)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function updateEvent({ id, fields }) {
  const { data, error } = await supabaseAdmin.from('events').update(fields).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function proposeCreateEvent(fields) {
  return fields
}

export async function commitCreateEvent(fields) {
  const { data, error } = await supabaseAdmin.from('events').insert(fields).select().single()
  if (error) throw error
  return data
}
