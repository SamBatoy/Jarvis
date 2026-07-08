-- Bug fix: completed todos were only archiving once their due_date passed
-- (archive-overdue.js's cron selected on due_date alone, using `done` only
-- to pick the archive_reason label after the fact) — a todo completed
-- early, with a due date days or weeks out, sat in the active list until
-- the deadline eventually passed. Completion should archive a todo
-- immediately, with the due date having no bearing on archive timing at
-- all; only the daily "missed" sweep should still depend on due_date.
--
-- Extends the existing todos_set_completed_at trigger (same transition-
-- detection pattern already used for completed_at, and for goals'
-- achieved_at in 003_goal_achieved_at_trigger.sql) rather than adding a
-- second trigger on the same table/event — done can flip from two
-- independent code paths (dashboard checkbox, chat's update_todo), so a
-- trigger is the single source of truth regardless of which path fired,
-- and it's genuinely instant (same transaction, no cron wait).
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

-- Trigger definition itself is unchanged (same name, same firing
-- condition) — only the function body changed, so no drop/recreate of the
-- trigger is needed, but re-stating it here keeps this migration
-- self-contained and safe to re-run.
drop trigger if exists todos_set_completed_at on todos;
create trigger todos_set_completed_at
  before insert or update on todos
  for each row
  execute function set_todo_completed_at();
