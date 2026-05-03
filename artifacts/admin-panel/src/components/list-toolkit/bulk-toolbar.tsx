import { useState } from "react";
import { Copy, Check, Download, Tag, Trash2, X, Loader2 } from "lucide-react";
import type { RowSelection } from "./use-row-selection";
import { downloadCsv, type CsvColumn } from "./csv";
import { useTagsStore, assignTag } from "@/components/tags/tags-store";

/**
 * Floating toolbar that appears when ≥1 row selected. Renders the
 * generic bulk actions admins use across every list — copy keys,
 * download CSV, bulk-tag, and a "clear selection" close button.
 *
 * Use the page-specific `extraActions` slot for actions that don't
 * generalise (e.g. "approve withdrawal" on the withdrawals page).
 */
interface Props<T> {
  selection: RowSelection;
  /** Rows currently visible on the page, used to download a CSV of just
   *  the selected ones. */
  rows: T[];
  /** Function from a row to its selection key (matches the keys used by
   *  `selection.isSelected`). Usually the wallet address — lowercased. */
  rowKey: (r: T) => string;
  /** CSV columns for `下载` action. */
  csvColumns: CsvColumn<T>[];
  /** Filename stem (no extension). */
  csvFilename: string;
  /** Show the bulk-tag action — turn off for pages where rows aren't
   *  addresses (e.g. tags admin page). */
  enableTag?: boolean;
  extraActions?: React.ReactNode;
}

export function BulkToolbar<T>({
  selection, rows, rowKey, csvColumns, csvFilename, enableTag = true, extraActions,
}: Props<T>) {
  const [copied, setCopied] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const count = selection.count;

  if (count === 0) return null;

  const selectedRows = rows.filter((r) => selection.isSelected(rowKey(r)));
  const selectedKeys = selectedRows.map(rowKey);

  function copyKeys() {
    void navigator.clipboard.writeText(selectedKeys.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function csv() {
    downloadCsv(`${csvFilename}-${new Date().toISOString().slice(0, 10)}.csv`, selectedRows, csvColumns);
  }

  return (
    <div className="sticky top-0 z-20 -mx-4 lg:-mx-6 px-4 lg:px-6 py-2 mb-3 bg-background/95 backdrop-blur border-y border-primary/30">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={selection.clear}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-border bg-card/40 hover:bg-card text-muted-foreground hover:text-foreground"
          title="清除选择"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs font-semibold text-foreground">
          已选 <span className="text-primary tabular-nums">{count}</span> 项
        </span>
        <span className="ml-auto inline-flex flex-wrap gap-1.5">
          <BulkBtn icon={copied ? Check : Copy} label={copied ? "已复制" : "复制"} onClick={copyKeys} />
          <BulkBtn icon={Download} label="下载 CSV" onClick={csv} />
          {enableTag && <BulkBtn icon={Tag} label="绑定标签" onClick={() => setTagOpen(true)} />}
          {extraActions}
        </span>
      </div>

      {tagOpen && enableTag && (
        <BulkTagDialog
          addresses={selectedKeys}
          onClose={() => setTagOpen(false)}
          onDone={() => { setTagOpen(false); selection.clear(); }}
        />
      )}
    </div>
  );
}

function BulkBtn({
  icon: Icon, label, onClick, danger,
}: { icon: typeof Copy; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
        danger
          ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
          : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

/** Re-export so pages that need a destructive-styled extra action (e.g.
 *  delete) can match the toolbar look. */
export { BulkBtn, Trash2 };

/* ─────────── Bulk tag dialog ─────────── */

function BulkTagDialog({
  addresses, onClose, onDone,
}: { addresses: string[]; onClose: () => void; onDone: () => void }) {
  const { tags } = useTagsStore();
  const [tagId, setTagId] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: addresses.length });
  const [err, setErr] = useState<string | null>(null);

  async function apply() {
    if (!tagId) return;
    setErr(null);
    setBusy(true);
    setProgress({ done: 0, total: addresses.length });
    try {
      // Sequential upsert so the UI can show progress; the assignments
      // table has a unique index on (tag_id, chain_id, user_address)
      // so re-tagging an already-tagged address is a safe no-op.
      for (let i = 0; i < addresses.length; i += 1) {
        await assignTag(Number(tagId), addresses[i], note.trim() || null);
        setProgress({ done: i + 1, total: addresses.length });
      }
      onDone();
    } catch (e: any) {
      setErr(e?.message ?? "绑定失败");
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
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground inline-flex items-center gap-2">
            <Tag className="h-4 w-4 text-amber-400" />
            批量绑定标签 · {addresses.length} 个地址
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted/50 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {err && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive mb-3">
            {err}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1.5">选择标签</label>
            <select
              value={tagId}
              onChange={(e) => setTagId(e.target.value ? Number(e.target.value) : "")}
              disabled={busy || !tags}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— 选择 —</option>
              {(tags ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1.5">统一备注（可选）</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy}
              placeholder="例如：第三季度业绩达标"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-[10px] text-muted-foreground mt-1">同一地址若已有此标签，将更新备注。</p>
          </div>

          {busy && (
            <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                <span>处理中</span>
                <span className="tabular-nums">{progress.done} / {progress.total}</span>
              </div>
              <div className="h-1.5 bg-muted/40 rounded overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={apply}
            disabled={busy || !tagId}
            className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            确认绑定
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
