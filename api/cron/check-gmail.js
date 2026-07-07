import { google } from 'googleapis'
import { supabaseAdmin } from '../../server/supabaseAdmin.js'
import { supabaseServiceRole } from '../../server/supabaseServiceRole.js'
import { decrypt, encrypt } from '../../server/tokenCrypto.js'
import { getFreshAccessToken, authorizedClient } from '../../server/googleAuth.js'
import { chatCompletion } from '../../server/llm/index.js'
import { logAction } from '../../server/actionLog.js'

// Deliberately loose pre-filter — the LLM pass afterward is what actually
// decides whether something is a real deadline, this just keeps the LLM
// call bounded to plausible candidates instead of every message.
const KEYWORD_PATTERN = /\b(due|deadline|submit(?:ted|ting)?|assignment|homework|turn in)\b/i
const LOOKBACK_WINDOW = 'newer_than:2d'

async function loadConnection() {
  const { data } = await supabaseServiceRole.from('oauth_connections').select('*').eq('provider', 'google').maybeSingle()
  return data
}

async function markNeedsReauth() {
  await supabaseServiceRole.from('oauth_connections').update({ needs_reauth: true }).eq('provider', 'google')
}

// The natural failure mode of staying in Google's Testing publishing
// status (refresh tokens expire every 7 days there) — caught here so the
// cron degrades to a no-op with needs_reauth set, instead of erroring.
async function refreshAndPersist(connection) {
  const refreshToken = decrypt(connection.encrypted_refresh_token)
  const { accessToken, expiryDate } = await getFreshAccessToken(refreshToken)
  await supabaseServiceRole
    .from('oauth_connections')
    .update({
      encrypted_access_token: encrypt(accessToken),
      access_token_expires_at: new Date(expiryDate).toISOString(),
      last_refreshed_at: new Date().toISOString(),
    })
    .eq('provider', 'google')
  return accessToken
}

// Avoids re-running the LLM pass on messages already suggested in a prior
// cron run (Gmail's 2-day lookback window naturally re-includes yesterday's
// messages) — the unique(source, source_id) constraint would silently
// reject the duplicate insert anyway, but this saves the LLM call itself.
async function filterUnseen(candidates) {
  if (candidates.length === 0) return []
  const { data: existing } = await supabaseAdmin
    .from('pending_suggestions')
    .select('source_id')
    .eq('source', 'gmail')
    .in(
      'source_id',
      candidates.map((c) => c.sourceId)
    )
  const seen = new Set((existing ?? []).map((r) => r.source_id))
  return candidates.filter((c) => !seen.has(c.sourceId))
}

// One LLM pass over just the keyword-narrowed, not-yet-seen candidates —
// same "deterministic narrowing plus one LLM call" shape used throughout
// this app (scaffold.js, the daily briefs). Only real, specific deadlines
// get extracted; ambiguous mentions are dropped rather than guessed at.
async function extractDeadlines(candidates) {
  if (candidates.length === 0) return []
  const prompt = `You are scanning ${candidates.length} email(s) for genuine assignment/task deadlines. For each one, decide if it truly names a specific task with a due date or deadline — not a vague mention of the word "due"/"deadline" with no real task attached.
Respond with ONLY a JSON array, exactly one entry per email in the same order: either null (no real deadline), or {"title": "short task title", "dueDate": "ISO 8601 datetime, or null if a task is clearly implied but no specific date/time is given"}.

Emails:
${candidates.map((c, i) => `${i + 1}. "${c.title}": ${c.snippet}`).join('\n')}

Respond with ONLY the JSON array, nothing else.`

  try {
    const response = await chatCompletion({ messages: [{ role: 'user', content: prompt }], tools: [] })
    const parsed = JSON.parse(response.content)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item, i) => (item ? { ...candidates[i], title: item.title, dueDate: item.dueDate ?? null } : null))
      .filter(Boolean)
  } catch {
    return [] // never let a malformed LLM response break the cron
  }
}

async function checkGmail(accessToken) {
  const gmail = google.gmail({ version: 'v1', auth: authorizedClient(accessToken) })
  const list = await gmail.users.messages.list({ userId: 'me', q: LOOKBACK_WINDOW, maxResults: 25 })
  const messages = list.data.messages ?? []

  const candidates = []
  for (const m of messages) {
    const msg = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'metadata', metadataHeaders: ['Subject'] })
    const subject = msg.data.payload?.headers?.find((h) => h.name === 'Subject')?.value ?? '(no subject)'
    const snippet = msg.data.snippet ?? ''
    if (KEYWORD_PATTERN.test(subject) || KEYWORD_PATTERN.test(snippet)) {
      candidates.push({ source: 'gmail', sourceId: m.id, title: subject, snippet })
    }
  }
  return extractDeadlines(await filterUnseen(candidates))
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const connection = await loadConnection()
  if (!connection || connection.needs_reauth) {
    res.status(200).json({ ok: true, skipped: true, reason: !connection ? 'not connected' : 'needs reauth' })
    return
  }

  let accessToken
  try {
    accessToken = await refreshAndPersist(connection)
  } catch (e) {
    await markNeedsReauth()
    res.status(200).json({ ok: true, skipped: true, reason: 'token refresh failed: ' + e.message })
    return
  }

  let results
  try {
    results = await checkGmail(accessToken)
  } catch (e) {
    res.status(500).json({ error: 'Gmail check failed: ' + e.message })
    return
  }

  let inserted = 0
  for (const item of results) {
    const { error } = await supabaseAdmin.from('pending_suggestions').insert({
      source: 'gmail',
      source_id: item.sourceId,
      suggested_type: item.dueDate ? 'deadline' : 'todo',
      title: item.title,
      due_date: item.dueDate,
      notes: item.snippet?.slice(0, 300) ?? null,
    })
    if (!error) inserted++
    // A unique(source, source_id) conflict here just means a concurrent run
    // beat us to it — not a real failure, nothing to surface.
  }

  if (inserted > 0) {
    await logAction({
      action: 'gmail_check',
      summary: `Found ${inserted} new suggestion${inserted === 1 ? '' : 's'} from Gmail`,
      source: 'auto',
    })
  }

  res.status(200).json({ ok: true, found: inserted })
}
