import { useState, useEffect } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import { motion } from "framer-motion";
import { TrendingUp, Layers, BarChart2, Target } from "lucide-react";
import { Card, CardContent } from "@dashboard/components/ui/card";
import { useTranslation } from "react-i18next";
import { usePoolStatsRune } from "@dashboard/lib/data-rune";

// Mainnet design tokens (mirrors src/index.css)
const AMBER  = "hsl(38 95% 55%)";       // primary
const BLUE   = "hsl(217 76% 58%)";       // chart-3
const TEAL   = "hsl(173 58% 50%)";       // reserve
const PURPLE = "hsl(266 60% 65%)";       // accent for yield curve

function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(target * ease);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

function AnimCount({ value, prefix = "", suffix = "", decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const v = useCountUp(value);
  return <>{prefix}{v.toFixed(decimals)}{suffix}</>;
}

const MONTHLY_PROJECTION = [
  { month: "M1", deposits: 100,  trading: 45 },
  { month: "M2", deposits: 230,  trading: 104 },
  { month: "M3", deposits: 480,  trading: 216 },
  { month: "M4", deposits: 890,  trading: 401 },
  { month: "M5", deposits: 1600, trading: 720 },
  { month: "M6", deposits: 2800, trading: 1260 },
];

const CustomTooltipAlloc = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg px-3 py-2 text-xs bg-popover border border-border/50 shadow-lg">
      <div className="font-bold" style={{ color: d.color }}>{d.name}</div>
      <div className="text-muted-foreground mt-0.5">${d.value.toLocaleString()} USDT · {d.pct}%</div>
    </div>
  );
};

const CustomTooltipGrowth = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-xs bg-popover border border-border/50 shadow-lg">
      <div className="text-muted-foreground mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex gap-2 justify-between">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-bold">${p.value.toLocaleString()}K</span>
        </div>
      ))}
    </div>
  );
};

/**
 * Vault analytics — donut + node-progress + TVL projection + yield curve.
 * Data sourced from `usePoolStatsRune` (no api-server). Visual style aligned
 * with mainnet (Card + amber primary + soft glows). Lock-position / burn
 * counters from TAICLAW are intentionally dropped — RUNE doesn't track
 * those server-side, and the projection charts are still illustrative.
 */
