"use client";

import { Sparkles, Send, Bed, Bath, Maximize2, MapPin, MessageSquarePlus } from "lucide-react";
import { QUICK_TEMPLATES } from "@/lib/constants";
import { recommendListings, parseSignals, describeSignals, hasSignals } from "@/lib/recommend";
import type { Listing } from "@/lib/types";
import { formatPHP } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function RecommendationPanel({
  customerText,
  listings,
  agentName,
  onInsert,
  onSendListing,
}: {
  customerText: string;
  listings: Listing[];
  agentName: string;
  onInsert: (text: string) => void;
  onSendListing: (listing: Listing) => void;
}) {
  const signals = parseSignals(customerText);
  const recs = recommendListings(customerText, listings);
  const detected = describeSignals(signals);

  return (
    <div className="flex h-full flex-col">
      {/* AI recommendations */}
      <div className="border-b p-4">
        <div className="mb-1 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold">Suggested listings</h3>
        </div>
        {hasSignals(signals) ? (
          <p className="text-xs text-muted-foreground">
            Detected: <span className="font-medium text-foreground">{detected || "—"}</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Listening to the customer… suggestions appear as they share what they want.
          </p>
        )}
      </div>

      <div className="scroll-thin flex-1 space-y-3 overflow-y-auto p-4">
        {recs.length === 0 && hasSignals(signals) && (
          <p className="text-xs text-muted-foreground">No available listings match yet — try editing a listing's status or price.</p>
        )}
        {recs.map(({ listing, score, reasons }) => (
          <div key={listing.id} className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <div className="flex gap-3 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={listing.image_urls[0] || "https://placehold.co/120x120?text=No+Image"}
                alt={listing.title}
                className="h-16 w-16 shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-semibold leading-tight">{listing.title}</p>
                  <Badge variant="muted" className="shrink-0">
                    {score} match{score > 1 ? "es" : ""}
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm font-bold text-emerald-600">{formatPHP(listing.price)}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
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
              </div>
            </div>
            <div className="flex flex-wrap gap-1 px-3 pb-2">
              {reasons.map((r) => (
                <Badge key={r} variant="success" className="text-[10px]">
                  {r}
                </Badge>
              ))}
            </div>
            <button
              onClick={() => onSendListing(listing)}
              className="flex w-full items-center justify-center gap-1.5 border-t bg-primary/5 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <Send className="h-3.5 w-3.5" /> Send to customer
            </button>
          </div>
        ))}
      </div>

      {/* Quick templates */}
      <div className="border-t p-4">
        <div className="mb-2 flex items-center gap-2">
          <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Quick inserts</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_TEMPLATES.map((t) => (
            <Button
              key={t.label}
              variant="outline"
              size="sm"
              onClick={() => onInsert(t.body.replaceAll("{agent}", agentName))}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
