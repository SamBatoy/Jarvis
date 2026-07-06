import Anthropic from '@anthropic-ai/sdk'

let client = null
function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set. Add it to your environment (see .env.example).')
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return client
}

// The rest of the app speaks OpenAI's chat-completions shape (messages with
// role system/user/assistant/tool, tool_calls with function.name/arguments).
// This module is the only place that translates to/from Anthropic's shape,
// so swapping providers never touches the chat loop or tool registry.

function toAnthropicTools(tools) {
  return (tools ?? []).map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }))
}

function toAnthropicMessages(messages) {
  const result = []
  for (const m of messages) {
    if (m.role === 'system') continue // handled separately
    if (m.role === 'user') {
      result.push({ role: 'user', content: [{ type: 'text', text: m.content }] })
    } else if (m.role === 'assistant') {
      const content = []
      if (m.content) content.push({ type: 'text', text: m.content })
      for (const tc of m.tool_calls ?? []) {
        content.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.function.name,
          input: JSON.parse(tc.function.arguments || '{}'),
        })
      }
      result.push({ role: 'assistant', content })
    } else if (m.role === 'tool') {
      result.push({
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: m.tool_call_id, content: m.content }],
      })
    }
  }
  return result
}

function fromAnthropicResponse(response) {
  let content = null
  const toolCalls = []
  for (const block of response.content) {
    if (block.type === 'text') {
      content = (content ?? '') + block.text
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        type: 'function',
        function: { name: block.name, arguments: JSON.stringify(block.input) },
      })
    }
  }
  return {
    content,
    toolCalls: toolCalls.length ? toolCalls : null,
    finishReason: response.stop_reason === 'tool_use' ? 'tool_calls' : 'stop',
  }
}

export async function chatCompletion({ messages, tools, model }) {
  const system = messages.find((m) => m.role === 'system')?.content
  const response = await getClient().messages.create({
    model,
    max_tokens: 4096,
    system,
    messages: toAnthropicMessages(messages),
    tools: tools?.length ? toAnthropicTools(tools) : undefined,
  })
  return fromAnthropicResponse(response)
}
