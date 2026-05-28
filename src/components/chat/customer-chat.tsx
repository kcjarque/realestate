"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { demoChannel } from "@/lib/channel/demo-channel";
import { MessageList } from "./message-list";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Agent, Inquiry, Message } from "@/lib/types";

export function CustomerChat() {
  const params = useParams();
  const sessionId = String(params.sessionId);
  const sb = getSupabaseBrowser();

  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const creating = useRef(false);

  // Resolve (or create) the inquiry for this session.
  useEffect(() => {
    let cancelled = false;
    async function ensure() {
      const { data } = await sb.from("inquiries").select("*").eq("session_id", sessionId).maybeSingle();
      if (cancelled) return;
      if (data) {
        setInquiry(data as Inquiry);
      } else if (!creating.current) {
        creating.current = true;
        await sb.rpc("start_inquiry", { p_session_id: sessionId, p_customer_name: "Guest" });
        const { data: created } = await sb.from("inquiries").select("*").eq("session_id", sessionId).maybeSingle();
        if (!cancelled) setInquiry(created as Inquiry);
      }
    }
    ensure();
    return () => {
      cancelled = true;
    };
  }, [sessionId, sb]);

  // Load messages + subscribe to the message stream and inquiry changes.
  useEffect(() => {
    if (!inquiry?.id) return;
    const inquiryId = inquiry.id;

    sb.from("messages")
      .select("*")
      .eq("inquiry_id", inquiryId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data ?? []) as Message[]));

    const unsub = demoChannel.subscribe(inquiryId, (m) => {
      setMessages((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
    });

    const inqCh = sb
      .channel(`inquiry:${inquiryId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "inquiries", filter: `id=eq.${inquiryId}` },
        (payload) => setInquiry(payload.new as Inquiry),
      )
      .subscribe();

    return () => {
      unsub();
      sb.removeChannel(inqCh);
    };
  }, [inquiry?.id, sb]);

  // Keep the assigned-agent card in sync.
  useEffect(() => {
    const agentId = inquiry?.current_agent_id;
    if (!agentId) {
      setAgent(null);
      return;
    }
    sb.from("agents").select("*").eq("id", agentId).maybeSingle().then(({ data }) => setAgent(data as Agent));
  }, [inquiry?.current_agent_id, sb]);

  async function handleSend() {
    const body = input.trim();
    if (!body || !inquiry) return;
    setSending(true);
    setInput("");
    try {
      // Reopen a resolved conversation if the customer comes back.
      if (inquiry.state === "resolved") {
        await sb.from("inquiries").update({ state: "queued", resolved_at: null }).eq("id", inquiry.id);
        fetch("/api/reconcile", { method: "POST" }).catch(() => {});
      }
      await demoChannel.send({ inquiryId: inquiry.id, senderType: "customer", body });
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
              <Loader2 className={connecting || !resolved ? "h-5 w-5 animate-spin" : "h-5 w-5"} />
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

        {/* Resolved banner */}
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
