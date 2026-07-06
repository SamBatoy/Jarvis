import { z } from 'zod'

// Note: these still validate strictly at runtime (our own zod safeParse in
// runTool). The .describe() hints (not JSON-schema `format` keywords) are
// what the LLM actually sees — see registry.js's stripFormat(): Groq (and
// likely other OpenAI-compatible providers) enforce `format: uuid` /
// `format: date-time` server-side and hard-fail the whole completion request
// on a near-miss, instead of returning a tool call we could validate and
// gracefully bounce back to the model. Stripping format keywords from the
// schema we send upstream keeps that graceful-retry loop in our own code.
const uuid = () => z.string().uuid().describe('A real UUID copied from a previous list_* result — never invent one.')
const isoDatetime = () =>
  z.string().datetime({ offset: true }).describe('Full ISO 8601 datetime with offset, e.g. 2026-07-13T15:00:00Z')

export const TASK_TYPES = [
  'study', 'presentation', 'problem-set', 'exam-prep', 'reading',
  'build-feature', 'design', 'debug', 'deploy', 'ship', 'general',
]
export const ACADEMIC_TASK_TYPES = ['study', 'presentation', 'problem-set', 'exam-prep', 'reading']
export const PRIORITIES = ['low', 'medium', 'high']
export const CONTEXT_TYPES = ['subject', 'project']
export const PROJECT_STATUSES = ['active', 'shipped', 'paused']
export const DEADLINE_STATUSES = ['upcoming', 'met', 'missed']
export const GOAL_STATUSES = ['active', 'achieved', 'abandoned']

// ─── read tools ─────────────────────────────────────────────────────────────

export const listTodosSchema = z.object({
  contextId: uuid().optional(),
  done: z.boolean().optional(),
  goalId: uuid().optional(),
  taskType: z.enum(TASK_TYPES).optional(),
  topLevelOnly: z.boolean().optional().describe('If true, only return todos with no parent (exclude scaffolded subtasks).'),
  dueBefore: isoDatetime().optional(),
  dueAfter: isoDatetime().optional(),
})

export const listEventsSchema = z.object({
  contextId: uuid().optional(),
  from: isoDatetime().optional(),
  to: isoDatetime().optional(),
})

export const listDeadlinesSchema = z.object({
  contextId: uuid().optional(),
  status: z.enum(DEADLINE_STATUSES).optional(),
  dueBefore: isoDatetime().optional(),
  dueAfter: isoDatetime().optional(),
})

export const listGoalsSchema = z.object({
  status: z.enum(GOAL_STATUSES).optional(),
})

export const listContextsSchema = z.object({
  type: z.enum(CONTEXT_TYPES).optional(),
})

export const listLearningPathsSchema = z.object({})

export const getTodayOverviewSchema = z.object({})

// ─── direct-write tools (execute immediately, no confirm) ──────────────────

export const todoFieldsSchema = z.object({
  title: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
  done: z.boolean().optional(),
  priority: z.enum(PRIORITIES).optional(),
  due_date: isoDatetime().nullable().optional(),
  context_id: uuid().nullable().optional(),
  goal_id: uuid().nullable().optional(),
  task_type: z.enum(TASK_TYPES).nullable().optional(),
})

export const updateTodoSchema = z.object({ id: uuid(), fields: todoFieldsSchema })

export const eventFieldsSchema = z.object({
  title: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
  start_at: isoDatetime().optional(),
  end_at: isoDatetime().optional(),
  location: z.string().nullable().optional(),
  context_id: uuid().nullable().optional(),
})

export const updateEventSchema = z.object({ id: uuid(), fields: eventFieldsSchema })

export const deadlineFieldsSchema = z.object({
  title: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
  due_at: isoDatetime().optional(),
  context_id: uuid().nullable().optional(),
  goal_id: uuid().nullable().optional(),
  status: z.enum(DEADLINE_STATUSES).optional(),
})

export const updateDeadlineSchema = z.object({ id: uuid(), fields: deadlineFieldsSchema })

export const goalFieldsSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  why_it_matters: z.string().nullable().optional(),
  target_date: z.string().date().nullable().optional(),
  status: z.enum(GOAL_STATUSES).optional(),
})

export const updateGoalSchema = z.object({ id: uuid(), fields: goalFieldsSchema })

