import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { getAdminSession, adminLogout, adminChangePassword, adminAddLog } from "@/lib/api";
import {
  LayoutDashboard, Users, ShoppingCart, ArrowDownToLine,
  MessageSquare, DollarSign, LogOut, Menu, X, Network, Settings,
  Shield, ScrollText, FileCode, Image, Package, KeyRound, Loader2, Gift, Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Each nav item requires a specific permission to be visible
const NAV_ITEMS: { path: string; label: string; icon: any; perm: string }[] = [
  { path: "/admin/dashboard", label: "统计台", icon: LayoutDashboard, perm: "dashboard.read" },
  { path: "/admin/members", label: "会员管理", icon: Users, perm: "members.read" },
  { path: "/admin/referrals", label: "推荐管理", icon: Network, perm: "referrals.read" },
  { path: "/admin/orders", label: "订单管理", icon: ShoppingCart, perm: "orders.read" },
  { path: "/admin/rewards", label: "奖励明细", icon: Gift, perm: "rewards.read" },
  { path: "/admin/withdrawals", label: "提现管理", icon: ArrowDownToLine, perm: "withdrawals.read" },
  { path: "/admin/messages", label: "消息管理", icon: MessageSquare, perm: "messages.read" },
  { path: "/admin/finance", label: "财务管理", icon: DollarSign, perm: "finance.read" },
  { path: "/admin/settings", label: "系统设置", icon: Settings, perm: "settings.read" },
  { path: "/admin/admins", label: "管理员", icon: Shield, perm: "admins.read" },
  { path: "/admin/logs", label: "操作日志", icon: ScrollText, perm: "logs.read" },
  { path: "/admin/contract", label: "合约配置", icon: FileCode, perm: "contracts.read" },
  { path: "/admin/products", label: "产品管理", icon: Package, perm: "products.read" },
  { path: "/admin/system", label: "系统环境", icon: Activity, perm: "system.read" },
  { path: "/admin/media", label: "Landing Page", icon: Image, perm: "media.read" },
];

const ROLE_LABELS: Record<string, string> = {
  superadmin: "超级管理员",
  tech: "技术调试",
  finance: "财务",
  customer_service: "客服",
  custom: "自定义",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();

  const admin = getAdminSession();
  const isSuperAdmin = admin?.role === "superadmin";
  const perms: string[] = admin?.permissions || [];

  useEffect(() => {
    if (!admin) {
      setLocation("/admin");
    }
  }, [admin]);

  // Redirect unauthorized routes on initial load only
  useEffect(() => {
    if (!admin) return;
    const allowed = NAV_ITEMS.filter(item => perms.includes(item.perm));
    const isAllowed = allowed.some(item => location === item.path);
    if (!isAllowed && allowed.length > 0) {
      setLocation(allowed[0].path);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [pwdOpen, setPwdOpen] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  const handleLogout = () => {
    adminLogout();
    toast({ title: "已退出登录" });
    setLocation("/admin");
  };

  const handleChangePassword = async () => {
    if (!newPwd || newPwd.length < 6) {
      toast({ title: "新密码至少6位", variant: "destructive" });
      return;
    }
    if (newPwd !== confirmPwd) {
      toast({ title: "两次密码不一致", variant: "destructive" });
      return;
    }
    setChangingPwd(true);
    try {
      await adminChangePassword(oldPwd, newPwd);
      await adminAddLog("修改密码", "admin_user", admin?.id?.toString() || "");
      toast({ title: "密码修改成功" });
      setPwdOpen(false);
      setOldPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err: any) {
      toast({ title: "修改失败", description: err.message, variant: "destructive" });
    } finally {
      setChangingPwd(false);
    }
  };

  const filteredNav = isSuperAdmin ? NAV_ITEMS : NAV_ITEMS.filter(item => perms.includes(item.perm));
  const roleLabel = ROLE_LABELS[admin?.role] || admin?.role || "";

  if (!admin) return null;

  return (
    <div className="min-h-screen flex" style={{ background: "#0c0a08" }}>
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity lg:hidden ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={`admin-sidebar fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: "linear-gradient(180deg, #1a1510, #0e0c08)", borderRight: "1px solid rgba(201,162,39,0.15)" }}
      >
        <div className="p-5 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(201,162,39,0.15)" }}>
          <img src="/corex.png" alt="CoreX" className="w-10 h-10 rounded-lg" />
          <div>
            <div className="font-bold text-base" style={{ color: "#C9A227" }}>CoreX Admin</div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{admin.username}</span>
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(201,162,39,0.12)", color: "#C9A227" }}>{roleLabel}</span>
            </div>
          </div>
          <button className="lg:hidden ml-auto p-2" onClick={() => setSidebarOpen(false)}>
            <X size={22} className="text-muted-foreground" />
          </button>
        </div>

        <nav className="flex-1 py-3 px-2.5 space-y-1 overflow-y-auto">
          {filteredNav.map(item => {
            const active = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  data-testid={`nav-${item.label}`}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: active ? "rgba(201,162,39,0.12)" : "transparent",
                    border: active ? "1px solid rgba(201,162,39,0.2)" : "1px solid transparent",
                  }}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon size={20} style={{ color: active ? "#C9A227" : "rgba(255,255,255,0.4)" }} />
                  <span className="text-sm font-medium" style={{ color: active ? "#C9A227" : "rgba(255,255,255,0.6)" }}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 space-y-1" style={{ borderTop: "1px solid rgba(201,162,39,0.15)" }}>
          <button
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm transition-all"
            style={{ color: "#C9A227" }}
            onClick={() => setPwdOpen(true)}
          >
            <KeyRound size={18} />
            修改密码
          </button>
          <button
            data-testid="button-admin-logout"
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm transition-all"
            style={{ color: "#ef4444" }}
            onClick={handleLogout}
          >
            <LogOut size={18} />
            退出登录
          </button>
        </div>

        {/* Change Password Dialog */}
        <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
          <DialogContent className="max-w-sm" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}>
            <DialogHeader>
              <DialogTitle style={{ color: "#C9A227" }}>修改密码</DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">修改后需重新登录</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">旧密码</label>
                <input
                  type="password"
                  value={oldPwd}
                  onChange={e => setOldPwd(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.25)", color: "#fff" }}
                  placeholder="输入当前密码"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">新密码</label>
                <input
                  type="password"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.25)", color: "#fff" }}
                  placeholder="至少6位"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">确认新密码</label>
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.25)", color: "#fff" }}
                  placeholder="再次输入新密码"
                />
              </div>
              <Button
                className="w-full font-bold text-sm"
                style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
                disabled={changingPwd || !oldPwd || !newPwd || !confirmPwd}
                onClick={handleChangePassword}
              >
                {changingPwd ? <><Loader2 size={14} className="mr-1.5 animate-spin" /> 修改中...</> : "确认修改"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </aside>

      <div className="admin-panel flex-1 flex flex-col min-h-screen">
        <header
          className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3.5 lg:hidden"
          style={{ background: "rgba(12,10,8,0.95)", borderBottom: "1px solid rgba(201,162,39,0.15)", backdropFilter: "blur(8px)" }}
        >
          <button data-testid="button-menu-toggle" className="p-1" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} style={{ color: "#C9A227" }} />
          </button>
          <span className="font-bold text-base" style={{ color: "#C9A227" }}>CoreX Admin</span>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
