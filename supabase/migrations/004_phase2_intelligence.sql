-- Phase 2 (Intelligence) migration: run this once in the Supabase SQL
-- Editor before building against it. Safe to re-run (guards with if not exists).

-- ─── daily_briefs ────────────────────────────────────────────────────────
-- Morning Brief / Night Review are generated once daily by Vercel Cron
-- (never user-triggered) and persisted here so they survive between cron
-- runs and dashboard loads. unique(brief_date, type) means re-running a
-- brief's cron for the same day refreshes it in place (upsert) rather than
-- creating a duplicate.
create table if not exists daily_briefs (
  id uuid primary key default gen_random_uuid(),
  brief_date date not null,
  type text not null check (type in ('morning', 'night')),
  content jsonb not null,
  created_at timestamptz not null default now(),
  unique (brief_date, type)
);
create index if not exists daily_briefs_date_idx on daily_briefs(brief_date desc);

alter table daily_briefs enable row level security;
drop policy if exists "anon full access" on daily_briefs;
create policy "anon full access" on daily_briefs
  for all to anon using (true) with check (true);
