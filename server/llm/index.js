import * as groq from './groq.js'
import * as anthropic from './anthropic.js'

const PROVIDERS = { groq, anthropic }

const DEFAULT_MODEL_BY_PROVIDER = {
  groq: 'llama-3.3-70b-versatile',
  anthropic: 'claude-sonnet-5',
}

// Single entry point the rest of the server uses for chat + tool use.
// Swap providers/models by changing LLM_PROVIDER / LLM_MODEL — nothing else
// in the app needs to know which one is active.
export async function chatCompletion({ messages, tools }) {
  const provider = process.env.LLM_PROVIDER || 'groq'
  const impl = PROVIDERS[provider]
  if (!impl) {
    throw new Error(`Unknown LLM_PROVIDER "${provider}". Expected one of: ${Object.keys(PROVIDERS).join(', ')}`)
  }
  const model = process.env.LLM_MODEL || DEFAULT_MODEL_BY_PROVIDER[provider]
  return impl.chatCompletion({ messages, tools, model })
}
