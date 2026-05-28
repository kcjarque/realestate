-- =============================================================================
-- Real Estate Agent Assignment & Live Chat — SCHEMA (canonical source of truth)
-- =============================================================================
-- Applied locally via `npm run db:reset` (which copies this file into
-- supabase/migrations/0001_init.sql and runs `supabase db reset`, then seed.sql).
-- For a hosted project, paste this file then seed.sql into the SQL editor.
--
-- DEMO SECURITY NOTE: RLS is enabled but policies are fully OPEN (using true).
-- This is intentional for a single-machine demo with no auth. DO NOT ship as-is.
-- =============================================================================

-- gen_random_uuid() is built into Postgres 13+ (Supabase is 15+), no extension needed.

-- -----------------------------------------------------------------------------
-- TABLES
-- -----------------------------------------------------------------------------

create table if not exists agents (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  avatar_url  text,
  -- Only two states the agent toggles. 'away' agents are skipped by assignment.
  -- "Busy" is handled implicitly by load-balancing (fewest active chats), per spec.
  status      text not null default 'available' check (status in ('available','away')),
  created_at  timestamptz not null default now()
);

create table if not exists inquiries (
  id                   uuid primary key default gen_random_uuid(),
  session_id           text unique not null,           -- drives /chat/[sessionId]
  customer_name        text not null default 'Guest',
  channel              text not null default 'demo',    -- future: 'messenger', etc.
  -- Lifecycle: queued (no human owner yet) -> assigned (has active owner) -> resolved.
  state                text not null default 'queued'
                         check (state in ('queued','assigned','resolved')),
  -- Denormalized pointer to the CURRENT owner (source-of-truth audit is `assignments`).
  -- Kept in sync by the engine functions; lets the customer widget + queues subscribe
  -- to a single inquiries row via Realtime instead of joining the assignment log.
  current_agent_id     uuid references agents(id) on delete set null,
  current_assigned_at  timestamptz,                    -- when current owner got it (timer base)
  -- Server-authoritative timestamps maintained by a trigger on `messages`.
  -- The reassignment timer is computed purely from these (survives refresh).
  last_customer_msg_at timestamptz,
  last_agent_msg_at    timestamptz,
  created_at           timestamptz not null default now(),
  resolved_at          timestamptz
);

-- Immutable audit log: one row per (re)assignment. Never updated except released_at.
create table if not exists assignments (
  id           uuid primary key default gen_random_uuid(),
  inquiry_id   uuid not null references inquiries(id) on delete cascade,
  agent_id     uuid not null references agents(id) on delete cascade,
  assigned_at  timestamptz not null default now(),
  released_at  timestamptz,                            -- null = currently active
  reason       text not null check (reason in ('initial','reassigned_timeout','manual'))
);

create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  inquiry_id  uuid not null references inquiries(id) on delete cascade,
  sender_type text not null check (sender_type in ('customer','agent')),
  sender_id   uuid,                                    -- agent id for agent msgs; null for customer
  body        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists listings (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  type           text not null check (type in ('condo','house','lot','townhouse')),
  city           text not null,
  price          numeric(14,2) not null check (price >= 0),   -- PHP
  bedrooms       int check (bedrooms >= 0),                   -- nullable (e.g. lots)
  bathrooms      int check (bathrooms >= 0),
  floor_area_sqm numeric(10,2) check (floor_area_sqm >= 0),
  status         text not null default 'available'
                   check (status in ('available','reserved','sold')),
  image_urls     jsonb not null default '[]'::jsonb,          -- array of public URLs
  description    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz                                  -- soft delete
);

-- -----------------------------------------------------------------------------
-- INDEXES
-- -----------------------------------------------------------------------------
create index if not exists idx_inquiries_state            on inquiries(state);
create index if not exists idx_inquiries_current_agent    on inquiries(current_agent_id);
create index if not exists idx_assignments_inquiry        on assignments(inquiry_id, assigned_at);
create index if not exists idx_assignments_active         on assignments(inquiry_id) where released_at is null;
create index if not exists idx_messages_inquiry           on messages(inquiry_id, created_at);
create index if not exists idx_listings_status            on listings(status);
create index if not exists idx_listings_city              on listings(city);
create index if not exists idx_listings_type              on listings(type);
create index if not exists idx_listings_live              on listings(status) where deleted_at is null;

-- -----------------------------------------------------------------------------
-- TRIGGERS
-- -----------------------------------------------------------------------------

-- Maintain listings.updated_at on every update.
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_listings_updated_at on listings;
create trigger trg_listings_updated_at
  before update on listings
  for each row execute function set_updated_at();

