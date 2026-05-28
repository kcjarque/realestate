import type { Message, SenderType } from "@/lib/types";

// =============================================================================
// CHANNEL ABSTRACTION
// -----------------------------------------------------------------------------
// The "customer window" is just one adapter. Today it's a DemoChannel backed by
// Supabase. To add Facebook Messenger later, implement MessengerChannel:
//   * send(): for an AGENT message, call the FB Send API, then persist to the
//     `messages` table (so agent/admin UIs stay in sync). For a CUSTOMER message,
//     a FB webhook handler would insert into `messages` instead.
//   * subscribe(): keep reading from `messages` via Realtime — the webhook makes
//     inbound FB messages appear there, so the rest of the app is unchanged.
// Nothing outside this folder knows which channel is in use.
// =============================================================================

export interface SendMessageInput {
  inquiryId: string;
  senderType: SenderType;
  senderId?: string | null;
  body: string;
}

export interface Channel {
  /** Persist + deliver an outbound message; returns the stored row. */
  send(input: SendMessageInput): Promise<Message>;
  /** Subscribe to new messages on an inquiry. Returns an unsubscribe fn. */
  subscribe(inquiryId: string, onMessage: (m: Message) => void): () => void;
}
