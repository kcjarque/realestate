"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, Bed, Bath, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useRealtimeList } from "@/lib/hooks/use-realtime-list";
import { ListingFormDialog } from "./listing-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatPHP } from "@/lib/utils";
import { LISTING_TYPES, LISTING_STATUSES, type Listing, type ListingStatus } from "@/lib/types";

const statusVariant: Record<ListingStatus, "success" | "warning" | "muted"> = {
  available: "success",
  reserved: "warning",
  sold: "muted",
};

export function ListingsManager() {
  const sb = getSupabaseBrowser();
  const { rows, refetch } = useRealtimeList<Listing>(
    "listings",
    async () => {
      const { data } = await sb
        .from("listings")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      return (data ?? []) as Listing[];
    },
    [],
  );

  const [search, setSearch] = useState("");
  const [typeF, setTypeF] = useState("all");
  const [cityF, setCityF] = useState("all");
  const [statusF, setStatusF] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Listing | null>(null);
  const [deleting, setDeleting] = useState<Listing | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const live = useMemo(() => rows.filter((l) => !l.deleted_at), [rows]);
  const cities = useMemo(() => [...new Set(live.map((l) => l.city))].sort(), [live]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return live.filter((l) => {
      if (q && !`${l.title} ${l.city}`.toLowerCase().includes(q)) return false;
      if (typeF !== "all" && l.type !== typeF) return false;
      if (cityF !== "all" && l.city !== cityF) return false;
      if (statusF !== "all" && l.status !== statusF) return false;
      return true;
    });
  }, [live, search, typeF, cityF, statusF]);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(l: Listing) {
    setEditing(l);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      const { error } = await sb.from("listings").update({ deleted_at: new Date().toISOString() }).eq("id", deleting.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Listing removed");
      setDeleting(null);
      refetch();
    } finally {
      setDeletingBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Listings</h1>
          <p className="text-sm text-muted-foreground">
            {live.length} active · changes feed agent recommendations instantly
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add listing
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or city…"
            className="pl-8"
          />
        </div>
        <Select value={typeF} onValueChange={setTypeF}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {LISTING_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={cityF} onValueChange={setCityF}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cities</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {LISTING_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          No listings match your filters.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => (
            <div key={l.id} className="overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
              <div className="relative aspect-[16/10] bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={l.image_urls[0] || "https://placehold.co/600x400?text=No+Image"}
                  alt={l.title}
                  className="h-full w-full object-cover"
                />
                <Badge variant={statusVariant[l.status]} className="absolute left-2 top-2 capitalize shadow">
                  {l.status}
                </Badge>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-1 font-semibold">{l.title}</h3>
                  <Badge variant="outline" className="shrink-0 capitalize">
                    {l.type}
                  </Badge>
                </div>
                <p className="mt-1 text-lg font-bold text-emerald-600">{formatPHP(l.price)}</p>
                <p className="text-sm text-muted-foreground">{l.city}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {l.bedrooms != null && (
                    <span className="inline-flex items-center gap-1">
                      <Bed className="h-3.5 w-3.5" /> {l.bedrooms}
                    </span>
                  )}
                  {l.bathrooms != null && (
                    <span className="inline-flex items-center gap-1">
                      <Bath className="h-3.5 w-3.5" /> {l.bathrooms}
                    </span>
                  )}
                  {l.floor_area_sqm != null && (
                    <span className="inline-flex items-center gap-1">
                      <Maximize2 className="h-3.5 w-3.5" /> {l.floor_area_sqm}m²
                    </span>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(l)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleting(l)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ListingFormDialog open={formOpen} onOpenChange={setFormOpen} listing={editing} onSaved={refetch} />

      {/* Delete confirm */}
      <Dialog open={Boolean(deleting)} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove listing?</DialogTitle>
            <DialogDescription>
              &ldquo;{deleting?.title}&rdquo; will be hidden from inventory and recommendations. This is a soft-delete —
              your demo data isn&rsquo;t lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deletingBusy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deletingBusy}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
