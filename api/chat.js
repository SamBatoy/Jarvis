import { chatCompletion } from '../server/llm/index.js'
import { getTool, allOpenAITools } from '../server/tools/registry.js'
import { buildSystemPrompt } from '../server/systemPrompt.js'

const MAX_TOOL_ROUNDS = 6

// Status codes that mean "the provider itself is unavailable/exhausted, or
// this exact request can never succeed as-is" (rate limit, auth, outage,
// payload too large) — retrying with model-facing feedback can't fix these,
// so fail fast with a clear message instead of burning every round. 413
// specifically showed up as a real bug: a bloated conversation (e.g. from
// several large tool results) kept getting retried with an ever-growing
// "fix your arguments" message appended each round, which only made the
// payload bigger, until MAX_TOOL_ROUNDS ran out and surfaced a misleading
// "tool-call limit" message instead of the real cause.
const PROVIDER_FAILURE_STATUS = new Set([401, 403, 413, 429, 500, 502, 503])

async function runTool(call) {
  const tool = getTool(call.function.name)
  if (!tool) {
    return { error: `Unknown tool "${call.function.name}"` }
  }

  let args
  try {
    args = JSON.parse(call.function.arguments || '{}')
  } catch {
    return { error: 'Malformed tool call: arguments were not valid JSON.' }
  }

  const parsed = tool.zodSchema.safeParse(args)
  if (!parsed.success) {
    return { error: 'Invalid arguments for this tool.', details: parsed.error.issues }
  }

  try {
    const result = await tool.execute(parsed.data)
    if (tool.kind === 'propose') {
      return { proposed: true, toolName: tool.name, preview: result }
    }
    return result
  } catch (e) {
    return { error: e.message }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { messages } = req.body ?? {}
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: 'Request body must include a "messages" array.' })
    return
  }

  const conversation = [{ role: 'system', content: buildSystemPrompt() }, ...messages]
  const tools = allOpenAITools()
  let proposal = null

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      let response
      try {
        response = await chatCompletion({ messages: conversation, tools })
      } catch (e) {
        if (process.env.DEBUG_CHAT) console.log(`[round ${round}] chatCompletion threw:`, e.status, e.message)

        if (PROVIDER_FAILURE_STATUS.has(e.status)) {
          // Not something a retry-with-feedback loop can fix — surface it
          // immediately instead of burning the remaining rounds.
          const message =
            e.status === 413
              ? `This conversation got too large for the model to process in one request (${e.message}). Try starting a new conversation or asking something more specific.`
              : `Jarvis's language model provider is currently unavailable (${e.status}): ${e.message}`
          res.status(e.status === 429 || e.status === 413 ? e.status : 502).json({ error: message })
          return
        }

        // Otherwise the provider rejected the tool call itself (e.g. Groq
        // validates JSON-schema constraints server-side and hard-fails the
        // request instead of returning a normal tool call). No assistant
        // message was produced this round, so there's no tool_call_id to
        // attach an error to — tell the model what went wrong as a plain
        // turn and let it retry with corrected arguments.
        conversation.push({
          role: 'user',
          content: `Your last tool call was rejected before it ran: ${e.message}. Retry with corrected, valid arguments (real UUIDs from list results, full ISO 8601 datetimes).`,
        })
        continue
      }

      if (!response.toolCalls || response.toolCalls.length === 0) {
        res.status(200).json({ message: { role: 'assistant', content: response.content }, proposal })
        return
      }

      conversation.push({ role: 'assistant', content: response.content, tool_calls: response.toolCalls })

      for (const call of response.toolCalls) {
        const result = await runTool(call)
        if (process.env.DEBUG_CHAT) {
          console.log(`[round ${round}] ${call.function.name}(${call.function.arguments}) ->`, JSON.stringify(result).slice(0, 300))
        }
        if (result?.proposed) proposal = { toolName: result.toolName, preview: result.preview }
        conversation.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) })
      }
    }

    res.status(200).json({
      message: {
        role: 'assistant',
        content: "I've hit my tool-call limit for this turn — try rephrasing or splitting the request into smaller steps.",
      },
      proposal,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
