-- Phase 3 (Personalization) migration: run this once in the Supabase SQL
-- Editor before building against it. Safe to re-run (guards with if not exists).

alter table todos
  add column if not exists estimated_minutes integer,
  add column if not exists actual_minutes integer,
  add column if not exists completed_at timestamptz;

create index if not exists todos_completed_at_idx on todos(completed_at);

-- Same rationale as the goals.achieved_at trigger (migration 003): done can
-- be toggled from two independent code paths (dashboard checkbox, chat's
-- update_todo), so a trigger is the single source of truth for
-- completed_at rather than threading it through both. Deliberately distinct
-- from archived_at, which can lag up to 24h behind the real completion
-- moment since the archive cron only runs once daily.
create or replace function set_todo_completed_at()
returns trigger as $$
begin
  if new.done = true and (old.done is distinct from true) then
    new.completed_at := now();
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
