"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Send, CheckCheck, Home, Loader2, Inbox, PanelLeft, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { api, fetchData, fetchMessages } from "@/lib/api";
import { usePoll } from "@/lib/hooks/use-poll";
import { POLL_INTERVAL_MS } from "@/lib/constants";
import { MessageList } from "@/components/chat/message-list";
import { QueueList } from "./queue-list";
import { RecommendationPanel } from "./recommendation-panel";
import { ReassignTimer } from "./reassign-timer";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Listing, Message, MessageListing } from "@/lib/types";

export function AgentWorkspace() {
  const agentId = String(useParams().agentId);
  const { data, refetch: refetchData } = usePoll(fetchData, POLL_INTERVAL_MS);

  const agent = useMemo(() => data?.agents.find((a) => a.id === agentId) ?? null, [data, agentId]);
  const queue = useMemo(
    () => (data?.inquiries ?? []).filter((i) => i.current_agent_id === agentId && i.state === "assigned"),
    [data, agentId],
  );
  const listings = useMemo(() => data?.listings ?? [], [data]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const [recsOpen, setRecsOpen] = useState(false);

  useEffect(() => {
    if (queue.length === 0) setSelectedId(null);
    else if (!selectedId || !queue.some((q) => q.id === selectedId)) setSelectedId(queue[0].id);
  }, [queue, selectedId]);
  const selected = queue.find((q) => q.id === selectedId) ?? null;

  const { data: messagesData, refetch: refetchMessages } = usePoll<Message[]>(
    () => (selected ? fetchMessages(selected.id) : Promise.resolve([])),
    POLL_INTERVAL_MS,
  );
  const messages = useMemo(() => messagesData ?? [], [messagesData]);
  useEffect(() => {
    refetchMessages();
  }, [selected?.id, refetchMessages]);

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
    await api.sendMessage(selected.id, "agent", body, agentId);
    refetchMessages();
  }

  async function toggleStatus() {
    if (!agent) return;
    const next = agent.status === "available" ? "away" : "available";
    await api.setAgentStatus(agentId, next);
    refetchData();
    toast.success(next === "away" ? "You're now Away — new chats will skip you" : "You're now Available");
  }

  async function resolve() {
    if (!selected) return;
    await api.resolveInquiry(selected.id);
    refetchData();
    toast.success("Conversation resolved");
  }

  async function sendListing(listing: Listing) {
    if (!selected) return;
    const card: MessageListing = {
      id: listing.id,
      title: listing.title,
      type: listing.type,
      city: listing.city,
      price: listing.price,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      floor_area_sqm: listing.floor_area_sqm,
      image_url: listing.image_urls[0] ?? null,
    };
    setRecsOpen(false);
    await api.sendMessage(selected.id, "agent", "", agentId, card);
    refetchMessages();
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
      <header className="flex items-center justify-between gap-2 border-b bg-card px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link href="/" className="shrink-0 text-muted-foreground hover:text-foreground">
            <Home className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setQueueOpen(true)}
            aria-label="Open queue"
            className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted lg:hidden"
          >
            <PanelLeft className="h-4 w-4" />
            {queue.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {queue.length}
              </span>
            )}
          </button>
          <Avatar name={agent.name} src={agent.avatar_url} className="h-9 w-9 shrink-0" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{agent.name}</div>
            <div className="text-xs text-muted-foreground">
              {queue.length} active chat{queue.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {selected && (
            <button
              onClick={() => setRecsOpen(true)}
              aria-label="Open suggestions"
              className="inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs font-medium text-muted-foreground hover:bg-muted xl:hidden"
            >
              <Sparkles className="h-4 w-4 text-violet-500" /> Suggestions
            </button>
          )}
          <span className={`hidden text-xs font-medium sm:inline ${available ? "text-emerald-600" : "text-muted-foreground"}`}>
            {available ? "Available" : "Away"}
          </span>
          <Switch checked={available} onCheckedChange={toggleStatus} aria-label="Toggle availability" />
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        {queueOpen && <div className="absolute inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setQueueOpen(false)} />}
        {recsOpen && <div className="absolute inset-0 z-20 bg-black/30 xl:hidden" onClick={() => setRecsOpen(false)} />}

        <aside
          className={cn(
            "scroll-thin absolute inset-y-0 left-0 z-30 w-72 shrink-0 overflow-y-auto border-r bg-card transition-transform duration-200 lg:static lg:z-0 lg:translate-x-0",
            queueOpen ? "translate-x-0 shadow-xl" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your queue</span>
            <button className="text-muted-foreground hover:text-foreground lg:hidden" onClick={() => setQueueOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <QueueList
            inquiries={queue}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setQueueOpen(false);
            }}
          />
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-slate-50">
          {selected ? (
            <>
              <div className="flex items-center justify-between gap-2 border-b bg-card px-4 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={selected.customer_name} className="h-9 w-9 shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{selected.customer_name}</div>
                    <div className="text-xs text-muted-foreground">Customer · {selected.channel}</div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <ReassignTimer inquiry={selected} />
                  <Button variant="outline" size="sm" onClick={resolve}>
                    <CheckCheck className="h-4 w-4" /> <span className="hidden sm:inline">Resolve</span>
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
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
              <Inbox className="h-8 w-8" />
              <p className="text-sm">
                {available
                  ? "No active chats. New inquiries land here the moment they arrive."
                  : "You're Away. Switch to Available to receive chats."}
              </p>
            </div>
          )}
        </section>

        <aside
          className={cn(
            "absolute inset-y-0 right-0 z-30 flex w-80 shrink-0 flex-col overflow-hidden border-l bg-card transition-transform duration-200 xl:static xl:z-0 xl:translate-x-0",
            recsOpen ? "translate-x-0 shadow-xl" : "translate-x-full",
          )}
        >
          <div className="flex items-center justify-end border-b px-2 py-1.5 xl:hidden">
            <button className="text-muted-foreground hover:text-foreground" onClick={() => setRecsOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1">
            {selected ? (
              <RecommendationPanel
                customerText={customerText}
                listings={listings}
                agentName={agent.name}
                onInsert={(text) => {
                  insert(text);
                  setRecsOpen(false);
                }}
                onSendListing={sendListing}
              />
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Suggestions appear here when a conversation is open.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
