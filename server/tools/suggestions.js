import { supabaseAdmin } from '../supabaseAdmin.js'

export async function proposeSuggestions() {
  const { data, error } = await supabaseAdmin
    .from('pending_suggestions')
    .select('*')
    .eq('status', 'pending')
    .order('detected_at', { ascending: false })
  if (error) throw error
  if (!data || data.length === 0) throw new Error('No pending suggestions right now.')

  return {
    suggestions: data.map((s) => ({
      id: s.id,
      source: s.source,
      suggestedType: s.suggested_type,
      title: s.title,
      dueDate: s.due_date,
      notes: s.notes,
      contextId: s.context_id,
      accepted: true, // defaults checked; the user unchecks individual items before confirming
    })),
  }
}

export async function commitSuggestions({ suggestions }) {
  let createdCount = 0
  let dismissedCount = 0

  for (const s of suggestions) {
    if (!s.accepted) {
      await supabaseAdmin.from('pending_suggestions').update({ status: 'dismissed' }).eq('id', s.id)
      dismissedCount++
      continue
    }

    // deadlines.due_at is NOT NULL — an accepted suggestion with no date
    // becomes a todo instead, regardless of its original suggested type.
    if (s.suggestedType === 'deadline' && s.dueDate) {
      await supabaseAdmin.from('deadlines').insert({ title: s.title, due_at: s.dueDate, context_id: s.contextId })
    } else {
      await supabaseAdmin.from('todos').insert({ title: s.title, due_date: s.dueDate, context_id: s.contextId })
    }
    await supabaseAdmin.from('pending_suggestions').update({ status: 'confirmed' }).eq('id', s.id)
    createdCount++
  }

  return { createdCount, dismissedCount, total: suggestions.length }
}
