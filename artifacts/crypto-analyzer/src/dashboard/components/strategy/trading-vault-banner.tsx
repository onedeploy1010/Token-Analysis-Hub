import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { BarChart2, TrendingUp, Zap, Shield, RefreshCw, Activity } from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import { VaultCalendar } from "./vault-calendar";
import { usePoolStatsRune } from "@dashboard/lib/data-rune";

/* ── Animated number that jitters in a range ── */
function FlickerRate({ min, max, decimals = 1, suffix = "%" }: {
  min: number; max: number; decimals?: number; suffix?: string;
}) {
  const [val, setVal] = useState((min + max) / 2);
  const ref = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => {
    ref.current = setInterval(() => {
      const next = min + Math.random() * (max - min);
      setVal(next);
    }, 1800 + Math.random() * 1200);
    return () => clearInterval(ref.current);
  }, [min, max]);
  return <>{val.toFixed(decimals)}{suffix}</>;
}

/* ── Animated count-up ── */
function CountUp({ target, prefix = "", suffix = "", decimals = 0, duration = 1000 }: {
  target: number; prefix?: string; suffix?: string; decimals?: number; duration?: number;
}) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(target * ease);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <>{prefix}{val.toFixed(decimals)}{suffix}</>;
}

/* ── Simulated monthly performance data (20–40%) ── */
function buildPerf() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months.map((m, i) => ({
    month: m,
    rate: +(20 + Math.abs(Math.sin(i * 0.9 + 1.2)) * 20).toFixed(1),
  }));
}
const PERF_DATA = buildPerf();

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-[11px]"
      style={{ background: "rgba(10,8,4,0.95)", border: "1px solid rgba(59,130,246,0.25)" }}>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-bold text-blue-300">{payload[0].value}%</div>
    </div>
  );
};

export function TradingVaultBanner() {
  const { t } = useTranslation();

  // Pool data sources from RUNE on-chain `rune_purchases` (via Supabase),
  // not the dead TAICLAW api-server. balance = 45% slice of total deposits.
  const { data, isLoading } = usePoolStatsRune();

  const balance    = data?.managedPool ?? 0;
  const totalDeposits = data?.totalDepositUsdt ?? 0;

  const fmtUsd = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000)     return `$${(v / 1_000).toFixed(2)}K`;
    return `$${v.toFixed(2)}`;
  };

  const STATS = [
    {
      icon: TrendingUp,
      colorClass: "text-blue-400",
      bgClass: "bg-blue-500/[0.06] ring-blue-500/25",
      label: t("strategy.banner.monthlyReturn"),
      value: <FlickerRate min={20} max={40} decimals={1} suffix="%" />,
      sub: t("strategy.banner.monthlyReturnSub"),
    },
    {
      icon: Zap,
      colorClass: "text-primary",
      bgClass: "bg-primary/[0.06] ring-primary/25",
      label: t("strategy.banner.totalAum"),
      value: isLoading ? "—" : <CountUp target={balance} prefix="$" decimals={2} />,
      sub: t("strategy.banner.totalAumSub"),
    },
    {
      icon: Activity,
      colorClass: "text-purple-400",
      bgClass: "bg-purple-500/[0.06] ring-purple-500/25",
      label: t("strategy.banner.annualEst"),
      value: <><FlickerRate min={240} max={480} decimals={0} suffix="%" /></>,
      sub: t("strategy.banner.annualEstSub"),
    },
    {
      icon: Shield,
      colorClass: "text-emerald-400",
      bgClass: "bg-emerald-500/[0.06] ring-emerald-500/25",
      label: t("strategy.banner.status"),
      value: t("strategy.banner.statusValue"),
      sub: t("strategy.banner.statusSub"),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="relative mx-4 lg:mx-0 rounded-2xl overflow-hidden border border-border/60 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]"
    >
      {/* Ambient blue glow */}
      <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-blue-500/[0.18] blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-blue-600/[0.08] blur-[70px]" />

      {/* Top accent line — blue→amber→blue gradient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 via-50% to-transparent" />
      <div className="pointer-events-none absolute inset-x-1/4 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="relative p-4 space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500/25 to-blue-500/10 ring-1 ring-blue-500/40 shadow-[0_4px_12px_-4px_hsl(217_76%_58%/0.4)]">
              <BarChart2 className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-bold leading-tight text-foreground tracking-tight">
                {t("strategy.banner.title")}
              </div>
              <div className="text-[11px] text-muted-foreground/80 leading-tight mt-0.5">
                {t("strategy.banner.subtitle")}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-40 animate-ping" />
              <span className="relative inline-flex h-full w-full rounded-full bg-blue-400" />
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-blue-400">
              {t("strategy.banner.live")}
            </span>
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STATS.map(({ icon: Icon, colorClass, bgClass, label, value, sub }) => (
            <div key={label} className={`rounded-xl px-3 py-2.5 ring-1 ${bgClass}`}>
              <Icon className={`h-3.5 w-3.5 mb-1.5 ${colorClass}`} />
              <div className={`text-[15px] font-black tabular-nums leading-none ${colorClass}`}>
                {value}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 leading-tight">{label}</div>
              <div className={`text-[9px] mt-0.5 opacity-75 ${colorClass}`}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Monthly performance area chart */}
        <div className="rounded-xl px-3 pt-3 pb-2 bg-blue-500/[0.04] ring-1 ring-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {t("strategy.banner.trendTitle")}
            </span>
            <span className="text-[10px] font-semibold text-blue-400">
              {t("strategy.banner.trendBadge")}
            </span>
          </div>
          <div style={{ height: 90 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={PERF_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month"
                  tick={{ fontSize: 8.5, fill: "rgba(255,255,255,0.32)", fontFamily: "monospace" }}
                  axisLine={false} tickLine={false} />
                <YAxis domain={[0, 50]}
                  tick={{ fontSize: 8, fill: "rgba(255,255,255,0.28)", fontFamily: "monospace" }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(59,130,246,0.2)", strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#tvGrad)"
                  dot={{ r: 2.5, fill: "#3b82f6", strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: "#60a5fa", strokeWidth: 0 }}
                  animationDuration={1200}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Range labels */}
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
            <span className="text-yellow-400/80">▼ 20% {t("strategy.banner.floor")}</span>
            <span className="text-blue-400/80">▲ 40% {t("strategy.banner.ceiling")}</span>
          </div>
        </div>

        {/* AI Quant Calendar */}
        <VaultCalendar />

        {/* Footer note */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
          <RefreshCw className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {t("strategy.banner.footerFormula", {
              total: fmtUsd(totalDeposits),
              vault: fmtUsd(balance),
              defaultValue: `Total deposits ${fmtUsd(totalDeposits)} × 45% = Trading vault ${fmtUsd(balance)} · Activates after node recruitment ends`,
            })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
