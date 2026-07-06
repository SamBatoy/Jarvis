// Swappable web search module. Only Tavily is implemented today, but every
// caller goes through this one function — swapping providers later means
// changing this file, not the learning-path logic that consumes it.
const TAVILY_URL = 'https://api.tavily.com/search'

export function isSearchConfigured() {
  return !!process.env.TAVILY_API_KEY
}

export async function search(query, { maxResults = 5 } = {}) {
  if (!isSearchConfigured()) return null

  const res = await fetch(TAVILY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: maxResults,
      include_answer: false,
    }),
  })
  if (!res.ok) throw new Error(`Tavily search failed (${res.status})`)
  const data = await res.json()
  return (data.results ?? []).map((r) => ({ title: r.title, url: r.url, content: r.content }))
}
