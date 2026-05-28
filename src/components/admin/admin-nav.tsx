import Link from "next/link";
import { Building2, LayoutDashboard, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminNav({ active }: { active: "dashboard" | "listings" }) {
  const tab = "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors";
  const inactive = "text-muted-foreground hover:bg-muted hover:text-foreground";
  const activeCls = "bg-primary text-primary-foreground";
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold">
            EstateConnect <span className="font-normal text-muted-foreground">Admin</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/admin" className={cn(tab, active === "dashboard" ? activeCls : inactive)}>
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
            <Link href="/admin/listings" className={cn(tab, active === "listings" ? activeCls : inactive)}>
              <Building2 className="h-4 w-4" /> Listings
            </Link>
          </nav>
        </div>
        <Link href="/" className="text-muted-foreground hover:text-foreground">
          <Home className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}
