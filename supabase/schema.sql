-- Jarvis schema: contexts (subjects & projects), todos, events, deadlines, goals, learning_paths
-- Run this once against a fresh Supabase project (SQL Editor), then rls.sql, then optionally seed.sql.

create extension if not exists pgcrypto;

-- ─── contexts ───────────────────────────────────────────────────────────────
-- The unifying container for both school (type='subject') and personal
-- projects (type='project'). Subject-only and project-only fields are both
-- present but only one set is populated depending on type.
create table if not exists contexts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('subject', 'project')),
  color text not null,
  -- subject-only fields
  instructor text,
  class_schedule jsonb, -- [{ day_of_week: 0-6 (Sun-Sat), start_time: 'HH:MM', end_time: 'HH:MM' }, ...]
  -- project-only fields
  description text,
  status text check (status in ('active', 'shipped', 'paused')),
  created_at timestamptz not null default now()
);

-- ─── goals ──────────────────────────────────────────────────────────────────
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  why_it_matters text,
  target_date date,
  status text not null default 'active' check (status in ('active', 'achieved', 'abandoned')),
  created_at timestamptz not null default now(),
  achieved_at timestamptz -- set when status transitions to 'achieved'; drives the chronological Archive/Done view
);

-- ─── todos ──────────────────────────────────────────────────────────────────
create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  done boolean not null default false,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date timestamptz,
  created_at timestamptz not null default now(),
  context_id uuid references contexts(id) on delete set null,
  goal_id uuid references goals(id) on delete set null,
  task_type text check (task_type in (
    'study', 'presentation', 'problem-set', 'exam-prep', 'reading',
    'build-feature', 'design', 'debug', 'deploy', 'ship', 'general'
  )),
  parent_todo_id uuid references todos(id) on delete cascade,
  -- archiving: completing a todo archives it instantly (trigger below,
  -- independent of due_date entirely); a todo whose due_date passes while
  -- still not done auto-archives daily (cron) as 'missed'; the user can
  -- also archive one manually early. reason: 'completed' | 'missed' | 'manual'
  archived boolean not null default false,
  archived_at timestamptz,
  archive_reason text check (archive_reason in ('completed', 'missed', 'manual')),
  -- Phase 3 personalization: optional time estimate/actual, settable at
  -- creation or completion. completed_at is set by a trigger below and is
  -- deliberately distinct from archived_at (archiving lags up to 24h behind
  -- the real completion moment, since the archive cron runs once daily).
  estimated_minutes integer,
  actual_minutes integer,
  completed_at timestamptz,
  -- Phase 4: real last-activity signal for stuck detection, and one
  -- categorical reason per missed todo (asked once in a Night Review batch).
  updated_at timestamptz not null default now(),
  missed_reason text check (missed_reason in ('too_hard', 'forgot', 'poor_estimate', 'other'))
);

create index if not exists todos_context_id_idx on todos(context_id);
create index if not exists todos_goal_id_idx on todos(goal_id);
create index if not exists todos_parent_todo_id_idx on todos(parent_todo_id);
create index if not exists todos_due_date_idx on todos(due_date);
create index if not exists todos_archived_idx on todos(archived);
create index if not exists todos_completed_at_idx on todos(completed_at);
create index if not exists todos_updated_at_idx on todos(updated_at);

-- Shared by todos and learning_paths.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists todos_set_updated_at on todos;
create trigger todos_set_updated_at before update on todos
  for each row execute function set_updated_at();

