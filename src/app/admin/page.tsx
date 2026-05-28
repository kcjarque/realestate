import { AdminNav } from "@/components/admin/admin-nav";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

// Realtime, per-session UI — render on demand, never statically prerender.
export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav active="dashboard" />
      <AdminDashboard />
    </div>
  );
}
