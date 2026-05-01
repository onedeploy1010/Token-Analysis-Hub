import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { PageShell } from "./page-shell";
import { StatsCard } from "@/components/stats-card";
import { supabase, adminChainId, fmtUsdt18 } from "@/lib/supabase";
import {
  Users, ShoppingCart, Coins, GitBranch, Server, HeartPulse,
  TrendingUp, Loader2,
} from "lucide-react";

/**
 * Dashboard — single live snapshot of everything the admin cares about.
 * Pure Supabase SDK, no api-server.
 *
 * Sections:
 *  • KPI grid: members / purchases / USDT inflow / referrers / indexer lag
 *  • 5-tier node distribution (count + USDT per tier)
 *  • Recent activity (last 5 purchases + last 5 bindings)
 */
const TIER_META: Record<number, { name: string; price: number; color: string }> = {
  101: { name: "联创·符主",   price: 50_000, color: "#c084fc" },
  201: { name: "超级·符魂",   price: 10_000, color: "#fbbf24" },
  301: { name: "高级·符印",   price:  5_000, color: "#34d399" },
  401: { name: "中级·符源",   price:  2_500, color: "#60a5fa" },
  501: { name: "初级·符胚",   price:  1_000, color: "#cbd5e1" },
};

interface SnapshotState {
  memberCount: number | null;
  purchases: Array<{ user: string; nodeId: number; amount: string; paidAt: string; txHash: string }>;
  referrerCount: number | null;
  recentBinds: Array<{ user: string; referrer: string; boundAt: string }>;
  indexer: Array<{ contract: string; lastBlock: number; updatedAt: string }>;
  chainHead: number | null;
}

const RPC_URL = adminChainId === 56
  ? "https://bsc-dataseed.binance.org"
  : "https://bsc-testnet.publicnode.com";

async function fetchChainHead(): Promise<number | null> {
  try {
    const r = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
    });
    const j = await r.json();
    return j?.result ? parseInt(j.result, 16) : null;
  } catch { return null; }
}

