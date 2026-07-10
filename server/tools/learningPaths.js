import { supabaseAdmin } from '../supabaseAdmin.js'
import { chatCompletion } from '../llm/index.js'
import { search, isSearchConfigured } from '../search/tavily.js'

export async function listLearningPaths() {
  const { data, error } = await supabaseAdmin.from('learning_paths').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// The model is asked to mark 3-4 "pivotal" skills isKey:true, but that
// instruction is unenforced — if it complies with none, resource search
// would silently never run for the whole generation. Guarantee at least
// one attempt by falling back to the first few skills. Exported so this
// can be exercised directly without a live LLM call.
export function applyIsKeyFallback(skills) {
  if (skills.some((s) => s.isKey === true)) return skills
  const fallbackCount = Math.min(4, skills.length)
  return skills.map((s, i) => ({ ...s, isKey: i < fallbackCount }))
}

async function generateSkillList(topic) {
  const prompt = `Create a structured learning path for: "${topic}".
List 5 to 8 skills in order from fundamentals to advanced. Mark the 3 or 4 most pivotal skills (the ones most worth spending real study resources on) with "isKey": true, the rest false.
Respond with ONLY a JSON array, nothing else — no markdown, no explanation. Example:
[{"name": "Networking basics", "description": "How data moves between machines", "isKey": true}, ...]`

  const response = await chatCompletion({ messages: [{ role: 'user', content: prompt }], tools: [] })
  const skills = JSON.parse(response.content)
  if (!Array.isArray(skills) || skills.length === 0) throw new Error('Model did not return a valid skill list')
  return applyIsKeyFallback(skills)
}

export async function pickResourcesForSkill(topic, skill) {
  const results = await search(`${topic} ${skill.name} tutorial`, { maxResults: 5 })
  if (!results || results.length === 0) return []

  const prompt = `Search results for learning "${skill.name}" (part of a "${topic}" learning path):
${JSON.stringify(results)}

Pick the 2 or 3 best, most relevant, highest-quality resources from the list above. Only use titles/urls that literally appear in the results above — never invent one.
Respond with ONLY a JSON array, nothing else. Example:
[{"title": "...", "url": "...", "type": "article"}]`

  try {
    const response = await chatCompletion({ messages: [{ role: 'user', content: prompt }], tools: [] })
    const resources = JSON.parse(response.content)
    if (Array.isArray(resources)) return resources
  } catch {
    // degrade gracefully — a skill with no resources is fine, an invented link is not
  }
  return []
}

export async function proposeLearningPath({ topic }) {
  const skillList = await generateSkillList(topic)
  const searchConfigured = isSearchConfigured()

  const skills = []
  for (const skill of skillList) {
    const resources = searchConfigured && skill.isKey ? await pickResourcesForSkill(topic, skill) : []
    skills.push({ name: skill.name, description: skill.description, done: false, resources })
  }

  return { topic, skills, resourcesAvailable: searchConfigured }
}

export async function commitLearningPath({ topic, skills }) {
  const { data, error } = await supabaseAdmin.from('learning_paths').insert({ topic, skills }).select().single()
  if (error) throw error
  return data
}
