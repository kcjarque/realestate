"use client";

import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Channel, SendMessageInput } from "./index";
import type { Message } from "@/lib/types";

// DemoChannel: the local, self-contained adapter. Messages live in Supabase and
// stream back over Realtime. A future MessengerChannel would implement the same
// interface (see channel/index.ts) without touching any UI.
export class DemoChannel implements Channel {
  // Lazy: don't construct the Supabase client at module-load (would break the
  // production build's prerender when env vars aren't present at build time).
  private get sb() {
    return getSupabaseBrowser();
  }

  async send(input: SendMessageInput): Promise<Message> {
    const { data, error } = await this.sb
      .from("messages")
      .insert({
        inquiry_id: input.inquiryId,
        sender_type: input.senderType,
        sender_id: input.senderId ?? null,
        body: input.body,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Message;
  }

  subscribe(inquiryId: string, onMessage: (m: Message) => void): () => void {
    const channel = this.sb
      .channel(`messages:${inquiryId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `inquiry_id=eq.${inquiryId}` },
        (payload) => onMessage(payload.new as Message),
      )
      .subscribe();
    return () => {
      this.sb.removeChannel(channel);
    };
  }
}

export const demoChannel: Channel = new DemoChannel();
