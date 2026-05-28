"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

// Visiting /chat with no session creates a fresh inquiry + session, then redirects.
export default function NewChatPage() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const sessionId = crypto.randomUUID();
    const name = `Guest ${Math.floor(1000 + Math.random() * 9000)}`;
    getSupabaseBrowser()
      .rpc("start_inquiry", { p_session_id: sessionId, p_customer_name: name })
      .then(() => router.replace(`/chat/${sessionId}`));
  }, [router]);

  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-100 to-slate-200 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p className="text-sm">Starting a new conversation…</p>
    </div>
  );
}
