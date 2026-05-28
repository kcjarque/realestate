import { AdminNav } from "@/components/admin/admin-nav";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav active="dashboard" />
      <AdminDashboard />
    </div>
  );
}
