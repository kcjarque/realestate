"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Home, ArrowRight } from "lucide-react";
import { fetchData } from "@/lib/api";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Agent } from "@/lib/types";

export default function AgentPicker() {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    fetchData().then((d) => setAgents([...d.agents].sort((a, b) => a.name.localeCompare(b.name))));
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <Home className="h-4 w-4" /> Home
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Agent Workspace</h1>
      <p className="mt-1 text-muted-foreground">Pick an agent to sign in as (no auth in this demo).</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {agents.map((a) => (
          <Link
            key={a.id}
            href={`/agent/${a.id}`}
            className="group flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <Avatar name={a.name} src={a.avatar_url} className="h-11 w-11" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{a.name}</div>
              <Badge variant={a.status === "available" ? "success" : "muted"} className="mt-0.5">
                {a.status}
              </Badge>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </main>
  );
}
