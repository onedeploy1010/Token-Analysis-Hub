import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, FolderOpen, LogOut, Shield, ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/admin",           label: "Dashboard", Icon: LayoutDashboard },
  { to: "/admin/materials", label: "Materials", Icon: FolderOpen },
];

/**
 * Dedicated shell for every page under /admin. Deliberately separate from
 * the public AppLayout so admins don't see the marketing header / language
 * switcher / theme chrome.
 */
export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const [path, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border/50 bg-card/40 backdrop-blur-sm flex flex-col">
        <div className="h-14 px-5 flex items-center gap-2 border-b border-border/40">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold tracking-wide">Admin</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, Icon }) => {
            const active = path === to || (to !== "/admin" && path.startsWith(to));
            return (
              <Link key={to} href={to}>
                <a
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-primary/10 border border-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </a>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border/40 space-y-2">
          <div className="px-2 py-1.5 text-[11px] leading-tight">
            <div className="text-muted-foreground/60 uppercase tracking-wider text-[9px] mb-0.5">Signed in</div>
            <div className="truncate text-foreground/90 font-medium">{user?.email ?? "—"}</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground h-8"
            onClick={async () => { await signOut(); navigate("/admin/login"); }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
          <Link href="/">
            <a className="flex items-center gap-2 px-2 py-1 rounded-md text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors">
              <ChevronLeft className="h-3 w-3" />
              Back to site
            </a>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="container max-w-6xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
