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
  /* Six independent slices so the dashboard reveals progressively as
   * each query lands instead of waiting for the slowest. KPIs that
   * depend on data render `…` (or a tiny spinner) until ready. */
  const [memberCount, setMemberCount]   = useState<number | null>(null);
  const [referrerCount, setReferrerCount] = useState<number | null>(null);
  const [purchases, setPurchases]       = useState<SnapshotState["purchases"] | null>(null);
  const [recentBinds, setRecentBinds]   = useState<SnapshotState["recentBinds"] | null>(null);
  const [indexer, setIndexer]           = useState<SnapshotState["indexer"] | null>(null);
  const [chainHead, setChainHead]       = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const setIfActive = <T,>(setter: (v: T) => void) => (v: T) => { if (active) setter(v); };
    const setErr = (msg: string) => { if (active) setError((cur) => cur ?? msg); };

    // Six independent fetches — fire-and-update, no await chain. Each
    // stores into its own slice so render reflects partial data.
    void supabase.from("rune_members").select("user", { count: "exact", head: true }).eq("chain_id", adminChainId)
      .then((r) => { if (r.error) setErr(r.error.message); else setIfActive(setMemberCount)(r.count ?? 0); });

    void supabase.from("rune_referrers").select("user", { count: "exact", head: true }).eq("chain_id", adminChainId)
      .then((r) => { if (r.error) setErr(r.error.message); else setIfActive(setReferrerCount)(r.count ?? 0); });

    void supabase.from("rune_purchases")
      .select("user, node_id, amount::text, paid_at, tx_hash")
      .eq("chain_id", adminChainId)
      .order("block_number", { ascending: false })
      .limit(2000)
      .then((r) => {
        if (r.error) { setErr(r.error.message); return; }
        setIfActive(setPurchases)((r.data ?? []).map((x: any) => ({
          user: x.user, nodeId: x.node_id, amount: x.amount, paidAt: x.paid_at, txHash: x.tx_hash,
        })));
      });

    void supabase.from("rune_referrers")
      .select("user, referrer, bound_at")
      .eq("chain_id", adminChainId)
      .order("bound_at", { ascending: false })
      .limit(5)
      .then((r) => {
        if (r.error) { setErr(r.error.message); return; }
        setIfActive(setRecentBinds)((r.data ?? []).map((x: any) => ({
          user: x.user, referrer: x.referrer, boundAt: x.bound_at,
        })));
      });

    void supabase.from("rune_indexer_state")
      .select("contract, last_block::text, updated_at")
      .eq("chain_id", adminChainId)
      .then((r) => {
        if (r.error) { setErr(r.error.message); return; }
        setIfActive(setIndexer)((r.data ?? []).map((x: any) => ({
          contract: x.contract, lastBlock: Number(x.last_block), updatedAt: x.updated_at,
        })));
      });

    void fetchChainHead().then((h) => setIfActive(setChainHead)(h));

    return () => { active = false; };
  }, []);

  const snap: SnapshotState = {
    memberCount,
    purchases: purchases ?? [],
    referrerCount,
    recentBinds: recentBinds ?? [],
    indexer: indexer ?? [],
    chainHead,
  };

  const totalUsdt = useMemo(() => {
    if (!purchases) return 0n;
    return purchases.reduce((acc, p) => acc + BigInt(p.amount), 0n);
  }, [purchases]);

  const tierStats = useMemo(() => {
    const out: Record<number, { count: number; usdt: bigint }> = {};
    for (const k of Object.keys(TIER_META)) out[Number(k)] = { count: 0, usdt: 0n };
    for (const p of purchases ?? []) {
      const s = out[p.nodeId];
      if (!s) continue;
      s.count++;
      s.usdt += BigInt(p.amount);
    }
    return out;
  }, [purchases]);

  const indexerLagBlocks = useMemo(() => {
    if (chainHead == null || !indexer || indexer.length === 0) return null;
    return Math.max(...indexer.map((s) => chainHead - s.lastBlock));
  }, [chainHead, indexer]);

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

      {/* Always render the layout — slices fill in as queries land. */}
      <>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <Link href="/members">
            <StatsCard title="总会员" value={memberCount ?? "…"} subtitle="rune_members 行数" icon={Users} color="#fbbf24" />
          </Link>
          <Link href="/orders">
            <StatsCard title="总订单 (节点)" value={purchases ? purchases.length : "…"} subtitle="rune_purchases 行数" icon={ShoppingCart} color="#34d399" />
          </Link>
          <StatsCard
            title="累计入金 USDT"
            value={purchases ? fmtUsdt18(totalUsdt.toString(), 0) : "…"}
            subtitle="所有节点付款总和"
            icon={Coins}
            color="#60a5fa"
          />
          <Link href="/referrals">
            <StatsCard title="推荐绑定" value={referrerCount ?? "…"} subtitle="rune_referrers 行数" icon={GitBranch} color="#c084fc" />
          </Link>
          <Link href="/system-health">
            <StatsCard
              title="索引器滞后"
              value={indexerLagBlocks != null ? `${indexerLagBlocks} 块` : (chainHead == null || indexer == null ? "…" : "—")}
              subtitle={chainHead ? `链头 ${chainHead.toLocaleString()}` : (chainHead === null ? "查询 RPC 中…" : "RPC 不可达")}
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
                      <span className="text-2xl font-bold tabular-nums" style={{ color: m.color }}>{purchases ? s.count : "…"}</span>
                      <span className="text-[11px] text-muted-foreground">笔</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                      {purchases ? `${fmtUsdt18(s.usdt.toString(), 0)} USDT` : "—"}
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
              loading={purchases == null}
              items={(purchases ?? []).slice(0, 5).map((p) => ({
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
              loading={recentBinds == null}
              items={(recentBinds ?? []).map((b) => ({
                primary: `${b.user.slice(0, 8)}…${b.user.slice(-6)}`,
                badge: "→",
                value: `${b.referrer.slice(0, 8)}…${b.referrer.slice(-6)}`,
                time: new Date(b.boundAt).toLocaleString("sv"),
                href: "/referrals",
              }))}
            />
          </div>

          {/* Indexer cursor */}
          {indexer && indexer.length > 0 && (
            <div className="mt-6 rounded-2xl border border-border/60 bg-card/40 p-4 lg:p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-foreground">索引器游标</h3>
                {chainHead != null && (
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    链头: {chainHead.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="space-y-1 text-xs">
                {indexer.map((c) => {
                  const lag = chainHead != null ? chainHead - c.lastBlock : null;
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
    </PageShell>
  );
}

function ActivityCard({ title, icon: Icon, items, loading }: {
  title: string;
  icon: typeof Users;
  items: Array<{ primary: string; badge: string; value: string; time: string; href: string }>;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4 lg:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />}
      </div>
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-7 rounded bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
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
