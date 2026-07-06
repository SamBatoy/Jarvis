-- Sample data so the dashboard shows school and projects coexisting on first
-- load. Dates are relative to "now" so this stays sensible whenever it's run.
-- Safe to re-run: it deletes rows with the same fixed ids first.

delete from todos where context_id in (
  '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444'
) or id in ('55555555-5555-5555-5555-555555555555');
delete from events where context_id in (
  '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444'
);
delete from deadlines where context_id in (
  '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444'
);
delete from goals where id in (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);
delete from contexts where id in (
  '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444'
);

-- ─── contexts ───────────────────────────────────────────────────────────────
insert into contexts (id, name, type, color, instructor, class_schedule, description, status) values
  ('11111111-1111-1111-1111-111111111111', 'Chemistry', 'subject', '#3b82f6',
    'Dr. Alvarez',
    '[{"day_of_week":1,"start_time":"09:00","end_time":"10:00"},{"day_of_week":3,"start_time":"09:00","end_time":"10:00"},{"day_of_week":5,"start_time":"09:00","end_time":"10:00"}]'::jsonb,
    null, null),
  ('22222222-2222-2222-2222-222222222222', 'Calculus', 'subject', '#8b5cf6',
    'Prof. Nguyen',
    '[{"day_of_week":2,"start_time":"11:00","end_time":"12:30"},{"day_of_week":4,"start_time":"11:00","end_time":"12:30"}]'::jsonb,
    null, null),
  ('33333333-3333-3333-3333-333333333333', 'Habit Tracker', 'project', '#22c55e',
    null, null,
    'A habit-tracking app with streaks, reminders, and weekly reviews.', 'active'),
  ('44444444-4444-4444-4444-444444444444', 'Portfolio Site', 'project', '#f97316',
    null, null,
    'Personal portfolio site to showcase shipped projects.', 'active');

-- ─── goals ──────────────────────────────────────────────────────────────────
insert into goals (id, title, description, why_it_matters, target_date, status) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ace Chemistry this semester',
    'Finish the semester with a strong grade in Chemistry.',
    'Chemistry grade affects overall GPA and the pre-med track.',
    (current_date + interval '45 days')::date, 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ship Habit Tracker v1',
    'Get a working v1 of the habit-tracker app live and usable.',
    'First real product to put in a portfolio and get real user feedback.',
    (current_date + interval '21 days')::date, 'active');

-- ─── todos ──────────────────────────────────────────────────────────────────
-- plain academic + project todos
insert into todos (title, notes, done, priority, due_date, context_id, goal_id, task_type) values
  ('Read chapter 4', 'Thermochemistry', false, 'medium',
    now() + interval '2 days', '11111111-1111-1111-1111-111111111111', null, 'reading'),
  ('Problem set 3', 'Derivatives and related rates', false, 'high',
    now() + interval '3 days', '22222222-2222-2222-2222-222222222222', null, 'problem-set'),
  ('Design onboarding flow', null, false, 'medium',
    now() + interval '4 days', '33333333-3333-3333-3333-333333333333',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'design'),
  ('Write README', null, false, 'low',
    now() + interval '10 days', '33333333-3333-3333-3333-333333333333',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'general'),
  ('Sketch homepage layout', null, false, 'medium',
    now() + interval '5 days', '44444444-4444-4444-4444-444444444444', null, 'design'),
  ('Renew gym membership', null, false, 'low', now() + interval '7 days', null, null, 'general');

-- scaffolded example: a parent task with child subtasks (single-level nesting)
insert into todos (id, title, notes, done, priority, due_date, context_id, goal_id, task_type) values
  ('55555555-5555-5555-5555-555555555555', 'Study for Chemistry midterm', null, false, 'high',
    now() + interval '9 days', '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'exam-prep');

insert into todos (title, done, priority, due_date, context_id, goal_id, task_type, parent_todo_id) values
  ('Review ch.1-2', true, 'high', now() + interval '4 days',
    '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'exam-prep', '55555555-5555-5555-5555-555555555555'),
  ('Review ch.3-4', false, 'high', now() + interval '6 days',
    '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'exam-prep', '55555555-5555-5555-5555-555555555555'),
  ('Practice problems', false, 'high', now() + interval '8 days',
    '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'exam-prep', '55555555-5555-5555-5555-555555555555'),
  ('Final review', false, 'high', now() + interval '9 days',
    '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'exam-prep', '55555555-5555-5555-5555-555555555555');

-- ─── events ─────────────────────────────────────────────────────────────────
insert into events (title, notes, start_at, end_at, location, context_id) values
  ('Chemistry Lecture', 'Ch. 4-5', date_trunc('day', now()) + interval '9 hours',
    date_trunc('day', now()) + interval '10 hours', 'Science Hall 210',
    '11111111-1111-1111-1111-111111111111'),
  ('Calculus Study Group', null, now() + interval '1 day 3 hours',
    now() + interval '1 day 4 hours 30 minutes', 'Library 2F', '22222222-2222-2222-2222-222222222222');

-- ─── deadlines ──────────────────────────────────────────────────────────────
insert into deadlines (title, notes, due_at, context_id, goal_id, status) values
  ('Chemistry Midterm Exam', null, now() + interval '9 days',
    '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'upcoming'),
  ('Habit Tracker beta submission', 'Deploy and share link with 3 test users', now() + interval '18 days',
    '33333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'upcoming');
