import { useEffect, useState } from "react";
import { PageShell } from "./page-shell";
import { StatsCard } from "@/components/stats-card";
import { supabase, adminChainId } from "@/lib/supabase";
import {
  Loader2, HeartPulse, Server, Database, RefreshCw, Activity,
  CheckCircle2, AlertTriangle, XCircle,
} from "lucide-react";

/**
 * 环境管理 — at-a-glance health of every dependency the panel hits:
 *
 *  • RPC head latency (Goldsky/public RPC)
 *  • Indexer cursor lag — `rune_indexer_state.last_block` vs chain head per
 *    contract, plus `updated_at` skew vs wall clock
 *  • Supabase reachability + key table row counts
 *
 * Auto-refresh every 60s. Pull the trigger manually with the Refresh button
 * to get instant feedback after kicking the indexer / RPC.
 */

const RPC_URL = adminChainId === 56
  ? "https://bsc-dataseed.binance.org"
  : "https://bsc-testnet.publicnode.com";

const POLL_MS = 60_000;

type Status = "ok" | "warn" | "down";

interface IndexerCheck {
  contract: string;
  lastBlock: number;
  updatedAt: string;
  lagBlocks: number | null;
  lagSeconds: number | null;
  status: Status;
}

interface Snapshot {
  rpc: { headBlock: number | null; latencyMs: number | null; status: Status; error?: string };
  supabase: { latencyMs: number | null; status: Status; error?: string };
  indexer: IndexerCheck[];
  counts: { table: string; count: number | null }[];
  fetchedAt: string;
}

const TABLES_TO_COUNT = [
  "rune_members",
  "rune_referrers",
  "rune_purchases",
  "rune_indexer_state",
  "admin_users",
  "system_config",
];

async function pingRpc(): Promise<{ headBlock: number | null; latencyMs: number; error?: string }> {
  const t0 = performance.now();
  try {
    const r = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
    });
    const j = await r.json();
    const ms = Math.round(performance.now() - t0);
    if (!j?.result) return { headBlock: null, latencyMs: ms, error: "RPC 返回 result 为空" };
    return { headBlock: parseInt(j.result, 16), latencyMs: ms };
  } catch (e: any) {
    return { headBlock: null, latencyMs: Math.round(performance.now() - t0), error: e?.message ?? "RPC 请求失败" };
  }
}

async function pingSupabase(): Promise<{ latencyMs: number; error?: string }> {
  const t0 = performance.now();
  try {
    const { error } = await supabase
      .from("rune_indexer_state")
      .select("contract", { count: "exact", head: true })
      .limit(1);
    const ms = Math.round(performance.now() - t0);
    if (error) return { latencyMs: ms, error: error.message };
    return { latencyMs: ms };
  } catch (e: any) {
    return { latencyMs: Math.round(performance.now() - t0), error: e?.message ?? "Supabase 不可达" };
  }
}

function classifyIndexer(lagBlocks: number | null, lagSeconds: number | null): Status {
  if (lagBlocks == null || lagSeconds == null) return "warn";
  // BSC blocks ~3s. 100 blocks ≈ 5min — beyond that the indexer is meaningfully behind.
  if (lagBlocks > 300 || lagSeconds > 1800) return "down";
  if (lagBlocks > 100 || lagSeconds > 600) return "warn";
  return "ok";
}

