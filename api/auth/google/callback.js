import { google } from 'googleapis'
import { exchangeCodeForTokens, authorizedClient } from '../../../server/googleAuth.js'
import { encrypt } from '../../../server/tokenCrypto.js'
import { supabaseServiceRole } from '../../../server/supabaseServiceRole.js'

function stateCookie(req) {
  const cookies = req.headers.cookie ?? ''
  const match = cookies
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('google_oauth_state='))
  return match?.split('=')[1]
}

// A relative "/" redirect resolves against whatever origin served this
// request — in production that's fine (Vercel serves the frontend and
// /api from the same domain), but locally the API dev server (port 3001)
// and Vite (port 5175) are different origins, so the redirect needs an
// explicit absolute target.
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5175'

function redirectHome(res, params) {
  res.writeHead(302, { Location: `${APP_BASE_URL}/?${new URLSearchParams(params).toString()}` })
  res.end()
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  if (oauthError) {
    redirectHome(res, { google_connect: 'error', reason: oauthError })
    return
  }

  const expectedState = stateCookie(req)
  if (!state || !expectedState || state !== expectedState) {
    res.status(400).json({ error: 'Invalid OAuth state — possible CSRF. Please retry connecting.' })
    return
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    if (!tokens.refresh_token) {
      throw new Error(
        "Google didn't return a refresh token. Remove Jarvis from your Google Account's connected apps and try connecting again."
      )
    }

    // gmail.readonly alone is enough to fetch the connected address, so no
    // extra userinfo/openid scope is needed just for display purposes.
    const client = authorizedClient(tokens.access_token)
    const gmail = google.gmail({ version: 'v1', auth: client })
    const profile = await gmail.users.getProfile({ userId: 'me' })

    const { error: dbError } = await supabaseServiceRole.from('oauth_connections').upsert(
      {
        provider: 'google',
        encrypted_refresh_token: encrypt(tokens.refresh_token),
        encrypted_access_token: encrypt(tokens.access_token),
        access_token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        scopes: tokens.scope ?? '',
        google_email: profile.data.emailAddress ?? null,
        connected_at: new Date().toISOString(),
        last_refreshed_at: new Date().toISOString(),
        needs_reauth: false,
      },
      { onConflict: 'provider' }
    )
    if (dbError) throw dbError

    redirectHome(res, { google_connect: 'success' })
  } catch (e) {
    redirectHome(res, { google_connect: 'error', reason: e.message })
  }
}
