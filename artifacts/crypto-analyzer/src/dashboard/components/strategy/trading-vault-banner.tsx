import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart2, TrendingUp, Zap, Shield, RefreshCw, Activity } from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import { VaultCalendar } from "./vault-calendar";
import { usePoolStatsRune } from "@dashboard/lib/data-rune";

/* ── Stable rate display.
 *  Picks a value within [min, max] from a deterministic 12h epoch hash so
 *  every viewer sees the same number for the same 12-hour window — and the
 *  number doesn't twitch every 2 seconds.
 */
const SLOT_MS = 12 * 60 * 60 * 1000;
function epochSlotHash(salt: string) {
  // Cheap deterministic hash of `${salt}:${slot}` → [0, 1).
  const slot = Math.floor(Date.now() / SLOT_MS);
  let h = 2166136261 >>> 0;
  const s = `${salt}:${slot}`;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  }
  return (h % 100000) / 100000;
}
function StableRate({ min, max, decimals = 1, suffix = "%", salt }: {
  min: number; max: number; decimals?: number; suffix?: string; salt: string;
}) {
  const val = min + epochSlotHash(salt) * (max - min);
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

/* ── Simulated monthly performance trend (3.5–6.5%) — deterministic so it
 *  stays consistent on every reload. */
function buildPerf() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months.map((m, i) => ({
    month: m,
    rate: +(3.5 + Math.abs(Math.sin(i * 0.9 + 1.2)) * 3).toFixed(2),
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
      // 4–6% monthly, deterministic per 12h slot.
      value: <StableRate min={4} max={6} decimals={2} suffix="%" salt="monthlyReturn" />,
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
      // Annual ≈ ((1 + monthly)^12 - 1). With monthly 4–6% that's 60–101%.
      value: <StableRate min={60} max={101} decimals={0} suffix="%" salt="annualEst" />,
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-4 lg:mx-0 rounded-3xl overflow-hidden border-2 border-blue-500/40"
      style={{
        background: "linear-gradient(140deg, rgba(8,18,40,0.95) 0%, rgba(20,18,40,0.92) 35%, rgba(40,30,8,0.85) 70%, rgba(8,12,28,0.98) 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(96,165,250,0.30), inset 0 -1px 0 rgba(0,0,0,0.45), 0 14px 40px -12px rgba(59,130,246,0.35), 0 28px 64px -28px rgba(251,191,36,0.18), 0 32px 80px -24px rgba(0,0,0,0.65)",
      }}
    >
      {/* Layered ambient glows — blue + amber dual aurora */}
      <div className="pointer-events-none absolute -top-32 -right-20 h-72 w-72 rounded-full bg-blue-500/[0.30] blur-[100px]" />
      <div className="pointer-events-none absolute -top-20 left-1/3 h-56 w-56 rounded-full bg-amber-500/[0.18] blur-[90px]" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-60 w-60 rounded-full bg-blue-600/[0.18] blur-[80px]" />

      {/* Top dual-tone accent lines */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-300/85 to-transparent" />
      <div className="pointer-events-none absolute inset-x-[12%] top-[1.5px] h-[1px] bg-gradient-to-r from-transparent via-amber-300/55 to-transparent" />

      {/* Diagonal scan-line shimmer (slow infinite) */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, transparent 0%, transparent 38%, rgba(255,255,255,0.04) 50%, transparent 62%, transparent 100%)",
          backgroundSize: "250% 100%",
          mixBlendMode: "screen",
        }}
        animate={{ backgroundPosition: ["180% 0%", "-80% 0%"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
      />

      {/* HUD corners — premium reactor look */}
      {[
        "top-3 left-3 border-t-2 border-l-2 rounded-tl-md",
        "top-3 right-3 border-t-2 border-r-2 rounded-tr-md",
        "bottom-3 left-3 border-b-2 border-l-2 rounded-bl-md",
        "bottom-3 right-3 border-b-2 border-r-2 rounded-br-md",
      ].map((cls, i) => (
        <span key={i} className={`absolute w-3 h-3 pointer-events-none ${cls}`} style={{ borderColor: "rgba(96,165,250,0.50)" }} />
      ))}

      <div className="relative p-5 space-y-4">

        {/* Header — bigger icon, premium typography */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-2xl flex items-center justify-center ring-2 ring-blue-400/55"
              style={{
                background: "linear-gradient(135deg, rgba(96,165,250,0.40), rgba(30,64,160,0.20))",
                boxShadow: "0 6px 20px -4px hsl(217 76% 58% / 0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
            >
              <BarChart2 className="h-5 w-5 text-blue-200" strokeWidth={2.5} />
            </div>
            <div>
              <div
                className="text-[16px] font-black leading-tight tracking-[0.02em]"
                style={{
                  background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 40%, #fbbf24 65%, #d97706 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.5))",
                }}
              >
                {t("strategy.banner.title")}
              </div>
              <div className="text-[11px] text-blue-200/70 leading-tight mt-1 tracking-wide">
                {t("strategy.banner.subtitle")}
              </div>
            </div>
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: "linear-gradient(135deg, rgba(96,165,250,0.20), rgba(96,165,250,0.05))",
              border: "1px solid rgba(96,165,250,0.40)",
              boxShadow: "0 0 12px hsl(217 76% 58% / 0.30)",
            }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-50 animate-ping" />
              <span className="relative inline-flex h-full w-full rounded-full bg-blue-300" />
            </span>
            <span className="text-[10px] uppercase tracking-[0.22em] font-black text-blue-200">
              {t("strategy.banner.live")}
            </span>
          </div>
        </div>

        {/* KPI grid — taller, glow accent on the AUM tile (the headline number) */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {STATS.map(({ icon: Icon, colorClass, label, value, sub }, idx) => {
            const isHero = idx === 1; // Total AUM
            return (
              <div
                key={label}
                className={`relative rounded-2xl px-3 py-3 overflow-hidden ${isHero ? "ring-2 ring-amber-400/45" : "ring-1 ring-blue-400/25"}`}
                style={{
                  background: isHero
                    ? "linear-gradient(160deg, rgba(251,191,36,0.20), rgba(120,80,10,0.12) 60%, rgba(0,0,0,0.30))"
                    : "linear-gradient(160deg, rgba(96,165,250,0.14), rgba(20,40,80,0.08) 60%, rgba(0,0,0,0.30))",
                  boxShadow: isHero
                    ? "inset 0 1px 0 rgba(251,191,36,0.40), 0 6px 18px -6px rgba(251,191,36,0.40)"
                    : "inset 0 1px 0 rgba(96,165,250,0.30), 0 4px 14px -6px rgba(59,130,246,0.30)",
                }}
              >
                {isHero && (
                  <div className="pointer-events-none absolute -top-8 -right-6 h-20 w-20 rounded-full bg-amber-400/30 blur-2xl" />
                )}
                <Icon className={`h-4 w-4 mb-1.5 ${isHero ? "text-amber-300" : colorClass}`} />
                <div
                  className={`text-[17px] font-black tabular-nums leading-none ${isHero ? "" : colorClass}`}
                  style={
                    isHero
                      ? {
                          background: "linear-gradient(135deg, #fef9c3 0%, #fde68a 40%, #f59e0b 100%)",
                          WebkitBackgroundClip: "text",
                          backgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          filter: "drop-shadow(0 0 12px hsl(38 95% 55% / 0.45))",
                        }
                      : { textShadow: "0 0 10px currentColor" }
                  }
                >
                  {value}
                </div>
                <div className={`text-[10px] mt-1.5 leading-tight ${isHero ? "text-amber-200/85" : "text-muted-foreground"}`}>{label}</div>
                <div className={`text-[9px] mt-0.5 ${isHero ? "text-amber-300/70" : `${colorClass} opacity-70`}`}>{sub}</div>
              </div>
            );
          })}
        </div>

        {/* Monthly performance area chart — premium-tinted card to match
            the banner shell. Inset glow + corner accents echo the outer
            HUD frame so this reads as part of the same instrument panel. */}
        <div
          className="relative rounded-2xl px-3.5 pt-3 pb-2 overflow-hidden ring-1 ring-blue-400/25"
          style={{
            background:
              "linear-gradient(160deg, rgba(59,130,246,0.10), rgba(20,40,80,0.04) 60%, rgba(0,0,0,0.30))",
            boxShadow:
              "inset 0 1px 0 rgba(96,165,250,0.20), inset 0 -1px 0 rgba(0,0,0,0.30), 0 4px 18px -8px rgba(59,130,246,0.30)",
          }}
        >
          <div className="pointer-events-none absolute -top-10 -right-6 h-24 w-24 rounded-full bg-blue-500/[0.20] blur-2xl" />
          <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/45 to-transparent" />
          <div className="relative flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-blue-200/85 uppercase tracking-[0.18em]">
              {t("strategy.banner.trendTitle")}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 ring-1 ring-blue-400/35 text-blue-200">
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