-- done can be toggled from two independent code paths (dashboard checkbox,
-- chat's update_todo), so a trigger is the single source of truth for
-- completed_at *and* instant archiving rather than threading it through
-- both — completing a todo archives it immediately, regardless of
-- due_date; see 010_instant_archive_on_complete.sql for the bug this fixed
-- (archiving used to wait for due_date to pass even for completed todos).
create or replace function set_todo_completed_at()
returns trigger as $$
begin
  if new.done = true and (old.done is distinct from true) then
    new.completed_at := now();
    new.archived := true;
    new.archived_at := now();
    new.archive_reason := 'completed';
  elsif new.done = false then
    new.completed_at := null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists todos_set_completed_at on todos;
create trigger todos_set_completed_at
  before insert or update on todos
  for each row
  execute function set_todo_completed_at();

-- ─── events ─────────────────────────────────────────────────────────────────
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  location text,
  context_id uuid references contexts(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists events_context_id_idx on events(context_id);
create index if not exists events_start_at_idx on events(start_at);

-- ─── deadlines ──────────────────────────────────────────────────────────────
create table if not exists deadlines (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  due_at timestamptz not null,
  context_id uuid references contexts(id) on delete set null,
  goal_id uuid references goals(id) on delete set null,
  status text not null default 'upcoming' check (status in ('upcoming', 'met', 'missed')),
  created_at timestamptz not null default now()
);

create index if not exists deadlines_context_id_idx on deadlines(context_id);
create index if not exists deadlines_due_at_idx on deadlines(due_at);

-- ─── learning_paths ─────────────────────────────────────────────────────────
create table if not exists learning_paths (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  created_at timestamptz not null default now(),
  skills jsonb not null default '[]',
  -- skills: [{ name, description, done, resources: [{ title, url, type }] }, ...]
  -- Phase 4: real last-activity signal for stuck detection, and a real
  -- paused state so a dismissed stuck-path notice actually stops recurring.
  updated_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'paused'))
);

drop trigger if exists learning_paths_set_updated_at on learning_paths;
create trigger learning_paths_set_updated_at before update on learning_paths
  for each row execute function set_updated_at();

-- ─── action_log ─────────────────────────────────────────────────────────────
-- Trust & Control Layer: a visible record of what Jarvis did and why,
-- covering confirmed writes (chat + dashboard) and automated actions (cron).
create table if not exists action_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  summary text not null,
  source text not null check (source in ('chat', 'dashboard', 'auto')),
  entity_type text,
  entity_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists action_log_created_at_idx on action_log(created_at desc);

-- Goals can be marked achieved from two independent code paths (dashboard
-- form direct-to-Supabase, and chat's update_goal server tool) — a trigger
-- is the single source of truth for achieved_at regardless of which path updates the row.
create or replace function set_goal_achieved_at()
returns trigger as $$
begin
  if new.status = 'achieved' and (old.status is distinct from 'achieved') then
    new.achieved_at := now();
  elsif new.status is distinct from 'achieved' then
    new.achieved_at := null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists goals_set_achieved_at on goals;
create trigger goals_set_achieved_at
  before insert or update on goals
  for each row
  execute function set_goal_achieved_at();

-- ─── daily_briefs ────────────────────────────────────────────────────────────
-- Morning Brief / Night Review, generated once daily by Vercel Cron (never
-- user-triggered), persisted so they survive between cron runs and page loads.
create table if not exists daily_briefs (
  id uuid primary key default gen_random_uuid(),
  brief_date date not null,
  type text not null check (type in ('morning', 'night')),
  content jsonb not null,
  created_at timestamptz not null default now(),
  unique (brief_date, type)
);

create index if not exists daily_briefs_date_idx on daily_briefs(brief_date desc);

-- ─── oauth_connections ─────────────────────────────────────────────────────
-- Phase 5 (Gmail-only — Classroom and Chat were both dropped, see
-- migrations 008/009 for why). RLS enabled, ZERO policies for anon —
-- an OAuth refresh token is a live credential to a real external account,
-- qualitatively more sensitive than everything else in this app. Only the
-- service-role client (server/supabaseServiceRole.js) can touch this table,
-- server-side only. Token values are also encrypted at the application
-- layer (server/tokenCrypto.js) before being written here.
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
  needs_reauth boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table oauth_connections enable row level security;

-- ─── pending_suggestions ───────────────────────────────────────────────────
-- Detected-but-unconfirmed todo/deadline candidates from Gmail.
-- Standard anon-full-access pattern — suggestion content is low-stakes
-- app-internal data, not a secret.
create table if not exists pending_suggestions (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('gmail')),
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
create index if not exists pending_suggestions_status_idx on pending_suggestions(status);
