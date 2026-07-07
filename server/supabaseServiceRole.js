import { createClient } from '@supabase/supabase-js'

// The first real service-role usage in this codebase, deliberately scoped
// to a single table (oauth_connections). Every other server function uses
// server/supabaseAdmin.js, which despite its name authenticates with the
// same anon key as the browser (fine for this app's low-stakes,
// single-user data) — but an OAuth refresh token is a live, standing
// credential to a real external account, and storing it under the
// anon-access pattern would mean the browser's own (already-public) anon
// key could read it directly. This client bypasses RLS entirely, so it
// must never be imported from anything that isn't strictly server-side,
// and must never touch any table other than oauth_connections.
const url = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in the server environment.')
}

export const supabaseServiceRole = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
