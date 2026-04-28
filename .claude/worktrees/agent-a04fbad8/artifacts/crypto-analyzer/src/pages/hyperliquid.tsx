import { useState } from "react";
import { motion } from "framer-motion";
import {
  ComposedChart, Bar, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, TrendingUp, TrendingDown, BarChart2,
  Wallet, Activity, Clock, Users, ExternalLink,
} from "lucide-react";
import { Link, useRoute } from "wouter";
import { useHLVault, useHLCandles, HL_TRACKED_VAULTS } from "@/hooks/use-hyperliquid";
import { useShowZh } from "@/contexts/language-context";

// ─── Constants ────────────────────────────────────────────────────────────────
const VAULT_LABELS: Record<string, { zh: string; en: string }> = {
  "0xc179e03922afe8fa9533d3f896338b9fb87ce0c8": { zh: "金库 A · Alpha", en: "Vault A · Alpha" },
  "0xd6e56265890b76413d1d527eb9b75e334c0c5b42": { zh: "金库 B · Beta",  en: "Vault B · Beta"  },
};

const INTERVAL_OPTIONS = [
  { label: "1H", value: "1h" },
  { label: "4H", value: "4h" },
  { label: "1D", value: "1d" },
  { label: "1W", value: "1w" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number, d = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtM(n: number) {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}
function fmtDate(ts: number, withTime = false) {
  const d = new Date(ts);
  return withTime
    ? d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}
function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ─── Tooltip style ────────────────────────────────────────────────────────────
const TT = {
  contentStyle: {
    background: "hsl(230,30%,8%)", border: "1px solid hsl(217,30%,22%)",
    borderRadius: 8, fontSize: 12,
  },
  labelStyle: { color: "hsl(217,20%,70%)", marginBottom: 4 },
  cursor: { fill: "hsl(217,80%,58%,0.06)" },
};

// ─── Candle bar shape ─────────────────────────────────────────────────────────
interface CandlePayload {
  ts: number;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

function CandleShape(props: {
  x?: number; y?: number; width?: number; height?: number;
  payload?: CandlePayload;
}) {
  const { x = 0, y = 0, width = 0, payload } = props;
  if (!payload) return null;
  const { open, close, high, low } = payload;
  const isUp = close >= open;
  const color = isUp ? "hsl(142,70%,45%)" : "hsl(0,75%,55%)";

  return (
    <g>
      <line
        x1={x + width / 2} y1={y}
        x2={x + width / 2} y2={y + Math.abs(high - low) * 20}
        stroke={color} strokeWidth={1}
      />
      <rect
        x={x + 1} y={y}
        width={Math.max(width - 2, 1)}
        height={Math.max(Math.abs(close - open) * 10, 1)}
        fill={color} fillOpacity={isUp ? 0.85 : 1}
        rx={1}
      />
    </g>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HyperLiquid() {
  const showZh = useShowZh();
  const [, params] = useRoute<{ address?: string }>("/projects/hyperliquid/:address");
  const routeAddr = params?.address?.toLowerCase();
  const VAULT_ADDRESS =
    routeAddr && HL_TRACKED_VAULTS.includes(routeAddr as (typeof HL_TRACKED_VAULTS)[number])
      ? routeAddr
      : HL_TRACKED_VAULTS[0];
  const vaultLabel = VAULT_LABELS[VAULT_ADDRESS] ?? { zh: "金库", en: "Vault" };
  const { data: vault, isLoading: vaultLoading } = useHLVault(VAULT_ADDRESS);
  const [interval, setInterval] = useState("1d");
  const { data: candleData, isLoading: candleLoading } = useHLCandles(interval);

  const candles = candleData?.candles ?? [];

  const chartCandles = candles.map(c => ({
    ...c,
    date: fmtDate(c.ts, interval === "1h" || interval === "4h"),
    isUp: c.close >= c.open,
    bodySize: Math.abs(c.close - c.open),
  }));

  const equityChart = (vault?.equityHistory ?? []).map(h => ({
    date: fmtDate(h.ts),
    equity: h.value,
  }));

  const pnlChart = (vault?.pnlHistory ?? []).map(h => ({
    date: fmtDate(h.ts),
    pnl: h.value,
  }));

  const aprPct = vault ? (vault.apr * 100) : 0;

  const currentPrice = candles.at(-1)?.close ?? 0;
  const prevPrice    = candles.at(-2)?.close ?? 0;
  const priceChange  = prevPrice ? ((currentPrice - prevPrice) / prevPrice) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-10">

      {/* Back link + vault switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /><span className="zh-only">返回项目库 · </span>Back to Projects
        </Link>
        <div className="inline-flex items-center gap-1 rounded-full border border-green-500/25 bg-background/50 p-1 text-xs backdrop-blur self-start sm:self-auto">
          {HL_TRACKED_VAULTS.map((addr) => {
            const active = addr === VAULT_ADDRESS;
            const label = VAULT_LABELS[addr];
            return (
              <Link
                key={addr}
                href={`/projects/hyperliquid/${addr}`}
                className={`rounded-full px-3 py-1 font-mono tabular-nums transition-all ${
                  active
                    ? "bg-green-500/20 text-green-300 shadow-[inset_0_0_0_1px_rgba(34,197,94,0.4)]"
                    : "text-muted-foreground/65 hover:text-green-300/80"
                }`}
              >
                {showZh ? label.zh : label.en}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Hero Banner ── */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md px-6 py-8 md:px-10 shadow-[0_8px_40px_rgba(0,0,0,0.45)]">

        {/* Backgrounds */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/8 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-28 -right-28 w-72 h-72 bg-green-500/10 rounded-full blur-[90px] pointer-events-none animate-orb-drift" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-blue-500/8 rounded-full blur-[60px] pointer-events-none animate-float-y" />
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-400/25 to-transparent animate-scan-line pointer-events-none" style={{ top: 0 }} />

        {/* Corners */}
        <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-green-500/40 rounded-tl pointer-events-none" />
        <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-green-500/40 rounded-tr pointer-events-none" />
        <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-green-500/40 rounded-bl pointer-events-none" />
        <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-green-500/40 rounded-br pointer-events-none" />

        <div className="relative z-10">
          {/* Logo + title */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 rounded-xl border border-green-500/30 shadow-[0_0_24px_rgba(34,197,94,0.2)] shrink-0 bg-black flex items-center justify-center">
              <span className="text-2xl font-black text-green-400 tracking-tighter">HL</span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-green-400/70 block mb-1">
                <span className="zh-only">金库实时数据 · </span>Live Vault Intelligence
              </span>
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                {vault?.name || (showZh ? vaultLabel.zh : vaultLabel.en)}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 tracking-wide">
                Hyperliquid Vault<span className="zh-only"> · 链上永续合约做市金库</span>
              </p>
              {/* Vault address */}
              <div className="mt-2 inline-flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-muted/30 border border-border/50 rounded-lg px-3 py-1">
                  <Wallet className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="font-mono text-xs text-muted-foreground hidden sm:block">{VAULT_ADDRESS}</span>
                  <span className="font-mono text-xs text-muted-foreground sm:hidden">{shortAddr(VAULT_ADDRESS)}</span>
                  <a href={`https://app.hyperliquid.xyz/vaults/${VAULT_ADDRESS}`} target="_blank" rel="noopener noreferrer"
                    className="text-green-400/70 hover:text-green-400 transition-colors ml-1">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-400 bg-green-500/10">
                  {vault?.isClosed ? (showZh ? "已关闭" : "Closed") : (showZh ? "运行中" : "Active")}
                </Badge>
              </div>
            </div>
          </div>

          {/* Stat strip */}
          {vaultLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-border/30">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : vault ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-border/30">
              <div className="space-y-1">
                <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/55 font-medium">TVL<span className="zh-only"> / 总锁仓</span></div>
                <div className="text-2xl font-bold num text-foreground">{fmtM(vault.latestEquity)}</div>
                {showZh && <div className="text-[10px] text-muted-foreground/70">金库总价值</div>}
              </div>
              <div className="space-y-1">
                <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/55 font-medium">APR<span className="zh-only"> / 年化</span></div>
                <div className={`text-2xl font-bold ${aprPct >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {aprPct >= 0 ? "+" : ""}{fmt(aprPct, 2)}%
                </div>
                {showZh && <div className="text-[10px] text-muted-foreground/70">实时年化收益率</div>}
              </div>
              <div className="space-y-1">
                <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/55 font-medium">All-Time PnL</div>
                <div className={`text-2xl font-bold num ${vault.allTimePnl >= 0 ? "num-gold" : "text-red-400"}`}>
                  {vault.allTimePnl >= 0 ? "+" : ""}{fmtM(vault.allTimePnl)}
                </div>
                {showZh && <div className="text-[10px] text-muted-foreground/70">历史累计盈亏</div>}
              </div>
              <div className="space-y-1">
                <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/55 font-medium">Followers</div>
                <div className="text-2xl font-bold text-foreground">{vault.followers.toLocaleString()}</div>
                {showZh && <div className="text-[10px] text-muted-foreground/70">跟单用户数</div>}
              </div>
            </div>
          ) : null}
        </div>
      </motion.div>

      {/* ── PnL Summary Cards ── */}
      {vault && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "今日盈亏", labelEn: "Day PnL",   value: vault.dayPnl,   },
            { label: "本周盈亏", labelEn: "Week PnL",  value: vault.weekPnl,  },
            { label: "本月盈亏", labelEn: "Month PnL", value: vault.monthPnl, },
            { label: "历史盈亏", labelEn: "All-Time",  value: vault.allTimePnl },
          ].map(({ label, labelEn, value }) => {
            const up = value >= 0;
            return (
              <div key={labelEn} className={`p-4 rounded-xl border ${up ? "border-green-800/40 bg-green-950/20" : "border-red-900/40 bg-red-950/20"}`}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{labelEn}{showZh && ` · ${label}`}</p>
                <p className={`font-mono text-lg font-bold ${up ? "text-green-400" : "text-red-400"}`}>
                  {up ? "+" : ""}{fmtM(value)}
                </p>
                <div className={`flex items-center gap-1 mt-1 ${up ? "text-green-500" : "text-red-500"}`}>
                  {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span className="text-[10px] zh-only">{up ? "盈利" : "亏损"}</span>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* ── Analysis Section ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.15 }}
        className="space-y-8">

        <div className="border-b border-border/40 pb-4">
          <div className="border-l-[3px] border-green-500 pl-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-green-500/60 block mb-0.5 zh-only">市场数据</span>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Market Intelligence</h2>
            {showZh && <p className="text-xs text-muted-foreground mt-0.5">HYPE价格K线 · 金库规模 · 累计盈亏走势</p>}
          </div>
        </div>

        {/* Row 1: HYPE K-line chart */}
        <Card className="bg-card/80 backdrop-blur border-border shadow-sm overflow-hidden border-t-2 border-t-green-500/50">
          <CardHeader className="pb-2 border-b border-border/40">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                <BarChart2 className="h-4 w-4 text-green-400 shrink-0" />
                <span>HYPE<span className="zh-only"> 价格走势</span></span>
                <span className="text-xs text-muted-foreground font-normal">Price Chart</span>
                {currentPrice > 0 && (
                  <span className="font-mono font-bold text-foreground">${fmt(currentPrice)}</span>
                )}
                {priceChange !== 0 && (
                  <span className={`text-xs font-mono ${priceChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {priceChange >= 0 ? "+" : ""}{fmt(priceChange, 2)}%
                  </span>
                )}
              </CardTitle>
              {/* Interval selector */}
              <div className="flex gap-1 self-start sm:self-auto">
                {INTERVAL_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setInterval(opt.value)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${interval === opt.value ? "bg-green-500/20 text-green-400 border border-green-500/40" : "text-muted-foreground hover:text-foreground border border-transparent hover:border-border/50"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 pb-2">
            {candleLoading ? (
              <Skeleton className="h-[220px] sm:h-[300px] w-full" />
            ) : chartCandles.length > 0 ? (
              <ResponsiveContainer width="100%" height={typeof window !== "undefined" && window.innerWidth < 640 ? 220 : 300}>
                <ComposedChart data={chartCandles} margin={{ top: 4, right: 12, left: -8, bottom: 4 }}>
                  <defs>
                    <linearGradient id="hlCloseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(142,70%,45%)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(142,70%,45%)" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,30%,18%)" />
                  <XAxis dataKey="date" tick={{ fill: "hsl(217,20%,40%)", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: "hsl(217,20%,40%)", fontSize: 10 }} axisLine={false} tickLine={false}
                    domain={["auto", "auto"]} tickFormatter={v => `$${v}`} width={52} />
                  <Tooltip {...TT}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.[0]) return null;
                      const d = payload[0].payload as typeof chartCandles[0];
                      return (
                        <div style={TT.contentStyle} className="space-y-1 p-3">
                          <p style={TT.labelStyle} className="mb-2">{label}</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                            <span className="text-muted-foreground"><span className="zh-only">开盘 · </span>Open</span><span className="font-mono font-medium">${fmt(d.open)}</span>
                            <span className="text-muted-foreground"><span className="zh-only">收盘 · </span>Close</span>
                            <span className={`font-mono font-bold ${d.isUp ? "text-green-400" : "text-red-400"}`}>${fmt(d.close)}</span>
                            <span className="text-muted-foreground"><span className="zh-only">最高 · </span>High</span><span className="font-mono font-medium text-green-400">${fmt(d.high)}</span>
                            <span className="text-muted-foreground"><span className="zh-only">最低 · </span>Low</span><span className="font-mono font-medium text-red-400">${fmt(d.low)}</span>
                            <span className="text-muted-foreground"><span className="zh-only">成交量 · </span>Vol</span><span className="font-mono">{(d.volume/1e6).toFixed(2)}M</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  {/* Close price area */}
                  <Area type="monotone" dataKey="close" stroke="hsl(142,70%,45%)" strokeWidth={2}
                    fill="url(#hlCloseGrad)" dot={false} name={(showZh ? "收盘价" : "Close")} />
                  {/* Volume bars at bottom (scaled down visually) */}
                  <Bar dataKey="volume" yAxisId="vol" name={(showZh ? "成交量" : "Volume")} maxBarSize={8} opacity={0.35}
                    radius={[2, 2, 0, 0]}>
                    {chartCandles.map((c, i) => (
                      <Cell key={i} fill={c.isUp ? "hsl(142,70%,45%)" : "hsl(0,75%,55%)"} />
                    ))}
                  </Bar>
                  <YAxis yAxisId="vol" hide domain={[0, (max: number) => max * 8]} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">{showZh ? "暂无数据" : "No data"}</div>
            )}
          </CardContent>
        </Card>

        {/* Row 2: Vault Equity + PnL */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Vault Equity over time */}
          <Card className="bg-card/80 backdrop-blur border-border shadow-sm overflow-hidden border-t-2 border-t-blue-500/50">
            <CardHeader className="pb-2 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-400" />
                <span className="zh-only">金库规模走势</span>
                <span className="text-xs text-muted-foreground font-normal">Vault Equity</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
              {vaultLoading ? <Skeleton className="h-[220px] w-full" /> : equityChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={equityChart} margin={{ top: 4, right: 12, left: -8, bottom: 4 }}>
                    <defs>
                      <linearGradient id="hlEquityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="hsl(217,80%,58%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(217,80%,58%)" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,30%,18%)" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(217,20%,40%)", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: "hsl(217,20%,40%)", fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={v => `$${(v / 1e6).toFixed(0)}M`} width={52} />
                    <Tooltip {...TT} formatter={(v: number) => [fmtM(v), (showZh ? "金库规模" : "Vault Size")]} />
                    <Area type="monotone" dataKey="equity" stroke="hsl(217,80%,58%)" strokeWidth={2}
                      fill="url(#hlEquityGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <Skeleton className="h-[220px] w-full" />}
            </CardContent>
          </Card>

          {/* All-time PnL */}
          <Card className="bg-card/80 backdrop-blur border-border shadow-sm overflow-hidden border-t-2 border-t-amber-500/50">
            <CardHeader className="pb-2 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-400" />
                <span className="zh-only">历史累计盈亏</span>
                <span className="text-xs text-muted-foreground font-normal">All-Time PnL</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
              {vaultLoading ? <Skeleton className="h-[220px] w-full" /> : pnlChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={pnlChart} margin={{ top: 4, right: 12, left: -8, bottom: 4 }}>
                    <defs>
                      <linearGradient id="hlPnlGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="hsl(38,92%,50%)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="hsl(38,92%,50%)" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,30%,18%)" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(217,20%,40%)", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: "hsl(217,20%,40%)", fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={v => `$${(v / 1e6).toFixed(0)}M`} width={52} />
                    <Tooltip {...TT} formatter={(v: number) => [fmtM(v), (showZh ? "累计盈亏" : "Cumulative PnL")]} />
                    <ReferenceLine y={0} stroke="hsl(217,20%,40%)" strokeDasharray="3 3" />
                    <Area type="monotone" dataKey="pnl" stroke="hsl(38,92%,50%)" strokeWidth={2}
                      fill="url(#hlPnlGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <Skeleton className="h-[220px] w-full" />}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ── Vault Info Table ── */}
      {vault && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.25 }}
          className="space-y-6">

          <div className="border-b border-border/40 pb-4">
            <div className="border-l-[3px] border-green-500 pl-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-green-500/60 block mb-0.5 zh-only">基本信息</span>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Vault Details</h2>
              {showZh && <p className="text-xs text-muted-foreground mt-0.5">合约地址 · 管理员 · 参数配置</p>}
            </div>
          </div>

          <Card className="bg-card/80 backdrop-blur border-border shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    { label: "合约地址",    labelEn: "Vault Address",  value: VAULT_ADDRESS,       mono: true,  isAddr: true, link: `https://app.hyperliquid.xyz/vaults/${VAULT_ADDRESS}` },
                    { label: "管理员地址",  labelEn: "Leader",         value: vault.leader,         mono: true,  isAddr: true, link: `https://app.hyperliquid.xyz/profile/${vault.leader}` },
                    { label: "管理员份额",  labelEn: "Leader Fraction",value: `${(vault.leaderFraction * 100).toFixed(1)}%`, mono: false },
                    { label: "管理员佣金",  labelEn: "Commission",     value: `${(vault.leaderCommission * 100).toFixed(1)}%`, mono: false },
                    { label: "年化收益率",  labelEn: "APR",            value: `${aprPct >= 0 ? "+" : ""}${fmt(aprPct, 3)}%`, mono: false, highlight: true },
                    { label: "接受存款",    labelEn: "Allow Deposits", value: vault.allowDeposits ? "是 Yes" : "否 No",  mono: false },
                    { label: "跟单人数",    labelEn: "Followers",      value: vault.followers.toLocaleString(), mono: false },
                    { label: "今日盈亏",    labelEn: "Day PnL",        value: (vault.dayPnl >= 0 ? "+" : "") + fmtM(vault.dayPnl), mono: true, highlight: true },
                    { label: "历史累计盈亏",labelEn: "All-Time PnL",   value: (vault.allTimePnl >= 0 ? "+" : "") + fmtM(vault.allTimePnl), mono: true, highlight: true },
                  ].map(({ label, labelEn, value, mono, link, highlight, isAddr }, i) => (
                    <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-3 sm:px-5 text-muted-foreground w-28 sm:w-40 shrink-0">
                        <span className="hidden sm:inline">{labelEn}</span>
                        <span className="sm:hidden text-[11px]">{showZh ? label : labelEn}</span>
                        {showZh && <span className="ml-1.5 text-[10px] opacity-50 hidden sm:inline">{label}</span>}
                      </td>
                      <td className="py-3 px-3 sm:px-5 text-right">
                        {link ? (
                          <a href={link} target="_blank" rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 hover:underline ${mono ? "font-mono" : ""} ${highlight ? "text-green-400 font-semibold" : "text-foreground"}`}>
                            {isAddr ? (
                              <>
                                <span className="hidden sm:inline text-xs">{value}</span>
                                <span className="sm:hidden text-xs">{shortAddr(value)}</span>
                              </>
                            ) : (
                              <span>{value}</span>
                            )}
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                          </a>
                        ) : (
                          <span className={`${mono ? "font-mono" : ""} ${highlight ? "font-semibold" + (value.startsWith("+") ? " text-green-400" : " text-red-400") : "font-medium"}`}>
                            {value}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Description */}
          {vault.description && (
            <div className="p-5 rounded-xl border border-border/40 bg-muted/10 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium flex items-center gap-1.5">
                <Clock className="h-3 w-3" /><span className="zh-only">项目简介 · </span>Description
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">{vault.description}</p>
            </div>
          )}

          {/* Live data note */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-live-ping" />
            <span><span className="zh-only">数据实时同步自 HyperLiquid 公开 API · 每 2 分钟自动刷新</span></span>
            <Users className="h-3 w-3 ml-auto" />
            <span>{vault.followers} {showZh ? "跟单用户" : "followers"}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
