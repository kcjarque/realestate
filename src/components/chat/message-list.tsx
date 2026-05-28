"use client";

import { useEffect, useRef } from "react";
import { Bed, Bath, Maximize2, MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn, formatClock, formatPHP } from "@/lib/utils";
import type { Message, MessageListing } from "@/lib/types";

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
            <div className={cn("flex max-w-[80%] flex-col", mine ? "items-end" : "items-start")}>
              {m.body && (
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                    mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted text-foreground",
                  )}
                >
                  {m.body}
                </div>
              )}
              {m.listing && <ListingCard listing={m.listing} className={m.body ? "mt-1" : ""} />}
              <span className="mt-0.5 px-1 text-[10px] text-muted-foreground">{formatClock(m.created_at)}</span>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

function ListingCard({ listing, className }: { listing: MessageListing; className?: string }) {
  return (
    <div className={cn("w-60 overflow-hidden rounded-xl border bg-card shadow-sm", className)}>
      {listing.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={listing.image_url} alt={listing.title} className="h-32 w-full object-cover" />
      )}
      <div className="p-3">
        <p className="text-sm font-semibold leading-tight">{listing.title}</p>
        <p className="mt-1 text-base font-bold text-emerald-600">{formatPHP(listing.price)}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-0.5">
            <MapPin className="h-3 w-3" /> {listing.city}
          </span>
          {listing.bedrooms != null && (
            <span className="inline-flex items-center gap-0.5">
              <Bed className="h-3 w-3" /> {listing.bedrooms}
            </span>
          )}
          {listing.bathrooms != null && (
            <span className="inline-flex items-center gap-0.5">
              <Bath className="h-3 w-3" /> {listing.bathrooms}
            </span>
          )}
          {listing.floor_area_sqm != null && (
            <span className="inline-flex items-center gap-0.5">
              <Maximize2 className="h-3 w-3" /> {listing.floor_area_sqm}m²
            </span>
          )}
        </div>
        <span className="mt-2 inline-block rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
          {listing.type}
        </span>
      </div>
    </div>
  );
}
