"use client";

import { useEffect } from "react";
import { RECONCILE_INTERVAL_MS } from "@/lib/constants";

// Drives the assignment engine. Any mounted agent/admin screen pings /api/reconcile
// on an interval. Because reconcile is server-timestamp based and idempotent, it
// doesn't matter how many tabs are open or whether one refreshes — the deadline
// math is identical everywhere. (A future production setup could move this to a
// scheduled edge function; for a one-machine demo a client tick is simplest.)
export function useReconcileTicker(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const tick = () => {
      fetch("/api/reconcile", { method: "POST" }).catch(() => {});
    };
    tick();
    const id = setInterval(() => {
      if (active) tick();
    }, RECONCILE_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [enabled]);
}
