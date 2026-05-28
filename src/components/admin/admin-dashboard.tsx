"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Users, Inbox, Clock, CheckCircle2, ChevronRight, ExternalLink, AlertTriangle } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useRealtimeList } from "@/lib/hooks/use-realtime-list";
import { useReconcileTicker } from "@/lib/hooks/use-reconcile";
import { AgentEditDialog } from "./agent-edit-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn, timeAgo, formatClock } from "@/lib/utils";
import type { Agent, Assignment, AssignmentReason, Inquiry, InquiryState } from "@/lib/types";

const reasonLabel: Record<AssignmentReason, string> = {
  initial: "initial",
  reassigned_timeout: "timeout",
  manual: "manual",
};

const stateVariant: Record<InquiryState, "info" | "success" | "muted"> = {
  queued: "info",
  assigned: "success",
  resolved: "muted",
};

export function AdminDashboard() {
  const sb = getSupabaseBrowser();
  useReconcileTicker(true); // admin board drives the engine while open

  const { rows: agents, refetch: refetchAgents } = useRealtimeList<Agent>(
    "agents",
    async () => {
      const { data } = await sb.from("agents").select("*").order("name");
      return (data ?? []) as Agent[];
    },
    [],
  );
  const { rows: inquiries } = useRealtimeList<Inquiry>(
    "inquiries",
    async () => {
      const { data } = await sb.from("inquiries").select("*");
      return (data ?? []) as Inquiry[];
    },
    [],
  );
  const { rows: assignments } = useRealtimeList<Assignment>(
    "assignments",
    async () => {
      const { data } = await sb.from("assignments").select("*");
      return (data ?? []) as Assignment[];
    },
    [],
  );

  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const agentName = useMemo(() => new Map(agents.map((a) => [a.id, a.name])), [agents]);
  const activeByAgent = useMemo(() => {
    const m = new Map<string, Inquiry[]>();
    for (const i of inquiries) {
      if (i.state === "assigned" && i.current_agent_id) {
        const arr = m.get(i.current_agent_id) ?? [];
        arr.push(i);
        m.set(i.current_agent_id, arr);
      }
    }
    return m;
  }, [inquiries]);

  const stats = useMemo(() => {
    return {
      total: inquiries.length,
      active: inquiries.filter((i) => i.state === "assigned").length,
      queued: inquiries.filter((i) => i.state === "queued").length,
      resolved: inquiries.filter((i) => i.state === "resolved").length,
      available: agents.filter((a) => a.status === "available").length,
    };
  }, [inquiries, agents]);

  const log = useMemo(() => {
    const byInquiry = new Map<string, Assignment[]>();
    for (const a of assignments) {
      const arr = byInquiry.get(a.inquiry_id) ?? [];
      arr.push(a);
      byInquiry.set(a.inquiry_id, arr);
    }
    for (const arr of byInquiry.values())
      arr.sort((x, y) => new Date(x.assigned_at).getTime() - new Date(y.assigned_at).getTime());
    return [...inquiries]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((inq) => ({ inq, history: byInquiry.get(inq.id) ?? [] }));
  }, [inquiries, assignments]);

  async function toggleStatus(a: Agent) {
    const next = a.status === "available" ? "away" : "available";
    await sb.from("agents").update({ status: next }).eq("id", a.id);
    fetch("/api/reconcile", { method: "POST" }).catch(() => {});
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat icon={Users} label="Agents available" value={`${stats.available}/${agents.length}`} />
        <Stat icon={Inbox} label="Active chats" value={stats.active} />
        <Stat icon={Clock} label="Queued" value={stats.queued} highlight={stats.queued > 0} />
        <Stat icon={CheckCircle2} label="Resolved" value={stats.resolved} />
        <Stat icon={Inbox} label="Total inquiries" value={stats.total} />
      </div>

      {stats.queued > 0 && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          {stats.queued} inquiry{stats.queued > 1 ? "ies are" : " is"} waiting for an available agent — they&rsquo;ll be
          assigned automatically the moment capacity frees up.
        </div>
      )}

      {/* Agents board / roster */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Agents</h2>
          <Button
            size="sm"
            onClick={() => {
              setEditAgent(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add agent
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => {
            const active = activeByAgent.get(a.id) ?? [];
            return (
              <div key={a.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <Avatar name={a.name} src={a.avatar_url} className="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-semibold">{a.name}</span>
                      <button onClick={() => { setEditAgent(a); setDialogOpen(true); }} className="text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <Badge variant={a.status === "available" ? "success" : "muted"}>{a.status}</Badge>
                      <span className="text-xs text-muted-foreground">{active.length} active</span>
                    </div>
                  </div>
                  <Switch checked={a.status === "available"} onCheckedChange={() => toggleStatus(a)} aria-label="toggle" />
                </div>
                {active.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1 border-t pt-3">
                    {active.map((i) => (
                      <Badge key={i.id} variant="secondary" className="font-normal">
                        {i.customer_name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Inquiry log */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Inquiry log <span className="font-normal text-muted-foreground">— assignment history</span>
        </h2>
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="grid grid-cols-[1.2fr_0.6fr_2.4fr_0.7fr] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <div>Customer</div>
            <div>Status</div>
            <div>Assignment trail</div>
            <div className="text-right">Started</div>
          </div>
          <div className="scroll-thin max-h-[460px] divide-y overflow-y-auto">
            {log.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No inquiries yet.</div>}
            {log.map(({ inq, history }) => (
              <div key={inq.id} className="grid grid-cols-[1.2fr_0.6fr_2.4fr_0.7fr] items-center gap-3 px-4 py-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar name={inq.customer_name} className="h-7 w-7 text-[10px]" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{inq.customer_name}</div>
                    <Link
                      href={`/chat/${inq.session_id}`}
                      target="_blank"
                      className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      open chat <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                </div>
                <div>
                  <Badge variant={stateVariant[inq.state]} className="capitalize">
                    {inq.state}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {history.length === 0 && <span className="text-xs text-muted-foreground">queued — awaiting agent</span>}
                  {history.map((h, idx) => (
                    <span key={h.id} className="flex items-center gap-1">
                      {idx > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs",
                          h.released_at ? "bg-muted/50 text-muted-foreground" : "border-emerald-200 bg-emerald-50 text-emerald-700",
                        )}
                        title={`${reasonLabel[h.reason]} · ${formatClock(h.assigned_at)}`}
                      >
                        {agentName.get(h.agent_id) ?? "—"}
                        <span className="text-[10px] opacity-70">· {reasonLabel[h.reason]}</span>
                      </span>
                    </span>
                  ))}
                  {inq.state === "resolved" && (
                    <span className="flex items-center gap-1">
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> resolved
                      </span>
                    </span>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground">{timeAgo(inq.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AgentEditDialog open={dialogOpen} onOpenChange={setDialogOpen} agent={editAgent} onSaved={refetchAgents} />
    </main>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-sm", highlight && "border-amber-300 bg-amber-50")}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
