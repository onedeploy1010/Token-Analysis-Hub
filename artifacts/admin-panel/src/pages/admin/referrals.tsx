import { useEffect, useMemo, useState } from "react";
import { PageShell } from "./page-shell";
import { supabase, adminChainId, w } from "@/lib/supabase";
import { Loader2, Users, ChevronRight, ChevronDown, ArrowUp, Search } from "lucide-react";

/**
 * Referrals page — drill-down tree built from rune_referrers.
 *
 * Strategy: pre-load the entire (chain-scoped) referrers table once,
 * build an in-memory `referrer → [users]` map, then expand on click.
 * For testnet's small dataset and mainnet's ~hundreds-of-rows scale this
 * is far cheaper than RPC round-trips per node.
 *
 * Two views:
 *  - 树形 (tree): expand/collapse downstream of a chosen root
 *  - 上溯 (upline): from any address, walk up the referrer chain to ROOT
 */
const ROOT = "0x0000000000000000000000000000000000000001";
type RefMap = Map<string, string[]>; // referrer (lowercase) → [user, user, ...]

interface ReferrerRow { user: string; referrer: string; boundAt: string }

export default function ReferralsPage() {
  const [rows, setRows] = useState<ReferrerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [root, setRoot] = useState(ROOT);
  const [expanded, setExpanded] = useState<Set<string>>(new Set([ROOT]));

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from("rune_referrers")
        .select("user, referrer, bound_at")
        .eq("chain_id", adminChainId)
        .order("bound_at", { ascending: true });
      if (error) { setError(error.message); return; }
      setRows((data ?? []).map((r: any) => ({
        user: r.user, referrer: r.referrer, boundAt: r.bound_at,
      })));
    })();
  }, []);

  // referrer → children, plus user → upline lookup
  const { childrenOf, uplineOf } = useMemo(() => {
    const c: RefMap = new Map();
    const u: Map<string, string> = new Map();
    if (rows) {
      for (const r of rows) {
        const arr = c.get(r.referrer) ?? [];
        arr.push(r.user);
        c.set(r.referrer, arr);
        u.set(r.user, r.referrer);
      }
    }
    return { childrenOf: c, uplineOf: u };
  }, [rows]);

  const totalKnown = rows?.length ?? 0;
  const totalRoots = (childrenOf.get(ROOT)?.length ?? 0);

  function toggle(addr: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(addr)) next.delete(addr); else next.add(addr);
      return next;
    });
  }

  function jumpToAddress() {
    const a = w(search);
    if (!a) return;
    if (!uplineOf.has(a) && !childrenOf.has(a) && a !== ROOT) {
      setError(`地址 ${a} 不在 chain ${adminChainId} 的推荐表里`);
      return;
    }
    setError(null);
    setRoot(a);
    setExpanded(new Set([a]));
  }

  // upline trail (from `root` up to ROOT, inclusive of root itself)
  const uplineTrail = useMemo(() => {
    const trail: string[] = [root];
    let cur = root;
    while (uplineOf.has(cur)) {
      const up = uplineOf.get(cur)!;
      if (trail.includes(up)) break; // cycle guard
      trail.unshift(up);
      cur = up;
    }
    return trail;
  }, [root, uplineOf]);

  return (
    <PageShell
      title="推荐管理"
      subtitle={`Referrals · chain ${adminChainId} · ${totalKnown} 绑定 · ROOT 直推 ${totalRoots} 人`}
    >
      {/* Search + root jump */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="跳到地址 0x… (查任何人的子树)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && jumpToAddress()}
          className="flex-1 min-w-[260px] max-w-md px-3 py-2 bg-input border border-border rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={jumpToAddress}
          className="px-3 py-2 bg-primary/15 text-primary text-sm rounded-lg border border-primary/30 hover:bg-primary/25"
        >聚焦</button>
        <button
          onClick={() => { setRoot(ROOT); setExpanded(new Set([ROOT])); setSearch(""); setError(null); }}
          className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-card text-muted-foreground"
        >回到 ROOT</button>
      </div>

      {/* Upline breadcrumb */}
      {uplineTrail.length > 1 && (
        <div className="flex items-center gap-1 flex-wrap text-[11px] text-muted-foreground mb-3 p-2 rounded-lg border border-border/40 bg-card/30">
          <ArrowUp className="h-3 w-3" />
          <span className="mr-1">上溯路径:</span>
          {uplineTrail.map((addr, i) => (
            <span key={addr} className="flex items-center gap-1">
              <button
                onClick={() => { setRoot(addr); setExpanded(new Set([addr])); }}
                className={`font-mono px-1.5 py-0.5 rounded hover:bg-muted/40 ${addr === root ? "text-primary font-semibold" : ""}`}
              >
                {addr === ROOT ? "ROOT" : `${addr.slice(0, 6)}…${addr.slice(-4)}`}
              </button>
              {i < uplineTrail.length - 1 && <ChevronRight className="h-3 w-3 opacity-40" />}
            </span>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          {error}
        </div>
      )}

      {!rows ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> 加载中…
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-2">
          <TreeNode
            address={root}
            depth={0}
            childrenOf={childrenOf}
            expanded={expanded}
            onToggle={toggle}
            onFocus={(a) => { setRoot(a); setExpanded(new Set([a])); }}
          />
        </div>
      )}
    </PageShell>
  );
}

interface TreeNodeProps {
  address: string;
  depth: number;
  childrenOf: RefMap;
  expanded: Set<string>;
  onToggle: (addr: string) => void;
  onFocus: (addr: string) => void;
}

function TreeNode({ address, depth, childrenOf, expanded, onToggle, onFocus }: TreeNodeProps) {
  const kids = childrenOf.get(address) ?? [];
  const hasKids = kids.length > 0;
  const isOpen = expanded.has(address);
  const isRoot = address === "0x0000000000000000000000000000000000000001";

  // Hard cap depth render to avoid blowing render time on pathological chains.
  if (depth > 30) return <div className="pl-4 text-[11px] text-muted-foreground">…(深度截断)</div>;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/30"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <button
          onClick={() => hasKids && onToggle(address)}
          className={`p-0.5 rounded ${hasKids ? "text-muted-foreground hover:text-foreground" : "opacity-30 cursor-default"}`}
        >
          {hasKids ? (isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : <span className="inline-block w-3.5" />}
        </button>
        <Users className={`h-3.5 w-3.5 ${isRoot ? "text-amber-400" : "text-muted-foreground"}`} />
        <button
          onClick={() => onFocus(address)}
          className={`font-mono text-[12px] hover:text-primary transition-colors ${isRoot ? "text-amber-300 font-semibold" : "text-foreground/85"}`}
          title={address}
        >
          {isRoot ? "ROOT" : `${address.slice(0, 12)}…${address.slice(-8)}`}
        </button>
        {hasKids && (
          <span className="text-[10px] text-muted-foreground ml-1">{kids.length} 直推</span>
        )}
      </div>
      {isOpen && kids.map((k) => (
        <TreeNode
          key={k}
          address={k}
          depth={depth + 1}
          childrenOf={childrenOf}
          expanded={expanded}
          onToggle={onToggle}
          onFocus={onFocus}
        />
      ))}
    </div>
  );
}
