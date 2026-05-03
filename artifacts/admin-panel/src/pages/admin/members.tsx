import { useEffect, useMemo, useState } from "react";
import { PageShell } from "./page-shell";
import { MobileDataCard } from "@/components/mobile-card";
import { supabase, adminChainId, fmtUsdt18 } from "@/lib/supabase";
import { AddressButton } from "@/components/member-detail";
import { TagChipsForAddress } from "@/components/tags/tag-chip";
import { TagFilter, useTagAddressFilter } from "@/components/tags/tag-filter";
import { Loader2, Search, Wallet } from "lucide-react";

/**
 * Members page — every wallet in `rune_members` enriched with their
 * purchase + downline count. Click any address to pop the global member
 * detail modal (handled by `<AddressButton>`); filter the whole list
 * (and the count in the page subtitle) by selected tags.
 */
const PAGE_SIZE = 30;

interface MemberRow {
  user: string;
  boundAt: string;
  registeredAt: string;
  nodeId: number | null;
  amount: string | null;
  paidAt: string | null;
  txHash: string | null;
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [downlinesByRef, setDownlinesByRef] = useState<Map<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "withNode" | "noNode">("all");
  const [tagFilter, setTagFilter] = useState<number[]>([]);
  const [page, setPage] = useState(0);

  const tagPredicate = useTagAddressFilter(tagFilter);

  useEffect(() => {
    let active = true;
    // Render the table the moment rune_members lands. The two enrichment
    // queries (purchases, referrers) backfill node info + downline counts
    // asynchronously, so users see rows during the first round-trip
    // instead of staring at a loader for the slowest of three queries.
    void (async () => {
      try {
        const m = await supabase
          .from("rune_members")
          .select("user, bound_at, registered_at")
          .eq("chain_id", adminChainId)
          .order("bound_at", { ascending: false })
          .limit(2000);
        if (!active) return;
        if (m.error) throw new Error(m.error.message);
        setMembers((m.data ?? []).map((row: any) => ({
          user: row.user,
          boundAt: row.bound_at,
          registeredAt: row.registered_at,
          nodeId: null,
          amount: null,
          paidAt: null,
          txHash: null,
        })));
      } catch (e: any) {
        if (active) setError(e?.message ?? "load failed");
      }
    })();
    void (async () => {
      try {
        const p = await supabase
          .from("rune_purchases")
          .select("user, node_id, amount::text, paid_at, tx_hash")
          .eq("chain_id", adminChainId);
        if (!active) return;
        if (p.error) throw new Error(p.error.message);
        const purchaseByUser = new Map<string, any>();
        for (const x of p.data ?? []) purchaseByUser.set((x as any).user, x);
        setMembers((prev) => prev?.map((row) => {
          const buy = purchaseByUser.get(row.user);
          if (!buy) return row;
          return { ...row, nodeId: buy.node_id, amount: buy.amount, paidAt: buy.paid_at, txHash: buy.tx_hash };
        }) ?? null);
      } catch (e: any) {
        if (active) setError((cur) => cur ?? e?.message ?? "load failed");
      }
    })();
    void (async () => {
      try {
        const r = await supabase
          .from("rune_referrers")
          .select("referrer")
          .eq("chain_id", adminChainId);
        if (!active) return;
        if (r.error) throw new Error(r.error.message);
        const counts = new Map<string, number>();
        for (const x of r.data ?? []) {
          const ref = (x as any).referrer as string;
          counts.set(ref, (counts.get(ref) ?? 0) + 1);
        }
        setDownlinesByRef(counts);
      } catch (e: any) {
        if (active) setError((cur) => cur ?? e?.message ?? "load failed");
      }
    })();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!members) return [];
    const q = search.trim().toLowerCase();
    return members.filter((r) => {
      if (filter === "withNode" && !r.nodeId) return false;
      if (filter === "noNode" && r.nodeId) return false;
      if (q && !r.user.toLowerCase().includes(q)) return false;
      if (!tagPredicate(r.user)) return false;
      return true;
    });
  }, [members, search, filter, tagPredicate]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const aggregateUsdtRaw = filtered.reduce((acc, r) => acc + (r.amount ? BigInt(r.amount) : 0n), 0n);

  return (
    <PageShell
      title="会员管理"
      subtitle={`Members · chain ${adminChainId} · ${filtered.length}/${members?.length ?? "…"} 显示 · 累计 ${fmtUsdt18(aggregateUsdtRaw.toString(), 0)} U`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜地址 0x… / Search address"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card/40 p-0.5 text-xs">
          {([
            { v: "all",      label: "全部" },
            { v: "withNode", label: "有节点" },
            { v: "noNode",   label: "无节点" },
          ] as const).map(({ v, label }) => (
            <button
              key={v}
              onClick={() => { setFilter(v); setPage(0); }}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === v ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >{label}</button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <TagFilter selected={tagFilter} onChange={(s) => { setTagFilter(s); setPage(0); }} />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          {error}
        </div>
      )}

      {!members && !error ? (
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
                  <th className="text-left px-4 py-3">地址</th>
                  <th className="text-left px-4 py-3">标签</th>
                  <th className="text-left px-4 py-3">节点</th>
                  <th className="text-right px-4 py-3">入金 USDT</th>
                  <th className="text-left px-4 py-3">绑定时间</th>
                  <th className="text-right px-4 py-3">直推</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => (
                  <tr key={r.user} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="px-4 py-2.5"><AddressButton addr={r.user} /></td>
                    <td className="px-4 py-2.5"><TagChipsForAddress address={r.user} compact /></td>
                    <td className="px-4 py-2.5">
                      {r.nodeId ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">{r.nodeId}</span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.amount ? fmtUsdt18(r.amount, 0) : "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{r.boundAt ? new Date(r.boundAt).toLocaleString("sv") : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-xs">{downlinesByRef?.get(r.user) ?? 0}</td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">无匹配记录</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {paged.map((r) => (
              <MobileDataCard
                key={r.user}
                header={
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-3.5 w-3.5 text-amber-400" />
                      <AddressButton addr={r.user} />
                    </div>
                    <TagChipsForAddress address={r.user} compact />
                  </div>
                }
                fields={[
                  { label: "节点", value: r.nodeId ? <span className="text-amber-300 font-semibold">{r.nodeId}</span> : "—" },
                  { label: "入金 USDT", value: r.amount ? fmtUsdt18(r.amount, 0) : "—" },
                  { label: "绑定时间", value: r.boundAt ? new Date(r.boundAt).toLocaleDateString("sv") : "—" },
                  { label: "直推人数", value: String(downlinesByRef?.get(r.user) ?? 0) },
                ]}
              />
            ))}
            {paged.length === 0 && (
              <p className="text-center text-muted-foreground py-12">无匹配记录</p>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
              <span>第 {page + 1} / {totalPages} 页 · 共 {filtered.length} 条</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                  className="px-3 py-1.5 rounded border border-border hover:bg-card disabled:opacity-40">上一页</button>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 rounded border border-border hover:bg-card disabled:opacity-40">下一页</button>
              </div>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
