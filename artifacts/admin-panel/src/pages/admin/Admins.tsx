import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";
import { getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser, adminAddLog, adminResetPassword, getAdminSession } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, UserCog, KeyRound, Loader2 } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  superadmin: "超级管理员",
  tech: "技术调试",
  finance: "财务",
  customer_service: "客服",
  custom: "自定义",
};

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  superadmin: { bg: "rgba(239,68,68,0.1)", color: "#ef4444" },
  tech: { bg: "rgba(245,158,11,0.1)", color: "#f59e0b" },
  finance: { bg: "rgba(59,130,246,0.1)", color: "#3b82f6" },
  customer_service: { bg: "rgba(34,197,94,0.1)", color: "#22c55e" },
  custom: { bg: "rgba(168,85,247,0.1)", color: "#a855f7" },
};

const ROLE_PRESETS: Record<string, string[]> = {
  superadmin: [
    "dashboard.read", "members.read", "members.write", "referrals.read",
    "orders.read", "rewards.read", "withdrawals.read", "withdrawals.write",
    "messages.read", "messages.write", "finance.read",
    "products.read", "products.write",
    "settings.read", "settings.write", "admins.read", "admins.write", "logs.read",
    "media.read", "media.write", "contracts.read", "contracts.write", "system.read",
  ],
  tech: [
    "dashboard.read", "orders.read", "products.read", "settings.read",
    "contracts.read", "contracts.write", "system.read", "logs.read",
  ],
  finance: [
    "members.read", "referrals.read", "orders.read", "rewards.read",
    "withdrawals.read", "withdrawals.write", "finance.read",
  ],
  customer_service: [
    "members.read", "referrals.read", "media.read", "media.write",
  ],
};

const PERM_MODULES = [
  { key: "dashboard", label: "统计台", hasWrite: false },
  { key: "members", label: "会员管理", hasWrite: true },
  { key: "referrals", label: "推荐管理", hasWrite: false },
  { key: "orders", label: "订单管理", hasWrite: false },
  { key: "rewards", label: "奖励明细", hasWrite: false },
  { key: "products", label: "产品管理", hasWrite: true },
  { key: "withdrawals", label: "提现管理", hasWrite: true },
  { key: "messages", label: "消息管理", hasWrite: true },
  { key: "finance", label: "财务管理", hasWrite: false },
  { key: "contracts", label: "合约管理", hasWrite: true },
  { key: "system", label: "系统环境", hasWrite: false },
  { key: "settings", label: "系统设置", hasWrite: true },
  { key: "admins", label: "管理员", hasWrite: true },
  { key: "logs", label: "操作日志", hasWrite: false },
  { key: "media", label: "Landing Page", hasWrite: true },
];

