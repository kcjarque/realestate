import Link from "next/link";
import { MessageSquare, Headset, LayoutDashboard, Building2, ArrowRight, Timer, Users, Sparkles } from "lucide-react";
import { REASSIGN_TIMEOUT_SECONDS } from "@/lib/constants";

const surfaces = [
  {
    href: "/chat",
    title: "Customer Chat",
    desc: "Start a new inquiry — simulates clicking a Messenger link.",
    icon: MessageSquare,
    accent: "from-sky-500 to-blue-600",
  },
  {
    href: "/agent",
    title: "Agent Workspace",
    desc: "Live queue, real-time chat, AI listing suggestions.",
    icon: Headset,
    accent: "from-emerald-500 to-teal-600",
  },
  {
    href: "/admin",
    title: "Admin Dashboard",
    desc: "Agent board + auditable assignment history.",
    icon: LayoutDashboard,
    accent: "from-violet-500 to-purple-600",
  },
  {
    href: "/admin/listings",
    title: "Listing Management",
    desc: "Full inventory CRUD with image upload.",
    icon: Building2,
    accent: "from-amber-500 to-orange-600",
  },
];

const guarantees = [
  { icon: Users, title: "Always owned", desc: "Load-balanced round-robin assigns every inquiry to an available agent." },
  { icon: Timer, title: "Never stalls", desc: `Silent past ${REASSIGN_TIMEOUT_SECONDS}s? Auto-reassigns to the next agent.` },
  { icon: Sparkles, title: "Agent-assisted", desc: "Rule-based listing recommendations, inserted with one click." },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-14 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Demo MVP
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">EstateConnect</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Agent assignment &amp; live chat for Philippine real estate. Every inquiry is{" "}
          <span className="font-semibold text-foreground">guaranteed a human owner.</span>
        </p>
      </div>

      <div className="mb-16 grid gap-4 sm:grid-cols-2">
        {surfaces.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <div className={`mb-4 inline-flex rounded-lg bg-gradient-to-br ${s.accent} p-2.5 text-white`}>
              <s.icon className="h-5 w-5" />
            </div>
            <h2 className="flex items-center gap-1.5 text-lg font-semibold">
              {s.title}
              <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {guarantees.map((g) => (
          <div key={g.title} className="text-center">
            <g.icon className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            <h3 className="font-semibold">{g.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{g.desc}</p>
          </div>
        ))}
      </div>

      <p className="mt-16 text-center text-xs text-muted-foreground">
        Tip: open the customer chat, two agent workspaces, and the admin board in separate windows to watch the full flow.
      </p>
    </main>
  );
}
