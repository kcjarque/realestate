"use client";

import { Avatar } from "@/components/ui/avatar";
import { ReassignTimer, computeDeadlineMs } from "./reassign-timer";
import { cn, timeAgo } from "@/lib/utils";
import type { Inquiry } from "@/lib/types";

export function QueueList({
  inquiries,
  selectedId,
  onSelect,
}: {
  inquiries: Inquiry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const sorted = [...inquiries].sort((a, b) => {
    const aNeeds = computeDeadlineMs(a) !== null;
    const bNeeds = computeDeadlineMs(b) !== null;
    if (aNeeds !== bNeeds) return aNeeds ? -1 : 1; // unanswered first
    const at = a.last_customer_msg_at ?? a.created_at;
    const bt = b.last_customer_msg_at ?? b.created_at;
    return new Date(at).getTime() - new Date(bt).getTime(); // oldest waiting first
  });

  if (sorted.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No active chats. New inquiries are assigned to you automatically.
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {sorted.map((inq) => {
        const needsReply = computeDeadlineMs(inq) !== null;
        const active = inq.id === selectedId;
        return (
          <li key={inq.id}>
            <button
              onClick={() => onSelect(inq.id)}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/60",
                active && "bg-muted",
              )}
            >
              <div className="relative">
                <Avatar name={inq.customer_name} className="h-9 w-9" />
                {needsReply && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-amber-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{inq.customer_name}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {timeAgo(inq.last_customer_msg_at ?? inq.created_at)}
                  </span>
                </div>
                <div className="mt-1">
                  {needsReply ? (
                    <ReassignTimer inquiry={inq} />
                  ) : (
                    <span className="text-xs text-muted-foreground">Replied · waiting on customer</span>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
