import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";
import {
  useGetRuneOverview,
  useCalculateRuneReturns,
  RuneCalculatorInputNodeLevel,
} from "@workspace/api-client-react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        const airdropVal  = n.airdropPerSeat      * stage.subPrice;
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
    { name: isEn ? "Sub Token Airdrop"  : t("mr.rune.kpi.airdropValue"), value: calcMutation.data.airdropTokenValue },
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
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/60 block mb-1">
                {bi("mr.rune.deepAnalysis", "Deep Node Analysis")}
              </span>
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                RUNE Protocol
              </h1>
              <p className="text-sm text-muted-foreground mt-1 tracking-wide">
                {t("mr.rune.heroTagline")}
              </p>
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

        <div className="border-b border-border/40 pb-4">
          <div className="border-l-[3px] border-primary pl-4">
            {!isEn && <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/60 block mb-0.5">{t("mr.rune.section.analysis.eyebrow")}</span>}
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {isEn ? "Market Analysis" : isZh ? `${t("mr.rune.section.analysis.title")} · Market Analysis` : t("mr.rune.section.analysis.title")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("mr.rune.section.analysis.desc")}</p>
          </div>
        </div>

        {/* Row 1: Price Stages + Fund Allocation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Chart 1: Price Stage Progression – 2/3 width */}
          <Card className="lg:col-span-2 bg-card/80 backdrop-blur border-border shadow-sm overflow-hidden border-t-2 border-t-primary/50">
            <CardHeader className="pb-2 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary" />
                {isEn ? "Price Stage Progression" : t("mr.rune.chart.priceStages")}
                {isZh && <span className="text-xs text-muted-foreground font-normal ml-1">Price Stage Progression</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
              {priceStageChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={priceStageChartData} margin={{ top: 4, right: 12, left: -8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                    <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={v => v >= 1 ? `$${v}` : `$${v}`} />
                    <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [`$${fmt(v, v < 1 ? 4 : 2)}`, name]} />
                    <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} />
                    <Bar dataKey="mother" name={isEn ? "Mother Token" : t("mr.rune.token.mother")} fill={C.mother} radius={[4,4,0,0]} maxBarSize={40} />
                    <Bar dataKey="sub"    name={isEn ? "Sub Token"    : t("mr.rune.token.sub")}    fill={C.sub}    radius={[4,4,0,0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center">
                  <Skeleton className="h-full w-full" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chart 2: Fund Allocation – 1/3 width */}
          <Card className="bg-card/80 backdrop-blur border-border shadow-sm overflow-hidden border-t-2 border-t-chart-1/50">
            <CardHeader className="pb-2 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-primary" />
                {isEn ? "Fund Allocation" : t("mr.rune.chart.fundAlloc")}
                {isZh && <span className="text-xs text-muted-foreground font-normal ml-1">Fund Allocation</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
              {fundAllocData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={fundAllocData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                        dataKey="value" nameKey="name" paddingAngle={3}>
                        {fundAllocData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle.contentStyle}
                        formatter={(v: number, name: string) => [`$${(v/1e6).toFixed(2)}M`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {fundAllocData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                          <span className="text-muted-foreground">{d.name}</span>
                        </div>
                        <span className="font-mono font-medium">${((d.value ?? 0)/1e6).toFixed(1)}M</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <Skeleton className="h-[220px] w-full" />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Node Comparison + Deflation Curve */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Chart 3: Node Returns by Stage */}
          <Card className="bg-card/80 backdrop-blur border-border shadow-sm overflow-hidden border-t-2 border-t-amber-500/50">
            <CardHeader className="pb-2 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                {isEn ? "Node Returns / Stage" : t("mr.rune.chart.nodeCompare")}
                {isZh && <span className="text-xs text-muted-foreground font-normal ml-1">Node Returns / Stage</span>}
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">{t("mr.rune.chart.nodeCompare.sub")}</p>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
              {nodeCompareData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={nodeCompareData} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                    <defs>
                      {(overview?.nodes ?? []).map((n, i) => (
                        <linearGradient key={n.level} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={Object.values(C).slice(0,4)[i]} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={Object.values(C).slice(0,4)[i]} stopOpacity={0}    />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                    <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={v => v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v/1e3).toFixed(0)}K` : `$${v}`} />
                    <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [`$${fmt(v, 0)}`, name]} />
                    <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} />
                    {(overview?.nodes ?? []).map((n, i) => (
                      <Area key={n.level} type="monotone" dataKey={n.level} name={nodeName(n)}
                        stroke={Object.values(C)[i]} strokeWidth={2}
                        fill={`url(#grad-${i})`} dot={false} />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Skeleton className="h-[240px] w-full" />
              )}
            </CardContent>
          </Card>

          {/* Chart 4: Sub-token Deflation Curve */}
          <Card className="bg-card/80 backdrop-blur border-border shadow-sm overflow-hidden border-t-2 border-t-orange-500/50">
            <CardHeader className="pb-2 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-400" />
                {isEn ? "Deflation Curve" : t("mr.rune.chart.deflation")}
                {isZh && <span className="text-xs text-muted-foreground font-normal ml-1">Deflation Curve</span>}
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">{t("mr.rune.chart.deflation.sub")}</p>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
              {deflationData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={deflationData} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                    <defs>
                      <linearGradient id="gradCirc"  x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={C.sub}    stopOpacity={0.3} />
                        <stop offset="95%" stopColor={C.sub}    stopOpacity={0}   />
                      </linearGradient>
                      <linearGradient id="gradBurn"  x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="hsl(0,80%,55%)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(0,80%,55%)" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                    <XAxis dataKey="month" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={v => `${(v/1e6).toFixed(1)}M`} />
                    <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [`${(v/1e6).toFixed(3)}M ${isEn ? "tokens" : t("mr.rune.kpi.tokensUnit")}`, name]} />
                    <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} />
                    <Area type="monotone" dataKey="circulating" name={isEn ? "Circulating" : (t("metrics.circulation") || "Circulating")} stroke={C.sub} strokeWidth={2} fill="url(#gradCirc)" dot={false} />
                    <Area type="monotone" dataKey="burned"      name={isEn ? "Burned"      : (t("metrics.burned")      || "Burned")}      stroke="hsl(0,80%,55%)" strokeWidth={1.5} fill="url(#gradBurn)" dot={false} strokeDasharray="4 2" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Skeleton className="h-[240px] w-full" />
              )}
            </CardContent>
          </Card>
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
                        className={`relative text-left p-4 rounded-xl border bg-gradient-to-br transition-all duration-200 overflow-hidden ${NODE_BG[node.level]} ${isOn ? `ring-2 ${NODE_RING[node.level]} shadow-lg` : "hover:brightness-110"}`}
                      >
                        {/* Selected glow line */}
                        {isOn && <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-60" style={{ color }} />}

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
                      <p className="text-[10px] text-orange-400 uppercase tracking-wider mb-1">{isEn ? "Sub Token Airdrop" : t("mr.rune.kpi.airdropValue")}</p>
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
                    <Card className="bg-card/80 backdrop-blur border-border shadow-sm overflow-hidden">
                      <CardHeader className="pb-2 border-b border-border/40">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {bi("mr.rune.chart.assetBreakdown", "Asset Breakdown")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-3 pb-2">
                        <ResponsiveContainer width="100%" height={160}>
                          <PieChart>
                            <Pie data={resultPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                              dataKey="value" nameKey="name" paddingAngle={3}>
                              {resultPieData.map((_, i) => (
                                <Cell key={i} fill={RESULT_COLORS[i]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle.contentStyle}
                              formatter={(v: number, name: string) => [`$${fmt(v, 0)}`, name]} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-1.5">
                          {resultPieData.map((d, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full" style={{ background: RESULT_COLORS[i] }} />
                                <span className="text-muted-foreground">{d.name}</span>
                              </div>
                              <span className="font-mono font-semibold">${fmt(d.value, 0)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Stage ROI bar chart: show all stages for this node */}
                    <Card className="bg-card/80 backdrop-blur border-border shadow-sm overflow-hidden">
                      <CardHeader className="pb-2 border-b border-border/40">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {bi("mr.rune.chart.stageForecast", "Stage Forecast")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-3 pb-2">
                        {selectedNode && (overview?.priceStages?.length) ? (
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart
                              data={(overview.priceStages ?? []).map((s, i) => ({
                                label: stageLabel(s, i),
                                totalAssets: Math.round(
                                  selectedNode.motherTokensPerSeat * seats * s.motherPrice +
                                  selectedNode.airdropPerSeat      * seats * s.subPrice    +
                                  selectedNode.dailyUsdt           * seats * durationDays
                                ),
                              }))}
                              margin={{ top: 4, right: 8, left: -10, bottom: 4 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                              <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 9 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: C.muted, fontSize: 9 }} axisLine={false} tickLine={false}
                                tickFormatter={v => v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : `$${(v/1e3).toFixed(0)}K`} />
                              <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${fmt(v,0)}`, isEn ? "Total Assets" : t("mr.rune.kpi.totalAssets")]} />
                              <Bar dataKey="totalAssets" name={isEn ? "Total Assets" : t("mr.rune.kpi.totalAssets")} radius={[4,4,0,0]}>
                                {(overview.priceStages ?? []).map((_, i) => (
                                  <Cell key={i} fill={i === priceStageIndex ? C.mother : "hsl(217,50%,35%)"} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : null}
                      </CardContent>
                    </Card>
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
