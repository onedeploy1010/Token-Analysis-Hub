import { useEffect, useState } from "react";
import { PageShell } from "./page-shell";
import { useAdminAuth } from "@/contexts/admin-auth";
import {
  useTagsStore, createTag, updateTag, deleteTag, type Tag,
} from "@/components/tags/tags-store";
import {
  Loader2, Plus, Pencil, Trash2, X, Tag as TagIcon, Lock,
} from "lucide-react";

/**
 * 标签管理 — CRUD on `admin_member_tags`. Color picker is just a 12-swatch
 * palette tuned for the amber/dark theme. Each tag tracks an assignment
 * count (computed from the in-memory store).
 */

const PALETTE = [
  "#fbbf24", "#f97316", "#f87171", "#c084fc", "#a78bfa", "#60a5fa",
  "#34d399", "#10b981", "#cbd5e1", "#94a3b8", "#fde68a", "#fb7185",
];

export default function TagsPage() {
  const { hasPermission } = useAdminAuth();
  // Reuse `admins.write` as the gate — tag editing is admin-meta work.
  const canWrite = hasPermission("admins.write");
  const { tags, assignments, error, reload } = useTagsStore();
  const [editing, setEditing] = useState<Tag | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Tag | null>(null);

  // Force a reload on mount in case something else mutated it.
  useEffect(() => { void reload(); }, []);

  const counts = new Map<number, number>();
  if (assignments) {
    for (const a of assignments) counts.set(a.tagId, (counts.get(a.tagId) ?? 0) + 1);
  }

  return (
    <PageShell
      title="标签管理"
      subtitle="Tags · 会员分组、组织线追踪、风险标记"
      actions={
        canWrite && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> 新增标签
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

      {!tags ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> 加载中…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tags.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-border/60 bg-card/40 p-4 flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <span
                  className="h-6 w-6 rounded-md border shrink-0"
                  style={{ background: `${t.color}40`, borderColor: t.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground truncate" style={{ color: t.color }}>{t.name}</div>
                  {t.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>}
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">绑定 <span className="font-semibold text-foreground tabular-nums">{counts.get(t.id) ?? 0}</span> 个地址</span>
                {canWrite && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditing(t)}
                      className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      title="编辑"
                    ><Pencil className="h-3.5 w-3.5" /></button>
                    <button
                      onClick={() => setDeleting(t)}
                      className="p-1.5 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive"
                      title="删除"
                    ><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {tags.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border/60 bg-card/20 p-8 text-center text-sm text-muted-foreground">
              暂无标签。点击右上角「新增标签」开始。
            </div>
          )}
        </div>
      )}

      {(editing || creating) && (
        <TagDialog
          tag={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={async () => { await reload(); setEditing(null); setCreating(false); }}
        />
      )}

      {deleting && (
        <DeleteConfirm
          tag={deleting}
          assignmentCount={counts.get(deleting.id) ?? 0}
          onClose={() => setDeleting(null)}
          onDeleted={async () => { await reload(); setDeleting(null); }}
        />
      )}
    </PageShell>
  );
}

function TagDialog({
  tag, onClose, onSaved,
}: { tag: Tag | null; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const isCreate = !tag;
  const [name, setName] = useState(tag?.name ?? "");
  const [color, setColor] = useState(tag?.color ?? PALETTE[0]);
  const [desc, setDesc] = useState(tag?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setErr(null);
    if (!name.trim()) { setErr("标签名不能为空"); return; }
    setBusy(true);
    try {
      if (isCreate) await createTag({ name: name.trim(), color, description: desc.trim() || null });
      else await updateTag(tag!.id, { name: name.trim(), color, description: desc.trim() || null });
      await onSaved();
    } catch (e: any) {
      setErr(e?.message ?? "保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div
        className="rounded-2xl bg-background border border-border p-5 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground inline-flex items-center gap-2">
            <TagIcon className="h-4 w-4 text-amber-400" />
            {isCreate ? "新增标签" : "编辑标签"}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted/50 text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>

        {err && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive mb-3">{err}</div>}

        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1.5">名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="一线领导 / VIP / 风险账户"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1.5">颜色</label>
            <div className="grid grid-cols-12 gap-1.5">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-md border-2 transition-all"
                  style={{
                    background: c,
                    borderColor: color === c ? "white" : "transparent",
                    boxShadow: color === c ? `0 0 0 2px ${c}` : undefined,
                  }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1.5">描述（可选）</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isCreate ? "创建" : "保存"}
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted/30"
          >取消</button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({
  tag, assignmentCount, onClose, onDeleted,
}: { tag: Tag; assignmentCount: number; onClose: () => void; onDeleted: () => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div className="rounded-2xl bg-background border border-border p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-foreground">删除标签</h3>
        <p className="text-sm text-muted-foreground mt-2">
          确定删除 <span className="font-semibold" style={{ color: tag.color }}>{tag.name}</span>?
          {assignmentCount > 0 && (
            <span className="block mt-1 text-amber-300">
              该标签已绑定到 <span className="font-bold">{assignmentCount}</span> 个地址，删除会同时移除所有绑定。
            </span>
          )}
        </p>
        {err && <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</div>}
        <div className="flex gap-2 mt-4">
          <button
            onClick={async () => {
              setErr(null); setBusy(true);
              try { await deleteTag(tag.id); await onDeleted(); }
              catch (e: any) { setErr(e?.message ?? "删除失败"); }
              finally { setBusy(false); }
            }}
            disabled={busy}
            className="flex-1 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            确认删除
          </button>
          <button
            onClick={onClose} disabled={busy}
            className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted/30"
          >取消</button>
        </div>
      </div>
    </div>
  );
}
