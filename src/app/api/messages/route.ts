import { NextRequest, NextResponse } from "next/server";
import { messagesFor } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const inquiryId = req.nextUrl.searchParams.get("inquiryId");
  if (!inquiryId) return NextResponse.json([]);
  return NextResponse.json(messagesFor(inquiryId));
}
