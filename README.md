# Jarvis

A personal life-assistant app for someone who's both a student and a builder
of side projects. It treats school (subjects, classes, coursework) and
personal projects (building and shipping products) as **equal partners** —
one dashboard, one chat assistant, both domains side by side.

- **Dashboard**: today's classes/events, todos (filterable by school/projects/
  any specific subject or project), deadlines, goals with progress, and
  learning paths — all directly editable, no chat required.
- **Chat ("Jarvis")**: talk to it like an assistant — "what's due this week?",
  "study for the chem exam on the 20th", "build the login screen for my
  habit tracker", "I want to learn cybersecurity". It reads your data and
  acts on it via tool calls.
- **Auto-scaffolding**: ask for a presentation, study plan, feature build,
  etc. and Jarvis breaks it into an ordered, dated set of subtasks —
  academic task types use fixed templates, project task types get an
  LLM-tailored breakdown, and dates are always placed by a deterministic
  scheduler that looks at your class schedule and existing commitments.
- **Confirm-guard**: anything that *creates or deletes* data (including
  multi-subtask scaffolds) is only ever a *proposal* until you click
  Confirm. Reading, answering, and simple edits to existing items (toggle
  done, nudge a date) happen immediately with no confirmation.
- **Learning paths**: ask to learn something and get an ordered skill list
  from fundamentals to advanced, with real web-search-sourced resources for
  the most pivotal skills (degrades gracefully to no resources, never
  invented links, if search isn't configured). Turn any skill into a dated
  todo plan under a new or existing project — it then disappears from the
  learning-path list since it's a tracked task now, not a pending skill.
- **Archive/Done view**: todos past their deadline auto-archive daily (via
  Vercel Cron) so the active list starts each day clean; you can also
  archive one early yourself. The Archive tab shows a chronological history
  of what got completed/missed/archived and when, achieved goals, and a
  visible log of every action Jarvis has taken and why.
- **Calendar**: month/week/day views showing deadlines, todo due dates,
  events, and recurring classes together.

## Stack

- **Frontend**: Vite + React, Tailwind CSS, `@tanstack/react-query`
- **Backend**: Supabase (Postgres + RLS, no auth — single-user), Vercel
  serverless functions under `/api`
- **LLM**: Groq (default) or Anthropic Claude, behind one swappable client
  (`server/llm/`)
- **Search**: Tavily (optional, for learning-path resources)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

Create a free project at [supabase.com](https://supabase.com). In the
**SQL Editor**, run these files from `supabase/` **in order**:

1. `schema.sql` — creates the seven tables (`contexts`, `todos`, `events`,
   `deadlines`, `goals`, `learning_paths`, `action_log`) with the full
   current schema, including archiving fields and goal `achieved_at`
2. `rls.sql` — enables Row Level Security with full anon read/write access
   (this is a no-login single-user app, so the anon key alone drives
   everything, same as any other Supabase project without auth)
3. `seed.sql` — optional sample data (2 subjects with class schedules, 2
   projects, a handful of todos/events/deadlines/goals including one
   already-scaffolded example) so the dashboard shows both domains
   coexisting on first load

For an **existing** project set up before Phase 1 (archiving/calendar/
action log), instead run the incremental files in `supabase/migrations/` in
numeric order — `schema.sql`/`rls.sql` already reflect the end state for
fresh installs, the migrations are for upgrading a database that predates
them.

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values (see the full
reference below).

```bash
cp .env.example .env.local
```

### 4. Run it locally

Two dev servers run side by side: Vite for the frontend, and a lightweight
stand-in for Vercel's serverless functions (`/api/*.js`) so chat and search
work locally without needing a Vercel account.

```bash
npm run dev       # frontend, http://localhost:5173 (or next free port)
npm run dev:api   # api routes, http://localhost:3001 — proxied by Vite's dev server
```

Run both in separate terminals. The Vite dev server proxies `/api/*` to the
port `dev:api` listens on (see `vite.config.js` / `DEV_API_PORT`).

In production on Vercel, `dev:api`'s stand-in isn't used — Vercel serves
everything under `/api` natively as serverless functions, same code, no
changes needed.

## Environment variables

| Variable | Required | What it's for |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL (Project Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | Yes | Your Supabase anon public key |
| `LLM_PROVIDER` | Yes | `groq` (default) or `anthropic` |
| `LLM_MODEL` | Yes | Model name for the chosen provider (default `llama-3.3-70b-versatile`) |
| `GROQ_API_KEY` | If `LLM_PROVIDER=groq` | From [console.groq.com](https://console.groq.com) → API Keys (free tier available) |
| `ANTHROPIC_API_KEY` | If `LLM_PROVIDER=anthropic` | From [console.anthropic.com](https://console.anthropic.com) |
| `TAVILY_API_KEY` | No | From [tavily.com](https://tavily.com) (free tier). Without it, learning paths still generate — just without resource links, clearly noted in the UI instead of inventing any |
| `APP_TIMEZONE` | Yes | An IANA timezone (e.g. `America/Los_Angeles`). Single fixed timezone since this is a single-user app — used for "today," class-schedule day matching, and all scaffold date placement |
| `CRON_SECRET` | Yes | Protects `api/cron/*` so only Vercel's scheduler can trigger them. Generate any high-entropy string, e.g. `node -e "console.log(require('node:crypto').randomBytes(24).toString('base64url'))"` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | If using Gmail detection | From Google Cloud Console → APIs & Services → Credentials (OAuth client) |
| `GOOGLE_REDIRECT_URI` | If using Gmail detection | Must exactly match an "Authorized redirect URI" on that OAuth client. Differs per environment |
| `APP_BASE_URL` | If using Gmail detection | The frontend's own origin (not the API's) — where the OAuth callback redirects back to. Differs per environment |
| `SUPABASE_SERVICE_ROLE_KEY` | If using Gmail detection | From Supabase → Project Settings → API → `service_role` secret (not the anon key). Only used server-side, only for the `oauth_connections` table — see `supabase/migrations/007_phase5_google_integration.sql` |
| `TOKEN_ENCRYPTION_KEY` | If using Gmail detection | Encrypts OAuth tokens at the application layer. Generate with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"` |
| `DEV_API_PORT` | No | Local dev only — port for `npm run dev:api` (default `3001`) |

**All of these (except `DEV_API_PORT`) must also be set in your Vercel
project's Environment Variables settings** for the deployed app's chat and
learning-path search to work — Vercel doesn't read your local `.env.local`.

### Swapping the LLM provider or model

Change two env vars, nothing else:

```bash
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-5
ANTHROPIC_API_KEY=sk-ant-...
```

Every part of the app that talks to the model — the chat tool-use loop, the
scaffold-content generator, the learning-path generator — goes through
`server/llm/index.js`, which is the only place that knows which provider is
active. `server/llm/groq.js` and `server/llm/anthropic.js` both normalize to
the same internal shape (OpenAI-style `messages`/`tool_calls`), so nothing
downstream needs to change when you switch.

## Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel, "Add New… → Project", import the repo. Vercel auto-detects the
   Vite frontend and the `/api/*.js` serverless functions — no config needed.
3. In the project's **Settings → Environment Variables**, add every variable
   from the table above (except `DEV_API_PORT`).
4. Deploy. `vercel.json`'s `crons` entry automatically schedules the daily
   overdue-archive job — no extra setup, though note Vercel's Hobby tier
   runs cron jobs at most once a day with some drift in the exact minute,
   which is fine for "clean list each morning."

## Project structure

```
api/                    Vercel serverless functions (chat, propose, commit-proposal)
  cron/archive-overdue.js Daily auto-archive job (Vercel Cron, see vercel.json)
server/                 Shared server code imported by api/ (not routes themselves)
  llm/                   Swappable LLM client (groq.js, anthropic.js, index.js)
  search/                Swappable web search client (tavily.js)
  tools/                 Tool registry: zod schemas, read/direct/propose handlers
  scheduler.js           Deterministic date placement for scaffolded subtasks
  taskTemplates.js       Fixed subtask templates for academic task_types
  actionLog.js           Trust & Control Layer: logs every confirmed write
supabase/                schema.sql, rls.sql, seed.sql, migrations/ (incremental upgrades)
src/
  hooks/                 React Query hooks per table + chat hook
  components/
    dashboard/            Dashboard, filters, lists, forms (direct editing)
    calendar/             Month/week/day calendar view
    archive/              Archive/Done view (completed/missed todos, achieved goals, activity log)
    chat/                 ChatPanel, MessageList, ProposalCard (confirm/cancel UI)
scripts/devApiServer.mjs  Local stand-in for Vercel functions (dev only)
```

## How the confirm-guard works

Every tool the assistant can call is one of three kinds:

- **read** — executes immediately, just returns data.
- **direct** — executes immediately, no confirmation. Reserved for simple
  edits to a row that already exists (toggle done, nudge a date, change
  status). Matches how the dashboard already edits in place.
- **propose** — never touches the database. Returns a preview of exactly
  what would be created/deleted/archived. The chat UI (and the dashboard's
  own direct actions, like "turn skill into todos") render that preview with
  Confirm/Cancel; only a Confirm click calls `/api/commit-proposal`, which
  re-validates the payload from scratch and performs the real write. This
  applies to every create (todos, events, deadlines, goals, contexts,
  scaffolded subtask sets, learning paths), every delete, and manually
  archiving a todo early (auto-archiving overdue todos via cron is the one
  exception — it's inherently automatic, so it has no live user to confirm
  with; instead it's recorded in the visible activity log).

This is enforced in code (a real UI round-trip through `/api/commit-proposal`),
not by asking the model to "check with the user first" in a system prompt.
Every confirmed write (and every automated cron action) is also recorded to
the `action_log` table — visible in the Archive tab's "Recent Activity"
section — so there's always a visible record of what Jarvis did and why.
