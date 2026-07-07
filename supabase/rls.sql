-- Row Level Security: no-login single-user app.
-- The anon key is used directly from the browser and from server functions,
-- so every table grants full read/write to the `anon` role. There is no
-- per-row ownership because there is only ever one user.

alter table contexts enable row level security;
alter table goals enable row level security;
alter table todos enable row level security;
alter table events enable row level security;
alter table deadlines enable row level security;
alter table learning_paths enable row level security;
alter table action_log enable row level security;

drop policy if exists "anon full access" on contexts;
create policy "anon full access" on contexts
  for all to anon using (true) with check (true);

drop policy if exists "anon full access" on goals;
create policy "anon full access" on goals
  for all to anon using (true) with check (true);

drop policy if exists "anon full access" on todos;
create policy "anon full access" on todos
  for all to anon using (true) with check (true);

drop policy if exists "anon full access" on events;
create policy "anon full access" on events
  for all to anon using (true) with check (true);

drop policy if exists "anon full access" on deadlines;
create policy "anon full access" on deadlines
  for all to anon using (true) with check (true);

drop policy if exists "anon full access" on learning_paths;
create policy "anon full access" on learning_paths
  for all to anon using (true) with check (true);

drop policy if exists "anon full access" on action_log;
create policy "anon full access" on action_log
  for all to anon using (true) with check (true);
