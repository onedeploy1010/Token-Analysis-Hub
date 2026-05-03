import { useEffect, useMemo, useState } from "react";
import { PageShell } from "./page-shell";
import { MobileDataCard } from "@/components/mobile-card";
import { supabase } from "@/lib/supabase";
import { useAdminAuth } from "@/contexts/admin-auth";
import {
  Loader2, ShieldCheck, Plus, Pencil, Trash2, X, Search, Lock,
} from "lucide-react";

/**
 * 权限管理 — admin_users CRUD. Reads role + permissions JSONB array per row;
 * lets admins with `admins.write` create/edit/delete other admins.
 *
 * Auth: a brand-new admin needs both an `auth.users` row and an `admin_users`
 * row. Creating the auth user from the browser would require service-role key,
 * which we DO NOT ship to the client. So this page only manages the
 * `admin_users` profile (role + permissions) for users whose auth.users row
 * already exists. The "创建" flow expects `userId` (UUID) of a Supabase Auth
 * user that was provisioned out-of-band (CLI / dashboard).
 */

type AdminRole = "superadmin" | "admin" | "support";

const ROLES: Array<{ value: AdminRole; label: string; desc: string; color: string }> = [
  { value: "superadmin", label: "超级管理员", desc: "全部权限 · 不受 permissions 限制", color: "#fbbf24" },
  { value: "admin",      label: "管理员",     desc: "按 permissions 列表授予",           color: "#60a5fa" },
  { value: "support",    label: "客服",       desc: "通常只读，按需放开",                 color: "#cbd5e1" },
];

/** Catalogue of valid permission keys — keep in sync with
 *  `lib/db/src/schema/admin-users.ts → ADMIN_PERMISSIONS`. */
const PERMISSION_GROUPS: Array<{ group: string; keys: Array<{ key: string; label: string }> }> = [
  { group: "会员", keys: [
    { key: "members.read",   label: "查看会员" },
    { key: "members.write",  label: "编辑会员" },
    { key: "referrals.read", label: "查看推荐" },
    { key: "orders.read",    label: "查看订单" },
  ]},
  { group: "节点", keys: [
    { key: "nodes.read",  label: "查看节点" },
    { key: "nodes.write", label: "编辑节点" },
    { key: "rewards.read", label: "查看奖励" },
  ]},
  { group: "合约", keys: [
    { key: "contracts.read",  label: "查看合约" },
    { key: "contracts.write", label: "编辑配置" },
  ]},
  { group: "系统", keys: [
    { key: "system.read",    label: "查看系统" },
    { key: "system.write",   label: "编辑系统" },
    { key: "resources.read", label: "查看资料" },
    { key: "resources.write",label: "编辑资料" },
  ]},
  { group: "权限", keys: [
    { key: "admins.read",  label: "查看管理员" },
    { key: "admins.write", label: "编辑管理员" },
  ]},
];

interface AdminRow {
  id: number;
  userId: string | null;
  username: string | null;
  role: AdminRole;
  permissions: string[];
  createdAt: string;
}

