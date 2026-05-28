import { AdminNav } from "@/components/admin/admin-nav";
import { ListingsManager } from "@/components/admin/listings-manager";

export default function ListingsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav active="listings" />
      <ListingsManager />
    </div>
  );
}
