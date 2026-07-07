-- Goals can be marked achieved from two independent code paths (the
-- dashboard's Goal form, updating Supabase directly; and chat's update_goal
-- tool, going through the server). Rather than duplicating "set achieved_at
-- when status becomes achieved" in both places, a DB trigger makes it a
-- single source of truth that works no matter how the row gets updated.
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
