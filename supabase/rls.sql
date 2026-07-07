-- Row Level Security: no-login single-user app.
-- The anon key is used directly from the browser and from most server
-- functions, so most tables grant full read/write to the `anon` role —
-- there's no per-row ownership because there is only ever one user.
-- Exception: oauth_connections (Phase 5) gets RLS enabled with NO anon
-- policy at all — it holds real OAuth credentials to an external account,
-- and is only ever touched by the separate service-role client
-- (server/supabaseServiceRole.js), server-side.

alter table contexts enable row level security;
alter table goals enable row level security;
alter table todos enable row level security;
alter table events enable row level security;
alter table deadlines enable row level security;
alter table learning_paths enable row level security;
alter table action_log enable row level security;
alter table daily_briefs enable row level security;
alter table oauth_connections enable row level security; -- no anon policy — see note above
alter table pending_suggestions enable row level security;

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

drop policy if exists "anon full access" on daily_briefs;
create policy "anon full access" on daily_briefs
  for all to anon using (true) with check (true);

drop policy if exists "anon full access" on pending_suggestions;
create policy "anon full access" on pending_suggestions
  for all to anon using (true) with check (true);

-- Deliberately no policy for oauth_connections — RLS enabled with zero
-- grants means the anon role (browser + most server code) gets nothing at
-- all from this table. Only the service-role client bypasses RLS entirely.
