"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Send, CheckCheck, Home, Loader2, Inbox } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useRealtimeList } from "@/lib/hooks/use-realtime-list";
import { useReconcileTicker } from "@/lib/hooks/use-reconcile";
import { demoChannel } from "@/lib/channel/demo-channel";
import { MessageList } from "@/components/chat/message-list";
import { QueueList } from "./queue-list";
import { RecommendationPanel } from "./recommendation-panel";
import { ReassignTimer } from "./reassign-timer";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Agent, Inquiry, Listing, Message } from "@/lib/types";

export function AgentWorkspace() {
  const agentId = String(useParams().agentId);
  const sb = getSupabaseBrowser();
  useReconcileTicker(true); // this screen drives the assignment engine

  const [agent, setAgent] = useState<Agent | null>(null);
  useEffect(() => {
    sb.from("agents").select("*").eq("id", agentId).maybeSingle().then(({ data }) => setAgent(data as Agent));
    const ch = sb
      .channel(`agent:${agentId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "agents", filter: `id=eq.${agentId}` },
        (p) => setAgent(p.new as Agent),
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [agentId, sb]);

  const { rows: allInquiries } = useRealtimeList<Inquiry>(
    "inquiries",
    async () => {
      const { data } = await sb.from("inquiries").select("*");
      return (data ?? []) as Inquiry[];
    },
    [agentId],
  );
  const queue = useMemo(
    () => allInquiries.filter((i) => i.current_agent_id === agentId && i.state === "assigned"),
    [allInquiries, agentId],
  );

  const { rows: listings } = useRealtimeList<Listing>(
    "listings",
    async () => {
      const { data } = await sb.from("listings").select("*").is("deleted_at", null);
      return (data ?? []) as Listing[];
    },
    [],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (queue.length === 0) {
      setSelectedId(null);
    } else if (!selectedId || !queue.some((q) => q.id === selectedId)) {
      setSelectedId(queue[0].id);
    }
  }, [queue, selectedId]);
  const selected = queue.find((q) => q.id === selectedId) ?? null;

  const [messages, setMessages] = useState<Message[]>([]);
  useEffect(() => {
    if (!selected?.id) {
      setMessages([]);
      return;
    }
    const id = selected.id;
    sb.from("messages")
      .select("*")
      .eq("inquiry_id", id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data ?? []) as Message[]));
    const unsub = demoChannel.subscribe(id, (m) =>
      setMessages((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m])),
    );
    return () => unsub();
  }, [selected?.id, sb]);

  const customerText = useMemo(
    () => messages.filter((m) => m.sender_type === "customer").map((m) => m.body).join(" "),
    [messages],
  );

  const [composer, setComposer] = useState("");
  useEffect(() => setComposer(""), [selected?.id]);

  function insert(text: string) {
    setComposer((prev) => (prev.trim() ? `${prev.replace(/\s+$/, "")}\n${text}` : text));
  }

  async function sendReply() {
    const body = composer.trim();
    if (!body || !selected) return;
    setComposer("");
    await demoChannel.send({ inquiryId: selected.id, senderType: "agent", senderId: agentId, body });
  }

  async function toggleStatus() {
    if (!agent) return;
    const next = agent.status === "available" ? "away" : "available";
    await sb.from("agents").update({ status: next }).eq("id", agentId);
    fetch("/api/reconcile", { method: "POST" }).catch(() => {});
    toast.success(next === "away" ? "You're now Away — new chats will skip you" : "You're now Available");
  }

  async function resolve() {
    if (!selected) return;
    await sb.rpc("resolve_inquiry", { p_inquiry_id: selected.id });
    fetch("/api/reconcile", { method: "POST" }).catch(() => {});
    toast.success("Conversation resolved");
  }

  if (!agent) {
    return (
      <div className="flex h-[100dvh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading workspace…
      </div>
    );
  }

  const available = agent.status === "available";

  return (
    <div className="flex h-[100dvh] flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b bg-card px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            <Home className="h-4 w-4" />
          </Link>
          <Avatar name={agent.name} src={agent.avatar_url} className="h-9 w-9" />
          <div>
            <div className="text-sm font-semibold">{agent.name}</div>
            <div className="text-xs text-muted-foreground">{queue.length} active chat{queue.length === 1 ? "" : "s"}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${available ? "text-emerald-600" : "text-muted-foreground"}`}>
            {available ? "Available" : "Away"}
          </span>
          <Switch checked={available} onCheckedChange={toggleStatus} aria-label="Toggle availability" />
        </div>
      </header>

      {/* 3-pane workspace */}
      <div className="grid flex-1 grid-cols-[18rem_1fr_22rem] overflow-hidden">
        {/* Left: queue */}
        <aside className="scroll-thin overflow-y-auto border-r bg-card">
          <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your queue
          </div>
          <QueueList inquiries={queue} selectedId={selectedId} onSelect={setSelectedId} />
        </aside>

        {/* Center: conversation */}
        <section className="flex min-w-0 flex-col bg-slate-50">
          {selected ? (
            <>
              <div className="flex items-center justify-between gap-2 border-b bg-card px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <Avatar name={selected.customer_name} className="h-9 w-9" />
                  <div>
                    <div className="text-sm font-semibold">{selected.customer_name}</div>
                    <div className="text-xs text-muted-foreground">Customer · {selected.channel}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ReassignTimer inquiry={selected} />
                  <Button variant="outline" size="sm" onClick={resolve}>
                    <CheckCheck className="h-4 w-4" /> Resolve
                  </Button>
                </div>
              </div>

              <div className="scroll-thin flex-1 overflow-y-auto">
                <MessageList
                  messages={messages}
                  viewer="agent"
                  customerName={selected.customer_name}
                  emptyHint="No messages yet — say hello to your customer."
                />
              </div>

              <form
                className="border-t bg-card p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendReply();
                }}
              >
                <Textarea
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendReply();
                    }
                  }}
                  placeholder="Type your reply…  (Enter to send, Shift+Enter for newline)"
                  className="mb-2 max-h-40 min-h-[44px] resize-none"
                />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={!composer.trim()}>
                    <Send className="h-4 w-4" /> Send
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <Inbox className="h-8 w-8" />
              <p className="text-sm">
                {available
                  ? "No active chats. New inquiries land here the moment they arrive."
                  : "You're Away. Switch to Available to receive chats."}
              </p>
            </div>
          )}
        </section>

        {/* Right: recommendations + templates */}
        <aside className="overflow-hidden border-l bg-card">
          {selected ? (
            <RecommendationPanel
              customerText={customerText}
              listings={listings}
              agentName={agent.name}
              onInsert={insert}
            />
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Suggestions appear here when a conversation is open.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
