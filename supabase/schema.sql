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
  -- archiving: todos past their due date auto-archive daily (cron), or the
  -- user can archive one manually early. reason distinguishes why it left
  -- the active list: 'completed' | 'missed' (both auto, by due-date pass) | 'manual'
  archived boolean not null default false,
  archived_at timestamptz,
  archive_reason text check (archive_reason in ('completed', 'missed', 'manual'))
);

create index if not exists todos_context_id_idx on todos(context_id);
create index if not exists todos_goal_id_idx on todos(goal_id);
create index if not exists todos_parent_todo_id_idx on todos(parent_todo_id);
create index if not exists todos_due_date_idx on todos(due_date);
create index if not exists todos_archived_idx on todos(archived);

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
  skills jsonb not null default '[]'
  -- skills: [{ name, description, done, resources: [{ title, url, type }] }, ...]
);

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
