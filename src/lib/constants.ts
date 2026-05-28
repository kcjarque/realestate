// =============================================================================
// Tunable demo settings. Change these and the whole app + engine follow.
// =============================================================================

/** Seconds an agent may stay silent on an unanswered customer message before the
 *  inquiry auto-reassigns. Passed straight into the reconcile_assignments() RPC. */
export const REASSIGN_TIMEOUT_SECONDS = 30;

/** How often the agent/admin screens fire a reconcile tick (drives the timer).
 *  The decision is server-timestamp based, so a coarse interval is fine. */
export const RECONCILE_INTERVAL_MS = 3000;

/** How often screens poll the in-memory backend for live updates. Each /api/data
 *  poll also runs reconcile server-side, so this drives reassignment too. */
export const POLL_INTERVAL_MS = 1500;

/** Max AI listing recommendations shown to an agent at once. */
export const MAX_RECOMMENDATIONS = 3;

/** Listings priced up to budget * (1 + tolerance) still count as "within budget". */
export const BUDGET_TOLERANCE = 0.1;

/** Supabase Storage bucket for listing images. */
export const STORAGE_BUCKET = "listing-images";

/** Minimal agent quick-insert templates. {agent} is replaced with the agent name. */
export const QUICK_TEMPLATES: { label: string; body: string }[] = [
  {
    label: "Greeting",
    body: "Hi! This is {agent}. Thanks for reaching out — how can I help you find the right property today?",
  },
  {
    label: "Ask budget",
    body: "To narrow things down, may I know your budget range and preferred location?",
  },
  {
    label: "Schedule viewing",
    body: "Would you like to schedule a viewing? I'm free this week — what day works best for you?",
  },
];
