import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only client using the service role key. Used by route handlers
// (e.g. /api/reconcile) that need to run the assignment engine reliably.
export function getSupabaseAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
