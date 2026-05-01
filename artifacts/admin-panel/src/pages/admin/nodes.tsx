import { useEffect, useMemo, useState } from "react";
import { PageShell } from "./page-shell";
import { StatsCard } from "@/components/stats-card";
import { MobileDataCard } from "@/components/mobile-card";
import { supabase, adminChainId, fmtUsdt18 } from "@/lib/supabase";
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

export default function NodesPage() {
  const [rows, setRows] = useState<Purchase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<number | "all">("all");

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
    if (tierFilter === "all") return rows;
    return rows.filter((r) => r.nodeId === tierFilter);
  }, [rows, tierFilter]);

  const totalSold = rows?.length ?? 0;
  const totalUsdt = rows?.reduce((acc, r) => acc + BigInt(r.amount), 0n) ?? 0n;

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

      {/* Tier filter */}
      <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-card/40 p-0.5 text-xs mb-4">
        <button
          onClick={() => setTierFilter("all")}
          className={`px-3 py-1.5 rounded-md ${tierFilter === "all" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >全部</button>
        {TIERS.map((t) => (
          <button
            key={t.nodeId}
            onClick={() => setTierFilter(t.nodeId)}
            className={`px-3 py-1.5 rounded-md ${tierFilter === t.nodeId ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >{t.nodeId}</button>
        ))}
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
                  <th className="text-left px-4 py-3">买家地址</th>
                  <th className="text-left px-4 py-3">节点</th>
                  <th className="text-right px-4 py-3">USDT</th>
                  <th className="text-left px-4 py-3">购买时间</th>
                  <th className="text-left px-4 py-3">tx</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((r) => (
                  <tr key={`${r.txHash}-${r.user}`} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-mono text-xs">{r.user.slice(0, 12)}…{r.user.slice(-8)}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">{r.nodeId}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtUsdt18(r.amount, 0)}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(r.paidAt).toLocaleString("sv")}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground">{r.txHash.slice(0, 10)}…{r.txHash.slice(-6)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">无数据</td></tr>
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
            {filtered.slice(0, 50).map((r) => (
              <MobileDataCard
                key={`${r.txHash}-${r.user}`}
                header={
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[12px] text-foreground/85 truncate">
                      {r.user.slice(0, 10)}…{r.user.slice(-6)}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                      {r.nodeId}
                    </span>
                  </div>
                }
                fields={[
                  { label: "USDT", value: fmtUsdt18(r.amount, 0) },
                  { label: "时间", value: new Date(r.paidAt).toLocaleDateString("sv") },
                  { label: "tx", value: `${r.txHash.slice(0, 8)}…${r.txHash.slice(-6)}`, mono: true },
                ]}
              />
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
