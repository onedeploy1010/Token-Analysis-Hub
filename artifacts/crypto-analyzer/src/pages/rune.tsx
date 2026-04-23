import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";
import {
  useGetRuneOverview,
  useCalculateRuneReturns,
  RuneCalculatorInputNodeLevel,
} from "@workspace/api-client-react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, ComposedChart,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // still used by calculator section below
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  ArrowLeft, BarChart2, Coins, Flame, TrendingUp,
  Layers, BadgeCheck, ChevronRight, PieChart as PieIcon,
  Activity,
} from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/language-context";

/**
 * Bilingual render helper — zh/zh-TW render "LOCAL · ENG" together,
 * en renders English only, ko/ja/th/vi render only their native label.
 */
function useBi() {
  const { t, language } = useLanguage();
  const isEn = language === "en";
  const isZh = language === "zh" || language === "zh-TW";
  return {
    t,
    language,
    isEn,
    isZh,
    /** localized label, optionally suffixed with " · <ENG>" for zh/zh-TW */
    bi: (key: string, en: string) => {
      if (isEn) return en;
      if (isZh) return `${t(key)} · ${en}`;
      return t(key);
    },
  };
}

// ─── Color palette ────────────────────────────────────────────────────────────
const C = {
  pioneer:  "hsl(217,80%,58%)",
  builder:  "hsl(142,70%,45%)",
  guardian: "hsl(38,92%,50%)",
  strategic:"hsl(280,70%,60%)",
  mother:   "hsl(217,80%,65%)",
  sub:      "hsl(30,90%,58%)",
  usdt:     "hsl(142,65%,50%)",
  grid:     "hsl(217,30%,18%)",
  muted:    "hsl(217,20%,40%)",
};

const PIE_COLORS = [
  "hsl(217,80%,58%)", "hsl(142,70%,45%)", "hsl(38,92%,50%)", "hsl(280,70%,60%)",
];

const NODE_BG: Record<string, string> = {
  pioneer:  "from-blue-950/60 to-blue-900/20 border-blue-800/40",
  builder:  "from-green-950/60 to-green-900/20 border-green-800/40",
  guardian: "from-amber-950/60 to-amber-900/20 border-amber-800/40",
  strategic:"from-purple-950/60 to-purple-900/20 border-purple-800/40",
};
const NODE_RING: Record<string, string> = {
  pioneer:  "ring-blue-500/60",
  builder:  "ring-green-500/60",
  guardian: "ring-amber-500/60",
  strategic:"ring-purple-500/60",
};

// ─── Chart tooltip style ──────────────────────────────────────────────────────
const tooltipStyle = {
  contentStyle: { background: "hsl(230,30%,8%)", border: "1px solid hsl(217,30%,22%)", borderRadius: 8, fontSize: 12 },
  labelStyle:   { color: "hsl(217,20%,70%)", marginBottom: 4 },
  cursor:       { fill: "hsl(217,80%,58%,0.06)" },
};

