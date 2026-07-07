-- Phase 1 (Foundation) migration: run this once in the Supabase SQL Editor
-- before building against it. Safe to re-run (guards with if not exists).

-- ─── archiving on todos ─────────────────────────────────────────────────────
-- Todos past their due date auto-archive daily (via cron) so the active list
-- stays clean; the user can also archive one manually ahead of schedule.
-- archive_reason distinguishes why it left the active list:
--   'completed' - auto-archived, was done when its due date passed
--   'missed'    - auto-archived, was NOT done when its due date passed
--   'manual'    - user archived it early themselves
alter table todos add column if not exists archived boolean not null default false;
alter table todos add column if not exists archived_at timestamptz;
alter table todos add column if not exists archive_reason text
  check (archive_reason in ('completed', 'missed', 'manual'));
create index if not exists todos_archived_idx on todos(archived);

-- ─── goals ──────────────────────────────────────────────────────────────────
-- created_at alone can't tell us *when* a goal became achieved, which the
-- chronological Archive/Done view needs.
alter table goals add column if not exists achieved_at timestamptz;

-- ─── action_log ─────────────────────────────────────────────────────────────
-- Trust & Control Layer standard: a visible record of what Jarvis did and
-- why, covering confirmed writes (chat + dashboard) and automated actions
-- (cron). Written from a single choke point in api/commit-proposal.js plus
-- the cron archive job, so every current and future propose/commit tool is
-- covered without per-tool changes.
create table if not exists action_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,               -- e.g. 'create_todo', 'archive_todo', 'delete_goal'
  summary text not null,              -- human-readable, e.g. "Archived 'Problem set 3' (missed deadline)"
  source text not null check (source in ('chat', 'dashboard', 'auto')),
  entity_type text,                   -- 'todo' | 'event' | 'deadline' | 'goal' | 'context' | 'learning_path'
  entity_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists action_log_created_at_idx on action_log(created_at desc);

alter table action_log enable row level security;
drop policy if exists "anon full access" on action_log;
create policy "anon full access" on action_log
  for all to anon using (true) with check (true);
