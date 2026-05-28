import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "EstateConnect — Agent Assignment & Live Chat",
  description: "Every inquiry gets a human owner. Demo MVP.",
};

const supabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {supabaseConfigured ? children : <ConfigNeeded />}
        <Toaster />
      </body>
    </html>
  );
}

// Shown instead of a blank "client-side exception" crash when the Supabase env
// vars are missing (e.g. a Vercel deploy before NEXT_PUBLIC_* are set).
function ConfigNeeded() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-lg font-semibold text-amber-900">Supabase isn&rsquo;t configured</h1>
        <p className="mt-2 text-sm text-amber-800">
          This deployment is missing its database connection. Set these environment variables to a{" "}
          <strong>hosted</strong> Supabase project, then redeploy:
        </p>
        <ul className="mt-3 space-y-1 font-mono text-xs text-amber-900">
          <li>• NEXT_PUBLIC_SUPABASE_URL</li>
          <li>• NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
          <li>• SUPABASE_SERVICE_ROLE_KEY</li>
        </ul>
        <p className="mt-3 text-xs text-amber-700">
          These are read at build time, so trigger a fresh deploy after adding them. Run
          <code className="mx-1 rounded bg-amber-100 px-1">supabase/schema.sql</code> +
          <code className="mx-1 rounded bg-amber-100 px-1">seed.sql</code> in the project first.
        </p>
      </div>
    </main>
  );
}
