import { supabaseAdmin } from '../supabaseAdmin.js'
import { nextContextColor } from '../colorPalette.js'

export async function listContexts(args) {
  let query = supabaseAdmin.from('contexts').select('*').order('created_at', { ascending: true })
  if (args.type) query = query.eq('type', args.type)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function updateContext({ id, fields }) {
  const { data, error } = await supabaseAdmin.from('contexts').update(fields).eq('id', id).select().single()
  if (error) throw error
  return data
}

// Color is auto-assigned from the fixed palette here, at proposal time, so
// the preview the user confirms already shows the real color they'll get.
export async function proposeCreateContext(args) {
  const color = await nextContextColor(supabaseAdmin)
  if (args.type === 'subject') {
    return {
      name: args.name,
      type: 'subject',
      color,
      instructor: args.instructor ?? null,
      class_schedule: args.class_schedule ?? null,
      description: null,
      status: null,
    }
  }
  return {
    name: args.name,
    type: 'project',
    color,
    instructor: null,
    class_schedule: null,
    description: args.description ?? null,
    status: args.status ?? 'active',
  }
}

export async function commitCreateContext(fields) {
  const { data, error } = await supabaseAdmin.from('contexts').insert(fields).select().single()
  if (error) throw error
  return data
}
