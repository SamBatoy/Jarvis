import { supabaseServiceRole } from '../server/supabaseServiceRole.js'

// The ONLY read path the client ever gets into oauth_connections — never
// the token itself, just enough to render a connection status/banner.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { data, error } = await supabaseServiceRole
    .from('oauth_connections')
    .select('google_email, needs_reauth, connected_at')
    .eq('provider', 'google')
    .maybeSingle()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  if (!data) {
    res.status(200).json({ connected: false })
    return
  }

  res.status(200).json({
    connected: true,
    googleEmail: data.google_email,
    needsReauth: data.needs_reauth,
    connectedAt: data.connected_at,
  })
}
