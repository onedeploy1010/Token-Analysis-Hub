import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ArrowLeft, BarChart2, Coins, Flame, TrendingUp, Layers,
  Shield, Zap, CircleDollarSign, PieChart as PieIcon, Activity,
} from "lucide-react";
import { Link } from "wouter";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  primary: "hsl(217,80%,58%)",
  green:   "hsl(142,70%,45%)",
  amber:   "hsl(38,92%,50%)",
  purple:  "hsl(280,70%,60%)",
  red:     "hsl(0,72%,55%)",
  cyan:    "hsl(190,80%,50%)",
  grid:    "hsl(217,30%,18%)",
  muted:   "hsl(217,20%,40%)",
};
const PIE_COLORS = [C.primary, C.green, C.amber, C.purple, C.red, C.cyan];

const tooltipStyle = {
  contentStyle: {
    background: "hsl(230,30%,8%)",
    border: "1px solid hsl(217,30%,22%)",
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: "hsl(217,20%,70%)", marginBottom: 4 },
  cursor: { fill: "hsl(217,80%,0.06)" },
};

function fmt(n: number, d = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtPct(n: number) { return (n * 100).toFixed(2) + "%"; }

function SectionTitle({ icon: Icon, en, cn }: { icon: React.ElementType; en: string; cn: string }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
      <Icon className="h-4 w-4 text-primary" />
      {cn} · <span className="text-muted-foreground/60">{en}</span>
    </h2>
  );
}

// ─── Static data (from schema.ts) ────────────────────────────────────────────
const LP_TOKENS        = 100_000;
const DELIVERY_TOKENS  = 10_000_000;
const INITIAL_LP_USDC  = 5_000_000;
const INITIAL_PRICE    = 50;
const AMM_SLIPPAGE     = 0.03;

const stakingPeriods = [
  { days: 30,  dailyRate: 0.005, totalReturn: Math.pow(1.005, 30) - 1, label: "30天" },
  { days: 90,  dailyRate: 0.007, totalReturn: Math.pow(1.007, 90) - 1, label: "90天" },
  { days: 180, dailyRate: 0.01,  totalReturn: 5.9374,                   label: "180天" },
  { days: 360, dailyRate: 0.012, totalReturn: 36,                       label: "360天" },
];

const releaseTaxRules = [
  { label: "24小时", days: 1,  taxRate: 0.20 },
  { label: "7天",    days: 7,  taxRate: 0.10 },
  { label: "15天",   days: 15, taxRate: 0.06 },
  { label: "30天",   days: 30, taxRate: 0.03 },
];

const b18FlowData = [
  { name: "交付合约 Delivery", value: 50, color: C.primary },
  { name: "销毁 Burn",         value: 20, color: C.red },
  { name: "奖励池 Bonus Pool", value: 20, color: C.amber },
  { name: "SPP",               value: 10, color: C.purple },
];

const fundFlowData = [
  { name: "LP 底池",          value: 50, color: C.green },
  { name: "国库 Treasury",    value: 50, color: C.primary },
];

const tokenSupplyData = [
  { name: "LP 流通",  value: LP_TOKENS,       color: C.primary },
  { name: "交付合约", value: DELIVERY_TOKENS,  color: C.cyan },
];

const rewardTiers = [
  { tier: "V1",  staking: 200,   team: 2,    bonus: 10 },
  { tier: "V2",  staking: 500,   team: 5,    bonus: 20 },
  { tier: "V3",  staking: 1000,  team: 10,   bonus: 30 },
  { tier: "V4",  staking: 2000,  team: 30,   bonus: 40 },
  { tier: "V5",  staking: 3000,  team: 100,  bonus: 50 },
  { tier: "V6",  staking: 5000,  team: 250,  bonus: 60 },
  { tier: "V7",  staking: 7000,  team: 500,  bonus: 70 },
  { tier: "V8",  staking: 10000, team: 1000, bonus: 80 },
  { tier: "V9",  staking: 15000, team: 2000, bonus: 90 },
  { tier: "V10", staking: 20000, team: 5000, bonus: 100 },
];

const protocol334 = [
  { name: "国库 Treasury",       value: 40, color: C.primary },
  { name: "动态奖励 Dynamic",    value: 30, color: C.amber },
  { name: "静态奖励 Static",     value: 30, color: C.green },
];

