"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { STORAGE_BUCKET } from "@/lib/constants";
import { LISTING_TYPES, LISTING_STATUSES, type Listing, type ListingStatus, type ListingType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

type FormState = {
  title: string;
  type: ListingType;
  city: string;
  price: string;
  bedrooms: string;
  bathrooms: string;
  floor_area_sqm: string;
  status: ListingStatus;
  description: string;
  image_urls: string[];
};

const empty: FormState = {
  title: "",
  type: "condo",
  city: "",
  price: "",
  bedrooms: "",
  bathrooms: "",
  floor_area_sqm: "",
  status: "available",
  description: "",
  image_urls: [],
};

function fromListing(l: Listing): FormState {
  return {
    title: l.title,
    type: l.type,
    city: l.city,
    price: String(l.price),
    bedrooms: l.bedrooms != null ? String(l.bedrooms) : "",
    bathrooms: l.bathrooms != null ? String(l.bathrooms) : "",
    floor_area_sqm: l.floor_area_sqm != null ? String(l.floor_area_sqm) : "",
    status: l.status,
    description: l.description ?? "",
    image_urls: l.image_urls ?? [],
  };
}

export function ListingFormDialog({
  open,
  onOpenChange,
  listing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  listing: Listing | null;
  onSaved: () => void;
}) {
  const sb = getSupabaseBrowser();
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setForm(listing ? fromListing(listing) : empty);
  }, [open, listing]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await sb.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: false });
        if (error) {
          toast.error(`Upload failed: ${error.message}`);
          continue;
        }
        const { data } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      if (urls.length) set("image_urls", [...form.image_urls, ...urls]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeImage(url: string) {
    set("image_urls", form.image_urls.filter((u) => u !== url));
  }

  function validate(): string | null {
    if (!form.title.trim()) return "Title is required.";
    if (!form.city.trim()) return "City / area is required.";
    const price = Number(form.price);
    if (!form.price.trim() || Number.isNaN(price) || price <= 0) return "Price must be a number greater than 0.";
    for (const [label, v] of [
      ["Bedrooms", form.bedrooms],
      ["Bathrooms", form.bathrooms],
      ["Floor area", form.floor_area_sqm],
    ] as const) {
      if (v.trim() && (Number.isNaN(Number(v)) || Number(v) < 0)) return `${label} must be a non-negative number.`;
    }
    return null;
  }

  async function save() {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      type: form.type,
      city: form.city.trim(),
      price: Number(form.price),
      bedrooms: form.bedrooms.trim() ? Number(form.bedrooms) : null,
      bathrooms: form.bathrooms.trim() ? Number(form.bathrooms) : null,
      floor_area_sqm: form.floor_area_sqm.trim() ? Number(form.floor_area_sqm) : null,
      status: form.status,
      description: form.description.trim() || null,
      image_urls: form.image_urls,
    };
    try {
      const res = listing
        ? await sb.from("listings").update(payload).eq("id", listing.id)
        : await sb.from("listings").insert(payload);
      if (res.error) {
        toast.error(res.error.message);
        return;
      }
      toast.success(listing ? "Listing updated" : "Listing added");
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{listing ? "Edit listing" : "Add listing"}</DialogTitle>
          <DialogDescription>Changes feed the agent recommendation engine instantly.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. 2BR Condo at Uptown Parksuites" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v as ListingType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LISTING_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="city">City / Area</Label>
              <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Taguig" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="price">Price (PHP)</Label>
              <Input id="price" inputMode="numeric" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="18500000" />
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as ListingStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LISTING_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="beds">Bedrooms</Label>
              <Input id="beds" inputMode="numeric" value={form.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} placeholder="2" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="baths">Bathrooms</Label>
              <Input id="baths" inputMode="numeric" value={form.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} placeholder="2" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sqm">Floor area (m²)</Label>
              <Input id="sqm" inputMode="numeric" value={form.floor_area_sqm} onChange={(e) => set("floor_area_sqm", e.target.value)} placeholder="75" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Short selling description…" />
          </div>

          {/* Images */}
          <div className="grid gap-1.5">
            <Label>Images</Label>
            <div className="flex flex-wrap gap-2">
              {form.image_urls.map((url) => (
                <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-md border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {uploading ? "Uploading" : "Add"}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || uploading}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {listing ? "Save changes" : "Add listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
