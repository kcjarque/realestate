import type { Agent, AgentStatus, Assignment, Inquiry, Listing, Message, SenderType } from "@/lib/types";

export interface Snapshot {
  agents: Agent[];
  inquiries: Inquiry[];
  assignments: Assignment[];
  listings: Listing[];
}

export type ListingInput = Omit<Listing, "id" | "created_at" | "updated_at" | "deleted_at">;

export async function fetchData(): Promise<Snapshot> {
  const res = await fetch("/api/data", { cache: "no-store" });
  return res.json();
}

export async function fetchMessages(inquiryId: string): Promise<Message[]> {
  const res = await fetch(`/api/messages?inquiryId=${encodeURIComponent(inquiryId)}`, { cache: "no-store" });
  return res.json();
}

async function action<T = unknown>(payload: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export const api = {
  startInquiry: (sessionId: string, customerName?: string) =>
    action<{ inquiry: Inquiry }>({ type: "startInquiry", sessionId, customerName }),
  sendMessage: (inquiryId: string, senderType: SenderType, body: string, senderId?: string | null) =>
    action<{ message: Message }>({ type: "sendMessage", inquiryId, senderType, body, senderId }),
  resolveInquiry: (inquiryId: string) => action({ type: "resolveInquiry", inquiryId }),
  manualReassign: (inquiryId: string, agentId: string) => action({ type: "manualReassign", inquiryId, agentId }),
  setAgentStatus: (agentId: string, status: AgentStatus) => action({ type: "setAgentStatus", agentId, status }),
  createAgent: (name: string, status: AgentStatus) => action<{ agent: Agent }>({ type: "createAgent", name, status }),
  updateAgent: (agentId: string, patch: { name?: string; status?: AgentStatus }) =>
    action({ type: "updateAgent", agentId, ...patch }),
  createListing: (listing: ListingInput) => action<{ listing: Listing }>({ type: "createListing", listing }),
  updateListing: (id: string, listing: ListingInput) => action({ type: "updateListing", id, listing }),
  deleteListing: (id: string) => action({ type: "deleteListing", id }),
};