export function VaultCharts() {
  const { t } = useTranslation();
  const { data } = usePoolStatsRune();

  const motherUsdt  = data?.runeLp ?? 0;
  const reserveUsdt = data?.reserve ?? 0;
  const tradingUsdt = data?.managedPool ?? 0;
  const totalUsdt   = data?.totalDepositUsdt ?? 0;

  // Fixed protocol ratios: 35% / 45% / 20%
  const allocData = [
    { name: t("vault.charts.runeLp"),      value: motherUsdt,  color: AMBER, pct: "35" },
    { name: t("vault.charts.managedPool"), value: tradingUsdt, color: BLUE,  pct: "45" },
    { name: t("vault.charts.reserve"),       value: reserveUsdt, color: TEAL,  pct: "20" },
  ];

  // Recruitment progress is measured in **USDT raised**, not node count.
  // Spec (节点招募计划 §五.1):
  //   • Total node-presale fundraise target: 8,000,000 USDT (gross sales)
  //   • Of that, 35% = 2,800,000 USDT injects into the RUNE LP底池
  // Show both: raisedUsdt against the 8M overall target, with the 2.8M
  // LP threshold called out as the qualifying milestone.
  const TOTAL_FUNDRAISE_TARGET_USDT = 8_000_000;
  const LP_TARGET_USDT = 2_800_000;
  const raisedUsdt = data?.totalDepositUsdt ?? 0;
  const lpDepositedUsdt = data?.runeLp ?? 0; // already 35% of raised
  const nodeProgress = Math.min((raisedUsdt / TOTAL_FUNDRAISE_TARGET_USDT) * 100, 100);
  const lpProgress = Math.min((lpDepositedUsdt / LP_TARGET_USDT) * 100, 100);

  const LABEL_STYLE = { fontSize: 10, fill: "hsl(215 28% 65%)" };

  return (
    <div className="px-4 lg:px-6 space-y-3">
      {/* Section title */}
      <div className="flex items-center gap-2 pt-1">
        <div className="h-5 w-5 rounded flex items-center justify-center bg-blue-500/15 ring-1 ring-blue-500/25">
          <BarChart2 className="h-3 w-3 text-blue-400" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {t("vault.charts.protocolAnalytics")}
        </span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Layers,     color: AMBER,  label: t("vault.charts.totalDeposits"), val: totalUsdt,   prefix: "$", suffix: "", dec: 0, ringClass: "ring-primary/25 bg-primary/[0.06]" },
          { icon: Target,     color: BLUE,   label: t("vault.charts.managedPool"),   val: tradingUsdt, prefix: "$", suffix: "", dec: 0, ringClass: "ring-blue-500/25 bg-blue-500/[0.06]" },
          { icon: TrendingUp, color: PURPLE, label: t("vault.charts.annualEst"),     val: 8,           prefix: "",  suffix: "%", dec: 0, ringClass: "ring-purple-500/25 bg-purple-500/[0.06]" },
        ].map(({ icon: Icon, color, label, val, prefix, suffix, dec, ringClass }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`rounded-xl px-3 py-3 text-center ring-1 ${ringClass}`}
          >
            <Icon className="h-4 w-4 mx-auto mb-1" style={{ color }} />
            <div className="text-sm font-bold tabular-nums" style={{ color }}>
              <AnimCount value={val} prefix={prefix} suffix={suffix} decimals={dec} />
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Allocation donut + legend */}
      <Card className="surface-3d border-border/55 bg-card/60">
        <CardContent className="p-3">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
            {t("vault.charts.allocation")}
          </div>
          <div className="flex items-center gap-4">
            <div style={{ width: 110, height: 110 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                    animationBegin={0}
                    animationDuration={900}
                  >
                    {allocData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} opacity={0.85} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltipAlloc />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {allocData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1 rounded-full overflow-hidden bg-muted/40">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${d.pct}%`, background: d.color }} />
                    </div>
                    <span className="font-bold tabular-nums w-10 text-right" style={{ color: d.color }}>{d.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Node recruitment progress — 2.8M LP target (35% of fundraise) +
          8M overall fundraise target (节点招募计划 spec). */}
      <Card className="surface-3d border-primary/30 bg-primary/[0.04]">
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {t("vault.charts.nodeRecruitment")}
            </div>
            <div className="text-[11px] font-bold tabular-nums text-primary">
              {fmtUsdt(raisedUsdt)} / {fmtUsdt(TOTAL_FUNDRAISE_TARGET_USDT)}
            </div>
          </div>
          {/* Overall fundraise bar (8M USDT, 100% of node sales) */}
          <div>
            <div className="h-2.5 rounded-full overflow-hidden bg-muted/40">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${nodeProgress}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                style={{ background: `linear-gradient(90deg, ${AMBER}99, ${AMBER})`, boxShadow: `0 0 8px ${AMBER}60` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">
                {t("vault.charts.fundraiseTarget", "Fundraise target")} · 8M USDT
              </span>
              <span className="text-primary tabular-nums">{nodeProgress.toFixed(1)}%</span>
            </div>
          </div>
          {/* LP-side milestone (2.8M USDT = 35% of fundraise → into RUNE LP) */}
          <div>
            <div className="h-2 rounded-full overflow-hidden bg-muted/40">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${lpProgress}%` }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.15 }}
                style={{ background: `linear-gradient(90deg, ${BLUE}99, ${BLUE})`, boxShadow: `0 0 8px ${BLUE}60` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">
                {t("vault.charts.lpInjectTarget", "LP inject target")} · 2.8M USDT
              </span>
              <span className="text-blue-400 tabular-nums">
                {fmtUsdt(lpDepositedUsdt)} ({lpProgress.toFixed(1)}%)
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
            <span>{t("vault.charts.launchOnFullRecruitment")}</span>
            <span className="text-primary">{t("vault.charts.targetPrice")}</span>
          </div>
        </CardContent>
      </Card>

      {/* TVL growth projection */}
      <Card className="surface-3d border-border/55 bg-card/60">
        <CardContent className="p-3">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
            {t("vault.charts.tvlGrowth")}
          </div>
          <div style={{ height: 130 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_PROJECTION} barGap={2} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="hsl(228 22% 28%)" />
                <XAxis dataKey="month" tick={LABEL_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={LABEL_STYLE} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<CustomTooltipGrowth />} cursor={{ fill: "hsl(228 22% 22%)" }} />
                <Bar dataKey="deposits" name={t("vault.charts.tvlDeposits")} fill={AMBER} opacity={0.75} radius={[3, 3, 0, 0]} animationDuration={1000} />
                <Bar dataKey="trading"  name={t("vault.charts.managed")}  fill={BLUE}  opacity={0.75} radius={[3, 3, 0, 0]} animationDuration={1200} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-1 text-[10px] text-muted-foreground justify-center">
            <span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded" style={{ background: AMBER }} />{t("vault.charts.tvlDeposits")}</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded" style={{ background: BLUE }} />{t("vault.charts.tvlManaged")}</span>
          </div>
        </CardContent>
      </Card>

      {/* Yield accumulation */}
      <Card className="surface-3d border-border/55 bg-card/60">
        <CardContent className="p-3">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
            {t("vault.charts.yieldProjection")}
          </div>
          <div style={{ height: 110 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MONTHLY_PROJECTION.map((d, i) => ({
                ...d,
                yield: +(d.deposits * 0.08 * (i + 1) / 6).toFixed(1),
              }))}>
                <defs>
                  <linearGradient id="yieldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PURPLE} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={PURPLE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="hsl(228 22% 28%)" />
                <XAxis dataKey="month" tick={LABEL_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={LABEL_STYLE} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<CustomTooltipGrowth />} cursor={{ stroke: "hsl(215 28% 65%)", strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="yield"
                  name={t("vault.charts.yieldLegend")}
                  stroke={PURPLE}
                  strokeWidth={2}
                  fill="url(#yieldGrad)"
                  dot={false}
                  animationDuration={1400}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
