import { chatCompletion } from '../server/llm/index.js'

const FALLBACK = 'Open the task and write down what "done" looks like — that alone often breaks the freeze.'

// Read-only, no DB write — same class as a "read" tool. Lets a stuck todo's
// badge ask for one short, concrete first step without going through the
// full chat tool loop for what's really a canned one-shot completion.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { title, notes, taskType } = req.body ?? {}
  if (!title) {
    res.status(400).json({ error: 'title is required' })
    return
  }

  const prompt = `You are Jarvis helping someone get unstuck on a task they've been avoiding.
Task: "${title}"${taskType ? ` (type: ${taskType})` : ''}${notes ? `\nNotes: ${notes}` : ''}
Suggest ONE short, concrete first step to actually start this task right now — something that takes 5-10 minutes, not the whole task. No preamble, no quotes, just the suggestion, one sentence.`

  try {
    const response = await chatCompletion({ messages: [{ role: 'user', content: prompt }], tools: [] })
    res.status(200).json({ suggestion: response.content?.trim() || FALLBACK })
  } catch (e) {
    res.status(200).json({ suggestion: FALLBACK })
  }
}
