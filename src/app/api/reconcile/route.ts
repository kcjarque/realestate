import { NextResponse } from "next/server";
import { reconcile } from "@/lib/server/store";

// Kept for compatibility; /api/data already reconciles on every poll.
export const dynamic = "force-dynamic";

export async function POST() {
  reconcile();
  return NextResponse.json({ ok: true });
}