export default function AdminRolesPage() {
  const { hasPermission, user: me } = useAdminAuth();
  const canWrite = hasPermission("admins.write");
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AdminRow | null>(null);

  async function reload() {
    const { data, error } = await supabase
      .from("admin_users")
      .select("id, user_id, username, role, permissions, created_at")
      .order("id", { ascending: true });
    if (error) { setError(error.message); return; }
    setRows((data ?? []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      username: r.username,
      role: (r.role ?? "admin") as AdminRole,
      permissions: Array.isArray(r.permissions) ? r.permissions : [],
      createdAt: r.created_at,
    })));
  }

  useEffect(() => { void reload(); }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.username ?? "").toLowerCase().includes(q) ||
      (r.userId ?? "").toLowerCase().includes(q) ||
      r.role.includes(q),
    );
  }, [rows, search]);

  return (
    <PageShell
      title="权限管理"
      subtitle={`Permissions · admin_users 表 · 共 ${rows?.length ?? "…"} 个账号`}
      actions={
        canWrite && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> 新增管理员
          </button>
        )
      }
    >
      {!canWrite && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 mb-4 flex items-center gap-2">
          <Lock className="h-4 w-4 shrink-0" />
          <span>你没有 <code className="text-[11px] bg-black/30 px-1 rounded">admins.write</code> 权限，仅可查看。</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 mb-4 max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="搜用户名 / UUID / 角色 …"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {!rows && !error ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> 加载中…
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto rounded-2xl border border-border/60 bg-card/40">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">用户名</th>
                  <th className="text-left px-4 py-3">角色</th>
                  <th className="text-left px-4 py-3">权限</th>
                  <th className="text-left px-4 py-3">创建时间</th>
                  <th className="text-right px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const isMe = me?.username === r.username;
                  return (
                    <tr key={r.id} className="border-t border-border/40 hover:bg-muted/20">
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-foreground">{r.username ?? "—"}</span>
                        {isMe && <span className="ml-2 text-[10px] text-amber-300">(我)</span>}
                        {r.userId && (
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate max-w-[200px]">
                            {r.userId}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5"><RoleBadge role={r.role} /></td>
                      <td className="px-4 py-2.5">
                        {r.role === "superadmin" ? (
                          <span className="text-[11px] text-amber-300">★ 全部</span>
                        ) : r.permissions.length === 0 ? (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        ) : (
                          <span className="text-[11px] text-foreground/80">
                            {r.permissions.length} 项
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString("sv") : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => setEditing(r)}
                            disabled={!canWrite}
                            className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                            title="编辑"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleting(r)}
                            disabled={!canWrite || isMe}
                            className="p-1.5 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive disabled:opacity-40 disabled:cursor-not-allowed"
                            title={isMe ? "不能删除自己" : "删除"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">无匹配记录</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {filtered.map((r) => {
              const isMe = me?.username === r.username;
              return (
                <MobileDataCard
                  key={r.id}
                  header={
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />
                        <span className="font-medium truncate">{r.username ?? "—"}</span>
                        {isMe && <span className="text-[10px] text-amber-300 shrink-0">(我)</span>}
                      </div>
                      <RoleBadge role={r.role} />
                    </div>
                  }
                  fields={[
                    { label: "权限", value: r.role === "superadmin" ? "★ 全部" : `${r.permissions.length} 项` },
                    { label: "UUID", value: r.userId ? `${r.userId.slice(0, 8)}…` : "—", mono: true },
                    { label: "创建", value: r.createdAt ? new Date(r.createdAt).toLocaleDateString("sv") : "—" },
                  ]}
                  actions={
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditing(r)}
                        disabled={!canWrite}
                        className="flex-1 px-3 py-1.5 rounded border border-border text-xs hover:bg-muted/30 disabled:opacity-40"
                      >编辑</button>
                      <button
                        onClick={() => setDeleting(r)}
                        disabled={!canWrite || isMe}
                        className="flex-1 px-3 py-1.5 rounded border border-destructive/40 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-40"
                      >{isMe ? "—" : "删除"}</button>
                    </div>
                  }
                />
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-12">无匹配记录</p>
            )}
          </div>
        </>
      )}

      {(editing || creating) && (
        <EditDrawer
          row={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={async () => { await reload(); setEditing(null); setCreating(false); }}
        />
      )}

      {deleting && (
        <DeleteConfirm
          row={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={async () => { await reload(); setDeleting(null); }}
        />
      )}
    </PageShell>
  );
}

function RoleBadge({ role }: { role: AdminRole }) {
  const meta = ROLES.find((r) => r.value === role) ?? ROLES[1];
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-semibold"
      style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}30` }}
    >
      {meta.label}
    </span>
  );
}

function EditDrawer({
  row, onClose, onSaved,
}: { row: AdminRow | null; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const isCreate = !row;
  const [username, setUsername] = useState(row?.username ?? "");
  const [userId, setUserId] = useState(row?.userId ?? "");
  const [role, setRole] = useState<AdminRole>(row?.role ?? "admin");
  const [perms, setPerms] = useState<string[]>(row?.permissions ?? []);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function togglePerm(key: string) {
    setPerms((prev) => prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]);
  }

  async function save() {
    setErr(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        username: username.trim() || null,
        user_id: userId.trim() || null,
        role,
        permissions: role === "superadmin" ? [] : perms,
      };
      if (isCreate) {
        const { error } = await supabase.from("admin_users").insert(payload);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("admin_users").update(payload).eq("id", row!.id);
        if (error) throw new Error(error.message);
      }
      await onSaved();
    } catch (e: any) {
      setErr(e?.message ?? "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="fixed right-0 top-0 h-full w-full max-w-lg bg-background border-l border-border overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-border px-5 py-3 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">{isCreate ? "新增管理员" : "编辑管理员"}</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {err && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {err}
            </div>
          )}

          <Field label="用户名 (Username)">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="superadmin / alice"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>

          <Field label="Supabase Auth UUID (user_id)">
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="550e8400-e29b-41d4-a716-446655440000"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-[10px] text-muted-foreground mt-1.5">
              先在 Supabase Auth 后台创建用户，再把 UUID 填到这里。本面板不持有 service-role key。
            </p>
          </Field>

          <Field label="角色 (Role)">
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={`px-3 py-2 rounded-lg border text-left text-xs transition-colors ${
                    role === opt.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-border/80 bg-card/30"
                  }`}
                  style={role === opt.value ? { borderColor: opt.color, background: `${opt.color}10` } : undefined}
                >
                  <div className="font-semibold" style={{ color: opt.color }}>{opt.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{opt.desc}</div>
                </button>
              ))}
            </div>
          </Field>

          <Field label="权限项 (Permissions)">
            {role === "superadmin" ? (
              <p className="text-xs text-amber-300">超级管理员忽略此列表，拥有全部权限。</p>
            ) : (
              <div className="space-y-3">
                {PERMISSION_GROUPS.map((g) => (
                  <div key={g.group} className="rounded-lg border border-border/60 bg-card/30 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{g.group}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {g.keys.map((p) => (
                        <label key={p.key} className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={perms.includes(p.key)}
                            onChange={() => togglePerm(p.key)}
                            className="h-3.5 w-3.5 accent-primary"
                          />
                          <span className="font-mono text-[10px] text-muted-foreground">{p.key}</span>
                          <span className="text-foreground/80 ml-auto truncate">{p.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Field>

          <div className="flex gap-2 pt-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isCreate ? "创建" : "保存"}
            </button>
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted/30"
            >取消</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({
  row, onClose, onDeleted,
}: { row: AdminRow; onClose: () => void; onDeleted: () => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function confirm() {
    setErr(null);
    setBusy(true);
    try {
      const { error } = await supabase.from("admin_users").delete().eq("id", row.id);
      if (error) throw new Error(error.message);
      await onDeleted();
    } catch (e: any) {
      setErr(e?.message ?? "删除失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div
        className="rounded-2xl bg-background border border-border p-5 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-foreground">删除管理员</h3>
        <p className="text-sm text-muted-foreground mt-2">
          确定删除 <span className="text-foreground font-medium">{row.username ?? row.userId ?? `#${row.id}`}</span>？
          此操作只移除 admin_users 行；Supabase Auth 用户仍存在。
        </p>
        {err && (
          <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {err}
          </div>
        )}
        <div className="flex gap-2 mt-4">
          <button
            onClick={confirm}
            disabled={busy}
            className="flex-1 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            确认删除
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted/30"
          >取消</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{label}</div>
      {children}
    </div>
  );
}
