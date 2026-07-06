import { getTool } from '../server/tools/registry.js'

// Lets the dashboard UI trigger a propose_* tool directly (e.g. "generate a
// learning path", "turn this skill into todos") without going through the
// chat/LLM loop — these are deterministic UI actions, not natural-language
// requests, so there's nothing for a model to interpret. It reuses the exact
// same tool.execute() + tool.zodSchema as the chat path, so both routes
// produce identically-shaped previews that flow into the same
// /api/commit-proposal confirm step.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { toolName, args } = req.body ?? {}
  const tool = getTool(toolName)
  if (!tool || tool.kind !== 'propose') {
    res.status(400).json({ error: `"${toolName}" is not a proposable tool.` })
    return
  }

  const parsed = tool.zodSchema.safeParse(args ?? {})
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid arguments.', details: parsed.error.issues })
    return
  }

  try {
    const preview = await tool.execute(parsed.data)
    res.status(200).json({ toolName, preview })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
