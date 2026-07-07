import crypto from 'node:crypto'
import { buildConsentUrl } from '../../../server/googleAuth.js'

// Redirects to Google's consent screen. The state param is a lightweight
// CSRF defense (this app has no session store) — set as an httpOnly cookie
// on the way out, checked against the query param the callback receives.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const state = crypto.randomBytes(16).toString('hex')
  res.setHeader('Set-Cookie', `google_oauth_state=${state}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax`)
  res.writeHead(302, { Location: buildConsentUrl(state) })
  res.end()
}
