-- Phase 4 (Intelligence Extensions) migration: run this once in the
-- Supabase SQL Editor before building against it. Safe to re-run.
--
-- Note: goal-todo linkage needs NO migration — todos.goal_id already
-- exists from the original build and is already used throughout (Smart
-- Priority, scaffolding, GoalsPanel's progress bar).

-- Shared by todos and learning_paths — a real last-activity signal for
-- stuck detection (created_at alone doesn't capture "touched yesterday,
-- created three weeks ago").
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

alter table todos add column if not exists updated_at timestamptz not null default now();
create index if not exists todos_updated_at_idx on todos(updated_at);
drop trigger if exists todos_set_updated_at on todos;
create trigger todos_set_updated_at before update on todos
  for each row execute function set_updated_at();

-- Feature 5 (Missed Deadline Analysis): one categorical reason per missed
-- todo, asked once in a Night Review batch.
alter table todos add column if not exists missed_reason text
  check (missed_reason in ('too_hard', 'forgot', 'poor_estimate', 'other'));

alter table learning_paths add column if not exists updated_at timestamptz not null default now();
drop trigger if exists learning_paths_set_updated_at on learning_paths;
create trigger learning_paths_set_updated_at before update on learning_paths
  for each row execute function set_updated_at();

-- Feature 3 (Learning Path Intelligence): lets a stuck path be dismissed
-- for real (stops re-flagging), mirroring contexts' active/paused.
alter table learning_paths add column if not exists status text not null default 'active'
  check (status in ('active', 'paused'));
