# EstateConnect — Agent Assignment & Live Chat (Demo MVP)

A self-contained demo of an **agent assignment + live chat platform** for Philippine
real estate. It proves one core idea: **every customer inquiry is guaranteed a human
owner**, with automatic load-balanced assignment and timeout-based reassignment, plus
agent-assisted (rule-based) listing recommendations and full inventory management.

This is a workflow demo — not the production Facebook Messenger integration. The
customer channel is abstracted so a real `MessengerChannel` can be dropped in later.

---

## Tech stack

- **Next.js 15** (App Router) · TypeScript · Tailwind · shadcn-style UI · `lucide-react`
- **Supabase** — Postgres + Realtime (live sync) + Storage (listing images)
- Deploy target: Vercel (uses a hosted Supabase project)

---

## The four surfaces

| Surface | URL | What it does |
| --- | --- | --- |
| Customer chat | `/chat` → `/chat/[sessionId]` | Visiting `/chat` creates an inquiry + session and redirects. Messenger-style bubbles; shows the assigned agent. |
| Agent workspace | `/agent` → `/agent/[agentId]` | Live queue, real-time thread, AI listing suggestions + quick inserts, Available/Away toggle, visible reassignment timer, Resolve. |
| Admin dashboard | `/admin` | Live agent board, agent roster manager, and an auditable inquiry log (assigned → reassigned → resolved). |
| Listing management | `/admin/listings` | Full CRUD with search/filter, image upload to Storage, soft-delete. Edits feed recommendations instantly. |

---

## Prerequisites

- **Node 18.18+** (built on Node 26)
- **Docker** — any engine works; this machine uses **OrbStack**. Start it before Supabase.
- **Supabase CLI** (`supabase --version`)

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Start your Docker engine (OrbStack / Docker Desktop), then local Supabase
npm run db:start            # = supabase start

# 3. Create schema + seed (20 listings, 5 agents)
npm run db:reset            # copies schema.sql -> migration, runs reset + seed.sql

# 4. Run the app
npm run dev                 # http://localhost:3000
```

> **Ports:** local Supabase here is configured on the **553xx** range
> (API `55321`, DB `55322`, Studio `55323`) so it can run alongside other Supabase
> projects on this machine. `.env.local` is already pointed at `http://127.0.0.1:55321`.
> If you change anything, re-sync with `supabase status -o env`.

### Environment variables