export default function DashboardPage() {
  const [snap, setSnap] = useState<SnapshotState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [mc, pAll, rc, rRecent, idx, head] = await Promise.all([
          // Member total — `count: 'exact', head: true` returns just the count.
          supabase.from("rune_members").select("user", { count: "exact", head: true }).eq("chain_id", adminChainId),
          supabase.from("rune_purchases")
            .select("user, node_id, amount::text, paid_at, tx_hash")
            .eq("chain_id", adminChainId)
            .order("block_number", { ascending: false })
            .limit(2000),
          supabase.from("rune_referrers").select("user", { count: "exact", head: true }).eq("chain_id", adminChainId),
          supabase.from("rune_referrers")
            .select("user, referrer, bound_at")
            .eq("chain_id", adminChainId)
            .order("bound_at", { ascending: false })
            .limit(5),
          supabase.from("rune_indexer_state")
            .select("contract, last_block::text, updated_at")
            .eq("chain_id", adminChainId),
          fetchChainHead(),
        ]);
        if (mc.error) throw new Error(mc.error.message);
        if (pAll.error) throw new Error(pAll.error.message);
        if (rc.error) throw new Error(rc.error.message);
        if (rRecent.error) throw new Error(rRecent.error.message);
        if (idx.error) throw new Error(idx.error.message);

        setSnap({
          memberCount: mc.count ?? 0,
          purchases: (pAll.data ?? []).map((r: any) => ({
            user: r.user, nodeId: r.node_id, amount: r.amount, paidAt: r.paid_at, txHash: r.tx_hash,
          })),
          referrerCount: rc.count ?? 0,
          recentBinds: (rRecent.data ?? []).map((r: any) => ({
            user: r.user, referrer: r.referrer, boundAt: r.bound_at,
          })),
          indexer: (idx.data ?? []).map((r: any) => ({
            contract: r.contract, lastBlock: Number(r.last_block), updatedAt: r.updated_at,
          })),
          chainHead: head,
        });
      } catch (e: any) {
        setError(e?.message ?? "加载失败");
      }
    })();
  }, []);

  const totalUsdt = useMemo(() => {
    if (!snap) return 0n;
    return snap.purchases.reduce((acc, p) => acc + BigInt(p.amount), 0n);
  }, [snap]);

  const tierStats = useMemo(() => {
    const out: Record<number, { count: number; usdt: bigint }> = {};
    for (const k of Object.keys(TIER_META)) out[Number(k)] = { count: 0, usdt: 0n };
    if (snap) {
      for (const p of snap.purchases) {
        const s = out[p.nodeId];
        if (!s) continue;
        s.count++;
        s.usdt += BigInt(p.amount);
      }
    }
    return out;
  }, [snap]);

  // Worst (highest) lag across the two indexed contracts.
  const indexerLagBlocks = useMemo(() => {
    if (!snap?.chainHead || snap.indexer.length === 0) return null;
    return Math.max(...snap.indexer.map((s) => snap.chainHead! - s.lastBlock));
  }, [snap]);

  const isLoading = !snap && !error;

  return (
    <PageShell
      title="仪表盘总览"
      subtitle={`Dashboard · chain ${adminChainId} · ${adminChainId === 56 ? "BSC Mainnet" : "BSC Testnet"}`}
    >
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> 加载中…
        </div>
      ) : snap && (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <Link href="/members">
              <StatsCard title="总会员" value={snap.memberCount ?? 0} subtitle="rune_members 行数" icon={Users} color="#fbbf24" />
            </Link>
            <Link href="/orders">
              <StatsCard title="总订单 (节点)" value={snap.purchases.length} subtitle="rune_purchases 行数" icon={ShoppingCart} color="#34d399" />
            </Link>
            <StatsCard
              title="累计入金 USDT"
              value={fmtUsdt18(totalUsdt.toString(), 0)}
              subtitle="所有节点付款总和"
              icon={Coins}
              color="#60a5fa"
            />
            <Link href="/referrals">
              <StatsCard title="推荐绑定" value={snap.referrerCount ?? 0} subtitle="rune_referrers 行数" icon={GitBranch} color="#c084fc" />
            </Link>
            <Link href="/system-health">
              <StatsCard
                title="索引器滞后"
                value={indexerLagBlocks != null ? `${indexerLagBlocks} 块` : "—"}
                subtitle={snap.chainHead ? `链头 ${snap.chainHead.toLocaleString()}` : "RPC 不可达"}
                icon={HeartPulse}
                color={indexerLagBlocks != null && indexerLagBlocks > 100 ? "#f87171" : "#34d399"}
              />
            </Link>
          </div>

          {/* Tier distribution */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-4 lg:p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Server className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-foreground">5 档节点分布</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {Object.entries(TIER_META).map(([id, m]) => {
                const s = tierStats[Number(id)];
                return (
                  <div key={id} className="rounded-xl border border-border/40 bg-card/30 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{id}</span>
                      <span className="text-[11px] tabular-nums text-muted-foreground">{m.price.toLocaleString()} U</span>
                    </div>
                    <div className="text-sm font-semibold text-foreground" style={{ color: m.color }}>{m.name}</div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold tabular-nums" style={{ color: m.color }}>{s.count}</span>
                      <span className="text-[11px] text-muted-foreground">笔</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                      {fmtUsdt18(s.usdt.toString(), 0)} USDT
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ActivityCard
              title="最近 5 笔购节点"
              icon={ShoppingCart}
              items={snap.purchases.slice(0, 5).map((p) => ({
                primary: `${p.user.slice(0, 8)}…${p.user.slice(-6)}`,
                badge: String(p.nodeId),
                value: `${fmtUsdt18(p.amount, 0)} USDT`,
                time: new Date(p.paidAt).toLocaleString("sv"),
                href: "/orders",
              }))}
            />
            <ActivityCard
              title="最近 5 条绑定"
              icon={GitBranch}
              items={snap.recentBinds.map((b) => ({
                primary: `${b.user.slice(0, 8)}…${b.user.slice(-6)}`,
                badge: "→",
                value: `${b.referrer.slice(0, 8)}…${b.referrer.slice(-6)}`,
                time: new Date(b.boundAt).toLocaleString("sv"),
                href: "/referrals",
              }))}
            />
          </div>

          {/* Indexer cursor */}
          {snap.indexer.length > 0 && (
            <div className="mt-6 rounded-2xl border border-border/60 bg-card/40 p-4 lg:p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-foreground">索引器游标</h3>
                {snap.chainHead && (
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    链头: {snap.chainHead.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="space-y-1 text-xs">
                {snap.indexer.map((c) => {
                  const lag = snap.chainHead ? snap.chainHead - c.lastBlock : null;
                  return (
                    <div key={c.contract} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                      <span className="font-mono text-foreground/85">{c.contract}</span>
                      <span className="tabular-nums text-muted-foreground">
                        @ {c.lastBlock.toLocaleString()}
                        {lag != null && (
                          <span className={`ml-2 ${lag > 100 ? "text-red-400" : "text-emerald-400"}`}>
                            (滞后 {lag} 块)
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}

function ActivityCard({ title, icon: Icon, items }: {
  title: string;
  icon: typeof Users;
  items: Array<{ primary: string; badge: string; value: string; time: string; href: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4 lg:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-6">暂无数据</p>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => (
            <Link key={i} href={it.href}>
              <div className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0 hover:bg-muted/20 px-1 -mx-1 rounded cursor-pointer">
                <span className="font-mono text-[11px] text-foreground/85 truncate flex-1">{it.primary}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                  {it.badge}
                </span>
                <span className="text-[11px] tabular-nums text-foreground/85 shrink-0 max-w-[120px] truncate">{it.value}</span>
                <span className="text-[10px] text-muted-foreground shrink-0 hidden lg:block">{it.time}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
