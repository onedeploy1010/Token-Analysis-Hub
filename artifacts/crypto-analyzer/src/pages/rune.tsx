import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
function SectionTitle({ icon: Icon, en, cn }: { icon: React.ElementType; en: string; cn: string }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
      <Icon className="h-4 w-4 text-primary" />
      {cn} · <span className="text-muted-foreground/60">{en}</span>
    </h2>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Rune() {
  const { data: overview, isLoading } = useGetRuneOverview();

  const [nodeLevel, setNodeLevel]   = useState<RuneCalculatorInputNodeLevel>(RuneCalculatorInputNodeLevel.pioneer);
  const [seats,     setSeats]       = useState(1);
  const [durationDays, setDurationDays] = useState(180);
  const [priceStageIndex, setPriceStageIndex] = useState(3);
  const calcMutation = useCalculateRuneReturns();

  const selectedNode         = overview?.nodes?.find(n => n.level === nodeLevel);
  const selectedStagePreview = overview?.priceStages?.[priceStageIndex];

  // ── Derived chart data ────────────────────────────────────────────────────
  const priceStageChartData = useMemo(() =>
    (overview?.priceStages ?? []).map(s => ({
      label: s.labelCn,
      母TOKEN: s.motherPrice,
      子TOKEN: s.subPrice,
      倍数: s.multiplier,
    })), [overview]);

  const nodeCompareData = useMemo(() => {
    const stages = overview?.priceStages ?? [];
    const nodes  = overview?.nodes       ?? [];
    return stages.map(stage => {
      const row: Record<string, string | number> = { label: stage.labelCn };
      nodes.forEach(n => {
        const motherVal   = n.motherTokensPerSeat * stage.motherPrice;
        const airdropVal  = n.airdropPerSeat      * stage.subPrice;
        const usdtVal     = n.dailyUsdt * 180;
        const total       = motherVal + airdropVal + usdtVal;
        row[n.nameCn]     = Math.round(total);
      });
      return row;
    });
  }, [overview]);

  const deflationData = useMemo(() => {
    const total      = overview?.subToken?.totalSupply ?? 13_100_000;
    const burnRate   = overview?.subToken?.dailyBurnRate ?? 0.002;
    const months     = [0,1,2,3,4,5,6,9,12,15,18,21,24];
    return months.map(m => ({
      month: `${m}月`,
      流通量: Math.round(total * Math.pow(1 - burnRate, m * 30)),
      燃烧量: Math.round(total - total * Math.pow(1 - burnRate, m * 30)),
    }));
  }, [overview]);

  const fundAllocData = useMemo(() => {
    const f = overview?.fundraising;
    if (!f) return [];
    return [
      { name: "TLP流动池",  value: f.tlpPool,    label: "TLP 母TOKEN底池" },
      { name: "运营资金",    value: f.operations, label: "日常运营" },
      { name: "国库资金",    value: f.treasury,   label: "战略储备" },
      { name: "子TOKEN LP", value: f.subTokenLP,  label: "子币流动性" },
    ];
  }, [overview]);

  const resultPieData = calcMutation.data ? [
    { name: "母TOKEN市值",  value: calcMutation.data.motherTokenValue  },
    { name: "子TOKEN空投",  value: calcMutation.data.airdropTokenValue },
    { name: "USDT收益",     value: calcMutation.data.totalUsdtIncome   },
  ] : [];

  const RESULT_COLORS = [C.mother, C.sub, C.usdt];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto px-4 py-8 space-y-10">

      {/* Back link */}
      <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />返回项目库 Back to Projects
      </Link>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
        className="border-b border-border/50 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-14 h-14 rounded-xl overflow-hidden border border-primary/20 shadow-[0_0_18px_rgba(251,191,36,0.2)] shrink-0 bg-black">
            <img src="/rune-logo.png" alt="RUNE Protocol" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-primary/70">节点收益深度分析</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
              RUNE Protocol
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              双TOKEN通缩经济模型 · 四级节点产品 · 六阶价格路线图
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Token Info ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4"><Skeleton className="h-28 rounded-xl" /><Skeleton className="h-28 rounded-xl" /></div>
      ) : (overview?.motherToken && overview?.subToken) ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 to-transparent shadow-[0_0_20px_hsl(217,80%,58%,0.08)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-widest text-primary font-semibold">母TOKEN · Mother Token</span>
              <Flame className="h-4 w-4 text-primary/60" />
            </div>
            <p className="text-5xl font-bold tracking-tight mb-2">{overview.motherToken.symbol}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span>开盘价 <span className="font-mono text-foreground font-semibold">${overview.motherToken.launchPrice}</span></span>
              <span>发行量 <span className="font-mono text-foreground font-semibold">{(overview.motherToken.totalSupply/1e8).toFixed(1)}亿枚</span></span>
              <span>日燃烧 <span className="font-mono text-foreground font-semibold">{(overview.motherToken.dailyBurnRate*100).toFixed(1)}%</span></span>
              <span>24M目标 <span className="font-mono text-green-400 font-semibold">${overview.motherToken.targetPriceLow}~${overview.motherToken.targetPriceHigh}</span></span>
            </div>
          </div>
          <div className="p-5 rounded-xl border border-orange-800/30 bg-gradient-to-br from-orange-950/40 to-transparent">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-widest text-orange-400 font-semibold">子TOKEN · Sub Token</span>
              <TrendingUp className="h-4 w-4 text-orange-400/60" />
            </div>
            <p className="text-5xl font-bold tracking-tight text-orange-300 mb-2">{overview.subToken.symbol}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span>初始价 <span className="font-mono text-foreground font-semibold">${overview.subToken.launchPrice}</span></span>
              <span>发行量 <span className="font-mono text-foreground font-semibold">{(overview.subToken.totalSupply/1e6).toFixed(1)}百万枚</span></span>
              <span>日燃烧 <span className="font-mono text-foreground font-semibold">{(overview.subToken.dailyBurnRate*100).toFixed(1)}%</span></span>
              <span>24M目标 <span className="font-mono text-green-400 font-semibold">${overview.subToken.targetPriceLow}~${overview.subToken.targetPriceHigh}</span></span>
            </div>
          </div>
        </motion.div>
      ) : null}

      {/* ═══════════════════════════════════════════════════════════════════════
          ANALYSIS SECTION — 深度分析图表
      ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.15 }}
        className="space-y-8">

        <div className="flex items-center gap-3 pb-2 border-b border-border/40">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">深度分析 · Market Analysis</h2>
        </div>

        {/* Row 1: Price Stages + Fund Allocation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Chart 1: Price Stage Progression – 2/3 width */}
          <Card className="lg:col-span-2 bg-card/80 backdrop-blur border-border shadow-sm overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary" />
                价格阶段走势图
                <span className="text-xs text-muted-foreground font-normal ml-1">Price Stage Progression</span>
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
                    <Bar dataKey="母TOKEN" fill={C.mother} radius={[4,4,0,0]} maxBarSize={40} />
                    <Bar dataKey="子TOKEN" fill={C.sub}    radius={[4,4,0,0]} maxBarSize={40} />
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
          <Card className="bg-card/80 backdrop-blur border-border shadow-sm overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-primary" />
                资金分配结构
                <span className="text-xs text-muted-foreground font-normal ml-1">Fund Allocation</span>
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
                        <span className="font-mono font-medium">${(d.value/1e6).toFixed(1)}M</span>
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
          <Card className="bg-card/80 backdrop-blur border-border shadow-sm overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                各节点阶段总资产对比
                <span className="text-xs text-muted-foreground font-normal ml-1">Node Returns / Stage</span>
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">基于1席 · 180天USDT收益</p>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
              {nodeCompareData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={nodeCompareData} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                    <defs>
                      {(["符胚","符印","符主","符魂"] as const).map((name, i) => (
                        <linearGradient key={name} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
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
                    {["符胚","符印","符主","符魂"].map((name, i) => (
                      <Area key={name} type="monotone" dataKey={name}
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
          <Card className="bg-card/80 backdrop-blur border-border shadow-sm overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-400" />
                子TOKEN通缩曲线
                <span className="text-xs text-muted-foreground font-normal ml-1">Deflation Curve</span>
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">日燃烧率 0.2% · 24个月通缩进程</p>
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
                    <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [`${(v/1e6).toFixed(3)}M 枚`, name]} />
                    <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} />
                    <Area type="monotone" dataKey="流通量" stroke={C.sub} strokeWidth={2} fill="url(#gradCirc)" dot={false} />
                    <Area type="monotone" dataKey="燃烧量" stroke="hsl(0,80%,55%)" strokeWidth={1.5} fill="url(#gradBurn)" dot={false} strokeDasharray="4 2" />
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

        <div className="flex items-center gap-3 pb-2 border-b border-border/40">
          <BarChart2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">节点收益模拟器 · Node Yield Simulator</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Left: Node Cards + Params */}
          <div className="lg:col-span-2 space-y-6">

            {/* Node tier selection */}
            {(overview?.nodes?.length) ? (
              <div>
                <SectionTitle icon={Coins} en="Select Node Tier" cn="选择节点等级" />
                <div className="grid grid-cols-2 gap-3">
                  {(overview.nodes ?? []).map(node => {
                    const color  = (C as Record<string,string>)[node.level] ?? C.pioneer;
                    const isOn   = nodeLevel === node.level;
                    return (
                      <button key={node.level}
                        onClick={() => { setNodeLevel(node.level as RuneCalculatorInputNodeLevel); setSeats(1); calcMutation.reset(); }}
                        className={`text-left p-4 rounded-xl border bg-gradient-to-br transition-all ${NODE_BG[node.level]} ${isOn ? `ring-2 ${NODE_RING[node.level]}` : ""}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color }}>{node.nameCn}</span>
                          {isOn && <BadgeCheck className="h-3.5 w-3.5" style={{ color }} />}
                        </div>
                        <p className="font-semibold text-sm">{node.nameEn}</p>
                        <p className="font-mono text-xl font-bold mt-1">${node.investment.toLocaleString()}</p>
                        <div className="mt-2 pt-2 border-t border-white/10 space-y-0.5">
                          <p className="text-[10px] text-muted-foreground">私募价 <span className="font-mono text-foreground">${node.privatePrice}</span></p>
                          <p className="text-[10px] text-muted-foreground">日USDT <span className="font-mono font-semibold" style={{ color }}>${node.dailyUsdt}</span></p>
                          <p className="text-[10px] text-muted-foreground">剩余席位 <span className="font-mono text-foreground">{node.seats}</span></p>
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
                  <Activity className="h-4 w-4 text-primary" />模拟参数 · Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Seats */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm text-muted-foreground">席位数量 <span className="text-xs opacity-60">Seats</span></Label>
                    <span className="font-mono text-sm font-bold text-primary">{seats} 席</span>
                  </div>
                  <Slider value={[seats]} min={1} max={Math.min(selectedNode?.seats ?? 10, 20)} step={1}
                    onValueChange={v => { setSeats(v[0]); calcMutation.reset(); }} className="py-2" />
                  <p className="text-[10px] text-muted-foreground text-right">
                    总投入 <span className="font-mono text-foreground font-semibold">
                      ${selectedNode ? (selectedNode.investment * seats).toLocaleString() : "—"} USDT
                    </span>
                  </p>
                </div>

                {/* Duration */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm text-muted-foreground">持仓周期 <span className="text-xs opacity-60">Duration</span></Label>
                    <span className="font-mono text-sm font-bold">{durationDays}天 / ≈{Math.round(durationDays/30)}月</span>
                  </div>
                  <Slider value={[durationDays]} min={30} max={720} step={30}
                    onValueChange={v => { setDurationDays(v[0]); calcMutation.reset(); }} className="py-2" />
                </div>

                {/* Price stage selector */}
                {(overview?.priceStages?.length) ? (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">目标价格阶段 <span className="text-xs opacity-60">Target Stage</span></Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(overview.priceStages ?? []).map((s, i) => (
                        <button key={i} onClick={() => { setPriceStageIndex(i); calcMutation.reset(); }}
                          className={`text-left p-2 rounded-lg border text-[10px] transition-all ${priceStageIndex === i ? "border-primary bg-primary/10" : "border-border/50 hover:border-border"}`}>
                          <p className="text-muted-foreground leading-tight">{s.labelCn}</p>
                          <p className="font-mono font-bold text-foreground">${s.motherPrice}</p>
                          {s.multiplier > 1 && <p className="text-green-400 font-mono">{s.multiplier}×</p>}
                        </button>
                      ))}
                    </div>
                    {selectedStagePreview && (
                      <p className="text-[10px] text-muted-foreground px-1">{selectedStagePreview.trigger}</p>
                    )}
                  </div>
                ) : null}

                <Button className="w-full font-semibold shadow-[0_0_18px_hsl(217,80%,58%,0.25)]"
                  onClick={() => calcMutation.mutate({ data: { nodeLevel, seats, durationDays, priceStageIndex } })}
                  disabled={calcMutation.isPending}>
                  {calcMutation.isPending ? "计算中..." : "开始模拟 Run Simulation"}
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
                      <p className="text-[11px] text-green-400 uppercase tracking-widest font-semibold mb-1">总资产 Total Assets</p>
                      <div className="flex items-end gap-4 flex-wrap">
                        <p className="text-4xl font-bold font-mono text-green-300">${fmt(calcMutation.data.totalAssets)}</p>
                        <div className="mb-1 flex gap-3 flex-wrap">
                          <span className="text-sm bg-green-900/50 text-green-300 border border-green-700/40 px-2.5 py-0.5 rounded-full font-mono font-semibold">ROI {fmt(calcMutation.data.roi)}%</span>
                          <span className="text-sm bg-blue-900/50 text-blue-300 border border-blue-700/40 px-2.5 py-0.5 rounded-full font-mono font-semibold">{fmt(calcMutation.data.roiMultiplier)}× 本金</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {overview?.priceStages?.[priceStageIndex]?.labelCn} 阶段 · 投入 ${fmt(calcMutation.data.investment)}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                      <p className="text-[10px] text-primary uppercase tracking-wider mb-1">母TOKEN市值</p>
                      <p className="font-mono text-lg font-bold">${fmt(calcMutation.data.motherTokenValue)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{calcMutation.data.motherTokens.toLocaleString()} 枚</p>
                    </div>
                    <div className="p-4 rounded-xl border border-orange-800/30 bg-orange-950/20">
                      <p className="text-[10px] text-orange-400 uppercase tracking-wider mb-1">子TOKEN空投</p>
                      <p className="font-mono text-lg font-bold text-orange-300">${fmt(calcMutation.data.airdropTokenValue)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{calcMutation.data.airdropTokens.toLocaleString()} 枚</p>
                    </div>
                    <div className="p-4 rounded-xl border border-green-800/30 bg-green-950/20">
                      <p className="text-[10px] text-green-400 uppercase tracking-wider mb-1">USDT收益</p>
                      <p className="font-mono text-lg font-bold text-green-300">${fmt(calcMutation.data.totalUsdtIncome)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">${fmt(calcMutation.data.dailyUsdt)}/天 × {calcMutation.data.durationDays}天</p>
                    </div>
                  </div>

                  {/* Result chart: pie + bar side by side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Asset breakdown pie */}
                    <Card className="bg-card/80 backdrop-blur border-border shadow-sm overflow-hidden">
                      <CardHeader className="pb-2 border-b border-border/40">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">资产构成 Asset Breakdown</CardTitle>
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
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">各阶段总资产预测</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-3 pb-2">
                        {selectedNode && (overview?.priceStages?.length) ? (
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart
                              data={(overview.priceStages ?? []).map(s => ({
                                label: s.labelCn,
                                总资产: Math.round(
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
                              <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${fmt(v,0)}`, "总资产"]} />
                              <Bar dataKey="总资产" radius={[4,4,0,0]}>
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
                        <Layers className="h-4 w-4 text-primary" />明细拆解 · Full Breakdown
                      </h3>
                    </div>
                    <CardContent className="p-0">
                      <table className="w-full text-sm">
                        <tbody>
                          {calcMutation.data.breakdown.map((item, i) => (
                            <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors">
                              <td className="py-2.5 px-5 text-muted-foreground">
                                {item.label}
                                {item.labelCn && <span className="ml-2 text-[10px] opacity-50">{item.labelCn}</span>}
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
                        <p className="font-medium text-foreground/60">选择节点和参数后点击模拟</p>
                        <p className="text-sm opacity-60">Select node tier and parameters, then run simulation</p>
                      </div>
                      <div className="grid grid-cols-3 gap-6 mt-2 text-center">
                        {["选择节点", "设定参数", "查看图表"].map((s, i) => (
                          <div key={i}>
                            <p className="text-xs text-muted-foreground">第{["一","二","三"][i]}步</p>
                            <p className="text-xs font-semibold mt-0.5">{s}</p>
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
                    <Layers className="h-4 w-4 text-primary" />节点参数总表 · Node Parameters
                  </h3>
                </div>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-xs min-w-[560px]">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/10">
                        {["节点","投资额","私募价","母TOKEN","子TOKEN空投","日USDT","席位"].map(h => (
                          <th key={h} className={`py-2.5 px-4 text-muted-foreground font-medium ${h === "节点" ? "text-left" : "text-right"}`}>{h}</th>
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
                                <span className="font-medium" style={{ color }}>{node.nameCn}</span>
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
              </Card>
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