See [`.env.example`](.env.example). `.env.local` is pre-filled for the local stack:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321
NEXT_PUBLIC_SUPABASE_ANON_KEY=...        # browser client + Realtime
SUPABASE_SERVICE_ROLE_KEY=...            # server-only, used by /api/reconcile
```

### Deploying to a hosted Supabase

1. Create a project, run the contents of `supabase/schema.sql` then `supabase/seed.sql`
   in the SQL editor.
2. Set the three env vars above to your project's URL + keys (Vercel project settings).
3. The open demo RLS policies in `schema.sql` are **for the demo only** — tighten them
   before any real use.

---

## Scripted demo walkthrough

Open **four browser windows** side by side:

1. **Admin** → `/admin` (keep this open — it drives the assignment engine and shows the log)
2. **Agent A** → `/agent`, pick *Maria Santos*
3. **Agent B** → `/agent`, pick *Juan Dela Cruz*
4. **Customer** → `/chat`

Then:

1. **Auto-assignment.** In the customer window, send *"Hi, looking for a 2 bedroom condo
   in BGC around 18M."* It's instantly assigned to the least-busy agent — watch it appear
   in that agent's queue and in the admin board. The customer header shows the agent's name.
2. **AI suggestions.** In that agent's workspace, the right panel shows matching listings
   ranked by criteria met (type, location, budget, bedrooms), best match first. Click
   **Insert into reply**, edit if you like, and **Send** — the customer sees it live.
3. **Reassignment.** Send another customer message and **don't reply as the agent**. The
   queue timer counts down from 30s; when it expires the inquiry auto-reassigns to the
   other agent. The admin **inquiry log** shows the trail: `Agent A · initial → Agent B · timeout`.
4. **Away skipping.** Toggle an agent to **Away** — new inquiries skip them. If everyone is
   Away, new inquiries show as **Queued** in admin and assign the instant someone returns.
5. **Resolve.** Click **Resolve** on a conversation — it leaves the queue and the log shows
   it closed.
6. **Listings feed recommendations.** Open `/admin/listings`, edit a listing's price or set
   it to *Sold* (or add a new one with an image). Go back to the agent panel — recommendations
   update immediately from live inventory.

---

## How the assignment engine works

All assignment logic lives in SQL functions in [`supabase/schema.sql`](supabase/schema.sql)
and is **race-safe** (a transaction-level advisory lock serializes concurrent ticks).

- **Assignment:** least active chats first; ties broken by who's gone longest without an
  assignment → load-balanced round-robin (`pick_available_agent`).
- **Timer:** purely **server-timestamp based**. The deadline is
  `max(last_customer_msg_at, current_assigned_at) + REASSIGN_TIMEOUT_SECONDS`, computed only
  while the agent hasn't answered the latest customer message. It survives refresh and is
  identical for every viewer; the on-screen countdown is display only.
- **The tick:** the agent + admin screens `POST /api/reconcile` every few seconds
  (`useReconcileTicker`), which calls `reconcile_assignments()`. Because the logic is
  timestamp-based and idempotent, it doesn't matter how many tabs are open. (Keep an agent or
  admin window open during the demo so the engine keeps ticking. In production this would move
  to a scheduled function.)
- **Guarantees:** every inquiry is always either `assigned` to an agent or `queued` — never
  dropped. A timed-out agent who is the *only* one available keeps the chat (no churn); if
  they've gone Away, it requeues.

The engine was verified end-to-end with [`supabase/engine_test.sql`](supabase/engine_test.sql)
(round-robin distribution, timeout reassignment + audit trail, resolve, no orphans).

### Business rules chosen for this demo

- **Resolve:** agents resolve conversations manually.
- **Recommendation tie-break:** equal criteria → closest to stated budget (else lowest price).
- **Timeout:** 30 seconds (in `src/lib/constants.ts`).
- **Delete:** soft-delete (`deleted_at`) so demo data isn't lost.

---

## Channel abstraction (future Facebook Messenger)

Message send/receive is behind a `Channel` interface
([`src/lib/channel/index.ts`](src/lib/channel/index.ts)). The current `DemoChannel` uses
Supabase. A future `MessengerChannel` implements the same interface: `send()` calls the FB
Send API for agent replies, and a webhook inserts inbound FB messages into `messages` — the
rest of the app is unchanged. The seam is documented in that file.

---

## Configuration

All tunables live in [`src/lib/constants.ts`](src/lib/constants.ts):

| Constant | Default | Meaning |
| --- | --- | --- |
| `REASSIGN_TIMEOUT_SECONDS` | `30` | Agent silence before reassignment |
| `RECONCILE_INTERVAL_MS` | `3000` | How often open screens tick the engine |
| `MAX_RECOMMENDATIONS` | `3` | Suggestions shown per conversation |
| `BUDGET_TOLERANCE` | `0.1` | Listings up to budget×1.1 count as in-budget |
| `QUICK_TEMPLATES` | 3 items | Agent quick-insert snippets |

---

## Data model

`agents`, `inquiries`, `assignments` (immutable audit log), `messages`, `listings` — plus a
`listing-images` Storage bucket. Realtime is enabled on all five tables. Full DDL +
functions: [`supabase/schema.sql`](supabase/schema.sql).

## Scripts

| Script | Action |
| --- | --- |
| `npm run dev` | Next dev server (`:3000`) |
| `npm run build` / `start` | Production build / serve |
| `npm run db:start` / `db:stop` | Start / stop local Supabase |
| `npm run db:reset` | Re-apply schema + seed (fresh demo data) |
