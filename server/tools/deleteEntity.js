import { supabaseAdmin } from '../supabaseAdmin.js'
import { ENTITY_TABLES } from './schemas.js'

export async function proposeDelete({ entityType, id }) {
  const table = ENTITY_TABLES[entityType]
  const { data, error } = await supabaseAdmin.from(table).select('*').eq('id', id).single()
  if (error) throw error
  return { entityType, id, row: data }
}

export async function commitDelete({ entityType, id }) {
  const table = ENTITY_TABLES[entityType]
  const { error } = await supabaseAdmin.from(table).delete().eq('id', id)
  if (error) throw error
  return { entityType, id }
}
