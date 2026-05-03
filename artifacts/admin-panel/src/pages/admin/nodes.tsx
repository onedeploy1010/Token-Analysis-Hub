import { useEffect, useMemo, useState } from "react";
import { PageShell } from "./page-shell";
import { StatsCard } from "@/components/stats-card";
import { MobileDataCard } from "@/components/mobile-card";
import { supabase, adminChainId, fmtUsdt18 } from "@/lib/supabase";
import { AddressButton, TxHashLink } from "@/components/member-detail";
import { TagChipsForAddress } from "@/components/tags/tag-chip";
import { TagFilter, useTagAddressFilter } from "@/components/tags/tag-filter";
import {
  useRowSelection, SelectCell, SelectAllCell,
  SortHeader, type SortState, compareBy,
  DateRangeFilter, EMPTY_RANGE, isInRange, type DateRange,
  BulkToolbar, type CsvColumn,
} from "@/components/list-toolkit";
import { Loader2, Server } from "lucide-react";

/**
 * Nodes page — aggregates rune_purchases by nodeId. Shows the 5 RUNE
 * tiers (101=FOUNDER…501=INITIAL) with their on-chain stats: how many
 * sold, total inflow USDT, latest sale.
 *
 * Data source: rune_purchases (writes from QuickNode Streams + Railway
 * indexer fallback). No api-server hop.
 */
const TIERS: Array<{ nodeId: number; nameCn: string; nameEn: string; price: number; color: string }> = [
  { nodeId: 101, nameCn: "联创·符主", nameEn: "FOUNDER",  price: 50_000, color: "#c084fc" },
  { nodeId: 201, nameCn: "超级·符魂", nameEn: "SUPER",    price: 10_000, color: "#fbbf24" },
  { nodeId: 301, nameCn: "高级·符印", nameEn: "ADVANCED", price:  5_000, color: "#34d399" },
  { nodeId: 401, nameCn: "中级·符源", nameEn: "MID",      price:  2_500, color: "#60a5fa" },
  { nodeId: 501, nameCn: "初级·符胚", nameEn: "INITIAL",  price:  1_000, color: "#cbd5e1" },
];

interface Purchase {
  user: string;
  nodeId: number;
  amount: string;
  paidAt: string;
  txHash: string;
  blockNumber: number;
}

type SortKey = "user" | "amount" | "paidAt";

