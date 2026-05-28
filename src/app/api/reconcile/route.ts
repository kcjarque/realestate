import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { REASSIGN_TIMEOUT_SECONDS } from "@/lib/constants";

// The assignment engine's heartbeat. The agent + admin screens POST here on a
// short interval (see useReconcileTicker). All the actual logic — queue draining
// and timeout reassignment — lives in the reconcile_assignments() SQL function,
// which is server-timestamp based and race-safe (advisory lock).
export const dynamic = "force-dynamic";

export async function POST() {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.rpc("reconcile_assignments", {
    p_timeout_seconds: REASSIGN_TIMEOUT_SECONDS,
  });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, result: data });
}
