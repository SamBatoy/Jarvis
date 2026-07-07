-- Phase 5 (Gmail + Google Classroom integration) migration: run this once
-- in the Supabase SQL Editor before building against it. Safe to re-run.

-- Locked down: RLS enabled, ZERO policies for anon. An OAuth refresh token
-- is a live, standing credential to a real external account — qualitatively
-- more sensitive than everything else in this app, which uses the
-- anon-full-access pattern throughout. Only the new service-role client
-- (server/supabaseServiceRole.js) can touch this table, and only from
-- server-side code (OAuth callback, cron, the connection-status endpoint).
-- Token values are additionally encrypted at the application layer
-- (server/tokenCrypto.js) before being written here, independent of
-- Supabase's own disk-level encryption.
create table if not exists oauth_connections (
  id uuid primary key default gen_random_uuid(),
  -- Single-user app: one row per provider, upserted on (re)connect.
  provider text not null unique check (provider in ('google')),
  encrypted_refresh_token text not null,
  encrypted_access_token text,
  access_token_expires_at timestamptz,
  scopes text not null,
  google_email text,
  connected_at timestamptz not null default now(),
  last_refreshed_at timestamptz,
  -- Set true when a token refresh fails (7-day Testing-mode expiry, or a
  -- revoked grant) so the dashboard can show a "Reconnect" banner.
  needs_reauth boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table oauth_connections enable row level security;

-- Standard anon-full-access pattern, same as daily_briefs/action_log —
-- suggestion content itself (a candidate title/date extracted from an
-- email or coursework item) is low-stakes app-internal data, not a secret.
create table if not exists pending_suggestions (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('gmail', 'classroom')),
  -- Gmail message id / Classroom coursework id — dedupes across cron runs
  -- regardless of a suggestion's current status, so a dismissed or
  -- confirmed item is never re-suggested.
  source_id text not null,
  suggested_type text not null check (suggested_type in ('todo', 'deadline')),
  title text not null,
  due_date timestamptz,
  notes text,
  context_id uuid references contexts(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'dismissed')),
  detected_at timestamptz not null default now(),
  unique (source, source_id)
);
alter table pending_suggestions enable row level security;
drop policy if exists "anon full access" on pending_suggestions;
create policy "anon full access" on pending_suggestions
  for all to anon using (true) with check (true);

create index if not exists pending_suggestions_status_idx on pending_suggestions(status);
