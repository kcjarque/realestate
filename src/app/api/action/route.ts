import { NextRequest, NextResponse } from "next/server";
import * as store from "@/lib/server/store";

// Single dispatch endpoint for all mutations.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const p = await req.json();
  switch (p.type) {
    case "startInquiry":
      return NextResponse.json({ inquiry: store.startInquiry(p.sessionId, p.customerName) });
    case "sendMessage":
      return NextResponse.json({
        message: store.sendMessage({
          inquiryId: p.inquiryId,
          senderType: p.senderType,
          senderId: p.senderId ?? null,
          body: p.body,
          listing: p.listing ?? null,
        }),
      });
    case "resolveInquiry":
      store.resolveInquiry(p.inquiryId);
      return NextResponse.json({ ok: true });
    case "manualReassign":
      store.manualReassign(p.inquiryId, p.agentId);
      return NextResponse.json({ ok: true });
    case "setAgentStatus":
      store.setAgentStatus(p.agentId, p.status);
      return NextResponse.json({ ok: true });
    case "createAgent":
      return NextResponse.json({ agent: store.createAgent(p.name, p.status) });
    case "updateAgent":
      store.updateAgent(p.agentId, { name: p.name, status: p.status });
      return NextResponse.json({ ok: true });
    case "createListing":
      return NextResponse.json({ listing: store.createListing(p.listing) });
    case "updateListing":
      store.updateListing(p.id, p.listing);
      return NextResponse.json({ ok: true });
    case "deleteListing":
      store.softDeleteListing(p.id);
      return NextResponse.json({ ok: true });
    case "reconcile":
      store.reconcile();
      return NextResponse.json({ ok: true });
    default:
      return NextResponse.json({ error: `unknown action: ${p.type}` }, { status: 400 });
  }
}
