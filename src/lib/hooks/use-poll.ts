"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Polls a fetcher on an interval and exposes the latest result. Replaces the
// Supabase Realtime subscription with simple HTTP polling (works with the
// in-memory backend, no websockets needed).
export function usePoll<T>(fetcher: () => Promise<T>, intervalMs: number): {
  data: T | null;
  refetch: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(() => {
    fetcherRef.current().then(setData).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const tick = () => {
      fetcherRef
        .current()
        .then((d) => {
          if (active) setData(d);
        })
        .catch(() => {});
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return { data, refetch };
}
