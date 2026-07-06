import { zodToJsonSchema } from 'zod-to-json-schema'
import * as schemas from './schemas.js'
import { listTodos, updateTodo, proposeCreateTodo, commitCreateTodo } from './todos.js'
import { listEvents, updateEvent, proposeCreateEvent, commitCreateEvent } from './events.js'
import { listDeadlines, updateDeadline, proposeCreateDeadline, commitCreateDeadline } from './deadlines.js'
import { listGoals, updateGoal, proposeCreateGoal, commitCreateGoal } from './goals.js'
import { listContexts, updateContext, proposeCreateContext, commitCreateContext } from './contexts.js'
import { listLearningPaths, proposeLearningPath, commitLearningPath } from './learningPaths.js'
import { getTodayOverview } from './overview.js'
import { proposeScaffold, commitScaffold } from './scaffold.js'
import { proposeDelete, commitDelete } from './deleteEntity.js'

// Recursively strips JSON-schema `format` keywords (uuid, date-time, ...).
// See the comment in schemas.js: some OpenAI-compatible providers (Groq
// included) enforce `format` server-side and hard-fail the whole completion
// request on a near-miss, rather than returning a tool call we could
// validate ourselves and gracefully bounce back to the model. Our own zod
// schemas still enforce these formats strictly at runtime in runTool.
function stripFormat(node) {
  if (Array.isArray(node)) {
    for (const item of node) stripFormat(item)
  } else if (node && typeof node === 'object') {
    delete node.format
    for (const value of Object.values(node)) stripFormat(value)
  }
  return node
}

function toJsonSchema(zodSchema) {
  const schema = zodToJsonSchema(zodSchema, { $refStrategy: 'none' })
  delete schema.$schema
  return stripFormat(schema)
}

// kind: 'read' (execute immediately, feed result back) |
//       'direct' (execute immediately, no user confirmation — simple edits to
//        an existing row) | 'propose' (never touches the DB; execute()
//        returns a preview the frontend renders with Confirm/Cancel; commit()
//        re-validates that exact preview payload against `previewSchema` and
//        performs the real write — see api/commit-proposal.js).
function def(name, description, zodSchema, kind, execute, proposeExtra) {
  return {
    name,
    kind,
    zodSchema,
    execute,
    previewSchema: proposeExtra?.previewSchema,
    commit: proposeExtra?.commit,
    openaiTool: {
      type: 'function',
      function: { name, description, parameters: toJsonSchema(zodSchema) },
    },
  }
}

