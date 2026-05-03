import { useMemo } from "react";
import { Tag as TagIcon } from "lucide-react";
import { useTagsStore, addressesWithTag } from "./tags-store";

/**
 * Top-of-page filter chip strip: click a tag to scope the surrounding
 * list (and any aggregate stats above it) to addresses carrying that
 * tag. Multi-select is intersection (an address must carry ALL selected
 * tags). Empty selection = no filter.
 */
export function TagFilter({
  selected, onChange,
}: { selected: number[]; onChange: (next: number[]) => void }) {
  const { tags } = useTagsStore();
  if (!tags || tags.length === 0) return null;

  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <TagIcon className="h-3.5 w-3.5" /> 标签筛选
      </span>
      {tags.map((t) => {
        const active = selected.includes(t.id);
        return (
          <button
            key={t.id}
            onClick={() => toggle(t.id)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all"
            style={
              active
                ? { background: `${t.color}25`, borderColor: t.color, color: t.color, boxShadow: `0 0 0 1px ${t.color}30` }
                : { background: "transparent", borderColor: `${t.color}30`, color: `${t.color}cc` }
            }
          >
            <span
              className="h-1.5 w-1.5 rounded-full inline-block shrink-0"
              style={{ background: t.color }}
            />
            {t.name}
          </button>
        );
      })}
      {selected.length > 0 && (
        <button
          onClick={() => onChange([])}
          className="text-[11px] text-muted-foreground hover:text-foreground underline"
        >清除</button>
      )}
    </div>
  );
}

/** Apply the selected-tag intersection filter to a list of address-bearing
 *  rows. Pass a getter so callers can use this on any row shape. */
export function useTagAddressFilter(selected: number[]): (addr: string) => boolean {
  const { assignments } = useTagsStore();
  return useMemo(() => {
    if (selected.length === 0 || !assignments) return () => true;
    const sets = selected.map((id) => addressesWithTag(id, assignments));
    return (addr: string) => {
      const lc = addr.toLowerCase();
      for (const s of sets) if (!s.has(lc)) return false;
      return true;
    };
  }, [selected, assignments]);
}
