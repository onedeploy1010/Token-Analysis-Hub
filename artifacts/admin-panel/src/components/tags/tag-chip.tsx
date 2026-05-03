import { useMemo, useState } from "react";
import { Plus, X, Pencil, Loader2 } from "lucide-react";
import {
  useTagsStore, tagsForAddress, assignTag, unassignTag, updateAssignmentNote,
  type Tag,
} from "./tags-store";

/** Small colored chip shown wherever a member is rendered. Pure UI. */
export function TagChip({
  tag, onRemove, note,
}: { tag: Tag; onRemove?: () => void; note?: string | null }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold"
      style={{
        background: `${tag.color}15`,
        color: tag.color,
        borderColor: `${tag.color}40`,
      }}
      title={note ? `${tag.name}: ${note}` : tag.name}
    >
      <span className="truncate max-w-[80px]">{tag.name}</span>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="hover:text-red-400 shrink-0"
          aria-label="移除标签"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

/** Renders all tags currently bound to an address, with optional inline
 *  removal + note editor. Used inside the modal and inline in list rows. */
export function TagChipsForAddress({
  address, editable = false, compact = false,
}: { address: string; editable?: boolean; compact?: boolean }) {
  const { tags, assignments } = useTagsStore();
  const bound = useMemo(() => tagsForAddress(address, assignments, tags), [address, assignments, tags]);
  const [editingNote, setEditingNote] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  if (bound.length === 0) {
    return (
      <span className={`text-[11px] text-muted-foreground ${compact ? "" : "italic"}`}>
        {compact ? "—" : "尚未打标签"}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {bound.map((t) => {
        const isEditing = editingNote === t.assignmentId;
        return (
          <span key={t.assignmentId} className="inline-flex items-center gap-1">
            <TagChip
              tag={t}
              note={t.note}
              onRemove={editable ? () => void unassignTag(t.assignmentId) : undefined}
            />
            {editable && !compact && (
              isEditing ? (
                <span className="inline-flex items-center gap-1">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="备注"
                    autoFocus
                    className="px-1.5 py-0.5 bg-input border border-border rounded text-[10px] w-32"
                  />
                  <button
                    onClick={async () => {
                      await updateAssignmentNote(t.assignmentId, draft.trim() || null);
                      setEditingNote(null);
                    }}
                    className="text-[10px] text-emerald-400 hover:underline"
                  >保存</button>
                  <button
                    onClick={() => setEditingNote(null)}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >取消</button>
                </span>
              ) : (
                <button
                  onClick={() => { setEditingNote(t.assignmentId); setDraft(t.note ?? ""); }}
                  className="p-0.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  title={t.note ? `备注: ${t.note}` : "添加备注"}
                >
                  <Pencil className="h-2.5 w-2.5" />
                </button>
              )
            )}
            {!editable && t.note && (
              <span className="text-[10px] text-muted-foreground italic max-w-[160px] truncate">{t.note}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

/** Inline picker shown inside the modal: select a tag + optional note,
 *  click "添加" to upsert the assignment. */
export function TagPickerInline({ address }: { address: string }) {
  const { tags, assignments } = useTagsStore();
  const bound = useMemo(() => tagsForAddress(address, assignments, tags), [address, assignments, tags]);
  const boundIds = useMemo(() => new Set(bound.map((b) => b.id)), [bound]);
  const [tagId, setTagId] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const remaining = useMemo(() => (tags ?? []).filter((t) => !boundIds.has(t.id)), [tags, boundIds]);

  if (!tags) return <span className="text-[11px] text-muted-foreground">加载标签…</span>;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={tagId}
          onChange={(e) => setTagId(e.target.value ? Number(e.target.value) : "")}
          className="px-2 py-1.5 bg-input border border-border rounded text-xs flex-shrink-0"
        >
          <option value="">— 选择标签 —</option>
          {remaining.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="备注（可选）"
          className="flex-1 min-w-0 px-2 py-1.5 bg-input border border-border rounded text-xs"
        />
        <button
          onClick={async () => {
            if (!tagId) return;
            setBusy(true); setErr(null);
            try {
              await assignTag(Number(tagId), address, note.trim() || null);
              setTagId(""); setNote("");
            } catch (e: any) {
              setErr(e?.message ?? "绑定失败");
            } finally {
              setBusy(false);
            }
          }}
          disabled={!tagId || busy}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 text-xs font-medium disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} 添加
        </button>
      </div>
      {err && <p className="text-[10px] text-destructive">{err}</p>}
      {remaining.length === 0 && (
        <p className="text-[10px] text-muted-foreground italic">所有标签都已绑定到该地址。</p>
      )}
    </div>
  );
}
