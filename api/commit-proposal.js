import { getTool } from '../server/tools/registry.js'

// Stateless by design: the client sends back the exact preview payload it
// was shown (not just an id), so there's no server-side "pending proposal"
// state to manage across serverless invocations. We never trust that
// payload blindly — it's re-validated against the tool's previewSchema
// before any write happens, so a tampered or malformed client payload can't
// slip through.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { toolName, payload } = req.body ?? {}
  const tool = getTool(toolName)
  if (!tool || tool.kind !== 'propose') {
    res.status(400).json({ error: `"${toolName}" is not a proposable tool.` })
    return
  }

  const parsed = tool.previewSchema.safeParse(payload)
  if (!parsed.success) {
    res.status(400).json({ error: 'Proposal payload failed validation.', details: parsed.error.issues })
    return
  }

  try {
    const result = await tool.commit(parsed.data)
    res.status(200).json({ result })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
