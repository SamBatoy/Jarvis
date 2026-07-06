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
  todo plan under a new or existing project.

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
**SQL Editor**, run these three files from `supabase/` **in order**:

1. `schema.sql` — creates the six tables (`contexts`, `todos`, `events`,
   `deadlines`, `goals`, `learning_paths`)
2. `rls.sql` — enables Row Level Security with full anon read/write access
   (this is a no-login single-user app, so the anon key alone drives
   everything, same as any other Supabase project without auth)
3. `seed.sql` — optional sample data (2 subjects with class schedules, 2
   projects, a handful of todos/events/deadlines/goals including one
   already-scaffolded example) so the dashboard shows both domains
   coexisting on first load

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
4. Deploy.

## Project structure

```
api/                    Vercel serverless functions (chat, propose, commit-proposal)
server/                 Shared server code imported by api/ (not routes themselves)
  llm/                   Swappable LLM client (groq.js, anthropic.js, index.js)
  search/                Swappable web search client (tavily.js)
  tools/                 Tool registry: zod schemas, read/direct/propose handlers
  scheduler.js           Deterministic date placement for scaffolded subtasks
  taskTemplates.js       Fixed subtask templates for academic task_types
supabase/                schema.sql, rls.sql, seed.sql
src/
  hooks/                 React Query hooks per table + chat hook
  components/
    dashboard/            Dashboard, filters, lists, forms (direct editing)
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
  what would be created/deleted. The chat UI renders that preview with
  Confirm/Cancel; only a Confirm click calls `/api/commit-proposal`, which
  re-validates the payload from scratch and performs the real write. This
  applies to every create (todos, events, deadlines, goals, contexts,
  scaffolded subtask sets, learning paths) and every delete.

This is enforced in code (a real UI round-trip through `/api/commit-proposal`),
not by asking the model to "check with the user first" in a system prompt.
