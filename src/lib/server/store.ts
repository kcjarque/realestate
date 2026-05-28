import { REASSIGN_TIMEOUT_SECONDS } from "@/lib/constants";
import type {
  Agent,
  AgentStatus,
  Assignment,
  Inquiry,
  Listing,
  Message,
  SenderType,
} from "@/lib/types";

// =============================================================================
// In-memory backend — zero external dependencies. The whole demo runs out of
// this single server-side store, so there's no database to configure.
//
// State lives in the Node process: it persists for the life of the server and
// is shared across all requests to that server (great for `npm run dev`,
// `npm start`, or any single-instance host). It is NOT shared across serverless
// instances, so this mode is not suitable for Vercel's serverless runtime.
//
// Reassignment is server-timestamp based (identical logic to the original SQL
// engine) and runs on every /api/data poll, so it advances whenever any tab is
// open — no separate ticker needed.
// =============================================================================

interface DB {
  agents: Agent[];
  inquiries: Inquiry[];
  assignments: Assignment[];
  messages: Message[];
  listings: Listing[];
}

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

function seed(): DB {
  const agents: Agent[] = [
    ["Maria Santos", "available"],
    ["Juan Dela Cruz", "available"],
    ["Andrea Reyes", "available"],
    ["Miguel Torres", "available"],
    ["Bea Aquino", "away"],
  ].map(([name, status]) => ({
    id: uid(),
    name,
    avatar_url: `https://i.pravatar.cc/150?u=${encodeURIComponent(name)}`,
    status: status as AgentStatus,
    created_at: now(),
  }));

  type L = [string, Listing["type"], string, number, number | null, number | null, number | null, Listing["status"], string[], string];
  const rows: L[] = [
    ["1BR Condo at The Gentry Residences", "condo", "Makati", 8500000, 1, 1, 38, "available", ["https://placehold.co/600x400?text=Gentry+1BR"], "Fully furnished 1-bedroom walking distance to Ayala Triangle. High floor, city view."],
    ["Studio at Air Residences", "condo", "Makati", 6200000, 0, 1, 23, "available", ["https://placehold.co/600x400?text=Air+Studio"], "Compact studio in the heart of the CBD. Ideal for young professionals or rental investment."],
    ["2BR Condo at Uptown Parksuites", "condo", "Taguig", 18500000, 2, 2, 75, "available", ["https://placehold.co/600x400?text=Uptown+2BR"], "Premium 2-bedroom in BGC Uptown. Connected to Uptown Mall via covered walkway."],
    ["3BR Penthouse at Grand Hyatt Residences", "condo", "Taguig", 45000000, 3, 4, 180, "available", ["https://placehold.co/600x400?text=Hyatt+PH"], "Luxury penthouse with panoramic BGC skyline views. Two parking slots included."],
    ["1BR Condo at Avida Towers Verte", "condo", "Taguig", 9800000, 1, 1, 42, "reserved", ["https://placehold.co/600x400?text=Avida+Verte"], "Modern 1BR in BGC, near schools and offices. Currently reserved."],
    ["Studio at Vinia Residences", "condo", "Quezon City", 4500000, 0, 1, 28, "available", ["https://placehold.co/600x400?text=Vinia+Studio"], "Affordable studio along EDSA, walking distance to MRT North Avenue."],
    ["2BR Condo at The Magnolia Residences", "condo", "Quezon City", 11500000, 2, 2, 68, "available", ["https://placehold.co/600x400?text=Magnolia+2BR"], "Spacious 2BR atop Robinsons Magnolia mall. Family-friendly amenities."],
    ["1BR Condo at Pioneer Woodlands", "condo", "Mandaluyong", 7200000, 1, 1, 40, "available", ["https://placehold.co/600x400?text=Pioneer+1BR"], "Near Boni MRT and Robinsons Forum. Great rental yield in the Ortigas-Makati corridor."],
    ["3BR Condo at The Florence", "condo", "Taguig", 22000000, 3, 3, 110, "sold", ["https://placehold.co/600x400?text=Florence+3BR"], "Large 3BR in McKinley Hill, Tuscan-inspired township. Recently sold."],
    ["4BR House and Lot at Ayala Alabang", "house", "Muntinlupa", 65000000, 4, 5, 420, "available", ["https://placehold.co/600x400?text=Alabang+House"], "Elegant family home in a prime gated village. Mature garden, pool, 3-car garage."],
    ["3BR House at BF Homes", "house", "Parañaque", 18000000, 3, 3, 220, "available", ["https://placehold.co/600x400?text=BF+Homes"], "Renovated 3-bedroom home in BF Homes. Near Aguirre restaurants and schools."],
    ["2BR Townhouse at Vista Verde", "townhouse", "Bacoor", 4200000, 2, 2, 90, "available", ["https://placehold.co/600x400?text=Vista+Verde"], "Affordable townhouse near Molino Boulevard. Flood-free, gated community."],
    ["3BR Townhouse at Lancaster New City", "townhouse", "Imus", 5600000, 3, 2, 110, "available", ["https://placehold.co/600x400?text=Lancaster"], "House in master-planned community along Daang Hari. Easy access to CAVITEX."],
    ["4BR House at Nuvali", "house", "Santa Rosa", 14500000, 4, 3, 250, "available", ["https://placehold.co/600x400?text=Nuvali"], "Eco-friendly community home near Solenad and Xavier School Nuvali."],
    ["3BR House at Sta. Rosa Estates", "house", "Santa Rosa", 9800000, 3, 2, 160, "reserved", ["https://placehold.co/600x400?text=Sta+Rosa"], "Modern home in Laguna near Eton City. Currently reserved by a buyer."],
    ["Residential Lot at Tagaytay Highlands", "lot", "Tagaytay", 12000000, null, null, 350, "available", ["https://placehold.co/600x400?text=Tagaytay+Lot"], "Premium lot with Taal Lake view in an exclusive mountain resort community."],
    ["Residential Lot at Silang", "lot", "Silang", 2800000, null, null, 300, "available", ["https://placehold.co/600x400?text=Silang+Lot"], "Cool-climate lot near Tagaytay, ideal for a vacation home or investment."],
    ["Commercial Lot along Aguinaldo Highway", "lot", "Imus", 18500000, null, null, 500, "available", ["https://placehold.co/600x400?text=Aguinaldo+Lot"], "High-traffic corner lot perfect for retail or food business."],
    ["2BR Condo at SMDC Light Residences", "condo", "Mandaluyong", 6800000, 2, 1, 50, "available", ["https://placehold.co/600x400?text=Light+2BR"], "Connected to Boni MRT station. Resort-style amenities, ideal starter home."],
    ["5BR House at Greenmeadows", "house", "Quezon City", 48000000, 5, 5, 500, "available", ["https://placehold.co/600x400?text=Greenmeadows"], "Grand family residence in an exclusive QC village. Pool, garden, 4-car garage."],
  ];
  const ts = now();
  const listings: Listing[] = rows.map((r) => ({
    id: uid(),
    title: r[0], type: r[1], city: r[2], price: r[3], bedrooms: r[4], bathrooms: r[5],
    floor_area_sqm: r[6], status: r[7], image_urls: r[8], description: r[9],
    created_at: ts, updated_at: ts, deleted_at: null,
  }));

  return { agents, inquiries: [], assignments: [], messages: [], listings };
}