export const TOOLS = {
  list_todos: def(
    'list_todos',
    'List todos, optionally filtered by context, done status, goal, task type, or due date range.',
    schemas.listTodosSchema,
    'read',
    listTodos
  ),
  list_events: def(
    'list_events',
    'List calendar events, optionally filtered by context or a start-time range.',
    schemas.listEventsSchema,
    'read',
    listEvents
  ),
  list_deadlines: def(
    'list_deadlines',
    'List deadlines, optionally filtered by context, status, or a due-time range.',
    schemas.listDeadlinesSchema,
    'read',
    listDeadlines
  ),
  list_goals: def('list_goals', 'List goals, optionally filtered by status.', schemas.listGoalsSchema, 'read', listGoals),
  list_contexts: def(
    'list_contexts',
    'List contexts (subjects and/or projects), optionally filtered by type.',
    schemas.listContextsSchema,
    'read',
    listContexts
  ),
  list_learning_paths: def(
    'list_learning_paths',
    'List all saved learning paths with their skills and resources.',
    schemas.listLearningPathsSchema,
    'read',
    listLearningPaths
  ),
  get_today_overview: def(
    "get_today_overview",
    "Get everything relevant to today in one call: today's classes (from subject schedules), today's events, todos due today, and deadlines due today.",
    schemas.getTodayOverviewSchema,
    'read',
    getTodayOverview
  ),

  update_todo: def(
    'update_todo',
    'Update an existing todo in place: toggle done, change priority/due date/notes/context/goal/task_type. Executes immediately with no confirmation — only use on a todo that already exists.',
    schemas.updateTodoSchema,
    'direct',
    updateTodo
  ),
  update_event: def(
    'update_event',
    'Update an existing event in place (title/notes/time/location/context). Executes immediately with no confirmation.',
    schemas.updateEventSchema,
    'direct',
    updateEvent
  ),
  update_deadline: def(
    'update_deadline',
    'Update an existing deadline in place (title/notes/due time/context/goal/status). Executes immediately with no confirmation.',
    schemas.updateDeadlineSchema,
    'direct',
    updateDeadline
  ),
  update_goal: def(
    'update_goal',
    'Update an existing goal in place (title/description/why it matters/target date/status). Executes immediately with no confirmation.',
    schemas.updateGoalSchema,
    'direct',
    updateGoal
  ),
  update_context: def(
    'update_context',
    'Update an existing subject or project in place (name/color/instructor/class schedule/description/status). Executes immediately with no confirmation.',
    schemas.updateContextSchema,
    'direct',
    updateContext
  ),

  propose_scaffold: def(
    'propose_scaffold',
    'Break a task into an ordered set of dated subtasks (a parent todo + child todos). NEVER writes to the database — returns a preview of the parent and subtasks with computed due dates for the user to confirm. Use this whenever the user asks to plan/scaffold/break down a task of one of the task_types (study, presentation, problem-set, exam-prep, reading, build-feature, design, debug, deploy, ship, general) rather than creating a single plain todo.',
    schemas.proposeScaffoldSchema,
    'propose',
    proposeScaffold,
    { previewSchema: schemas.scaffoldPreviewSchema, commit: commitScaffold }
  ),
  propose_create_todo: def(
    'propose_create_todo',
    'Propose creating a single new plain todo (not a multi-step breakdown — use propose_scaffold for that). NEVER writes to the database; returns a preview for the user to confirm.',
    schemas.proposeCreateTodoSchema,
    'propose',
    proposeCreateTodo,
    { previewSchema: schemas.proposeCreateTodoSchema, commit: commitCreateTodo }
  ),
  propose_create_event: def(
    'propose_create_event',
    'Propose creating a new calendar event. NEVER writes to the database; returns a preview for the user to confirm.',
    schemas.proposeCreateEventSchema,
    'propose',
    proposeCreateEvent,
    { previewSchema: schemas.proposeCreateEventSchema, commit: commitCreateEvent }
  ),
  propose_create_deadline: def(
    'propose_create_deadline',
    'Propose creating a new deadline. NEVER writes to the database; returns a preview for the user to confirm.',
    schemas.proposeCreateDeadlineSchema,
    'propose',
    proposeCreateDeadline,
    { previewSchema: schemas.proposeCreateDeadlineSchema, commit: commitCreateDeadline }
  ),
  propose_create_goal: def(
    'propose_create_goal',
    'Propose creating a new goal. NEVER writes to the database; returns a preview for the user to confirm.',
    schemas.proposeCreateGoalSchema,
    'propose',
    proposeCreateGoal,
    { previewSchema: schemas.proposeCreateGoalSchema, commit: commitCreateGoal }
  ),
  propose_create_context: def(
    'propose_create_context',
    'Propose creating a new subject or project context. Color is auto-assigned. NEVER writes to the database; returns a preview (including the assigned color) for the user to confirm.',
    schemas.proposeCreateContextSchema,
    'propose',
    proposeCreateContext,
    { previewSchema: schemas.contextPreviewSchema, commit: commitCreateContext }
  ),
  propose_delete: def(
    'propose_delete',
    'Propose deleting a todo, event, deadline, goal, or context by id. NEVER deletes immediately; returns a preview of the exact row that would be deleted for the user to confirm. Deleting a parent todo also deletes its subtasks.',
    schemas.proposeDeleteSchema,
    'propose',
    proposeDelete,
    { previewSchema: schemas.deletePreviewSchema, commit: commitDelete }
  ),
  propose_learning_path: def(
    'propose_learning_path',
    'Generate a structured learning path for a topic the user wants to learn: an ordered sequence of skills from fundamentals to advanced, with real web-search-sourced resources for the most pivotal skills. NEVER writes to the database — returns a preview for the user to confirm before it is saved.',
    schemas.proposeLearningPathSchema,
    'propose',
    proposeLearningPath,
    { previewSchema: schemas.learningPathPreviewSchema, commit: commitLearningPath }
  ),
}

export function getTool(name) {
  return TOOLS[name]
}

export function allOpenAITools() {
  return Object.values(TOOLS).map((t) => t.openaiTool)
}