function fmt(n: number, d = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

// ─── Sub-component: Section Header ───────────────────────────────────────────
function SectionTitle({ icon: Icon, i18nKey, en }: { icon: React.ElementType; i18nKey: string; en: string }) {
  const { t, isEn, isZh } = useBi();
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
      <Icon className="h-4 w-4 text-primary" />
      {isEn ? en : t(i18nKey)}
      {isZh && <> · <span className="text-muted-foreground/60">{en}</span></>}
    </h2>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   TechChartCard — high-tech "HUD" wrapper for each analytical chart.
   Adds:
     • Hexa-corner brackets that pulse on mount
     • Animated top accent (gradient sweep)
     • Hover-reveal radial glow
     • Diagonal scan line (slow loop)
     • Live "STREAM" indicator
══════════════════════════════════════════════════════════════════════════════ */
interface TechChartCardProps {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  accent?: string;            // tailwind color class fragment (e.g. "primary", "amber-500")
  delay?: number;
  className?: string;
  children: React.ReactNode;
}

function TechChartCard({
  icon: Icon, title, subtitle,
  accent = "primary", delay = 0,
  className = "", children,
}: TechChartCardProps) {

  // map accent token → resolved hsl color + tailwind text class
  // (using explicit hsl ensures boxShadow / radial-gradient render consistently)
  const accentMap: Record<string, { hsl: string; cls: string }> = {
    primary:    { hsl: "hsl(38, 92%, 58%)",  cls: "text-amber-400" },
    "amber-500":{ hsl: "hsl(38, 92%, 58%)",  cls: "text-amber-400" },
    "orange-500":{ hsl: "hsl(24, 92%, 58%)", cls: "text-orange-400" },
    "chart-1":  { hsl: "hsl(199, 89%, 60%)", cls: "text-sky-400"   },
  };
  const { hsl: accentColor, cls: accentColorClass } = accentMap[accent] ?? accentMap.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className={`group relative rounded-xl border border-border/50 bg-gradient-to-br from-card/85 via-card/70 to-card/40 backdrop-blur-md overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.35)] ${className}`}
    >
      {/* Top accent gradient sweep */}
      <motion.div
        className="absolute left-0 right-0 top-0 h-[2px] pointer-events-none z-20 origin-left"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${accentColor} 30%, ${accentColor} 70%, transparent 100%)`,
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 0.85 }}
        transition={{ duration: 1.0, delay: delay + 0.15, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Subtle holographic radial glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-700"
        style={{
          background: `radial-gradient(600px circle at 50% 0%, ${accentColor.replace("hsl(", "hsla(").replace(")", ", 0.07)")}, transparent 45%)`,
        }}
      />

      {/* Diagonal scan line — slow infinite loop */}
      <motion.div
        className="absolute inset-y-0 -left-1/3 w-1/3 pointer-events-none z-10"
        style={{
          background: "linear-gradient(115deg, transparent 0%, transparent 35%, rgba(255,255,255,0.025) 50%, transparent 65%, transparent 100%)",
        }}
        animate={{ x: ["0%", "400%"] }}
        transition={{ duration: 9, repeat: Infinity, ease: "linear", delay: delay + 1.5 }}
      />

      {/* HUD corner brackets — 4 corners (steady, no pulse flicker) */}
      {[
        { pos: "top-2 left-2",     border: "border-t border-l", corner: "rounded-tl" },
        { pos: "top-2 right-2",    border: "border-t border-r", corner: "rounded-tr" },
        { pos: "bottom-2 left-2",  border: "border-b border-l", corner: "rounded-bl" },
        { pos: "bottom-2 right-2", border: "border-b border-r", corner: "rounded-br" },
      ].map((c, i) => (
        <motion.span
          key={i}
          className={`absolute ${c.pos} w-3 h-3 ${c.border} ${c.corner} pointer-events-none`}
          style={{ borderColor: accentColor, opacity: 0.55 }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 0.55, scale: 1 }}
          transition={{ duration: 0.5, delay: delay + 0.35 + i * 0.04, ease: "easeOut" }}
        />
      ))}

      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/30">
        <div className="flex items-center gap-3 min-w-0">
          {/* Icon plate — soft tinted background, even ambient halo behind it */}
          <div className="relative shrink-0">
            {/* Soft halo behind icon (steady, not flickering) */}
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                background: `radial-gradient(closest-side, ${accentColor.replace("hsl(", "hsla(").replace(")", ", 0.45)")}, transparent 75%)`,
                filter: "blur(8px)",
              }}
              animate={{ opacity: [0.45, 0.75, 0.45] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay }}
            />
            <div
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl ${accentColorClass}`}
              style={{
                background: `linear-gradient(135deg, ${accentColor.replace("hsl(", "hsla(").replace(")", ", 0.18)")} 0%, ${accentColor.replace("hsl(", "hsla(").replace(")", ", 0.04)")} 100%)`,
                border: `1px solid ${accentColor.replace("hsl(", "hsla(").replace(")", ", 0.35)")}`,
                boxShadow: `inset 0 1px 0 0 ${accentColor.replace("hsl(", "hsla(").replace(")", ", 0.18)")}, 0 0 0 1px ${accentColor.replace("hsl(", "hsla(").replace(")", ", 0.06)")}`,
              }}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </div>
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground tracking-tight leading-tight truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-tight tracking-wide font-mono tabular-nums">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Live data indicator — symmetric breathing */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="relative flex h-1.5 w-1.5">
            <motion.span
              className="absolute inline-flex h-full w-full rounded-full"
              style={{ background: accentColor }}
              animate={{ opacity: [0.5, 0, 0.5], scale: [1, 2.6, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <span className="relative inline-flex h-full w-full rounded-full" style={{ background: accentColor }} />
          </span>
          <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium hidden sm:inline">
            LIVE
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="relative z-20 px-3 pt-4 pb-3">
        {children}
      </div>
    </motion.div>
  );
}

// Fallback English labels for the 6 RUNE price stages (backend only sends labelCn).
const STAGE_EN_LABELS = ["① Launch", "② Batch 2", "③ Batch 3", "④ Batch 4", "⑤ Target (Low)", "⑥ Target (High)"];

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Rune() {
  const { t, bi, isEn, isZh } = useBi();
  const { data: overview, isLoading } = useGetRuneOverview();

  /** Pick the locale-appropriate stage label. zh/zh-TW get the backend's
   * labelCn; every other locale gets the English fallback list. */
  const stageLabel = (s: { labelCn: string }, i: number) =>
    isZh ? s.labelCn : (STAGE_EN_LABELS[i] ?? s.labelCn);

  /** Pick the locale-appropriate node tier name. zh/zh-TW get nameCn,
   * every other locale gets nameEn. */
  const nodeName = (n: { nameCn: string; nameEn: string }) => (isZh ? n.nameCn : n.nameEn);

  const [nodeLevel, setNodeLevel]   = useState<RuneCalculatorInputNodeLevel>(RuneCalculatorInputNodeLevel.pioneer);
  const [seats,     setSeats]       = useState(1);
  const [durationDays, setDurationDays] = useState(180);
  const [priceStageIndex, setPriceStageIndex] = useState(3);
  const [trendScale, setTrendScale] = useState<"log" | "linear">("log");
  const calcMutation = useCalculateRuneReturns();

  const selectedNode         = overview?.nodes?.find(n => n.level === nodeLevel);
  const selectedStagePreview = overview?.priceStages?.[priceStageIndex];

  // ── Derived chart data ────────────────────────────────────────────────────
  const priceStageChartData = useMemo(() =>
    (overview?.priceStages ?? []).map((s, i) => ({
      label: stageLabel(s, i),
      mother: s.motherPrice,
      sub:    s.subPrice,
      mult:   s.multiplier,
    })), [overview, isEn]);

  const nodeCompareData = useMemo(() => {
    const stages = overview?.priceStages ?? [];
    const nodes  = overview?.nodes       ?? [];
    return stages.map((stage, i) => {
      const row: Record<string, string | number> = { label: stageLabel(stage, i) };
      nodes.forEach(n => {
        const motherVal   = n.motherTokensPerSeat * stage.motherPrice;
        // The airdrop is mother-token per the 2026 spec (§六 "节点母TOKEN
        // 空投 · 10,000,000 枚母TOKEN"), so it prices off motherPrice —
        // using subPrice here was overstating airdrop value ~35%.
        const airdropVal  = n.airdropPerSeat      * stage.motherPrice;
        const usdtVal     = n.dailyUsdt * 180;
        const total       = motherVal + airdropVal + usdtVal;
        row[n.level]      = Math.round(total);
      });
      return row;
    });
  }, [overview, isEn]);

  const monthSuffix = isEn ? "mo" : t("mr.rune.input.months");
  const deflationData = useMemo(() => {
    const total      = overview?.subToken?.totalSupply ?? 13_100_000;
    const burnRate   = overview?.subToken?.dailyBurnRate ?? 0.002;
    const months     = [0,1,2,3,4,5,6,9,12,15,18,21,24];
    return months.map(m => ({
      month: `${m}${monthSuffix}`,
      circulating: Math.round(total * Math.pow(1 - burnRate, m * 30)),
      burned:      Math.round(total - total * Math.pow(1 - burnRate, m * 30)),
    }));
  }, [overview, monthSuffix]);

  const fundAllocData = useMemo(() => {
    const f = overview?.fundraising;
    if (!f) return [];
    // zh / zh-TW see the Chinese label; all other locales (en, ko, ja, th, vi) fall through to English.
    return [
      { name: isZh ? "TLP流动池" : "TLP Pool",     value: f.tlpPool    },
      { name: isZh ? "运营资金"   : "Operations",   value: f.operations },
      { name: isZh ? "国库资金"   : "Treasury",     value: f.treasury   },
      { name: isZh ? "子TOKEN LP" : "Sub-Token LP", value: f.subTokenLP },
    ];
  }, [overview, isZh]);

  const resultPieData = calcMutation.data ? [
    { name: isEn ? "Mother Token Value" : t("mr.rune.kpi.motherValue"),  value: calcMutation.data.motherTokenValue  },
    { name: isEn ? "Mother Token Airdrop"  : t("mr.rune.kpi.airdropValue"), value: calcMutation.data.airdropTokenValue },
    { name: isEn ? "USDT Income"        : t("mr.rune.kpi.usdtIncome"),   value: calcMutation.data.totalUsdtIncome   },
  ] : [];

  const RESULT_COLORS = [C.mother, C.sub, C.usdt];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto px-4 py-8 space-y-10">

      {/* Back link */}
      <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />{bi("mr.detail.back", "Back to Projects")}
      </Link>

      {/* ── Header Banner ── */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md px-6 py-8 md:px-10 shadow-[0_8px_40px_rgba(0,0,0,0.45)]">

        {/* Backgrounds */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-28 -right-28 w-72 h-72 bg-primary/14 rounded-full blur-[90px] pointer-events-none animate-orb-drift" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-chart-2/8 rounded-full blur-[60px] pointer-events-none animate-float-y" />

        {/* Scan line */}
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-scan-line pointer-events-none" style={{ top: 0 }} />

        {/* Corner accents */}
        <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-primary/45 rounded-tl pointer-events-none" />
        <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-primary/45 rounded-tr pointer-events-none" />
        <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-primary/45 rounded-bl pointer-events-none" />
        <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-primary/45 rounded-br pointer-events-none" />

        <div className="relative z-10">
          {/* Logo + title */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-xl overflow-hidden border border-primary/25 shadow-[0_0_24px_rgba(251,191,36,0.25)] shrink-0 bg-black">
              <img src="/rune-logo.png" alt="RUNE Protocol" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="mb-1 leading-tight">
                {!isEn && (
                  <span className="block text-[10px] font-semibold tracking-[0.22em] text-primary/70">
                    {t("mr.rune.deepAnalysis")}
                  </span>
                )}
                <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/50 mt-0.5">
                  Deep Node Analysis
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                RUNE Protocol
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                {t("mr.rune.heroTagline").split(/\s*·\s*/).map((part, idx) => (
                  <span key={idx} className="inline-flex items-center text-xs sm:text-sm text-muted-foreground tracking-wide">
                    {idx > 0 && <span className="mr-2 text-primary/40">·</span>}
                    {part}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Stat strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-border/30">
            {[
              { labelEn: "USDT APY",    i18nKey: "mr.rune.stat.apy",         end: 170.82, decimals: 2, prefix: "",  suffix: "%", highlight: true,  shimmer: true  },
              { labelEn: "TVL",         i18nKey: "mr.rune.stat.tvl",         end: 312,    decimals: 0, prefix: "$", suffix: "M", highlight: true,  shimmer: false },
              { labelEn: "Node Tiers",  i18nKey: "mr.rune.stat.nodeTiers",   end: 4,      decimals: 0, prefix: "",  suffix: "",  highlight: false, shimmer: false },
              { labelEn: "Price Stages",i18nKey: "mr.rune.stat.priceStages", end: 6,      decimals: 0, prefix: "",  suffix: "",  highlight: false, shimmer: false },
            ].map(({ labelEn, i18nKey, end, decimals, prefix, suffix, highlight, shimmer }, i) => (
              <motion.div
                key={labelEn}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-1"
              >
                <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/55 font-medium">{labelEn}</div>
                <div className={`text-2xl leading-none ${shimmer ? "num-shimmer" : highlight ? "num-gold" : "num text-foreground"}`}>
                  <CountUp end={end} decimals={decimals} duration={1.4} prefix={prefix} suffix={suffix} separator="," preserveValue />
                </div>
                {!isEn && <div className="text-[10px] text-muted-foreground/70">{t(i18nKey)}</div>}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Token Info — 3D raised buttons ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4"><Skeleton className="h-36 rounded-2xl" /><Skeleton className="h-36 rounded-2xl" /></div>
      ) : (overview?.motherToken && overview?.subToken) ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {([
            {
              kind: "mother" as const,
              labelKey: "mr.rune.token.mother",
              labelEn: "Mother Token",
              symbol: overview.motherToken.symbol,
              tintVars: "[--token-tint:217_80%_58%] [--token-border:217_80%_48%]",
              labelColor: "text-sky-300",
              symbolColor: "text-sky-200",
              Icon: Flame,
              rows: [
                { kKey: "mr.rune.token.open",      kEn: "Open",        v: `$${overview.motherToken.launchPrice}`, accent: false },
                { kKey: "mr.rune.token.supply",    kEn: "Supply",      v: `${((overview.motherToken.totalSupply ?? 0)/1e8).toFixed(1)}${isEn ? "B" : t("mr.rune.kpi.tokensUnit")}`, accent: false },
                { kKey: "mr.rune.token.dailyBurn", kEn: "Daily Burn",  v: `${((overview.motherToken.dailyBurnRate ?? 0)*100).toFixed(1)}%`, accent: false },
                { kKey: "mr.rune.token.target24M", kEn: "24M Target",  v: `$${overview.motherToken.targetPriceLow}~${overview.motherToken.targetPriceHigh}`, accent: true },
              ],
            },
            {
              kind: "sub" as const,
              labelKey: "mr.rune.token.sub",
              labelEn: "Sub Token",
              symbol: overview.subToken.symbol,
              tintVars: "[--token-tint:30_92%_58%] [--token-border:30_92%_48%]",
              labelColor: "text-orange-300",
              symbolColor: "text-orange-200",
              Icon: TrendingUp,
              rows: [
                { kKey: "mr.rune.token.initial",   kEn: "Initial",     v: `$${overview.subToken.launchPrice}`, accent: false },
                { kKey: "mr.rune.token.supply",    kEn: "Supply",      v: `${((overview.subToken.totalSupply ?? 0)/1e6).toFixed(1)}M`, accent: false },
                { kKey: "mr.rune.token.dailyBurn", kEn: "Daily Burn",  v: `${((overview.subToken.dailyBurnRate ?? 0)*100).toFixed(1)}%`, accent: false },
                { kKey: "mr.rune.token.target24M", kEn: "24M Target",  v: `$${overview.subToken.targetPriceLow}~${overview.subToken.targetPriceHigh}`, accent: true },
              ],
            },
          ]).map(({ kind, labelKey, labelEn, symbol, tintVars, labelColor, symbolColor, Icon, rows }, i) => (
            <motion.button
              key={kind}
              type="button"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.985 }}
              onClick={(e) => {
                const el = e.currentTarget;
                el.classList.remove("haptic-pulse");
                // force reflow so animation can replay
                void el.offsetWidth;
                el.classList.add("haptic-pulse");
              }}
              className={`token-card-3d ${tintVars} text-left p-5 w-full`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[11px] uppercase tracking-[0.22em] font-semibold ${labelColor}`}>
                  {isEn ? labelEn : t(labelKey)}
                  {isZh && <> · <span className="opacity-70">{labelEn}</span></>}
                </span>
                <Icon className={`h-4 w-4 ${labelColor} opacity-70`} />
              </div>
              <p className={`num text-5xl sm:text-6xl leading-none mb-4 ${symbolColor}`}>
                {symbol}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {rows.map((r) => (
                  <div key={r.kKey} className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70">{isEn ? r.kEn : t(r.kKey)}</span>
                    <span className={r.accent ? "num num-gold text-base" : "num text-foreground text-base"}>{r.v}</span>
                  </div>
                ))}
              </div>
            </motion.button>
          ))}
        </motion.div>
      ) : null}

      {/* ═══════════════════════════════════════════════════════════════════════
          ANALYSIS SECTION — 深度分析图表
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.15 }}
        className="space-y-8">

        {/* Tech-style section header */}
        <div className="relative pb-4">
          {/* Animated underline */}
          <motion.div
            className="absolute left-0 right-0 bottom-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg, hsl(var(--primary)/0.5) 0%, hsl(var(--primary)/0.2) 30%, transparent 100%)" }}
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
          />
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="flex items-stretch gap-4 min-w-0">
              {/* Glowing accent bar */}
              <motion.div
                className="w-[3px] rounded-full bg-gradient-to-b from-primary via-primary/80 to-primary/20"
                initial={{ scaleY: 0, originY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                style={{ boxShadow: "0 0 12px hsl(var(--primary)/0.6)" }}
              />
              <div>
                {!isEn && <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/60 block mb-0.5">{t("mr.rune.section.analysis.eyebrow")}</span>}
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {isEn ? "Market Analysis" : isZh ? `${t("mr.rune.section.analysis.title")} · Market Analysis` : t("mr.rune.section.analysis.title")}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">{t("mr.rune.section.analysis.desc")}</p>
              </div>
            </div>

            {/* Live status badge */}
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-primary/20 bg-primary/5 backdrop-blur-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-primary/80 font-semibold">
                Real-time Data Stream
              </span>
            </motion.div>
          </div>
        </div>

        {/* Row 1: Price Stages + Fund Allocation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Chart 1: Six-Stage Dual Line — 2/3 width */}
          <TechChartCard
            icon={BarChart2}
            title={isEn ? "Six-Stage Dual Line" : (isZh ? `${t("mr.rune.chart.priceStages")} · Six-Stage Dual Line` : t("mr.rune.chart.priceStages"))}
            subtitle="$0.028 → $4.56 · 120×"
            accent="primary"
            delay={0.05}
            className="lg:col-span-2"
          >
            {priceStageChartData.length > 0 ? (
              <div className="relative">
                {/* Pulsing ambient glow inside chart area */}
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute -top-8 -right-8 h-[260px] w-[260px] rounded-full"
                  style={{ background: "radial-gradient(circle, hsl(var(--primary)/0.10), transparent 65%)" }}
                  animate={{ opacity: [0.4, 0.85, 0.4] }}
                  transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Log/Linear toggle */}
                <div className="absolute top-0 right-2 z-10 inline-flex items-center gap-1 rounded-full border border-primary/25 bg-background/50 p-1 text-[10px] uppercase tracking-[0.18em] backdrop-blur">
                  {(["log", "linear"] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTrendScale(s)}
                      className={`rounded-full px-3 py-0.5 num tabular-nums transition-all ${
                        trendScale === s
                          ? "bg-primary/25 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.4)]"
                          : "text-muted-foreground/60 hover:text-primary/80"
                      }`}
                    >
                      {s === "log" ? (isEn ? "Log" : (isZh ? "对数" : "Log")) : (isEn ? "Linear" : (isZh ? "线性" : "Linear"))}
                    </button>
                  ))}
                </div>

                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={priceStageChartData} margin={{ top: 28, right: 18, left: 0, bottom: 6 }}>
                    <defs>
                      <linearGradient id="lineMotherGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%"   stopColor={C.mother} stopOpacity={0.4}  />
                        <stop offset="100%" stopColor={C.mother} stopOpacity={1}    />
                      </linearGradient>
                      <linearGradient id="lineSubGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%"   stopColor={C.sub} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={C.sub} stopOpacity={1}   />
                      </linearGradient>
                      <linearGradient id="areaMotherGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"  stopColor={C.mother} stopOpacity={0.32} />
                        <stop offset="100%" stopColor={C.mother} stopOpacity={0}   />
                      </linearGradient>
                      <linearGradient id="areaSubGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"  stopColor={C.sub} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={C.sub} stopOpacity={0}   />
                      </linearGradient>
                      <filter id="trendGlow">
                        <feGaussianBlur stdDeviation="2" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fill: C.muted, fontSize: 10 }}
                      axisLine={false} tickLine={false}
                      scale={trendScale}
                      domain={trendScale === "log" ? [0.02, "auto"] : [0, "auto"]}
                      allowDataOverflow
                      tickFormatter={v => v >= 1 ? `$${v}` : `$${(+v).toFixed(2)}`}
                    />
                    <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [`$${fmt(v, v < 1 ? 4 : 2)}`, name]} animationDuration={180} />
                    <Legend wrapperStyle={{ fontSize: 11, color: C.muted, paddingTop: 8 }} iconType="circle" />
                    <Line
                      type="monotone" dataKey="mother"
                      name={isEn ? "Mother Token (符)" : `${t("mr.rune.token.mother")} (符)`}
                      stroke={C.mother} strokeWidth={2.8}
                      dot={{ r: 3.5, fill: C.mother, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: C.mother, stroke: "#fff", strokeWidth: 1.5 }}
                      style={{ filter: "url(#trendGlow)" }}
                      animationDuration={1600} animationBegin={150}
                    />
                    <Line
                      type="monotone" dataKey="sub"
                      name={isEn ? "Sub Token (符火)" : `${t("mr.rune.token.sub")} (符火)`}
                      stroke={C.sub} strokeWidth={2.8}
                      dot={{ r: 3.5, fill: C.sub, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: C.sub, stroke: "#fff", strokeWidth: 1.5 }}
                      style={{ filter: "url(#trendGlow)" }}
                      animationDuration={1600} animationBegin={400}
                    />
                  </ComposedChart>
                </ResponsiveContainer>

                {/* Multiplier strip below */}
                <div className="grid grid-cols-6 gap-1 mt-2 px-1">
                  {priceStageChartData.map((d: any, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 0.9 + i * 0.07 }}
                      className="text-center"
                    >
                      <span className={`num text-[10px] tabular-nums ${d.mult >= 80 ? "text-primary font-semibold" : d.mult > 1 ? "text-primary/60" : "text-muted-foreground/50"}`}>
                        {d.mult > 1 ? `${d.mult}×` : "—"}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            )}
          </TechChartCard>

          {/* Chart 2: Fund Allocation – 1/3 width — stacked bar + animated rows */}
          <TechChartCard
            icon={PieIcon}
            title={isEn ? "Fund Allocation" : `${t("mr.rune.chart.fundAlloc")}${isZh ? " · Fund Allocation" : ""}`}
            accent="chart-1"
            delay={0.15}
          >
            {fundAllocData.length > 0 ? (() => {
              const total = fundAllocData.reduce((s, x) => s + (x.value ?? 0), 0) || 1;
              return (
                <div className="px-2 pb-1">
                  {/* Total raised + counter */}
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground/60 mb-1">
                        {isEn ? "Total Raised" : (isZh ? "总融资规模" : "Total Raised")}
                      </p>
                      <div className="num-shimmer text-3xl leading-none">
                        <CountUp end={total / 1e6} prefix="$" suffix="M" decimals={1} duration={1.4} preserveValue />
                      </div>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">
                      {fundAllocData.length} {isEn ? "Allocations" : (isZh ? "项分配" : "Allocations")}
                    </span>
                  </div>

                  {/* Stacked horizontal bar */}
                  <div className="relative h-3 rounded-full bg-border/25 overflow-hidden flex gap-[2px] mb-1.5">
                    {fundAllocData.map((d, i) => {
                      const pct = ((d.value ?? 0) / total) * 100;
                      return (
                        <motion.div
                          key={i}
                          className="h-full flex-none rounded-full"
                          style={{
                            background: PIE_COLORS[i],
                            boxShadow: `0 0 10px ${PIE_COLORS[i]}55`,
                          }}
                          initial={{ width: "0%", opacity: 0 }}
                          animate={{ width: `${pct}%`, opacity: 1 }}
                          transition={{ duration: 1.0, delay: 0.3 + i * 0.14, ease: [0.22, 1, 0.36, 1] }}
                        />
                      );
                    })}
                  </div>
                  {/* Percentage labels under bar */}
                  <div className="flex mb-4">
                    {fundAllocData.map((d, i) => {
                      const pct = ((d.value ?? 0) / total) * 100;
                      return (
                        <motion.div key={i} className="overflow-hidden"
                          style={{ width: `${pct}%` }}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          transition={{ delay: 0.7 + i * 0.14 }}>
                          <span className="num text-[9px] tabular-nums" style={{ color: PIE_COLORS[i] }}>
                            {pct.toFixed(0)}%
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Per-allocation rows with pulsing dot + progress */}
                  <div className="space-y-3">
                    {fundAllocData.map((d, i) => {
                      const pct = ((d.value ?? 0) / total) * 100;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -12, filter: "blur(4px)" }}
                          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                          transition={{ duration: 0.55, delay: 0.5 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                          className="space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <motion.span
                                className="shrink-0 w-2 h-2 rounded-sm"
                                style={{ background: PIE_COLORS[i] }}
                                animate={{
                                  boxShadow: [
                                    `0 0 0px ${PIE_COLORS[i]}`,
                                    `0 0 9px ${PIE_COLORS[i]}`,
                                    `0 0 0px ${PIE_COLORS[i]}`,
                                  ],
                                }}
                                transition={{ duration: 2.4 + i * 0.35, repeat: Infinity, ease: "easeInOut" }}
                              />
                              <span className="text-xs text-foreground/90 font-medium truncate">{d.name}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="num text-xs font-semibold tabular-nums" style={{ color: PIE_COLORS[i] }}>
                                <CountUp end={(d.value ?? 0) / 1e6} prefix="$" suffix="M" decimals={1}
                                  duration={1 + i * 0.15} preserveValue />
                              </span>
                            </div>
                          </div>
                          <div className="h-[3px] rounded-full bg-border/25 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: `linear-gradient(90deg, ${PIE_COLORS[i]}, ${PIE_COLORS[i]}66)` }}
                              initial={{ width: "0%" }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 1.0, delay: 0.6 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })() : (
              <Skeleton className="h-[280px] w-full" />
            )}
          </TechChartCard>
        </div>

        {/* Row 2: Node Comparison + Deflation Curve */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Chart 3: Node Returns by Stage */}
          <TechChartCard
            icon={TrendingUp}
            title={isEn ? "Node Returns / Stage" : `${t("mr.rune.chart.nodeCompare")}${isZh ? " · Node Returns / Stage" : ""}`}
            subtitle={t("mr.rune.chart.nodeCompare.sub")}
            accent="amber-500"
            delay={0.25}
          >
            {nodeCompareData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={nodeCompareData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                  <defs>
                    {(overview?.nodes ?? []).map((n, i) => (
                      <linearGradient key={n.level} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={Object.values(C).slice(0,4)[i]} stopOpacity={0.32} />
                        <stop offset="95%" stopColor={Object.values(C).slice(0,4)[i]} stopOpacity={0}    />
                      </linearGradient>
                    ))}
                    <filter id="lineGlow">
                      <feGaussianBlur stdDeviation="1.4" result="b" />
                      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v/1e3).toFixed(0)}K` : `$${v}`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [`$${fmt(v, 0)}`, name]} animationDuration={180} />
                  <Legend wrapperStyle={{ fontSize: 11, color: C.muted, paddingTop: 4 }} iconType="circle" />
                  {(overview?.nodes ?? []).map((n, i) => (
                    <Area key={n.level} type="monotone" dataKey={n.level} name={nodeName(n)}
                      stroke={Object.values(C)[i]} strokeWidth={2.2}
                      fill={`url(#grad-${i})`} dot={false}
                      style={{ filter: "url(#lineGlow)" }}
                      animationDuration={1300} animationBegin={i * 120 + 200} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-[260px] w-full" />
            )}
          </TechChartCard>

          {/* Chart 4: Sub-token Deflation Curve */}
          <TechChartCard
            icon={Flame}
            title={isEn ? "Deflation Curve" : `${t("mr.rune.chart.deflation")}${isZh ? " · Deflation Curve" : ""}`}
            subtitle={t("mr.rune.chart.deflation.sub")}
            accent="orange-500"
            delay={0.35}
          >
            {deflationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={deflationData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="gradCirc"  x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.sub}    stopOpacity={0.4} />
                      <stop offset="95%" stopColor={C.sub}    stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="gradBurn"  x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(0,80%,55%)" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="hsl(0,80%,55%)" stopOpacity={0}   />
                    </linearGradient>
                    <filter id="burnGlow">
                      <feGaussianBlur stdDeviation="1.4" result="b" />
                      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${(v/1e6).toFixed(1)}M`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [`${(v/1e6).toFixed(3)}M ${isEn ? "tokens" : t("mr.rune.kpi.tokensUnit")}`, name]} animationDuration={180} />
                  <Legend wrapperStyle={{ fontSize: 11, color: C.muted, paddingTop: 4 }} iconType="circle" />
                  <Area type="monotone" dataKey="circulating" name={isEn ? "Circulating" : (t("metrics.circulation") || "Circulating")} stroke={C.sub} strokeWidth={2.4} fill="url(#gradCirc)" dot={false}
                    style={{ filter: "url(#burnGlow)" }}
                    animationDuration={1400} animationBegin={200} />
                  <Area type="monotone" dataKey="burned"      name={isEn ? "Burned"      : (t("metrics.burned")      || "Burned")}      stroke="hsl(0,80%,55%)" strokeWidth={1.8} fill="url(#gradBurn)" dot={false} strokeDasharray="4 2"
                    style={{ filter: "url(#burnGlow)" }}
                    animationDuration={1400} animationBegin={400} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-[260px] w-full" />
            )}
          </TechChartCard>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          CALCULATOR SECTION — 节点收益模拟器
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.25 }}
        className="space-y-6">

        <div className="border-b border-border/40 pb-4">
          <div className="border-l-[3px] border-primary pl-4">
            {!isEn && <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/60 block mb-0.5">{t("mr.rune.section.simulator.eyebrow")}</span>}
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {isEn ? "Node Yield Simulator" : isZh ? `${t("mr.rune.section.simulator.title")} · Node Yield Simulator` : t("mr.rune.section.simulator.title")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("mr.rune.section.simulator.desc")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Left: Node Cards + Params */}
          <div className="lg:col-span-2 space-y-6">

            {/* Node tier selection */}
            {(overview?.nodes?.length) ? (
              <div>
                <SectionTitle icon={Coins} i18nKey="mr.rune.select.node" en="Select Node Tier" />
                <div className="grid grid-cols-2 gap-3">
                  {(overview.nodes ?? []).map(node => {
                    const color  = (C as Record<string,string>)[node.level] ?? C.pioneer;
                    const isOn   = nodeLevel === node.level;
                    const apy    = ((node.dailyUsdt * 365) / node.investment * 100).toFixed(2);
                    return (
                      <button key={node.level}
                        onClick={() => { setNodeLevel(node.level as RuneCalculatorInputNodeLevel); setSeats(1); calcMutation.reset(); }}
                        style={isOn ? {
                          boxShadow: `0 8px 24px -6px ${color}55, 0 0 0 1px ${color}80, inset 0 1px 0 0 ${color}40, inset 0 -12px 24px -12px ${color}30`,
                          borderColor: `${color}90`,
                        } : undefined}
                        className={`relative text-left p-4 rounded-xl border bg-gradient-to-br transition-all duration-300 overflow-hidden ${NODE_BG[node.level]} ${
                          isOn
                            ? `${NODE_RING[node.level]} -translate-y-0.5 scale-[1.02] z-10`
                            : "opacity-50 saturate-50 blur-[0.5px] hover:opacity-80 hover:saturate-100 hover:blur-0 hover:brightness-110"
                        }`}
                      >
                        {/* Selected glow line */}
                        {isOn && <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-80" style={{ color }} />}

                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color }}>{nodeName(node)}</span>
                          {isOn ? <BadgeCheck className="h-3.5 w-3.5" style={{ color }} /> : <span className="text-[9px] uppercase tracking-widest text-muted-foreground/40 font-medium">{node.nameEn}</span>}
                        </div>
                        <p className="num text-xl mt-0.5">${node.investment.toLocaleString()}</p>

                        {/* APY badge */}
                        <div className="mt-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 num-sm border" style={{ color, borderColor: `${color}40`, background: `${color}12` }}>
                          APY {apy}%
                        </div>

                        <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-2 gap-x-2 gap-y-0.5">
                          <p className="text-[10px] text-muted-foreground">{isEn ? "Daily USDT" : t("mr.rune.table.dailyUsdt")} <span className="num num-sm" style={{ color }}>${node.dailyUsdt}</span></p>
                          <p className="text-[10px] text-muted-foreground">{isEn ? "Seats" : t("mr.rune.table.seats")} <span className="num num-sm text-foreground">{node.seats}</span></p>
                          <p className="text-[10px] text-muted-foreground col-span-2">{isEn ? "Private" : t("mr.rune.table.privatePrice")} <span className="num num-sm text-foreground">${node.privatePrice}</span></p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Params card */}
            <Card className="bg-card/80 backdrop-blur border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  {isEn ? "Parameters" : t("mr.rune.select.params")}
                  {isZh && <span className="text-xs text-muted-foreground font-normal ml-1">· Parameters</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Seats */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-medium text-foreground">
                      {isEn ? "Seats" : t("mr.rune.input.seats")}
                      {isZh && <span className="text-xs text-muted-foreground font-normal ml-1">Seats</span>}
                    </Label>
                    <span className="num text-lg text-primary">{seats} {isEn ? "seats" : t("mr.rune.input.seatsUnit")}</span>
                  </div>
                  <Slider value={[seats]} min={1} max={Math.min(selectedNode?.seats ?? 10, 20)} step={1}
                    onValueChange={v => { setSeats(v[0]); calcMutation.reset(); }} className="py-2" />
                  <p className="text-xs text-muted-foreground text-right">
                    {isEn ? "Total Investment" : t("mr.rune.input.totalInvest")} <span className="num text-foreground">
                      ${selectedNode ? (selectedNode.investment * seats).toLocaleString() : "—"} USDT
                    </span>
                  </p>
                </div>

                {/* Duration */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-medium text-foreground">
                      {isEn ? "Duration" : t("mr.rune.input.duration")}
                      {isZh && <span className="text-xs text-muted-foreground font-normal ml-1">Duration</span>}
                    </Label>
                    <span className="num text-lg">{durationDays}{isEn ? "d" : t("mr.rune.kpi.daysUnit")} / ≈{Math.round(durationDays/30)}{isEn ? "mo" : t("mr.rune.input.months")}</span>
                  </div>
                  <Slider value={[durationDays]} min={30} max={720} step={30}
                    onValueChange={v => { setDurationDays(v[0]); calcMutation.reset(); }} className="py-2" />
                </div>

                {/* Price stage selector */}
                {(overview?.priceStages?.length) ? (
                  <div className="space-y-2">
                    <Label className="text-base font-medium text-foreground">
                      {isEn ? "Target Stage" : t("mr.rune.input.targetStage")}
                      {isZh && <span className="text-xs text-muted-foreground font-normal ml-1">Target Stage</span>}
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {(overview.priceStages ?? []).map((s, i) => (
                        <button key={i} onClick={() => { setPriceStageIndex(i); calcMutation.reset(); }}
                          className={`text-left p-2.5 rounded-lg border transition-all active:scale-[0.98] ${priceStageIndex === i ? "border-primary bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_4px_14px_-4px_hsl(var(--primary)/0.45)]" : "border-border/50 hover:border-border hover:-translate-y-[1px]"}`}>
                          <p className="text-xs text-muted-foreground leading-tight mb-0.5">{stageLabel(s, i)}</p>
                          <p className="num text-sm text-foreground">${s.motherPrice}</p>
                          {s.multiplier > 1 && <p className="text-green-400 num text-xs">{s.multiplier}×</p>}
                        </button>
                      ))}
                    </div>
                    {selectedStagePreview && isZh && (
                      <p className="text-xs text-muted-foreground px-1">{selectedStagePreview.trigger}</p>
                    )}
                  </div>
                ) : null}

                <Button className="w-full font-bold tracking-wide shadow-[0_0_28px_hsl(38,92%,50%,0.35)] bg-gradient-to-r from-primary to-primary hover:from-primary/90 hover:to-primary/80 text-primary-foreground"
                  onClick={() => calcMutation.mutate({ data: { nodeLevel, seats, durationDays, priceStageIndex } })}
                  disabled={calcMutation.isPending}>
                  {calcMutation.isPending
                    ? (isEn ? "Calculating…" : t("mr.rune.btn.simulating"))
                    : bi("mr.rune.btn.simulate", "Run Simulation")}
                  {!calcMutation.isPending && <ChevronRight className="h-4 w-4 ml-1" />}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-3 space-y-6">
            <AnimatePresence mode="wait">
              {calcMutation.data ? (
                <motion.div key="results" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }} className="space-y-6">

                  {/* KPI cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="col-span-2 md:col-span-3 p-5 rounded-xl border border-green-700/40 bg-gradient-to-br from-green-950/50 to-transparent shadow-[0_0_24px_hsl(142,70%,45%,0.1)]">
                      <p className="text-[11px] text-green-400 uppercase tracking-widest font-semibold mb-1">
                        {bi("mr.rune.kpi.totalAssets", "Total Assets")}
                      </p>
                      <div className="flex items-end gap-4 flex-wrap">
                        <p className="num-shimmer text-4xl">${fmt(calcMutation.data.totalAssets)}</p>
                        <div className="mb-1 flex gap-3 flex-wrap">
                          <span className="text-sm bg-green-900/50 text-green-300 border border-green-700/40 px-2.5 py-0.5 rounded-full num num-sm">ROI {fmt(calcMutation.data.roi)}%</span>
                          <span className="text-sm bg-blue-900/50 text-blue-300 border border-blue-700/40 px-2.5 py-0.5 rounded-full num num-sm">{fmt(calcMutation.data.roiMultiplier)}× {isEn ? "Principal" : t("mr.rune.kpi.principalMultiple")}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {overview?.priceStages?.[priceStageIndex] ? stageLabel(overview.priceStages[priceStageIndex], priceStageIndex) : ""} {isEn ? "stage" : t("mr.rune.kpi.stage")} · {isEn ? "investment" : t("mr.rune.kpi.invest")} <span className="num">${fmt(calcMutation.data.investment)}</span>
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                      <p className="text-[10px] text-primary uppercase tracking-wider mb-1">{isEn ? "Mother Token Value" : t("mr.rune.kpi.motherValue")}</p>
                      <p className="num text-lg">${fmt(calcMutation.data.motherTokenValue)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5"><span className="num">{calcMutation.data.motherTokens.toLocaleString()}</span> {isEn ? "tokens" : t("mr.rune.kpi.tokensUnit")}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-orange-800/30 bg-orange-950/20">
                      <p className="text-[10px] text-orange-400 uppercase tracking-wider mb-1">{isEn ? "Mother Token Airdrop" : t("mr.rune.kpi.airdropValue")}</p>
                      <p className="num text-lg text-orange-300">${fmt(calcMutation.data.airdropTokenValue)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5"><span className="num">{calcMutation.data.airdropTokens.toLocaleString()}</span> {isEn ? "tokens" : t("mr.rune.kpi.tokensUnit")}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-green-800/30 bg-green-950/20">
                      <p className="text-[10px] text-green-400 uppercase tracking-wider mb-1">{isEn ? "USDT Income" : t("mr.rune.kpi.usdtIncome")}</p>
                      <p className="num text-lg text-green-300">${fmt(calcMutation.data.totalUsdtIncome)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        <span className="num">${fmt(calcMutation.data.dailyUsdt)}</span>{isEn ? "/day" : t("mr.rune.kpi.perDay")} × <span className="num">{calcMutation.data.durationDays}</span>{isEn ? "d" : t("mr.rune.kpi.daysUnit")}
                      </p>
                    </div>
                  </div>

                  {/* Result chart: pie + bar side by side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Asset breakdown pie */}
                    <TechChartCard
                      icon={PieIcon}
                      title={bi("mr.rune.chart.assetBreakdown", "Asset Breakdown")}
                      accent="primary"
                      delay={0.05}
                    >
                      <div className="relative">
                        <ResponsiveContainer width="100%" height={170}>
                          <PieChart>
                            <defs>
                              {RESULT_COLORS.map((c, i) => (
                                <radialGradient key={i} id={`resPieGrad-${i}`} cx="50%" cy="50%" r="50%">
                                  <stop offset="0%"  stopColor={c} stopOpacity={1}   />
                                  <stop offset="100%" stopColor={c} stopOpacity={0.55} />
                                </radialGradient>
                              ))}
                            </defs>
                            <Pie data={resultPieData} cx="50%" cy="50%" innerRadius={48} outerRadius={75}
                              dataKey="value" nameKey="name" paddingAngle={4}
                              stroke="hsl(230,30%,8%)" strokeWidth={2}
                              animationDuration={1000} animationBegin={150}>
                              {resultPieData.map((_, i) => (
                                <Cell key={i} fill={`url(#resPieGrad-${i})`} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle.contentStyle}
                              formatter={(v: number, name: string) => [`$${fmt(v, 0)}`, name]} animationDuration={180} />
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Center total */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="text-center">
                            <div className="text-[8px] uppercase tracking-widest text-muted-foreground/60">Total</div>
                            <div className="num text-sm text-foreground/90">
                              ${fmt(resultPieData.reduce((s, d) => s + (d.value ?? 0), 0), 0)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5 mt-3">
                        {resultPieData.map((d, i) => {
                          const total = resultPieData.reduce((s, x) => s + (x.value ?? 0), 0) || 1;
                          const pct   = ((d.value ?? 0) / total) * 100;
                          return (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.4, delay: 0.5 + i * 0.08 }}
                              className="flex items-center justify-between text-xs gap-2"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="h-2 w-2 rounded-full shrink-0 shadow-[0_0_6px_currentColor]" style={{ background: RESULT_COLORS[i], color: RESULT_COLORS[i] }} />
                                <span className="text-muted-foreground truncate">{d.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-muted-foreground/60 num tabular-nums">{pct.toFixed(0)}%</span>
                                <span className="num font-semibold text-foreground/90 tabular-nums">${fmt(d.value, 0)}</span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </TechChartCard>

                    {/* Stage ROI bar chart: show all stages for this node */}
                    <TechChartCard
                      icon={BarChart2}
                      title={bi("mr.rune.chart.stageForecast", "Stage Forecast")}
                      accent="amber-500"
                      delay={0.15}
                    >
                      {selectedNode && (overview?.priceStages?.length) ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart
                            data={(overview.priceStages ?? []).map((s, i) => ({
                              label: stageLabel(s, i),
                              // Airdrop is mother-token, so it prices off motherPrice (not subPrice).
                              totalAssets: Math.round(
                                selectedNode.motherTokensPerSeat * seats * s.motherPrice +
                                selectedNode.airdropPerSeat      * seats * s.motherPrice +
                                selectedNode.dailyUsdt           * seats * durationDays
                              ),
                              isActive: i === priceStageIndex,
                            }))}
                            margin={{ top: 8, right: 8, left: -10, bottom: 4 }}
                          >
                            <defs>
                              <linearGradient id="stageActiveBar" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor="hsl(38,92%,60%)" stopOpacity={1}    />
                                <stop offset="100%" stopColor="hsl(38,92%,50%)" stopOpacity={0.4}  />
                              </linearGradient>
                              <linearGradient id="stageIdleBar" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor="hsl(217,55%,42%)" stopOpacity={0.85} />
                                <stop offset="100%" stopColor="hsl(217,55%,32%)" stopOpacity={0.3}  />
                              </linearGradient>
                              <filter id="activeBarGlow">
                                <feGaussianBlur stdDeviation="2.5" result="b" />
                                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                              </filter>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                            <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 9 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: C.muted, fontSize: 9 }} axisLine={false} tickLine={false}
                              tickFormatter={v => v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : `$${(v/1e3).toFixed(0)}K`} />
                            <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${fmt(v,0)}`, isEn ? "Total Assets" : t("mr.rune.kpi.totalAssets")]} animationDuration={180} />
                            <Bar dataKey="totalAssets" name={isEn ? "Total Assets" : t("mr.rune.kpi.totalAssets")} radius={[6,6,0,0]} maxBarSize={40}
                              animationDuration={1100} animationBegin={250}>
                              {(overview.priceStages ?? []).map((_, i) => (
                                <Cell key={i}
                                  fill={i === priceStageIndex ? "url(#stageActiveBar)" : "url(#stageIdleBar)"}
                                  style={i === priceStageIndex ? { filter: "url(#activeBarGlow)" } : undefined}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : null}
                      {/* Stage legend strip */}
                      <div className="flex items-center justify-center gap-4 mt-1 text-[10px] text-muted-foreground/70">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-sm shadow-[0_0_8px_hsl(38,92%,55%)]" style={{ background: "hsl(38,92%,55%)" }} />
                          <span>{isEn ? "Selected stage" : t("mr.rune.kpi.stage") + (isEn ? "" : " · 当前")}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-sm" style={{ background: "hsl(217,55%,40%)" }} />
                          <span>{isEn ? "Other stages" : "其他阶段"}</span>
                        </div>
                      </div>
                    </TechChartCard>
                  </div>

                  {/* Detail table */}
                  <Card className="bg-card/80 backdrop-blur border-border shadow-sm overflow-hidden">
                    <div className="bg-muted/20 border-b border-border/50 px-5 py-3">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" />
                        {isEn ? "Full Breakdown" : t("mr.rune.table.breakdown")}
                        {isZh && <span className="text-xs text-muted-foreground font-normal ml-1">· Full Breakdown</span>}
                      </h3>
                    </div>
                    <CardContent className="p-0">
                      <table className="w-full text-sm">
                        <tbody>
                          {calcMutation.data.breakdown.map((item, i) => (
                            <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors">
                              <td className="py-2.5 px-5 text-muted-foreground">
                                {item.label}
                                {isZh && item.labelCn && <span className="ml-2 text-[10px] opacity-50">{item.labelCn}</span>}
                              </td>
                              <td className="py-2.5 px-5 text-right font-mono font-medium">{item.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Card className="bg-card/80 backdrop-blur border-border shadow-sm min-h-[420px] flex items-center justify-center">
                    <div className="text-center text-muted-foreground p-12 flex flex-col items-center gap-5">
                      <div className="w-20 h-20 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center">
                        <BarChart2 className="h-9 w-9 opacity-20" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground/60">{t("mr.rune.placeholder.title")}</p>
                        {isZh && <p className="text-sm opacity-60">Select node tier and parameters, then run simulation</p>}
                      </div>
                      <div className="grid grid-cols-3 gap-6 mt-2 text-center">
                        {[
                          { key: "mr.rune.placeholder.stepTier",   en: "Pick Tier"   },
                          { key: "mr.rune.placeholder.stepParams", en: "Set Params" },
                          { key: "mr.rune.placeholder.stepCharts", en: "View Charts" },
                        ].map((s, i) => (
                          <div key={s.key}>
                            <p className="text-xs text-muted-foreground">{isEn ? `Step ${i + 1}` : `${t("mr.rune.placeholder.stepLabel")} ${i + 1}`}</p>
                            <p className="text-xs font-semibold mt-0.5">{isEn ? s.en : t(s.key)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Node comparison table */}
            {(overview?.nodes?.length) ? (
              <Card className="bg-card/80 backdrop-blur border-border shadow-sm overflow-hidden">
                <div className="bg-muted/20 border-b border-border/50 px-5 py-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    {isEn ? "Node Parameters" : t("mr.rune.table.nodeParams")}
                    {isZh && <span className="text-xs text-muted-foreground font-normal ml-1">· Node Parameters</span>}
                  </h3>
                </div>

                {/* ── Desktop table (md+) ── */}
                <CardContent className="p-0 overflow-x-auto hidden md:block">
                  <table className="w-full text-xs min-w-[560px]">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/10">
                        {[
                          { key: "mr.rune.table.node",         en: "Node",         align: "left"  as const },
                          { key: "mr.rune.table.invest",       en: "Investment",   align: "right" as const },
                          { key: "mr.rune.table.privatePrice", en: "Private",      align: "right" as const },
                          { key: "mr.rune.token.mother",       en: "Mother Token", align: "right" as const },
                          { key: "mr.rune.table.airdrop",      en: "Airdrop",      align: "right" as const },
                          { key: "mr.rune.table.dailyUsdt",    en: "Daily USDT",   align: "right" as const },
                          { key: "mr.rune.table.seats",        en: "Seats",        align: "right" as const },
                        ].map(h => (
                          <th key={h.key} className={`py-2.5 px-4 text-muted-foreground font-medium tracking-wider text-[10px] uppercase ${h.align === "left" ? "text-left" : "text-right"}`}>
                            {isEn ? h.en : t(h.key)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(overview.nodes ?? []).map(node => {
                        const color = (C as Record<string,string>)[node.level] ?? C.pioneer;
                        return (
                          <tr key={node.level}
                            onClick={() => { setNodeLevel(node.level as RuneCalculatorInputNodeLevel); setSeats(1); calcMutation.reset(); }}
                            className={`border-b border-border/30 last:border-0 cursor-pointer transition-colors ${nodeLevel === node.level ? "bg-primary/5" : "hover:bg-muted/10"}`}>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: color }} />
                                <span className="font-medium" style={{ color }}>{nodeName(node)}</span>
                                <span className="text-muted-foreground text-[10px]">{node.nameEn}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold">${node.investment.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-mono">${node.privatePrice}</td>
                            <td className="py-3 px-4 text-right font-mono">{node.motherTokensPerSeat.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-mono">{node.airdropPerSeat.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-mono font-semibold" style={{ color }}>${node.dailyUsdt}</td>
                            <td className="py-3 px-4 text-right font-mono text-muted-foreground">{node.seats}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>

                {/* ── Mobile cards (< md) ── */}
                <div className="md:hidden divide-y divide-border/30">
                  {(overview.nodes ?? []).map(node => {
                    const color = (C as Record<string,string>)[node.level] ?? C.pioneer;
                    const isSelected = nodeLevel === node.level;
                    return (
                      <div
                        key={node.level}
                        onClick={() => { setNodeLevel(node.level as RuneCalculatorInputNodeLevel); setSeats(1); calcMutation.reset(); }}
                        className={`px-4 py-4 cursor-pointer transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/10"}`}
                      >
                        {/* Node name header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                            <span className="font-semibold text-sm" style={{ color }}>{nodeName(node)}</span>
                            <span className="text-muted-foreground text-[10px] uppercase tracking-wider">{node.nameEn}</span>
                          </div>
                          {isSelected && (
                            <span className="text-[9px] uppercase tracking-widest text-primary border border-primary/30 rounded px-1.5 py-0.5">
                              {isEn ? "Selected" : t("mr.rune.table.selected")}
                            </span>
                          )}
                        </div>

                        {/* Primary metrics row */}
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          <div className="bg-muted/20 rounded-lg px-3 py-2">
                            <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">{isEn ? "Investment" : t("mr.rune.table.invest")}</div>
                            <div className="num text-sm text-foreground">${node.investment.toLocaleString()}</div>
                          </div>
                          <div className="bg-muted/20 rounded-lg px-3 py-2">
                            <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">{isEn ? "Daily USDT" : t("mr.rune.table.dailyUsdt")}</div>
                            <div className="num text-sm" style={{ color }}>${node.dailyUsdt}</div>
                          </div>
                          <div className="bg-muted/20 rounded-lg px-3 py-2">
                            <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">{isEn ? "Seats" : t("mr.rune.table.seats")}</div>
                            <div className="num text-sm text-foreground">{node.seats}</div>
                          </div>
                        </div>

                        {/* Secondary metrics row */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="px-3 py-1.5 border border-border/30 rounded-lg">
                            <div className="text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">{isEn ? "Private" : t("mr.rune.table.privatePrice")}</div>
                            <div className="num text-xs text-muted-foreground">${node.privatePrice}</div>
                          </div>
                          <div className="px-3 py-1.5 border border-border/30 rounded-lg">
                            <div className="text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">{isEn ? "Mother Token" : t("mr.rune.token.mother")}</div>
                            <div className="num text-xs text-muted-foreground">{node.motherTokensPerSeat.toLocaleString()}</div>
                          </div>
                          <div className="px-3 py-1.5 border border-border/30 rounded-lg">
                            <div className="text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">{isEn ? "Airdrop" : t("mr.rune.table.airdrop")}</div>
                            <div className="num text-xs text-muted-foreground">{node.airdropPerSeat.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
