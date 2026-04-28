import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAdminAuth } from "@/contexts/admin-auth";
import { LayoutDashboard, FileText, LogOut, Plus } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "仪表盘", sub: "Dashboard", icon: LayoutDashboard },
  { href: "/resources", label: "资料管理", sub: "Resources", icon: FileText },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAdminAuth();
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
          <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
            <span className="text-primary text-xs font-bold">M</span>
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-none">MarketRune</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, sub, icon: Icon }) => {
            const active = location === href || location.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                  active
                    ? "bg-sidebar-accent text-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                <div>
                  <p className="text-sm font-medium leading-none">{label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
                </div>
                {active && <div className="ml-auto w-1 h-4 rounded-full bg-primary" />}
              </Link>
            );
          })}

          <Link
            href="/resources/new"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-primary hover:bg-primary/10 mt-2 border border-primary/20"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-medium leading-none">新增资料</p>
              <p className="text-[10px] text-primary/60 mt-0.5">Add Resource</p>
            </div>
          </Link>
        </nav>

        {/* User info + logout */}
        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-primary text-xs font-semibold uppercase">{user?.username?.[0]}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.username}</p>
              <p className="text-[10px] text-muted-foreground">Administrator</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            退出登录 · Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