// AMM simulation: 50% of each purchase into LP
function buildPriceSimData() {
  const k = INITIAL_LP_USDC * LP_TOKENS;
  return Array.from({ length: 21 }, (_, i) => {
    const cumInvest  = i * 500_000;
    const newUsdc    = INITIAL_LP_USDC + cumInvest * 0.5;
    const newTokens  = k / newUsdc;
    return {
      invest:   `$${(cumInvest / 1e6).toFixed(1)}M`,
      price:    parseFloat((newUsdc / newTokens).toFixed(2)),
      lpUsdc:   parseFloat((newUsdc / 1e6).toFixed(2)),
      lpTokens: parseFloat((newTokens / 1e3).toFixed(1)),
    };
  });
}
const priceSimData = buildPriceSimData();

const stakingReturnData = stakingPeriods.map((p) => ({
  label:          p.label,
  dailyRate:      parseFloat((p.dailyRate * 100).toFixed(2)),
  totalReturnPct: parseFloat((p.totalReturn * 100).toFixed(1)),
  netReturn90:    parseFloat((p.totalReturn * 100 * 0.97).toFixed(1)),
}));

const releaseTaxData = releaseTaxRules.map((r) => ({
  label:   r.label,
  taxPct:  parseFloat((r.taxRate * 100).toFixed(0)),
  netPct:  parseFloat(((1 - r.taxRate) * 100).toFixed(0)),
}));

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function B18Page() {
  const [investment,      setInvestment]      = useState(5000);
  const [selectedPeriod,  setSelectedPeriod]  = useState(2); // default 180d

  const period = stakingPeriods[selectedPeriod];

  const calc = useMemo(() => {
    const tokensBought  = investment / INITIAL_PRICE;
    const totalTokens   = tokensBought * (1 + period.totalReturn);
    const grossUSDC     = totalTokens * INITIAL_PRICE;
    const taxBest       = grossUSDC * 0.03;
    const netBest       = grossUSDC - taxBest;
    const b18BuybackBest = taxBest / INITIAL_PRICE * (1 - AMM_SLIPPAGE);
    return {
      tokensBought:  +tokensBought.toFixed(2),
      usdcToLP:      investment * 0.5,
      usdcToTreasury:investment * 0.5,
      totalTokens:   +totalTokens.toFixed(2),
      grossUSDC:     +grossUSDC.toFixed(2),
      netBest:       +netBest.toFixed(2),
      roi:           +((netBest / investment - 1) * 100).toFixed(2),
      b18Buyback:    +b18BuybackBest.toFixed(2),
      toDelivery:    +(totalTokens * 0.5).toFixed(2),
      toBurn:        +(totalTokens * 0.2).toFixed(2),
      toBonus:       +(totalTokens * 0.2).toFixed(2),
      toSPP:         +(totalTokens * 0.1).toFixed(2),
    };
  }, [investment, selectedPeriod]);

  const buybackData = releaseTaxRules.map((r) => {
    const grossUSDC  = investment * (1 + period.totalReturn);
    const taxUSDC    = grossUSDC * r.taxRate;
    return {
      label:     r.label,
      taxUSDC:   +taxUSDC.toFixed(0),
      b18Bought: +(taxUSDC / INITIAL_PRICE * (1 - AMM_SLIPPAGE)).toFixed(2),
    };
  });

  const deflationData = Array.from({ length: 25 }, (_, m) => {
    const invested  = 1_000_000 * m;
    const tokens    = invested / INITIAL_PRICE;
    const total     = tokens * (1 + 1.5);
    return {
      month:       `M${m}`,
      burned:      +(total * 0.2 / 1e6).toFixed(3),
      circulating: +((LP_TOKENS + tokens) / 1e6).toFixed(3),
    };
  });

  const fade = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">

        {/* Header */}
        <motion.div initial="hidden" animate="show" variants={fade}>
          <Link href="/projects">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground -ml-2 mb-4">
              <ArrowLeft className="h-4 w-4 mr-1" /> 返回项目列表
            </Button>
          </Link>
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-primary">B</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">B18 Token</h1>
              <p className="text-sm text-muted-foreground">
                DeFi Protocol · Economic Analysis · 经济模型深析
              </p>
              <p className="text-sm text-muted-foreground/70 mt-2 max-w-2xl">
                以 AMM 恒积底池定价为核心，预售零滑点进入，SPP 平衡合约吸收释放抛压，
                334 分配协议确保国库可持续，V1–V10 动态奖励构成完整通缩闭环。
              </p>
            </div>
          </div>
        </motion.div>

        {/* KPIs */}
        <motion.div initial="hidden" animate="show" variants={fade} transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "初始价格",     value: "$50.00",  sub: "预售零滑点",          color: "text-primary" },
            { label: "总供应量",     value: "1,010万", sub: "1000万交付 + 10万LP", color: "text-cyan-400" },
            { label: "初始 LP 底池", value: "$500万",  sub: "10万B18 + 500万USDC", color: "text-green-400" },
            { label: "最高质押回报", value: "3600%",   sub: "360天 1.2%/日",        color: "text-amber-400" },
          ].map((kpi) => (
            <Card key={kpi.label} className="bg-card/60 border-border/40">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">{kpi.sub}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Supply + Fund + Release Flow */}
        <motion.div initial="hidden" animate="show" variants={fade} transition={{ delay: 0.08 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: "代币供应结构 Token Supply", icon: Coins, color: "text-primary",
              data: tokenSupplyData, inner: 45, fmt: (v: number) => `${(v / 1e6).toFixed(2)}M B18` },
            { title: "质押资金流向 Fund Flow",   icon: CircleDollarSign, color: "text-green-400",
              data: fundFlowData,    inner: 0,  fmt: (v: number) => `${v}%` },
            { title: "释放 B18 分配",            icon: Layers, color: "text-amber-400",
              data: b18FlowData,     inner: 40, fmt: (v: number) => `${v}%` },
          ].map((chart) => (
            <Card key={chart.title} className="bg-card/60 border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <chart.icon className={`h-4 w-4 ${chart.color}`} /> {chart.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={chart.data} cx="50%" cy="50%"
                      innerRadius={chart.inner} outerRadius={68}
                      dataKey="value" nameKey="name" paddingAngle={3}>
                      {chart.data.map((d, i) => (
                        <Cell key={i} fill={(d as any).color || PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v: number) => chart.fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1">
                  {chart.data.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: (d as any).color || C.primary }} />
                        {d.name}
                      </span>
                      <span className="text-muted-foreground">{chart.fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Staking Returns + Release Tax */}
        <motion.div initial="hidden" animate="show" variants={fade} transition={{ delay: 0.10 }}>
          <SectionTitle icon={TrendingUp} en="Staking Returns by Period" cn="各周期质押收益" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card/60 border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">总回报率 / 税后净回报 (%)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={stakingReturnData} barCategoryGap="28%">
                    <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.muted }} />
                    <YAxis tick={{ fontSize: 11, fill: C.muted }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => `${fmt(v)}%`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="totalReturnPct" name="总回报率"  fill={C.primary} radius={[4,4,0,0]} />
                    <Bar dataKey="netReturn90"    name="税后净回报(3%)" fill={C.green} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card/60 border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">释放税率 vs 净保留率</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={releaseTaxData} barCategoryGap="28%">
                    <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.muted }} />
                    <YAxis tick={{ fontSize: 11, fill: C.muted }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => `${v}%`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="netPct" name="净保留" fill={C.green} stackId="a" />
                    <Bar dataKey="taxPct" name="税率"   fill={C.red}   stackId="a" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* AMM Price Simulation */}
        <motion.div initial="hidden" animate="show" variants={fade} transition={{ delay: 0.12 }}>
          <SectionTitle icon={Activity} en="AMM Price Simulation (50% LP Model)" cn="AMM 价格模拟" />
          <Card className="bg-card/60 border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                随质押规模增加，LP 底池变化及 B18 价格走势 · k = USDC × B18（恒积公式）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={priceSimData}>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.primary} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="lpGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.green} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="invest" tick={{ fontSize: 10, fill: C.muted }} />
                  <YAxis yAxisId="l" tick={{ fontSize: 10, fill: C.muted }} tickFormatter={(v) => `$${v}`} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: C.muted }}
                    tickFormatter={(v) => `$${v}M`} />
                  <Tooltip {...tooltipStyle}
                    formatter={(v: number, name: string) =>
                      name === "B18价格" ? [`$${fmt(v)}`, name] : [`$${fmt(v)}M`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area yAxisId="l" type="monotone" dataKey="price"  name="B18价格"
                    stroke={C.primary} fill="url(#priceGrad)" strokeWidth={2} dot={false} />
                  <Area yAxisId="r" type="monotone" dataKey="lpUsdc" name="LP USDC规模"
                    stroke={C.green}  fill="url(#lpGrad)"   strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Dynamic Reward Tiers */}
        <motion.div initial="hidden" animate="show" variants={fade} transition={{ delay: 0.14 }}>
          <SectionTitle icon={Zap} en="V1–V10 Dynamic Reward Tiers" cn="动态奖励等级体系" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card/60 border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">各级奖励加成 Bonus Rate (%)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={rewardTiers} barCategoryGap="18%">
                    <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                    <XAxis dataKey="tier" tick={{ fontSize: 10, fill: C.muted }} />
                    <YAxis tick={{ fontSize: 10, fill: C.muted }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => `${v}%`} />
                    <Bar dataKey="bonus" name="加成比例" radius={[4,4,0,0]}>
                      {rewardTiers.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card/60 border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">等级自投门槛 Self-Stake Required (USDC)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={rewardTiers} layout="vertical" barCategoryGap="18%">
                    <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: C.muted }}
                      tickFormatter={(v) => v >= 1000 ? `${v/1000}K` : `${v}`} />
                    <YAxis dataKey="tier" type="category" tick={{ fontSize: 10, fill: C.muted }} width={30} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${fmt(v, 0)}`, "自投门槛"]} />
                    <Bar dataKey="staking" name="自投门槛" fill={C.cyan} radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* 334 Protocol */}
        <motion.div initial="hidden" animate="show" variants={fade} transition={{ delay: 0.16 }}>
          <SectionTitle icon={Shield} en="334 Protocol Distribution" cn="334 分配协议" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card/60 border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">334 国库分配</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={protocol334} cx="50%" cy="50%" outerRadius={65}
                      dataKey="value" nameKey="name" paddingAngle={4}>
                      {protocol334.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v: number) => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1 mt-1">
                  {protocol334.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                        {d.name}
                      </span>
                      <span className="text-muted-foreground">{d.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/60 border-border/40 md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">334 协议规则说明</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { pct: "40%", title: "国库",       desc: "兑付提现 USDC，短缺时承担 40% 缺口", color: C.primary },
                    { pct: "30%", title: "静态奖励",   desc: "固定利率释放，短缺时延迟 30%",       color: C.green },
                    { pct: "30%", title: "动态奖励",   desc: "V1–V10 等级池，短缺时延迟 30%",      color: C.amber },
                  ].map((item) => (
                    <div key={item.title}
                      className="rounded-lg bg-background/40 border border-border/30 p-3 flex flex-col gap-1">
                      <span className="text-lg font-bold" style={{ color: item.color }}>{item.pct}</span>
                      <span className="text-xs font-medium text-foreground">{item.title}</span>
                      <span className="text-xs text-muted-foreground leading-relaxed">{item.desc}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed bg-background/30 rounded-lg p-3 border border-border/20">
                  当国库余额不足时，334 协议自动启动：40% 缺口由国库承担，30% 动态奖励延迟兑付，
                  30% 静态奖励延迟兑付。未决提现进入 433 等待队列，按次序兑付，防止挤兑。
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* ROI Calculator */}
        <motion.div initial="hidden" animate="show" variants={fade} transition={{ delay: 0.18 }}>
          <SectionTitle icon={BarChart2} en="Staking ROI Calculator" cn="质押收益模拟器" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card/60 border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">参数设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>投资金额 Investment</span>
                    <span className="text-primary font-semibold">${investment.toLocaleString()} USDC</span>
                  </div>
                  <Slider value={[investment]} onValueChange={([v]) => setInvestment(v)}
                    min={500} max={100000} step={500} className="my-2" />
                  <div className="flex justify-between text-xs text-muted-foreground/60">
                    <span>$500</span><span>$100,000</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-3">质押周期</p>
                  <div className="grid grid-cols-2 gap-2">
                    {stakingPeriods.map((p, i) => (
                      <button key={i} onClick={() => setSelectedPeriod(i)}
                        className={`rounded-lg border py-2 px-3 text-xs transition-all text-left ${
                          selectedPeriod === i
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/40 text-muted-foreground hover:border-primary/40"
                        }`}>
                        <div className="font-semibold">{p.label}</div>
                        <div className="opacity-70">{(p.dailyRate * 100).toFixed(1)}%/日复利</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground/60 bg-background/30 rounded-lg p-3 border border-border/20 space-y-1">
                  <p>预售价格 $50 · 零滑点进入</p>
                  <p>释放税假设 3%（30天释放窗口）</p>
                  <p>获得代币: {calc.tokensBought.toLocaleString()} B18</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/60 border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">收益预测</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0.5">
                {[
                  { label: "本金投入",            value: `$${fmt(investment)}`,         sub: "USDC",                         color: "text-foreground" },
                  { label: "→ 进入 LP 底池",      value: `$${fmt(calc.usdcToLP)}`,      sub: "50%",                          color: "text-green-400" },
                  { label: "→ 进入国库",           value: `$${fmt(calc.usdcToTreasury)}`,sub: "50%",                          color: "text-primary" },
                  { label: "购入 B18",             value: `${fmt(calc.tokensBought)} B18`,sub: `@ $50`,                       color: "text-cyan-400" },
                  { label: "质押后本利合计",       value: `${fmt(calc.totalTokens)} B18`,sub: `ROI ${fmtPct(period.totalReturn)}`, color: "text-primary" },
                  { label: "总价值 (USDC)",        value: `$${fmt(calc.grossUSDC)}`,     sub: "按预售价 $50",                 color: "text-amber-400" },
                  { label: "税后净收 (30天释放)",  value: `$${fmt(calc.netBest)}`,       sub: "税率 3%",                      color: "text-green-400" },
                  { label: "净收益率",             value: `${fmt(calc.roi)}%`,           sub: `${period.days}天复利`,         color: "text-green-400" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <div className="text-right">
                      <span className={`text-sm font-semibold ${row.color}`}>{row.value}</span>
                      <p className="text-xs text-muted-foreground/60">{row.sub}</p>
                    </div>
                  </div>
                ))}

                <div className="mt-3 rounded-lg bg-background/40 border border-border/20 p-3">
                  <p className="text-xs text-muted-foreground mb-2">释放后 B18 流向分配</p>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { name: "交付合约 50%", val: calc.toDelivery, color: C.primary },
                      { name: "销毁 20%",     val: calc.toBurn,     color: C.red },
                      { name: "奖励池 20%",   val: calc.toBonus,    color: C.amber },
                      { name: "SPP 10%",      val: calc.toSPP,      color: C.purple },
                    ].map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="ml-auto font-mono" style={{ color: d.color }}>
                          {fmt(d.val, 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* SPP Buyback */}
        <motion.div initial="hidden" animate="show" variants={fade} transition={{ delay: 0.20 }}>
          <SectionTitle icon={PieIcon} en="SPP Buyback Simulation" cn="SPP 价格平衡合约" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card/60 border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">税收 USDC → AMM 回购 B18（按释放窗口）</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={buybackData} barCategoryGap="28%">
                    <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.muted }} />
                    <YAxis yAxisId="l" tick={{ fontSize: 10, fill: C.muted }}
                      tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
                    <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: C.muted }}
                      tickFormatter={(v) => `${v}B`} />
                    <Tooltip {...tooltipStyle}
                      formatter={(v: number, name: string) =>
                        name === "税收 USDC" ? [`$${fmt(v, 0)}`, name] : [`${fmt(v, 2)} B18`, name]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="l" dataKey="taxUSDC"   name="税收 USDC"  fill={C.red}    radius={[4,4,0,0]} />
                    <Bar yAxisId="r" dataKey="b18Bought" name="回购 B18"   fill={C.purple} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card/60 border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">SPP 运行逻辑</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                {[
                  { step: "01", title: "税收收集",  desc: "释放时按窗口缴纳 3%–20% USDC 税，全部流入 SPP 合约。", color: C.red },
                  { step: "02", title: "AMM 回购", desc: "SPP 用税收在二级 AMM 底池购 B18，公式：ΔB = Y − k/(X+ΔX)，含 3% 滑点。", color: C.purple },
                  { step: "03", title: "通缩锁定", desc: "购入的 B18 锁定于 SPP 合约（非流通），持续压低流通供应量。", color: C.primary },
                  { step: "04", title: "价格稳定", desc: "LP 中 B18 减少 → k/B18 上升 → 价格提升，对冲释放带来的抛压。", color: C.green },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3">
                    <span className="text-xs font-bold shrink-0 mt-0.5" style={{ color: item.color }}>
                      {item.step}
                    </span>
                    <div>
                      <span className="text-foreground font-medium">{item.title}: </span>
                      {item.desc}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Deflation Curve */}
        <motion.div initial="hidden" animate="show" variants={fade} transition={{ delay: 0.22 }}>
          <SectionTitle icon={Flame} en="Deflation & Supply Simulation" cn="通缩曲线模拟" />
          <Card className="bg-card/60 border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                假设每月 100万 USDC 稳定质押规模，模拟 24 个月累计销毁与流通量变化
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={deflationData}>
                  <defs>
                    <linearGradient id="burnGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.red}  stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.red}  stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="circGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.cyan} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={C.cyan} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: C.muted }} />
                  <YAxis tick={{ fontSize: 10, fill: C.muted }} tickFormatter={(v) => `${v}M`} />
                  <Tooltip {...tooltipStyle}
                    formatter={(v: number, name: string) => [`${fmt(v, 3)}M B18`, name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="burned"      name="累计销毁"
                    stroke={C.red}  fill="url(#burnGrad2)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="circulating" name="流通量"
                    stroke={C.cyan} fill="url(#circGrad2)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}