export default function AdminManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ username: "", password: "", role: "custom" });
  const [perms, setPerms] = useState<string[]>([]);
  const [resetTarget, setResetTarget] = useState<any>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [resetting, setResetting] = useState(false);
  const { toast } = useToast();
  const currentAdmin = getAdminSession();
  const isSuperAdmin = currentAdmin?.role === "superadmin";

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ["/api/admin/admins"],
    queryFn: getAdminUsers,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; role: string; permissions: string[] }) => {
      const result = await createAdminUser(data.username, data.password, data.role, data.permissions);
      await adminAddLog("创建管理员", "admin", data.username, { role: data.role, permissions: data.permissions });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/admins"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "管理员已创建" });
    },
    onError: (err: any) => toast({ title: "创建失败", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, role, password, permissions }: { id: number; role: string; password?: string; permissions: string[] }) => {
      const result = await updateAdminUser(id, role, password, permissions);
      await adminAddLog("更新管理员", "admin", id.toString(), { role, permissions, hasNewPassword: !!password });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/admins"] });
      setDialogOpen(false);
      setEditing(null);
      resetForm();
      toast({ title: "管理员已更新" });
    },
    onError: (err: any) => toast({ title: "更新失败", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await deleteAdminUser(id);
      await adminAddLog("删除管理员", "admin", id.toString());
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/admins"] });
      toast({ title: "管理员已删除" });
    },
    onError: (err: any) => toast({ title: "删除失败", description: err.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setForm({ username: "", password: "", role: "custom" });
    setPerms([]);
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (admin: any) => {
    setEditing(admin);
    setForm({ username: admin.username, password: "", role: admin.role });
    setPerms(typeof admin.permissions === 'string' ? JSON.parse(admin.permissions) : (admin.permissions || []));
    setDialogOpen(true);
  };

  const handleRoleChange = (role: string) => {
    setForm(f => ({ ...f, role }));
    if (ROLE_PRESETS[role]) {
      setPerms([...ROLE_PRESETS[role]]);
    }
  };

  const togglePerm = (perm: string) => {
    setPerms(prev => {
      const next = prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm];
      // If permissions don't match any preset, set role to custom
      const matchedRole = Object.entries(ROLE_PRESETS).find(
        ([, presetPerms]) => presetPerms.length === next.length && presetPerms.every(p => next.includes(p))
      );
      setForm(f => ({ ...f, role: matchedRole ? matchedRole[0] : "custom" }));
      return next;
    });
  };

  const handleSave = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, role: form.role, password: form.password || undefined, permissions: perms });
    } else {
      if (!form.username || !form.password) {
        toast({ title: "请填写用户名和密码", variant: "destructive" });
        return;
      }
      createMutation.mutate({ ...form, permissions: perms });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
          <h2 className="font-bold text-lg text-foreground">管理员管理</h2>
        </div>
        <Button
          className="text-sm"
          style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08", minHeight: "40px" }}
          onClick={openCreate}
        >
          <Plus size={14} className="mr-1" /> 添加管理员
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-10">加载中...</div>
      ) : (
        <div className="space-y-2">
          {(admins as any[]).map((a: any) => {
            const rc = ROLE_COLORS[a.role] || ROLE_COLORS.custom;
            const parsedPerms = typeof a.permissions === 'string' ? JSON.parse(a.permissions) : (a.permissions || []);
            const permCount = parsedPerms.length;
            return (
              <div key={a.id} className="rounded-xl p-3 flex items-center justify-between" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: rc.bg }}>
                    <UserCog size={16} style={{ color: rc.color }} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{a.username}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: rc.bg, color: rc.color }}>
                        {ROLE_LABELS[a.role] || a.role}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{permCount} 项权限</span>
                      {a.createdAt && <span className="text-[10px] text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {isSuperAdmin && (
                    <button
                      onClick={() => { setResetTarget(a); setResetPwd(""); }}
                      className="p-2 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", minWidth: "36px", minHeight: "36px" }}
                      title="重置密码"
                    >
                      <KeyRound size={16} />
                    </button>
                  )}
                  <button onClick={() => openEdit(a)} className="p-2 rounded-lg flex items-center justify-center" style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227", minWidth: "36px", minHeight: "36px" }}>
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => { if (confirm(`确定删除管理员 ${a.username}？`)) deleteMutation.mutate(a.id); }}
                    className="p-2 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", minWidth: "36px", minHeight: "36px" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={() => setResetTarget(null)}>
        <DialogContent className="max-w-sm mx-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#C9A227" }}>重置密码 - {resetTarget?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">新密码</Label>
              <Input
                type="password"
                value={resetPwd}
                onChange={e => setResetPwd(e.target.value)}
                placeholder="输入新密码（至少6位）"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)", minHeight: "40px" }}
              />
            </div>
            <Button
              className="w-full font-bold"
              style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", minHeight: "40px" }}
              disabled={resetting || !resetPwd || resetPwd.length < 6}
              onClick={async () => {
                setResetting(true);
                try {
                  await adminResetPassword(resetTarget.id, resetPwd);
                  await adminAddLog("重置管理员密码", "admin", resetTarget.id.toString(), { targetUsername: resetTarget.username });
                  toast({ title: "密码已重置" });
                  setResetTarget(null);
                  setResetPwd("");
                } catch (err: any) {
                  toast({ title: "重置失败", description: err.message, variant: "destructive" });
                } finally {
                  setResetting(false);
                }
              }}
            >
              {resetting ? <><Loader2 size={14} className="mr-1.5 animate-spin" /> 重置中...</> : "确认重置"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={() => { setDialogOpen(false); setEditing(null); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto mx-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#C9A227" }}>{editing ? "编辑管理员" : "添加管理员"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">用户名</Label>
              <Input
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                disabled={!!editing}
                placeholder="输入用户名"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)", minHeight: "40px" }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{editing ? "新密码（留空不修改）" : "密码"}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={editing ? "留空不修改" : "输入密码"}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)", minHeight: "40px" }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">角色预设</Label>
              <Select value={form.role} onValueChange={handleRoleChange}>
                <SelectTrigger style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)", minHeight: "40px" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="superadmin">超级管理员（全部权限）</SelectItem>
                  <SelectItem value="tech">技术调试（合约/系统/日志）</SelectItem>
                  <SelectItem value="finance">财务（会员/订单/出入金）</SelectItem>
                  <SelectItem value="customer_service">客服（仅查看）</SelectItem>
                  <SelectItem value="custom">自定义</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">权限配置</Label>
              <div className="rounded-lg p-3 space-y-2" style={{ background: "rgba(201,162,39,0.04)", border: "1px solid rgba(201,162,39,0.12)" }}>
                {PERM_MODULES.map(mod => (
                  <div key={mod.key} className="flex items-center justify-between py-1">
                    <span className="text-xs">{mod.label}</span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={perms.includes(`${mod.key}.read`)}
                          onChange={() => togglePerm(`${mod.key}.read`)}
                          className="accent-[#C9A227] w-3.5 h-3.5"
                        />
                        <span className="text-[10px] text-muted-foreground">读</span>
                      </label>
                      {mod.hasWrite && (
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={perms.includes(`${mod.key}.write`)}
                            onChange={() => togglePerm(`${mod.key}.write`)}
                            className="accent-[#C9A227] w-3.5 h-3.5"
                          />
                          <span className="text-[10px] text-muted-foreground">写</span>
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground">已选 {perms.length} 项权限</div>
            </div>

            <Button
              className="w-full font-bold"
              style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08", minHeight: "40px" }}
              disabled={!editing && (!form.username || !form.password)}
              onClick={handleSave}
            >
              {editing ? "保存修改" : "创建管理员"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
