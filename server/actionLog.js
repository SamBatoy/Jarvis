import { supabaseAdmin } from './supabaseAdmin.js'

// Trust & Control Layer: every confirmed write gets a human-readable log
// entry. Logging failures never break the actual write — this is called
// after the real commit already succeeded, so a logging hiccup shouldn't
// turn into a user-facing error for an action that actually went through.
export async function logAction({ action, summary, source, entityType, entityId }) {
  const { error } = await supabaseAdmin
    .from('action_log')
    .insert({ action, summary, source, entity_type: entityType ?? null, entity_id: entityId ?? null })
  if (error) console.error('Failed to write action_log entry:', error.message)
}

// Derives a human-readable log entry from a propose/commit tool's name and
// its commit result. One place to extend whenever a new propose_* tool is
// added, rather than threading logging logic through every tool handler.
export function summarizeCommit(toolName, result) {
  switch (toolName) {
    case 'propose_scaffold':
      return {
        action: 'scaffold',
        summary: `Created "${result.parent.title}" with ${result.children.length} subtask${result.children.length === 1 ? '' : 's'}`,
        entityType: 'todo',
        entityId: result.parent.id,
      }
    case 'propose_create_todo':
      return { action: 'create_todo', summary: `Created todo "${result.title}"`, entityType: 'todo', entityId: result.id }
    case 'propose_create_event':
      return { action: 'create_event', summary: `Created event "${result.title}"`, entityType: 'event', entityId: result.id }
    case 'propose_create_deadline':
      return {
        action: 'create_deadline',
        summary: `Created deadline "${result.title}"`,
        entityType: 'deadline',
        entityId: result.id,
      }
    case 'propose_create_goal':
      return { action: 'create_goal', summary: `Created goal "${result.title}"`, entityType: 'goal', entityId: result.id }
    case 'propose_create_context':
      return {
        action: 'create_context',
        summary: `Created ${result.type} "${result.name}"`,
        entityType: 'context',
        entityId: result.id,
      }
    case 'propose_delete':
      return {
        action: `delete_${result.entityType}`,
        summary: `Deleted ${result.entityType}`,
        entityType: result.entityType,
        entityId: result.id,
      }
    case 'propose_learning_path':
      return {
        action: 'create_learning_path',
        summary: `Saved learning path "${result.topic}"`,
        entityType: 'learning_path',
        entityId: result.id,
      }
    case 'propose_archive_todo':
      return { action: 'archive_todo', summary: `Archived "${result.title}"`, entityType: 'todo', entityId: result.id }
    default:
      return { action: toolName, summary: `Ran ${toolName}`, entityType: null, entityId: null }
  }
}
