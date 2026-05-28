# EstateConnect — Agent Assignment & Live Chat (Demo MVP)

A self-contained demo of an **agent assignment + live chat platform** for Philippine
real estate. It proves one core idea: **every customer inquiry is guaranteed a human
owner**, with automatic load-balanced assignment and timeout-based reassignment, plus
agent-assisted (rule-based) listing recommendations and full inventory management.

> **No database required.** The whole demo runs on a built-in **in-memory store** —
> `npm install && npm run dev` and it just works. No Supabase, no env vars, no setup.
> (See *Data & hosting* below for what that means for sharing.)

---

## Tech stack

- **Next.js 15** (App Router) · TypeScript · Tailwind · shadcn-style UI · `lucide-react`
- **In-memory backend** — a single server-side store + REST API + light polling. No external services.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

That's it. The store seeds itself with **5 agents + 20 listings** on first run.

---

## The four surfaces

| Surface | URL | What it does |
| --- | --- | --- |
| Customer chat | `/chat` → `/chat/[sessionId]` | Visiting `/chat` creates an inquiry + session and redirects. Messenger-style bubbles; shows the assigned agent. |
| Agent workspace | `/agent` → `/agent/[agentId]` | Live queue, real-time-ish thread, AI listing suggestions + quick inserts, Available/Away toggle, visible reassignment timer, Resolve. Responsive (panels collapse to drawers on small screens). |
| Admin dashboard | `/admin` | Live agent board, agent roster manager, and an auditable inquiry log (assigned → reassigned → resolved). |
| Listing management | `/admin/listings` | Full CRUD with search/filter, image upload (stored inline), soft-delete. Edits feed recommendations instantly. |

---

## Data & hosting

State lives in the **Node server process**: it persists for the life of the server and
is shared across every request to it. Two consequences:

- ✅ Works perfectly with `npm run dev` / `npm start`, and on any **single-instance host**.
- ⚠️ It is **not** shared across serverless instances, so **Vercel's serverless runtime is
  not suitable** for this mode (different requests can hit different, stateless instances).
- Restarting the server resets the demo to the seeded data (handy for a clean demo).

### Easiest way to let people try it (no hosting account)

Run it locally and expose it with a tunnel:

```bash
npm run dev
# in another terminal:
npx localtunnel --port 3000      # or: npx untun tunnel http://localhost:3000
```

Share the printed URL. Your machine stays the server, so the shared state is consistent.

### Permanent URL (single-instance host)

Deploy the repo as a **Node web service** on a single-instance host (e.g. Render,
Railway, Fly.io): build `npm run build`, start `npm start`. In-memory state works there.
Free tiers may sleep on inactivity (which resets the in-memory data) — fine for a demo.

### Want a real, multi-instance/serverless-safe deploy later?

Swap the in-memory store in `src/lib/server/store.ts` for a real database. The original
Postgres schema + assignment engine (functions, RLS, Realtime, Storage) is preserved in
[`supabase/schema.sql`](supabase/schema.sql) + [`seed.sql`](supabase/seed.sql) as a
reference implementation.

---

## Scripted demo walkthrough

Open a few windows side by side (on the same running server):

1. **Admin** → `/admin`
2. **Agent A** → `/agent`, pick *Maria Santos*
3. **Agent B** → `/agent`, pick *Juan Dela Cruz*
4. **Customer** → `/chat`

Then:

1. **Auto-assignment.** In the customer window, send *"Hi, looking for a 2 bedroom condo
   in BGC around 18M."* It's instantly assigned to the least-busy agent — watch it appear
   in that agent's queue and in the admin board.
2. **AI suggestions.** In that agent's workspace, the right panel ranks matching listings
   by criteria met (type, location, budget, bedrooms), best match first. Click **Insert
   into reply**, edit, and **Send** — the customer sees it within ~1.5s.
3. **Reassignment.** Send another customer message and **don't reply as the agent**. The
   queue timer counts down from 30s; when it expires the inquiry auto-reassigns to the
   other agent. The admin **inquiry log** shows `Agent A · initial → Agent B · timeout`.
4. **Away skipping.** Toggle an agent to **Away** — new inquiries skip them. If everyone is
   Away, new inquiries show as **Queued** and assign the instant someone returns.
5. **Resolve.** Click **Resolve** on a conversation — it leaves the queue, logged as closed.
6. **Listings feed recommendations.** Open `/admin/listings`, edit a price or set one to
   *Sold* (or add a new one with an image). The agent panel updates from live inventory.

---

## How the assignment engine works

All logic lives in [`src/lib/server/store.ts`](src/lib/server/store.ts) and mirrors the
reference SQL engine.

- **Assignment:** least active chats first; ties broken by who's gone longest without an
  assignment → load-balanced round-robin (`pickAvailableAgent`).
- **Timer:** purely **server-timestamp based**. Deadline =
  `max(last_customer_msg_at, current_assigned_at) + REASSIGN_TIMEOUT_SECONDS`, counted only
  while the agent hasn't answered the latest customer message. The on-screen countdown is
  display only.
- **The tick:** every screen polls `GET /api/data`, which runs `reconcile()` then returns a
  snapshot — so assignment + reassignment advance whenever any tab is open.
- **Guarantees:** every inquiry is always `assigned` or `queued` — never dropped. A timed-out
  agent who is the only one available keeps the chat (no churn); if they've gone Away, it requeues.

### Business rules

- **Resolve:** agents resolve conversations manually.
- **Recommendation tie-break:** equal criteria → closest to stated budget (else lowest price).
- **Timeout:** 30 seconds (in `src/lib/constants.ts`).
- **Delete:** soft-delete so demo data isn't lost.

---

## Configuration

All tunables live in [`src/lib/constants.ts`](src/lib/constants.ts):

| Constant | Default | Meaning |
| --- | --- | --- |
| `REASSIGN_TIMEOUT_SECONDS` | `30` | Agent silence before reassignment |
| `POLL_INTERVAL_MS` | `1500` | How often screens poll for updates (also drives the engine) |
| `MAX_RECOMMENDATIONS` | `3` | Suggestions shown per conversation |
| `BUDGET_TOLERANCE` | `0.1` | Listings up to budget×1.1 count as in-budget |
| `QUICK_TEMPLATES` | 3 items | Agent quick-insert snippets |

## API (in-memory backend)

| Route | Purpose |
| --- | --- |
| `GET /api/data` | Reconcile + return agents, inquiries, assignments, listings |
| `GET /api/messages?inquiryId=` | Messages for an inquiry |
| `POST /api/action` | All mutations (startInquiry, sendMessage, resolve, reassign, agent/listing CRUD) |
