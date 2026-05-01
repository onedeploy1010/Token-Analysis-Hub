import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { adminLogin, adminAddLog, getAdminSession } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Lock, User } from "lucide-react";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminLogin(username, password);
      await adminAddLog("管理员登录", "auth", username);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/me"] });
      toast({ title: "登录成功" });
      const session = getAdminSession();
      const perms: string[] = session?.permissions || [];
      // Redirect to first allowed page
      const navOrder = [
        { path: "/admin/dashboard", perm: "dashboard.read" },
        { path: "/admin/members", perm: "members.read" },
        { path: "/admin/referrals", perm: "referrals.read" },
        { path: "/admin/orders", perm: "orders.read" },
        { path: "/admin/withdrawals", perm: "withdrawals.read" },
        { path: "/admin/finance", perm: "finance.read" },
      ];
      const first = navOrder.find(n => perms.includes(n.perm));
      setLocation(first?.path || "/admin/dashboard");
    } catch (err: any) {
      toast({ title: "登录失败", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0c0a08" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)" }}>
            <Lock size={36} className="text-black" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">CoreX 管理后台</h1>
          <p className="text-base text-muted-foreground mt-2">请使用管理员账号登录</p>
        </div>

        <form onSubmit={handleLogin} className="rounded-xl p-8 space-y-5"
          style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.25)" }}>
          <div className="space-y-2">
            <Label className="text-base text-muted-foreground">用户名</Label>
            <div className="relative">
              <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                data-testid="input-username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="pl-10 h-12 text-base"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)" }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-base text-muted-foreground">密码</Label>
            <div className="relative">
              <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                data-testid="input-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="pl-10 h-12 text-base"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)" }}
              />
            </div>
          </div>
          <Button
            data-testid="button-login"
            type="submit"
            disabled={loading || !username || !password}
            className="w-full font-bold h-12 text-base"
            style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
          >
            {loading ? "登录中..." : "登 录"}
          </Button>
        </form>
      </div>
    </div>
  );
}
