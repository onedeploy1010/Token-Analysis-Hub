import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAdminAuth } from "@/contexts/admin-auth";
import {
  LayoutDashboard,
  Users,
  GitBranch,
  ShoppingCart,
  Server,
  Gift,
  FileCode2,
  HeartPulse,
  FileText,
  ShieldCheck,
  Tag,
  LogOut,
  Menu,
  X,
} from "lucide-react";

/**
 * Top-level admin chrome. Desktop = persistent 240px sidebar; mobile = an
 * off-canvas drawer that the top bar's Menu button toggles. Pure Tailwind
 * `lg:` breakpoint — no useMediaQuery, no JS measure (matches the TAICLAW
 * admin pattern that works well on real BSC-trader hardware).
 */
const NAV: Array<{ href: string; label: string; sub: string; icon: typeof LayoutDashboard }> = [
  { href: "/dashboard",     label: "仪表盘",   sub: "Dashboard",     icon: LayoutDashboard },
  { href: "/members",       label: "会员管理", sub: "Members",       icon: Users },
  { href: "/referrals",     label: "推荐管理", sub: "Referrals",     icon: GitBranch },
  { href: "/orders",        label: "订单管理", sub: "Orders",        icon: ShoppingCart },
  { href: "/nodes",         label: "节点管理", sub: "Nodes",         icon: Server },
  { href: "/rewards",       label: "奖励管理", sub: "Rewards",       icon: Gift },
  { href: "/contracts",     label: "合约管理", sub: "Contracts",     icon: FileCode2 },
  { href: "/system-health", label: "环境管理", sub: "System Health", icon: HeartPulse },
  { href: "/admin-roles",   label: "权限管理", sub: "Permissions",   icon: ShieldCheck },
  { href: "/tags",          label: "标签管理", sub: "Tags",          icon: Tag },
  { href: "/resources",     label: "资料管理", sub: "Resources",     icon: FileText },
];

function isActive(location: string, href: string): boolean {
  if (href === "/dashboard") return location === "/" || location === href;
  return location === href || location.startsWith(href + "/");
}

function NavList({ location, onNavigate }: { location: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      {NAV.map(({ href, label, sub, icon: Icon }) => {
        const active = isActive(location, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`relative flex items-center gap-3 px-3 py-3 rounded-lg transition-all group min-h-[44px] ${
              active
                ? "bg-gradient-to-r from-amber-500/[0.18] via-amber-500/[0.10] to-transparent text-foreground border border-amber-500/30 shadow-[inset_0_1px_0_rgba(251,191,36,0.15)]"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground border border-transparent"
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 transition-colors ${
                active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              }`}
            />
            <div className="min-w-0">
              <p className={`text-sm leading-none truncate ${active ? "font-bold" : "font-medium"}`}>{label}</p>
              <p className="text-[10px] text-muted-foreground mt-1 truncate">{sub}</p>
            </div>
            {active && <div className="ml-auto w-1 h-5 rounded-full bg-primary shrink-0 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarHeader() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border shrink-0">
      <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
        <span className="text-primary text-xs font-bold">R</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground leading-none">RUNE</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Admin Panel</p>
      </div>
    </div>
  );
}

function SidebarFooter() {
  const { user, logout } = useAdminAuth();
  return (
    <div className="px-4 py-4 border-t border-sidebar-border shrink-0">
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
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Desktop sidebar (lg+) ── */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col bg-sidebar border-r border-sidebar-border sticky top-0 h-screen">
        <SidebarHeader />
        <NavList location={location} />
        <SidebarFooter />
      </aside>

      {/* ── Mobile top bar (<lg) ── */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 h-12 bg-sidebar/95 backdrop-blur border-b border-sidebar-border flex items-center justify-between px-3">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-md text-foreground hover:bg-sidebar-accent/60"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-foreground">RUNE</span>
          <span className="text-[10px] text-muted-foreground">· Admin</span>
        </div>
        <div className="w-9" />
      </div>

      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        >
          <aside
            className="absolute left-0 top-0 h-full w-64 flex flex-col bg-sidebar border-r border-sidebar-border shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-sidebar-border">
              <SidebarHeader />
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-3 text-muted-foreground hover:text-foreground"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavList location={location} onNavigate={() => setDrawerOpen(false)} />
            <SidebarFooter />
          </aside>
        </div>
      )}

      {/* ── Main column ── */}
      <main className="flex-1 min-w-0 overflow-x-hidden pt-12 lg:pt-0">{children}</main>
    </div>
  );
}
