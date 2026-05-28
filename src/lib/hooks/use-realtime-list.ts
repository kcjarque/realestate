"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

type RowChange<T> = { eventType: "INSERT" | "UPDATE" | "DELETE"; new: T; old: Partial<T> };

// Fetch a table once, then keep a local array in sync via Realtime row changes.
// `fetcher` runs on mount and whenever `deps` change; the subscription merges
// INSERT/UPDATE/DELETE by id. Consumers sort/filter the returned rows.
export function useRealtimeList<T extends { id: string }>(
  table: string,
  fetcher: () => Promise<T[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: any[] = [],
): { rows: T[]; loading: boolean; refetch: () => void } {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(() => {
    fetcherRef.current().then((d) => {
      setRows(d);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    refetch();
    const sb = getSupabaseBrowser();
    const ch = sb
      .channel(`rt:${table}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
        const p = payload as unknown as RowChange<T>;
        setRows((cur) => {
          if (p.eventType === "DELETE") return cur.filter((r) => r.id !== (p.old as T).id);
          const row = p.new;
          const idx = cur.findIndex((r) => r.id === row.id);
          if (idx === -1) return [...cur, row];
          const next = [...cur];
          next[idx] = row;
          return next;
        });
      })
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { rows, loading, refetch };
}