const classScheduleSlot = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
})

export const contextFieldsSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  instructor: z.string().nullable().optional(),
  class_schedule: z.array(classScheduleSlot).nullable().optional(),
  description: z.string().nullable().optional(),
  status: z.enum(PROJECT_STATUSES).nullable().optional(),
})

export const updateContextSchema = z.object({ id: uuid(), fields: contextFieldsSchema })

// ─── propose tools (never write; return a preview for the user to confirm) ─

export const proposeScaffoldSchema = z.object({
  title: z.string().min(1).describe('The parent task title, e.g. "Study for Chemistry midterm".'),
  taskType: z.enum(TASK_TYPES),
  topic: z
    .string()
    .optional()
    .describe('The subject to interpolate into template steps, e.g. "photosynthesis". Defaults to the title if omitted.'),
  contextId: uuid().nullable().optional(),
  goalId: uuid().nullable().optional(),
  dueDate: isoDatetime().describe('When the parent task (and thus the whole scaffold) is due.'),
})

// Preview payload shape returned by propose_scaffold's execute(), re-validated
// at commit time against whatever the client sends back (never trust it blindly).
const scaffoldRowSchema = z.object({
  title: z.string().min(1),
  task_type: z.enum(TASK_TYPES).nullable(),
  context_id: uuid().nullable(),
  goal_id: uuid().nullable(),
  due_date: isoDatetime(),
  priority: z.enum(PRIORITIES),
})
export const scaffoldPreviewSchema = z.object({
  parent: scaffoldRowSchema,
  children: z.array(scaffoldRowSchema),
})

export const proposeCreateTodoSchema = z.object({
  title: z.string().min(1),
  notes: z.string().nullable().optional(),
  priority: z.enum(PRIORITIES).optional(),
  due_date: isoDatetime().nullable().optional(),
  context_id: uuid().nullable().optional(),
  goal_id: uuid().nullable().optional(),
  task_type: z.enum(TASK_TYPES).nullable().optional(),
})

export const proposeCreateEventSchema = z.object({
  title: z.string().min(1),
  notes: z.string().nullable().optional(),
  start_at: isoDatetime(),
  end_at: isoDatetime(),
  location: z.string().nullable().optional(),
  context_id: uuid().nullable().optional(),
})

export const proposeCreateDeadlineSchema = z.object({
  title: z.string().min(1),
  notes: z.string().nullable().optional(),
  due_at: isoDatetime(),
  context_id: uuid().nullable().optional(),
  goal_id: uuid().nullable().optional(),
})

export const proposeCreateGoalSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  why_it_matters: z.string().nullable().optional(),
  target_date: z.string().date().nullable().optional(),
})

export const proposeCreateContextSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('subject'),
    name: z.string().min(1),
    instructor: z.string().nullable().optional(),
    class_schedule: z.array(classScheduleSlot).nullable().optional(),
  }),
  z.object({
    type: z.literal('project'),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
  }),
])

// Preview adds the server-assigned color; this is what commit re-validates.
export const contextPreviewSchema = z.object({
  name: z.string().min(1),
  type: z.enum(CONTEXT_TYPES),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  instructor: z.string().nullable().optional(),
  class_schedule: z.array(classScheduleSlot).nullable().optional(),
  description: z.string().nullable().optional(),
  status: z.enum(PROJECT_STATUSES).nullable().optional(),
})

export const ENTITY_TABLES = { todo: 'todos', event: 'events', deadline: 'deadlines', goal: 'goals', context: 'contexts' }

export const proposeDeleteSchema = z.object({
  entityType: z.enum(Object.keys(ENTITY_TABLES)),
  id: uuid(),
})

export const deletePreviewSchema = z.object({
  entityType: z.enum(Object.keys(ENTITY_TABLES)),
  id: uuid(),
  row: z.record(z.string(), z.any()),
})

export const proposeLearningPathSchema = z.object({
  topic: z.string().min(1).describe('What the user wants to learn, e.g. "cybersecurity".'),
})

const resourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  type: z.string().min(1),
})

const skillSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  done: z.boolean(),
  resources: z.array(resourceSchema),
})

export const learningPathPreviewSchema = z.object({
  topic: z.string().min(1),
  skills: z.array(skillSchema).min(1),
})
