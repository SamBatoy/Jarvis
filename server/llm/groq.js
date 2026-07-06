import OpenAI from 'openai'

let client = null
function getClient() {
  if (!client) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set. Add it to your environment (see .env.example).')
    }
    client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  }
  return client
}

// Groq's API is OpenAI-compatible, so messages/tools/response are already in
// the canonical shape the rest of the app expects — no translation needed.
export async function chatCompletion({ messages, tools, model }) {
  const completion = await getClient().chat.completions.create({
    model,
    messages,
    tools: tools?.length ? tools : undefined,
    tool_choice: tools?.length ? 'auto' : undefined,
  })

  const choice = completion.choices[0]
  return {
    content: choice.message.content ?? null,
    toolCalls: choice.message.tool_calls ?? null,
    finishReason: choice.finish_reason,
  }
}