// Persist across HMR / module reloads in dev.
const g = globalThis as unknown as { __ESTATE_DB__?: DB };
export const db: DB = g.__ESTATE_DB__ ?? (g.__ESTATE_DB__ = seed());

// ---------------------------------------------------------------------------
// Assignment engine (mirrors supabase/schema.sql, server-timestamp based)
// ---------------------------------------------------------------------------

function activeCount(agentId: string): number {
  return db.inquiries.filter((i) => i.state === "assigned" && i.current_agent_id === agentId).length;
}

function lastAssignedAt(agentId: string): number {
  const times = db.assignments.filter((a) => a.agent_id === agentId).map((a) => +new Date(a.assigned_at));
  return times.length ? Math.max(...times) : -Infinity; // never-assigned sorts first
}

export function pickAvailableAgent(excludeId?: string | null): string | null {
  const candidates = db.agents.filter((a) => a.status === "available" && a.id !== excludeId);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const ac = activeCount(a.id), bc = activeCount(b.id);
    if (ac !== bc) return ac - bc; // fewest active chats
    const al = lastAssignedAt(a.id), bl = lastAssignedAt(b.id);
    if (al !== bl) return al - bl; // round-robin fairness
    return a.id < b.id ? -1 : 1; // stable
  });
  return candidates[0].id;
}

function releaseActive(inquiryId: string) {
  for (const a of db.assignments) {
    if (a.inquiry_id === inquiryId && !a.released_at) a.released_at = now();
  }
}