export default function SystemHealthPage() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      const [rpc, sb, idx] = await Promise.all([
        pingRpc(),
        pingSupabase(),
        supabase
          .from("rune_indexer_state")
          .select("contract, last_block::text, updated_at")
          .eq("chain_id", adminChainId),
      ]);

      const counts = await Promise.all(
        TABLES_TO_COUNT.map(async (t) => {
          const q = supabase.from(t).select("*", { count: "exact", head: true });
          const filtered = t.startsWith("rune_") ? q.eq("chain_id", adminChainId) : q;
          const { count, error } = await filtered;
          if (error) return { table: t, count: null };
          return { table: t, count: count ?? 0 };
        }),
      );

      const nowSec = Math.floor(Date.now() / 1000);
      const indexer: IndexerCheck[] = ((idx.data ?? []) as any[]).map((r) => {
        const lastBlock = Number(r.last_block);
        const lagBlocks = rpc.headBlock != null ? rpc.headBlock - lastBlock : null;
        const updSec = r.updated_at ? Math.floor(new Date(r.updated_at).getTime() / 1000) : null;
        const lagSeconds = updSec != null ? nowSec - updSec : null;
        return {
          contract: r.contract,
          lastBlock,
          updatedAt: r.updated_at,
          lagBlocks,
          lagSeconds,
          status: classifyIndexer(lagBlocks, lagSeconds),
        };
      });

      const rpcStatus: Status = rpc.error ? "down" : (rpc.latencyMs > 1500 ? "warn" : "ok");
      const sbStatus:  Status = sb.error  ? "down" : (sb.latencyMs  > 1500 ? "warn" : "ok");

      setSnap({
        rpc: { headBlock: rpc.headBlock, latencyMs: rpc.latencyMs, status: rpcStatus, error: rpc.error },
        supabase: { latencyMs: sb.latencyMs, status: sbStatus, error: sb.error },
        indexer,
        counts,
        fetchedAt: new Date().toISOString(),
      });
    } catch (e: any) {
      setError(e?.message ?? "刷新失败");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => { void refresh(); }, POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  const overall: Status = !snap ? "warn"
    : (snap.rpc.status === "down" || snap.supabase.status === "down" || snap.indexer.some((i) => i.status === "down")) ? "down"
    : (snap.rpc.status === "warn" || snap.supabase.status === "warn" || snap.indexer.some((i) => i.status === "warn")) ? "warn"
    : "ok";

  return (
    <PageShell
      title="环境管理"
      subtitle={`System Health · chain ${adminChainId} · 自动每 ${POLL_MS / 1000}s 刷新`}
      actions={
        <button
          onClick={() => { void refresh(); }}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card/40 hover:bg-card text-sm disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> 立即刷新
        </button>
      }
    >
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          {error}
        </div>
      )}

      {!snap ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> 探测环境中…
        </div>
      ) : (
        <>
          {/* Overall banner */}
          <div className={`rounded-2xl border p-4 mb-6 flex items-center gap-3 ${
            overall === "ok" ? "border-emerald-500/40 bg-emerald-500/10"
            : overall === "warn" ? "border-amber-500/40 bg-amber-500/10"
            : "border-red-500/40 bg-red-500/10"
          }`}>
            <StatusGlyph status={overall} large />
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-semibold ${
                overall === "ok" ? "text-emerald-300"
                : overall === "warn" ? "text-amber-300"
                : "text-red-400"
              }`}>
                {overall === "ok" ? "全部正常" : overall === "warn" ? "部分降级" : "存在异常"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                最后刷新: {new Date(snap.fetchedAt).toLocaleTimeString("sv")}
              </div>
            </div>
          </div>

          {/* KPI tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatsCard
              title="RPC 头部"
              value={snap.rpc.headBlock != null ? snap.rpc.headBlock.toLocaleString() : "—"}
              subtitle={snap.rpc.error ?? `延迟 ${snap.rpc.latencyMs ?? "—"} ms`}
              icon={Server}
              color={statusColor(snap.rpc.status)}
            />
            <StatsCard
              title="Supabase"
              value={snap.supabase.error ? "失败" : `${snap.supabase.latencyMs} ms`}
              subtitle={snap.supabase.error ?? "已连接"}
              icon={Database}
              color={statusColor(snap.supabase.status)}
            />
            <StatsCard
              title="索引器最大滞后"
              value={
                snap.indexer.length === 0
                  ? "—"
                  : `${Math.max(...snap.indexer.map((i) => i.lagBlocks ?? 0))} 块`
              }
              subtitle={
                snap.indexer.length === 0
                  ? "无索引器记录"
                  : `合约 ${snap.indexer.length} 个`
              }
              icon={Activity}
              color={statusColor(
                snap.indexer.length === 0
                  ? "warn"
                  : snap.indexer.reduce<Status>(
                      (acc, i) => (i.status === "down" ? "down" : acc === "down" ? "down" : i.status === "warn" ? "warn" : acc),
                      "ok",
                    ),
              )}
            />
            <StatsCard
              title="数据表行数"
              value={
                snap.counts.reduce((acc, c) => acc + (c.count ?? 0), 0).toLocaleString()
              }
              subtitle={`共 ${snap.counts.length} 张表`}
              icon={HeartPulse}
              color="#fbbf24"
            />
          </div>

          {/* Indexer per-contract breakdown */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-4 lg:p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-foreground">索引器游标 · rune_indexer_state</h3>
            </div>
            {snap.indexer.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 text-center">没有索引器记录</p>
            ) : (
              <div className="space-y-2">
                {snap.indexer.map((c) => (
                  <div
                    key={c.contract}
                    className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0"
                  >
                    <StatusGlyph status={c.status} />
                    <span className="font-mono text-xs text-foreground/85 flex-1">{c.contract}</span>
                    <span className="text-[11px] tabular-nums text-muted-foreground hidden sm:block">
                      @ {c.lastBlock.toLocaleString()}
                    </span>
                    <span className={`text-[11px] tabular-nums shrink-0 ${
                      c.status === "ok" ? "text-emerald-400"
                      : c.status === "warn" ? "text-amber-300"
                      : "text-red-400"
                    }`}>
                      {c.lagBlocks != null ? `滞后 ${c.lagBlocks} 块` : "—"}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0 hidden lg:block">
                      {c.lagSeconds != null ? `(${formatLag(c.lagSeconds)})` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Table row counts */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-4 lg:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Database className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-foreground">关键表行数</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {snap.counts.map((c) => (
                <div
                  key={c.table}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-card/30 px-3 py-2"
                >
                  <span className="font-mono text-xs text-foreground/85">{c.table}</span>
                  <span className={`text-sm font-semibold tabular-nums ${
                    c.count == null ? "text-red-400" : "text-foreground"
                  }`}>
                    {c.count == null ? "失败" : c.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </PageShell>
  );
}

function statusColor(s: Status): string {
  return s === "ok" ? "#34d399" : s === "warn" ? "#fbbf24" : "#f87171";
}

function StatusGlyph({ status, large }: { status: Status; large?: boolean }) {
  const cls = large ? "h-6 w-6" : "h-4 w-4";
  if (status === "ok") return <CheckCircle2 className={`${cls} text-emerald-400 shrink-0`} />;
  if (status === "warn") return <AlertTriangle className={`${cls} text-amber-300 shrink-0`} />;
  return <XCircle className={`${cls} text-red-400 shrink-0`} />;
}

function formatLag(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m${sec % 60}s`;
  const h = Math.floor(sec / 3600);
  return `${h}h${Math.floor((sec % 3600) / 60)}m`;
}
