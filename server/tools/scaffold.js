import { ACADEMIC_TASK_TYPES } from './schemas.js'
import { TASK_TEMPLATES } from '../taskTemplates.js'
import { computeScaffoldDates } from '../scheduler.js'
import { chatCompletion } from '../llm/index.js'
import { supabaseAdmin } from '../supabaseAdmin.js'

// Project task_types (and 'general') vary too much for a fixed template, so
// a small dedicated LLM call generates the ordered steps. This call asks for
// raw JSON rather than a tool call to keep the LLM client abstraction simple
// (no provider-specific "forced tool choice" plumbing needed for one
// internal use). If the model produces anything unparseable, we fall back to
// a generic 3-step skeleton so scaffolding never hard-fails.
async function generateProjectSteps(title, taskType) {
  const prompt = `Break the following task into 3 to 6 ordered, concrete, short steps for a "${taskType}" task.
Task: "${title}"
Respond with ONLY a JSON array of step title strings, nothing else — no markdown, no explanation. Example: ["Step one", "Step two", "Step three"]`

  try {
    const response = await chatCompletion({ messages: [{ role: 'user', content: prompt }], tools: [] })
    const steps = JSON.parse(response.content)
    if (Array.isArray(steps) && steps.length > 0 && steps.every((s) => typeof s === 'string' && s.trim())) {
      return steps
    }
  } catch {
    // fall through to the generic fallback below
  }
  return [`Plan: ${title}`, `Work on: ${title}`, `Finish and review: ${title}`]
}

export async function proposeScaffold({ title, taskType, topic, contextId, goalId, dueDate }) {
  const effectiveTopic = topic || title

  const steps = ACADEMIC_TASK_TYPES.includes(taskType)
    ? TASK_TEMPLATES[taskType](effectiveTopic)
    : await generateProjectSteps(title, taskType)

  const dates = await computeScaffoldDates({ steps, dueDate, contextId })

  return {
    parent: {
      title,
      task_type: taskType,
      context_id: contextId ?? null,
      goal_id: goalId ?? null,
      due_date: dueDate,
      priority: 'high',
    },
    children: steps.map((stepTitle, i) => ({
      title: stepTitle,
      task_type: taskType,
      context_id: contextId ?? null,
      goal_id: goalId ?? null,
      due_date: dates[i],
      priority: 'medium',
    })),
  }
}

// Inserts the parent, then the children pointing at the parent's new id —
// single-level nesting only (children never carry their own children).
export async function commitScaffold({ parent, children }) {
  const { data: insertedParent, error: parentError } = await supabaseAdmin.from('todos').insert(parent).select().single()
  if (parentError) throw parentError

  const childRows = children.map((c) => ({ ...c, parent_todo_id: insertedParent.id }))
  const { data: insertedChildren, error: childError } = await supabaseAdmin.from('todos').insert(childRows).select()
  if (childError) throw childError

  return { parent: insertedParent, children: insertedChildren }
}