export default function NodesPage() {
  const [rows, setRows] = useState<Purchase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<number | "all">("all");
  const [tagFilter, setTagFilter] = useState<number[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>(EMPTY_RANGE);
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "paidAt", dir: "desc" });
  const sel = useRowSelection();
  const tagPredicate = useTagAddressFilter(tagFilter);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from("rune_purchases")
        // amount cast to text — see members.tsx for the JSON-precision rationale.
        .select("user, node_id, amount::text, paid_at, tx_hash, block_number")
        .eq("chain_id", adminChainId)
        .order("block_number", { ascending: false })
        .limit(2000);
      if (error) { setError(error.message); return; }
      setRows((data ?? []).map((r: any) => ({
        user: r.user, nodeId: r.node_id, amount: r.amount, paidAt: r.paid_at,
        txHash: r.tx_hash, blockNumber: r.block_number,
      })));
    })();
  }, []);

  const stats = useMemo(() => {
    const byTier: Record<number, { count: number; sum: bigint; latest: string | null }> = {};
    for (const t of TIERS) byTier[t.nodeId] = { count: 0, sum: 0n, latest: null };
    if (rows) {
      for (const r of rows) {
        const s = byTier[r.nodeId];
        if (!s) continue;
        s.count++;
        s.sum += BigInt(r.amount);
        if (!s.latest || r.paidAt > s.latest) s.latest = r.paidAt;
      }
    }
    return byTier;
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    let out = rows.filter((r) => {
      if (tierFilter !== "all" && r.nodeId !== tierFilter) return false;
      if (!tagPredicate(r.user)) return false;
      if (!isInRange(r.paidAt, dateRange)) return false;
      return true;
    });
    if (sort.key && sort.dir) {
      const cmp = (() => {
        switch (sort.key) {
          case "user":   return compareBy<Purchase>((r) => r.user.toLowerCase(), sort.dir);
          case "amount": return compareBy<Purchase>((r) => BigInt(r.amount), sort.dir);
          case "paidAt": return compareBy<Purchase>((r) => r.paidAt, sort.dir);
          default: return () => 0;
        }
      })();
      out = [...out].sort(cmp);
    }
    return out;
  }, [rows, tierFilter, tagPredicate, dateRange, sort]);

  const totalSold = rows?.length ?? 0;
  const totalUsdt = rows?.reduce((acc, r) => acc + BigInt(r.amount), 0n) ?? 0n;
  const visiblePaged = filtered.slice(0, 100);
  const visibleKeys = visiblePaged.map((r) => `${r.txHash}-${r.user}`);

  const csvColumns: CsvColumn<Purchase>[] = [
    { header: "address", get: (r) => r.user },
    { header: "node_id", get: (r) => r.nodeId },
    { header: "amount_usdt_18", get: (r) => r.amount },
    { header: "paid_at", get: (r) => r.paidAt },
    { header: "tx_hash", get: (r) => r.txHash },
    { header: "block_number", get: (r) => r.blockNumber },
  ];

  return (
    <PageShell
      title="节点管理"
      subtitle={`Nodes · chain ${adminChainId} · ${totalSold} 笔已售 · 累计入金 ${fmtUsdt18(totalUsdt.toString(), 0)} USDT`}
    >
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          {error}
        </div>
      )}

      {/* Tier stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {TIERS.map((t) => (
          <StatsCard
            key={t.nodeId}
            title={`${t.nameCn} · ${t.nodeId}`}
            value={stats[t.nodeId]?.count ?? 0}
            subtitle={`${fmtUsdt18(stats[t.nodeId]?.sum.toString() ?? "0", 0)} USDT`}
            icon={Server}
            color={t.color}
          />
        ))}
      </div>

      <BulkToolbar
        selection={sel}
        rows={visiblePaged}
        rowKey={(r) => `${r.txHash}-${r.user}`}
        csvColumns={csvColumns}
        csvFilename="nodes-purchases"
        enableTag={false}
      />

      {/* Filter bar */}
      <div className="rounded-2xl border border-border/60 bg-card/30 p-3 space-y-3 mb-4 surface-3d">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-card/40 p-0.5 text-xs">
            <button
              onClick={() => setTierFilter("all")}
              className={`px-3 py-1.5 rounded-md ${tierFilter === "all" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >全部</button>
            {TIERS.map((t) => (
              <button
                key={t.nodeId}
                onClick={() => setTierFilter(t.nodeId)}
                className={`px-3 py-1.5 rounded-md ${tierFilter === t.nodeId ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                style={tierFilter === t.nodeId ? { color: t.color } : undefined}
              >{t.nodeId}</button>
            ))}
          </div>
          <DateRangeFilter value={dateRange} onChange={setDateRange} label="购买日期" />
        </div>
        <TagFilter selected={tagFilter} onChange={setTagFilter} />
      </div>

      {!rows && !error ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> 加载中…
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto rounded-2xl border border-border/60 bg-card/40 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.4)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/40 backdrop-blur text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-center px-3 py-3 w-10"><SelectAllCell visibleKeys={visibleKeys} sel={sel} /></th>
                  <th className="text-left px-4 py-3"><SortHeader columnKey="user" current={sort} onChange={setSort}>买家地址</SortHeader></th>
                  <th className="text-left px-4 py-3">节点</th>
                  <th className="text-right px-4 py-3"><SortHeader columnKey="amount" current={sort} onChange={setSort} align="right">USDT</SortHeader></th>
                  <th className="text-left px-4 py-3"><SortHeader columnKey="paidAt" current={sort} onChange={setSort}>购买时间</SortHeader></th>
                  <th className="text-left px-4 py-3">tx</th>
                </tr>
              </thead>
              <tbody>
                {visiblePaged.map((r) => {
                  const k = `${r.txHash}-${r.user}`;
                  return (
                    <tr key={k} className={`border-t border-border/40 align-top transition-colors ${
                      sel.isSelected(k) ? "bg-primary/[0.06]" : "hover:bg-muted/20"
                    }`}>
                      <td className="text-center px-3 py-2.5"><SelectCell k={k} sel={sel} /></td>
                      <td className="px-4 py-2.5 space-y-1">
                        <AddressButton addr={r.user} />
                        <TagChipsForAddress address={r.user} compact />
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">{r.nodeId}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtUsdt18(r.amount, 0)}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.paidAt).toLocaleString("sv")}</td>
                      <td className="px-4 py-2.5"><TxHashLink hash={r.txHash} /></td>
                    </tr>
                  );
                })}
                {visiblePaged.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">无数据</td></tr>
                )}
              </tbody>
            </table>
            {filtered.length > 100 && (
              <p className="px-4 py-2 text-[11px] text-muted-foreground text-center border-t border-border/40">
                仅显示最近 100 条 · 共 {filtered.length}
              </p>
            )}
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {visiblePaged.slice(0, 50).map((r) => {
              const k = `${r.txHash}-${r.user}`;
              return (
                <MobileDataCard
                  key={k}
                  header={
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <SelectCell k={k} sel={sel} />
                          <AddressButton addr={r.user} />
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                          {r.nodeId}
                        </span>
                      </div>
                      <TagChipsForAddress address={r.user} compact />
                    </div>
                  }
                  fields={[
                    { label: "USDT", value: fmtUsdt18(r.amount, 0) },
                    { label: "时间", value: new Date(r.paidAt).toLocaleDateString("sv") },
                    { label: "tx",   value: <TxHashLink hash={r.txHash} /> },
                  ]}
                />
              );
            })}
          </div>
        </>
      )}
    </PageShell>
  );
}
