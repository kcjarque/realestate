"use client";

import { useEffect, useRef } from "react";
import { Avatar } from "@/components/ui/avatar";
import { cn, formatClock } from "@/lib/utils";
import type { Message } from "@/lib/types";

export function MessageList({
  messages,
  viewer,
  agentName = "Agent",
  agentAvatar,
  customerName = "Customer",
  emptyHint,
}: {
  messages: Message[];
  viewer: "customer" | "agent";
  agentName?: string;
  agentAvatar?: string | null;
  customerName?: string;
  emptyHint?: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
        {emptyHint ?? "No messages yet."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {messages.map((m) => {
        const mine = m.sender_type === viewer;
        const otherName = m.sender_type === "agent" ? agentName : customerName;
        return (
          <div key={m.id} className={cn("flex items-end gap-2", mine ? "flex-row-reverse" : "flex-row")}>
            {!mine && (
              <Avatar
                name={otherName}
                src={m.sender_type === "agent" ? agentAvatar : null}
                className="h-7 w-7 text-[10px]"
              />
            )}
            <div className={cn("max-w-[78%]", mine ? "items-end" : "items-start", "flex flex-col")}>
              <div
                className={cn(
                  "rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                  mine
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-muted text-foreground",
                )}
              >
                {m.body}
              </div>
              <span className="mt-0.5 px-1 text-[10px] text-muted-foreground">{formatClock(m.created_at)}</span>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
