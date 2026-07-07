-- Second pivot: Google Chat API requires a paid Google Workspace
-- (Business/Enterprise) account — not available to personal @gmail.com
-- accounts, which is what's connected here. Rather than a second source,
-- Gmail-only detection going forward. No pending_suggestions rows exist
-- yet (the detection cron never successfully wrote a 'chat' row before
-- this was caught), so this is a pure constraint tightening, no data
-- migration.
alter table pending_suggestions drop constraint if exists pending_suggestions_source_check;
alter table pending_suggestions add constraint pending_suggestions_source_check
  check (source in ('gmail'));