-- Maintain the inquiry's last_*_msg_at from the message stream. This makes the
-- reassignment timer's inputs SERVER-AUTHORITATIVE regardless of which client
-- inserts the message — no client clocks involved.
create or replace function on_message_insert()
returns trigger language plpgsql as $$
begin
  if new.sender_type = 'customer' then
    update inquiries set last_customer_msg_at = new.created_at where id = new.inquiry_id;
  elsif new.sender_type = 'agent' then
    update inquiries set last_agent_msg_at = new.created_at where id = new.inquiry_id;
  end if;
  return new;
end; $$;

drop trigger if exists trg_message_insert on messages;
create trigger trg_message_insert
  after insert on messages
  for each row execute function on_message_insert();

-- -----------------------------------------------------------------------------
-- ASSIGNMENT ENGINE
-- -----------------------------------------------------------------------------
-- DESIGN — why a server-timestamp model driven by a client tick:
--   * The reassignment deadline is computed entirely from columns
--     (last_customer_msg_at, last_agent_msg_at, current_assigned_at) so it is
--     correct after any refresh and identical for every viewer. No fragile
--     in-memory countdown is the source of truth — the UI countdown is display only.
--   * "Ticking" just means: somebody calls reconcile_assignments() periodically.
--     The agent workspace + admin board call it on a short client interval
--     (see lib/constants RECONCILE_INTERVAL_MS). pg_cron was rejected because its
--     1-minute floor is too coarse for a 30s demo timeout, and a client interval
--     keeps the whole thing self-contained on one machine.
--   * All mutation goes through these functions, which take a transaction-level
--     ADVISORY LOCK so simultaneous ticks from multiple browser windows can never
--     double-assign. This is what makes the logic provably race-free.

-- Pick the AVAILABLE agent with the fewest active chats; ties broken by who has
-- gone longest without an assignment (true load-balanced round-robin).
create or replace function pick_available_agent(p_exclude uuid default null)
returns uuid
language sql
as $$
  select a.id
  from agents a
  left join (
    select current_agent_id as agent_id, count(*) as active_chats
    from inquiries
    where state = 'assigned' and current_agent_id is not null
    group by current_agent_id
  ) load on load.agent_id = a.id
  left join (
    select agent_id, max(assigned_at) as last_assigned_at
    from assignments
    group by agent_id
  ) la on la.agent_id = a.id
  where a.status = 'available'
    and (p_exclude is null or a.id <> p_exclude)
  order by coalesce(load.active_chats, 0) asc,   -- 1) fewest active chats
           la.last_assigned_at asc nulls first,  -- 2) round-robin fairness
           a.id asc                              -- 3) stable deterministic tiebreak
  limit 1;
$$;

-- The heartbeat. Idempotent: safe to call as often as you like.
--   1) Assigns every queued inquiry to an available agent (load-balanced).
--   2) Reassigns every overdue assigned inquiry to a DIFFERENT available agent.
-- Returns a small summary for debugging/telemetry.
create or replace function reconcile_assignments(p_timeout_seconds int default 30)
returns jsonb
language plpgsql
as $$
declare
  v_inq        inquiries;
  v_agent      uuid;
  v_deadline   timestamptz;
  v_assigned   int := 0;
  v_reassigned int := 0;
  v_queued     int := 0;
begin
  -- Serialize concurrent ticks: only one reconcile runs at a time per DB.
  perform pg_advisory_xact_lock(hashtext('reconcile_assignments'));

  -- (1) Drain the queue: assign waiting inquiries oldest-first.
  for v_inq in
    select * from inquiries where state = 'queued' order by created_at asc
  loop
    v_agent := pick_available_agent(null);
    exit when v_agent is null;  -- no capacity; remaining stay queued
    update inquiries
      set current_agent_id = v_agent, current_assigned_at = now(), state = 'assigned'
      where id = v_inq.id;
    insert into assignments (inquiry_id, agent_id, reason)
      values (v_inq.id, v_agent, 'initial');
    v_assigned := v_assigned + 1;
  end loop;

  -- (2) Reassign overdue inquiries: an unanswered customer message whose deadline
  --     (relative to the LATER of the customer msg and the current assignment, so
  --     each new owner gets a fresh full window) has passed.
  for v_inq in
    select * from inquiries
    where state = 'assigned'
      and last_customer_msg_at is not null
      and (last_agent_msg_at is null or last_agent_msg_at < last_customer_msg_at)
  loop
    v_deadline := greatest(
                    v_inq.last_customer_msg_at,
                    coalesce(v_inq.current_assigned_at, v_inq.last_customer_msg_at)
                  ) + make_interval(secs => p_timeout_seconds);
    continue when now() <= v_deadline;  -- still within window

    v_agent := pick_available_agent(v_inq.current_agent_id);  -- prefer someone else

    if v_agent is not null then
      update assignments set released_at = now()
        where inquiry_id = v_inq.id and released_at is null;
      update inquiries
        set current_agent_id = v_agent, current_assigned_at = now()
        where id = v_inq.id;
      insert into assignments (inquiry_id, agent_id, reason)
        values (v_inq.id, v_agent, 'reassigned_timeout');
      v_reassigned := v_reassigned + 1;
    else
      -- No other available agent. If the current owner has gone AWAY, requeue so
      -- it gets picked up the instant capacity returns (never dropped). If the
      -- current owner is still the only available agent, keep them (avoid churn).
      if not exists (select 1 from agents a
                     where a.id = v_inq.current_agent_id and a.status = 'available') then
        update assignments set released_at = now()
          where inquiry_id = v_inq.id and released_at is null;
        update inquiries
          set current_agent_id = null, current_assigned_at = null, state = 'queued'
          where id = v_inq.id;
        v_queued := v_queued + 1;
      end if;
    end if;
  end loop;

  return jsonb_build_object('assigned', v_assigned,
                            'reassigned', v_reassigned,
                            'requeued', v_queued);
