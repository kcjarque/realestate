import { NextResponse } from "next/server";
import { snapshot } from "@/lib/server/store";

// Single polling endpoint. Runs reconcile (assignment + timeout reassignment)
// then returns the full snapshot, so the engine advances whenever any tab polls.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(snapshot());
}
