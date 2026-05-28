"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { api, fetchData, fetchMessages } from "@/lib/api";
import { usePoll } from "@/lib/hooks/use-poll";
import { POLL_INTERVAL_MS } from "@/lib/constants";
import { MessageList } from "./message-list";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Message } from "@/lib/types";

export function CustomerChat() {
  const params = useParams();
  const sessionId = String(params.sessionId);

  const { data } = usePoll(fetchData, POLL_INTERVAL_MS);
  const inquiry = data?.inquiries.find((i) => i.session_id === sessionId) ?? null;
  const agent = inquiry?.current_agent_id
    ? data?.agents.find((a) => a.id === inquiry.current_agent_id) ?? null
    : null;

  // Create the inquiry if landing directly on a session that doesn't exist yet.
  const creating = useRef(false);
  useEffect(() => {
    if (data && !inquiry && !creating.current) {
      creating.current = true;
      api.startInquiry(sessionId, "Guest");
    }
  }, [data, inquiry, sessionId]);

  const { data: messagesData, refetch: refetchMessages } = usePoll<Message[]>(
    () => (inquiry ? fetchMessages(inquiry.id) : Promise.resolve([])),
    POLL_INTERVAL_MS,
  );
  const messages = messagesData ?? [];

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const body = input.trim();
    if (!body || !inquiry) return;
    setSending(true);
    setInput("");
    try {
      await api.sendMessage(inquiry.id, "customer", body);
      refetchMessages();
    } finally {
      setSending(false);
    }
  }

  const connecting = !inquiry;
  const assigned = Boolean(agent) && inquiry?.state === "assigned";
  const resolved = inquiry?.state === "resolved";

  return (
    <div className="flex h-[100dvh] items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="flex h-[640px] max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-3 text-white">
          {assigned ? (
            <Avatar name={agent!.name} src={agent!.avatar_url} className="h-10 w-10 border-2 border-white/40" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Loader2 className={resolved ? "h-5 w-5" : "h-5 w-5 animate-spin"} />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-sm font-semibold">
              {resolved
                ? "Conversation resolved"
                : assigned
                  ? `You're chatting with ${agent!.name}`
                  : "Connecting you to an agent"}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/80">
              {assigned ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Online · usually replies quickly
                </>
              ) : resolved ? (
                "Send a message to reopen"
              ) : (
                "An agent will be with you shortly."
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="scroll-thin flex-1 overflow-y-auto bg-slate-50">
          <MessageList
            messages={messages}
            viewer="customer"
            agentName={agent?.name ?? "Agent"}
            agentAvatar={agent?.avatar_url}
            emptyHint="Say hello to get started — an agent will be assigned to you right away."
          />
        </div>

        {resolved && (
          <div className="flex items-center gap-2 border-t bg-emerald-50 px-4 py-2 text-xs text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> This chat was marked resolved. You can still message to reopen it.
          </div>
        )}

        {/* Composer */}
        <form
          className="flex items-center gap-2 border-t bg-card p-3"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={connecting ? "Connecting…" : "Type a message…"}
            disabled={connecting}
            className="rounded-full"
          />
          <Button type="submit" size="icon" className="shrink-0 rounded-full" disabled={connecting || sending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