end; $$;

-- Create (or resume) an inquiry for a session and immediately try to assign it.
create or replace function start_inquiry(p_session_id text, p_customer_name text default 'Guest')
returns inquiries
language plpgsql
as $$
declare v_inq inquiries;
begin
  insert into inquiries (session_id, customer_name, state)
    values (p_session_id, coalesce(nullif(p_customer_name, ''), 'Guest'), 'queued')
    on conflict (session_id) do update set session_id = excluded.session_id
    returning * into v_inq;

  perform reconcile_assignments();           -- assign now if an agent is free
  select * into v_inq from inquiries where id = v_inq.id;
  return v_inq;
end; $$;

-- Agent closes a conversation. Frees capacity (a queued inquiry can then flow in
-- on the next tick).
create or replace function resolve_inquiry(p_inquiry_id uuid)
returns void
language plpgsql
as $$
begin
  update assignments set released_at = now()
    where inquiry_id = p_inquiry_id and released_at is null;
  update inquiries
    set state = 'resolved', resolved_at = now(),
        current_agent_id = null, current_assigned_at = null
    where id = p_inquiry_id;
end; $$;

-- Admin manually moves an inquiry to a specific agent (logged as 'manual').
create or replace function manual_reassign(p_inquiry_id uuid, p_agent_id uuid)
returns void
language plpgsql
as $$
begin
  update assignments set released_at = now()
    where inquiry_id = p_inquiry_id and released_at is null;
  update inquiries
    set current_agent_id = p_agent_id, current_assigned_at = now(), state = 'assigned'
    where id = p_inquiry_id;
  insert into assignments (inquiry_id, agent_id, reason)
    values (p_inquiry_id, p_agent_id, 'manual');
end; $$;

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY  (DEMO: fully open — replace before production)
-- -----------------------------------------------------------------------------
alter table agents      enable row level security;
alter table inquiries   enable row level security;
alter table assignments enable row level security;
alter table messages    enable row level security;
alter table listings    enable row level security;

drop policy if exists demo_all on agents;      create policy demo_all on agents      for all using (true) with check (true);
drop policy if exists demo_all on inquiries;   create policy demo_all on inquiries   for all using (true) with check (true);
drop policy if exists demo_all on assignments; create policy demo_all on assignments for all using (true) with check (true);
drop policy if exists demo_all on messages;    create policy demo_all on messages    for all using (true) with check (true);
drop policy if exists demo_all on listings;    create policy demo_all on listings    for all using (true) with check (true);

-- Privileges for the anon/authenticated API roles (demo).
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;

-- -----------------------------------------------------------------------------
-- REALTIME  (broadcast row changes to subscribed clients)
-- -----------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table agents;
  alter publication supabase_realtime add table inquiries;
  alter publication supabase_realtime add table assignments;
  alter publication supabase_realtime add table messages;
  alter publication supabase_realtime add table listings;
exception when duplicate_object then null;  -- already in publication
end $$;

-- -----------------------------------------------------------------------------
-- STORAGE  (bucket for listing images)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('listing-images', 'listing-images', true)
  on conflict (id) do nothing;

drop policy if exists demo_read_listing_images   on storage.objects;
drop policy if exists demo_insert_listing_images on storage.objects;
drop policy if exists demo_update_listing_images on storage.objects;
drop policy if exists demo_delete_listing_images on storage.objects;

create policy demo_read_listing_images   on storage.objects for select using (bucket_id = 'listing-images');
create policy demo_insert_listing_images on storage.objects for insert with check (bucket_id = 'listing-images');
create policy demo_update_listing_images on storage.objects for update using (bucket_id = 'listing-images');
create policy demo_delete_listing_images on storage.objects for delete using (bucket_id = 'listing-images');
