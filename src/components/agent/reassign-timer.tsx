"use client";

import { useEffect, useState } from "react";
import { AlarmClock } from "lucide-react";
import { REASSIGN_TIMEOUT_SECONDS } from "@/lib/constants";
import type { Inquiry } from "@/lib/types";
import { cn } from "@/lib/utils";

// Pure deadline math from server timestamps — identical for every viewer and
// resilient to refresh. Returns null when there's no live countdown (the agent
// has already answered the latest customer message, or none exists yet).
export function computeDeadlineMs(inq: Inquiry): number | null {
  if (!inq.last_customer_msg_at) return null;
  const customerMs = new Date(inq.last_customer_msg_at).getTime();
  const answered = inq.last_agent_msg_at && new Date(inq.last_agent_msg_at).getTime() >= customerMs;
  if (answered) return null;
  const assignedMs = inq.current_assigned_at ? new Date(inq.current_assigned_at).getTime() : 0;
  return Math.max(customerMs, assignedMs) + REASSIGN_TIMEOUT_SECONDS * 1000;
}

export function ReassignTimer({ inquiry, className }: { inquiry: Inquiry; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const deadline = computeDeadlineMs(inquiry);
  if (deadline === null) return null;

  const remaining = Math.max(0, Math.round((deadline - now) / 1000));
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");
  const danger = remaining <= 10;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        remaining === 0
          ? "animate-pulse bg-red-100 text-red-700"
          : danger
            ? "bg-amber-100 text-amber-700"
            : "bg-muted text-muted-foreground",
        className,
      )}
    >
      <AlarmClock className="h-3 w-3" />
      {remaining === 0 ? "Reassigning…" : `Reply in ${mm}:${ss}`}
    </span>
  );
}