export function reconcile(timeoutSeconds = REASSIGN_TIMEOUT_SECONDS) {
  // 1) Assign queued inquiries (oldest first) to available agents.
  const queued = db.inquiries
    .filter((i) => i.state === "queued")
    .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  for (const inq of queued) {
    const agent = pickAvailableAgent(null);
    if (!agent) break;
    inq.current_agent_id = agent;
    inq.current_assigned_at = now();
    inq.state = "assigned";
    db.assignments.push({ id: uid(), inquiry_id: inq.id, agent_id: agent, assigned_at: now(), released_at: null, reason: "initial" });
  }

  // 2) Reassign overdue inquiries (agent silent past the timeout window).
  const overdueCandidates = db.inquiries.filter(
    (i) =>
      i.state === "assigned" &&
      i.last_customer_msg_at &&
      (!i.last_agent_msg_at || new Date(i.last_agent_msg_at) < new Date(i.last_customer_msg_at)),
  );
  for (const inq of overdueCandidates) {
    const base = Math.max(
      +new Date(inq.last_customer_msg_at!),
      inq.current_assigned_at ? +new Date(inq.current_assigned_at) : 0,
    );
    if (Date.now() <= base + timeoutSeconds * 1000) continue;

    const next = pickAvailableAgent(inq.current_agent_id);
    if (next) {
      releaseActive(inq.id);
      inq.current_agent_id = next;
      inq.current_assigned_at = now();
      db.assignments.push({ id: uid(), inquiry_id: inq.id, agent_id: next, assigned_at: now(), released_at: null, reason: "reassigned_timeout" });
    } else {
      const cur = db.agents.find((a) => a.id === inq.current_agent_id);
      if (!cur || cur.status !== "available") {
        releaseActive(inq.id);
        inq.current_agent_id = null;
        inq.current_assigned_at = null;
        inq.state = "queued";
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function startInquiry(sessionId: string, customerName?: string): Inquiry {
  let inq = db.inquiries.find((i) => i.session_id === sessionId);
  if (!inq) {
    inq = {
      id: uid(),
      session_id: sessionId,
      customer_name: customerName?.trim() || "Guest",
      channel: "demo",
      state: "queued",
      current_agent_id: null,
      current_assigned_at: null,
      last_customer_msg_at: null,
      last_agent_msg_at: null,
      created_at: now(),
      resolved_at: null,
    };
    db.inquiries.push(inq);
  }
  reconcile();
  return db.inquiries.find((i) => i.id === inq!.id)!;
}

export function getInquiryBySession(sessionId: string): Inquiry | undefined {
  return db.inquiries.find((i) => i.session_id === sessionId);
}

export function sendMessage(input: { inquiryId: string; senderType: SenderType; senderId?: string | null; body: string }): Message {
  const msg: Message = {
    id: uid(),
    inquiry_id: input.inquiryId,
    sender_type: input.senderType,
    sender_id: input.senderId ?? null,
    body: input.body,
    created_at: now(),
  };
  db.messages.push(msg);
  const inq = db.inquiries.find((i) => i.id === input.inquiryId);
  if (inq) {
    if (input.senderType === "customer") {
      inq.last_customer_msg_at = msg.created_at;
      if (inq.state === "resolved") {
        inq.state = "queued";
        inq.resolved_at = null;
      }
    } else {
      inq.last_agent_msg_at = msg.created_at;
    }
  }
  reconcile();
  return msg;
}

export function messagesFor(inquiryId: string): Message[] {
  return db.messages
    .filter((m) => m.inquiry_id === inquiryId)
    .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
}

export function resolveInquiry(inquiryId: string) {
  releaseActive(inquiryId);
  const inq = db.inquiries.find((i) => i.id === inquiryId);
  if (inq) {
    inq.state = "resolved";
    inq.resolved_at = now();
    inq.current_agent_id = null;
    inq.current_assigned_at = null;
  }
}

export function manualReassign(inquiryId: string, agentId: string) {
  releaseActive(inquiryId);
  const inq = db.inquiries.find((i) => i.id === inquiryId);
  if (inq) {
    inq.current_agent_id = agentId;
    inq.current_assigned_at = now();
    inq.state = "assigned";
    db.assignments.push({ id: uid(), inquiry_id: inquiryId, agent_id: agentId, assigned_at: now(), released_at: null, reason: "manual" });
  }
}

export function setAgentStatus(agentId: string, status: AgentStatus) {
  const a = db.agents.find((x) => x.id === agentId);
  if (a) a.status = status;
  reconcile();
}

export function createAgent(name: string, status: AgentStatus = "available"): Agent {
  const agent: Agent = {
    id: uid(),
    name: name.trim(),
    avatar_url: `https://i.pravatar.cc/150?u=${encodeURIComponent(name.trim())}`,
    status,
    created_at: now(),
  };
  db.agents.push(agent);
  reconcile();
  return agent;
}

export function updateAgent(agentId: string, patch: { name?: string; status?: AgentStatus }) {
  const a = db.agents.find((x) => x.id === agentId);
  if (!a) return;
  if (patch.name !== undefined) a.name = patch.name.trim();
  if (patch.status !== undefined) a.status = patch.status;
  reconcile();
}

type ListingInput = Omit<Listing, "id" | "created_at" | "updated_at" | "deleted_at">;

export function createListing(input: ListingInput): Listing {
  const ts = now();
  const listing: Listing = { id: uid(), created_at: ts, updated_at: ts, deleted_at: null, ...input };
  db.listings.push(listing);
  return listing;
}

export function updateListing(id: string, input: Partial<ListingInput>) {
  const l = db.listings.find((x) => x.id === id);
  if (!l) return;
  Object.assign(l, input, { updated_at: now() });
}

export function softDeleteListing(id: string) {
  const l = db.listings.find((x) => x.id === id);
  if (l) l.deleted_at = now();
}

export function snapshot() {
  reconcile();
  return {
    agents: db.agents,
    inquiries: db.inquiries,
    assignments: db.assignments,
    listings: db.listings.filter((l) => !l.deleted_at),
  };
}
