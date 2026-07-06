import { createClient } from '@supabase/supabase-js'

// Server-side functions use the same anon key as the browser client — RLS
// grants the anon role full access (see supabase/rls.sql), since this is a
// single-user app with no auth. Vercel exposes all project env vars to
// serverless functions regardless of the VITE_ prefix, so no separate
// server-only var is needed.
const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in the server environment.')
}

export const supabaseAdmin = createClient(url, anonKey)
