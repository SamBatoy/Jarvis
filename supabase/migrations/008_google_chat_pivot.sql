-- Pivot: dropped Google Classroom, replaced with Google Chat (for catching
-- announcements) — Classroom's coursework scope kept getting misconfigured
-- on the OAuth consent screen and its narrow "your own coursework" model
-- was a worse fit than expected. Gmail detection is unaffected. No
-- pending_suggestions rows exist yet (the detection cron was never built
-- against Classroom), so this is a pure constraint swap, no data migration.
alter table pending_suggestions drop constraint if exists pending_suggestions_source_check;
alter table pending_suggestions add constraint pending_suggestions_source_check
  check (source in ('gmail', 'chat'));
