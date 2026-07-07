import { google } from 'googleapis'

// Gmail-only: Classroom got dropped (a consent-screen scope mix-up, see
// migrations 008/009's history), then Google Chat got dropped too (its API
// requires a paid Workspace account, not available to the personal
// @gmail.com account actually connected here — see migration
// 009_gmail_only_pivot.sql). Full Gmail read is needed for message body
// content, not just headers. No write scopes, no full-account scopes.
export const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

function newOAuthClient() {
  return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI)
}

export function buildConsentUrl(state) {
  return newOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // ensures a refresh token is issued even on repeat auth, not just the first grant
    scope: GOOGLE_SCOPES,
    state,
  })
}

export async function exchangeCodeForTokens(code) {
  const client = newOAuthClient()
  const { tokens } = await client.getToken(code)
  return tokens // { access_token, refresh_token, expiry_date, scope, ... }
}

// Returns a fresh, valid access token derived from the stored refresh
// token. Throws if the refresh token itself is expired or revoked — the
// natural failure mode of staying in Google's Testing publishing status
// (refresh tokens expire after 7 days there) — callers must catch this and
// set needs_reauth rather than let the cron fail loudly.
export async function getFreshAccessToken(refreshToken) {
  const client = newOAuthClient()
  client.setCredentials({ refresh_token: refreshToken })
  await client.getAccessToken()
  return {
    accessToken: client.credentials.access_token,
    expiryDate: client.credentials.expiry_date ?? null,
  }
}

export function authorizedClient(accessToken) {
  const client = newOAuthClient()
  client.setCredentials({ access_token: accessToken })
  return client
}
