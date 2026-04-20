import { type ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { ShieldAlert } from "lucide-react";

/**
 * Wraps every admin page. Redirects to /admin/login while unauthenticated,
 * shows a loader while restoring the session, and renders a config error
 * when Supabase env vars are missing so the user knows what to fix.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { configured, session, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (configured && !loading && !session) navigate("/admin/login");
  }, [configured, loading, session, navigate]);

  if (!configured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3 border border-destructive/30 bg-destructive/5 rounded-xl p-6">
          <ShieldAlert className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Supabase not configured</h1>
          <p className="text-sm text-muted-foreground">
            Set <code className="font-mono text-foreground">VITE_SUPABASE_URL</code> and
            {" "}<code className="font-mono text-foreground">VITE_SUPABASE_PUBLISHABLE_KEY</code>
            {" "}in <code className="font-mono text-foreground">.env</code> and restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Loading session…</div>
      </div>
    );
  }

  if (!session) return null;
  return <>{children}</>;
}
