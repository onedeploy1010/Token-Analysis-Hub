import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend as RechartsLegend,
} from "recharts";

/* ── constants ── */
const TIERS = [
  { days: 1,  label: "1天",  labelEn: "1-Day",  dailyRate: 0.0020, monthlyRate: 0.0617 },
  { days: 15, label: "15天", labelEn: "15-Day", dailyRate: 0.0060, monthlyRate: 0.1970 },
  { days: 30, label: "30天", labelEn: "30-Day", dailyRate: 0.0130, monthlyRate: 0.4730 },
] as const;

const STATIC_RATIO  = 0.65;
const BUB_RATIO     = 0.30;
const FEE_RATIO     = 0.05;
const LP_USDT_RATIO = 0.50;
const LP_ATM_RATIO  = 0.50;

type TierIdx = 0 | 1 | 2;

/* ── helpers ── */
const fmt = (n: number, dec = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });

const fmtPct = (n: number) => (n * 100).toFixed(2) + "%";

function calcSinglePeriod(principal: number, tierIdx: TierIdx) {
  const tier      = TIERS[tierIdx];
  const grossPnl  = principal * tier.monthlyRate;
  const net       = grossPnl * (1 - FEE_RATIO);
  const staticInc = net * STATIC_RATIO;
  const bubInc    = net * BUB_RATIO;
  const fee       = grossPnl * FEE_RATIO;
  const total     = principal + net;
  return { gross: grossPnl, net, staticInc, bubInc, fee, total };
}

function buildReinvestRows(
  principal: number,
  tierIdx: TierIdx,
  periods: number,
  reinvest: boolean,
) {
  const rows = [];
  let cap = principal;
  let cumPnl = 0;
  for (let i = 1; i <= periods; i++) {
    const r = calcSinglePeriod(cap, tierIdx);
    cumPnl += r.net;
    rows.push({
      period: i,
      principal: cap,
      grossPnl: r.gross,
      netPnl: r.net,
      cumPnl,
      balance: cap + r.net,
    });
    if (reinvest) cap = cap + r.net;
  }
  return rows;
}

/* ── sub-components ── */
function StatCard({
  label, labelEn, value, sub, highlight = false,
}: { label: string; labelEn: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="relative border border-border/40 bg-card/40 rounded p-3 md:p-4 overflow-hidden group">
      <div className="corner-brackets" />
      <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/55 font-medium mb-1">
        {labelEn} · {label}
      </div>
      <div className={`text-xl font-bold num ${highlight ? "num-gold" : "text-foreground"}`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

/* ── main page ── */
export default function LegendATM() {
  /* single calc state */
  const [principal, setPrincipal] = useState(1000);
  const [tierIdx, setTierIdx] = useState<TierIdx>(2);
  /* reinvest state */
  const [reinvestPrincipal, setReinvestPrincipal] = useState(1000);
  const [reinvestTier, setReinvestTier] = useState<TierIdx>(2);
  const [periods, setPeriods] = useState(6);
  const [autoReinvest, setAutoReinvest] = useState(true);
  /* dual token state */
  const [dualPrincipal, setDualPrincipal] = useState(2000);
  const [atmPrice, setAtmPrice] = useState(1.0);
  const [atmPriceEnd, setAtmPriceEnd] = useState(1.5);

  /* computed */
  const single = useMemo(() => calcSinglePeriod(principal, tierIdx), [principal, tierIdx]);
  const reinvestRows = useMemo(
    () => buildReinvestRows(reinvestPrincipal, reinvestTier, periods, autoReinvest),
    [reinvestPrincipal, reinvestTier, periods, autoReinvest],
  );
  const tier = TIERS[tierIdx];
  const annualSimple = tier.dailyRate * 365 * 100;

  /* dual token computed */
  const usdtLeg   = dualPrincipal * LP_USDT_RATIO;
  const atmLeg    = dualPrincipal * LP_ATM_RATIO;
  const atmUnits  = atmLeg / atmPrice;
  const atmValueEnd = atmUnits * atmPriceEnd;
  const atmGain   = atmValueEnd - atmLeg;
  const dualTier  = TIERS[2];
  const dualGross = dualPrincipal * dualTier.monthlyRate;
  const dualNet   = dualGross * (1 - FEE_RATIO);
  const totalEndValue = usdtLeg + atmValueEnd + dualNet;
  const totalReturn   = totalEndValue - dualPrincipal;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-5xl">

        {/* ── hero ── */}
        <div className="relative border border-primary/20 bg-gradient-to-br from-amber-950/30 via-card/60 to-card rounded-xl p-6 overflow-hidden">
          <div className="animate-scan-line" />
          <div className="corner-brackets" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-primary/60 font-medium mb-1">
                VAULT · 全民做市商系统
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                LEGEND <span className="text-primary">ATM</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                每秒复利 · 非整天结算 · 三档周期可选
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {TIERS.map((t, i) => (
                <div key={i} className="text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.label}</div>
                  <div className="text-lg font-bold num-gold">{(t.monthlyRate * 100).toFixed(2)}%</div>
                  <div className="text-[10px] text-muted-foreground">月化</div>
                </div>
              ))}
            </div>
          </div>

          {/* parameter strip */}
          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-muted-foreground border-t border-border/30 pt-4">
            {[
              ["LP 组成", "50% USDT + 50% ATM"],
              ["静态收益占比", "65%"],
              ["动态 BUB 占比", "30%"],
              ["手续费", "5%"],
              ["强制复投时限", "4 小时"],
              ["结算方式", "每秒复利"],
              ["防暴跌 -5%", "触发救助池"],
              ["防暴跌 -10%", "触发燃烧机制"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border border-border/20 rounded px-2 py-1 bg-black/20">
                <span className="text-muted-foreground/70">{k}</span>
                <span className="font-medium text-foreground">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── tabs ── */}
        <Tabs defaultValue="single">
          <TabsList className="w-full grid grid-cols-4 mb-6">
            <TabsTrigger value="single">单笔计算</TabsTrigger>
            <TabsTrigger value="reinvest">复投分析</TabsTrigger>
            <TabsTrigger value="dual">双币分析</TabsTrigger>
            <TabsTrigger value="params">参数说明</TabsTrigger>
          </TabsList>

          {/* ────────────── TAB 1: Single ────────────── */}
          <TabsContent value="single" className="space-y-6">
            {/* period selector */}
            <div className="grid grid-cols-3 gap-3">
              {TIERS.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setTierIdx(i as TierIdx)}
                  className={`relative border rounded-lg p-4 text-center transition-all ${
                    tierIdx === i
                      ? "border-primary/60 bg-primary/10"
                      : "border-border/30 bg-card/30 hover:border-border/60"
                  }`}
                >
                  {tierIdx === i && <div className="corner-brackets" />}
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                    {t.labelEn}
                  </div>
                  <div className="text-2xl font-bold num-gold">{(t.dailyRate * 100).toFixed(2)}%</div>
                  <div className="text-xs text-muted-foreground">日化收益率</div>
                  <div className="mt-1 text-sm font-semibold text-primary">
                    月化 {(t.monthlyRate * 100).toFixed(2)}%
                  </div>
                </button>
              ))}
            </div>

            {/* principal input */}
            <div className="border border-border/30 bg-card/30 rounded-lg p-4 space-y-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary/60 font-medium">
                投资本金 Principal (USDT)
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={principal}
                  min={100}
                  step={100}
                  onChange={e => setPrincipal(Math.max(0, Number(e.target.value)))}
                  className="text-xl font-bold num w-40"
                />
                <span className="text-muted-foreground">USDT</span>
              </div>
              <Slider
                min={100} max={100000} step={100} value={[principal]}
                onValueChange={([v]) => setPrincipal(v)}
                className="mt-2"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>$100</span><span>$10K</span><span>$50K</span><span>$100K</span>
              </div>
            </div>

            {/* results */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="期末利润" labelEn="Net PnL" value={`+$${fmt(single.net)}`} sub={`1周期 ${TIERS[tierIdx].days}天`} highlight />
              <StatCard label="静态收益" labelEn="Static Income" value={`$${fmt(single.staticInc)}`} sub="65% of net" />
              <StatCard label="BUB 动态" labelEn="BUB Dynamic" value={`$${fmt(single.bubInc)}`} sub="30% of net" />
              <StatCard label="手续费" labelEn="Platform Fee" value={`$${fmt(single.fee)}`} sub="5% of gross" />
            </div>

            {/* breakdown bar */}
            <div className="border border-border/30 bg-card/30 rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary/60 font-medium mb-3">
                收益拆解 Yield Breakdown · 1000U 示例对比
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={TIERS.map(t => {
                  const gross = 1000 * t.monthlyRate;
                  const net   = gross * (1 - FEE_RATIO);
                  return {
                    name: t.label,
                    静态收益: +(net * STATIC_RATIO).toFixed(2),
                    BUB动态:  +(net * BUB_RATIO).toFixed(2),
                    手续费:   +(gross * FEE_RATIO).toFixed(2),
                  };
                })}>
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => "$" + v} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }}
                    formatter={(v: number) => ["$" + fmt(v)]}
                  />
                  <RechartsLegend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="静态收益" stackId="a" fill="hsl(38,92%,50%)" radius={[0,0,0,0]} />
                  <Bar dataKey="BUB动态"  stackId="a" fill="hsl(38,70%,35%)" />
                  <Bar dataKey="手续费"   stackId="a" fill="hsl(0,60%,40%)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* APY reference */}
            <div className="border border-border/30 bg-card/30 rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary/60 font-medium mb-3">
                年化参考 Annual Reference · {TIERS[tierIdx].label}档
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">日化收益率</div>
                  <div className="text-2xl font-bold num-gold">{(tier.dailyRate * 100).toFixed(2)}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">月化复利率</div>
                  <div className="text-2xl font-bold num-gold">{(tier.monthlyRate * 100).toFixed(2)}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">简单年化估算</div>
                  <div className="text-2xl font-bold num-gold">{annualSimple.toFixed(0)}%</div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ────────────── TAB 2: Reinvest ────────────── */}
          <TabsContent value="reinvest" className="space-y-6">
            {/* controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-border/30 bg-card/30 rounded-lg p-4 space-y-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-primary/60 font-medium">初始本金</div>
                <div className="flex items-center gap-2">
                  <Input type="number" value={reinvestPrincipal} min={100} step={100}
                    onChange={e => setReinvestPrincipal(Math.max(0, Number(e.target.value)))}
                    className="font-bold num w-36"
                  />
                  <span className="text-muted-foreground text-sm">USDT</span>
                </div>
                <Slider min={100} max={100000} step={100} value={[reinvestPrincipal]}
                  onValueChange={([v]) => setReinvestPrincipal(v)} />
              </div>

              <div className="border border-border/30 bg-card/30 rounded-lg p-4 space-y-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-primary/60 font-medium">投资周期数 · {periods} 期</div>
                <Slider min={1} max={24} step={1} value={[periods]}
                  onValueChange={([v]) => setPeriods(v)} />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>1期</span><span>12期</span><span>24期</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="grid grid-cols-3 gap-2 flex-1">
                {TIERS.map((t, i) => (
                  <button key={i} onClick={() => setReinvestTier(i as TierIdx)}
                    className={`border rounded-lg py-2 px-3 text-center text-sm transition-all ${
                      reinvestTier === i ? "border-primary/60 bg-primary/10" : "border-border/30 hover:border-border/60"
                    }`}
                  >
                    <div className="font-bold num-gold">{(TIERS[i].monthlyRate * 100).toFixed(1)}%</div>
                    <div className="text-[10px] text-muted-foreground">{t.label}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => setAutoReinvest(r => !r)}
                className={`border rounded-lg px-4 py-2 text-sm transition-all ${
                  autoReinvest ? "border-primary/60 bg-primary/10 text-primary" : "border-border/30 text-muted-foreground"
                }`}
              >
                {autoReinvest ? "自动复投 ON" : "自动复投 OFF"}
              </button>
            </div>

            {/* growth chart */}
            <div className="border border-border/30 bg-card/30 rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary/60 font-medium mb-3">
                资产增长曲线 · {autoReinvest ? "复利" : "单利"}模式
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={reinvestRows.map(r => ({ 期: `第${r.period}期`, 资产余额: +r.balance.toFixed(2), 累计盈亏: +r.cumPnl.toFixed(2) }))}>
                  <defs>
                    <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(38,92%,50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(38,92%,50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="期" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => "$" + (v >= 1000 ? (v/1000).toFixed(1)+"K" : v)} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }}
                    formatter={(v: number) => ["$" + fmt(v)]} />
                  <Area type="monotone" dataKey="资产余额" stroke="hsl(38,92%,50%)" strokeWidth={2} fill="url(#balGrad)" dot={false} />
                  <Area type="monotone" dataKey="累计盈亏" stroke="hsl(142,70%,45%)" strokeWidth={1.5} fill="none" dot={false} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* table */}
            <div className="border border-border/30 bg-card/30 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 bg-black/20">
                      {["期数","投入本金","毛利润","净收益","累计盈亏","期末余额"].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reinvestRows.map((r, i) => (
                      <tr key={i} className="border-b border-border/20 hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 py-2 text-muted-foreground">第 {r.period} 期</td>
                        <td className="px-3 py-2 num">${fmt(r.principal)}</td>
                        <td className="px-3 py-2 num text-muted-foreground">+${fmt(r.grossPnl)}</td>
                        <td className="px-3 py-2 num text-green-400">+${fmt(r.netPnl)}</td>
                        <td className="px-3 py-2 num-gold">+${fmt(r.cumPnl)}</td>
                        <td className="px-3 py-2 num font-semibold">${fmt(r.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* summary */}
              {reinvestRows.length > 0 && (
                <div className="border-t border-border/30 bg-primary/5 px-3 py-2 flex flex-wrap gap-4 text-sm">
                  <span className="text-muted-foreground">总盈亏：<span className="num-gold font-bold">+${fmt(reinvestRows.at(-1)!.cumPnl)}</span></span>
                  <span className="text-muted-foreground">期末资产：<span className="num font-bold">${fmt(reinvestRows.at(-1)!.balance)}</span></span>
                  <span className="text-muted-foreground">总回报率：<span className="text-green-400 font-bold">{((reinvestRows.at(-1)!.balance / reinvestPrincipal - 1) * 100).toFixed(2)}%</span></span>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ────────────── TAB 3: Dual Token ────────────── */}
          <TabsContent value="dual" className="space-y-6">
            <div className="border border-amber-500/20 bg-amber-950/10 rounded-lg p-4 text-sm text-amber-400/80">
              LP 由 50% USDT（稳定） + 50% ATM（波动）组成，ATM 价格涨跌直接影响总收益。
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-border/30 bg-card/30 rounded-lg p-4 space-y-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-primary/60 font-medium">投入总量 (USDT)</div>
                <Input type="number" value={dualPrincipal} min={200} step={100}
                  onChange={e => setDualPrincipal(Math.max(0, Number(e.target.value)))}
                  className="font-bold num" />
                <Slider min={200} max={200000} step={200} value={[dualPrincipal]}
                  onValueChange={([v]) => setDualPrincipal(v)} />
              </div>
              <div className="border border-border/30 bg-card/30 rounded-lg p-4 space-y-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-primary/60 font-medium">ATM 入场价 (U)</div>
                <Input type="number" value={atmPrice} min={0.01} step={0.01}
                  onChange={e => setAtmPrice(Math.max(0.01, Number(e.target.value)))}
                  className="font-bold num" />
                <Slider min={0.01} max={10} step={0.01} value={[atmPrice]}
                  onValueChange={([v]) => setAtmPrice(v)} />
              </div>
              <div className="border border-border/30 bg-card/30 rounded-lg p-4 space-y-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-primary/60 font-medium">ATM 到期价 (U)</div>
                <Input type="number" value={atmPriceEnd} min={0.01} step={0.01}
                  onChange={e => setAtmPriceEnd(Math.max(0.01, Number(e.target.value)))}
                  className="font-bold num" />
                <Slider min={0.01} max={20} step={0.01} value={[atmPriceEnd]}
                  onValueChange={([v]) => setAtmPriceEnd(v)} />
              </div>
            </div>

            {/* breakdown cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="USDT腿" labelEn="USDT Leg" value={`$${fmt(usdtLeg)}`} sub="稳定 · 50%" />
              <StatCard label="ATM腿" labelEn="ATM Leg"
                value={`$${fmt(atmValueEnd)}`}
                sub={atmGain >= 0 ? `+$${fmt(atmGain)} 涨幅` : `-$${fmt(Math.abs(atmGain))} 跌幅`}
                highlight={atmGain >= 0}
              />
              <StatCard label="做市净收益" labelEn="Vault Net" value={`+$${fmt(dualNet)}`} sub="30天周期" highlight />
              <StatCard
                label="总回报"
                labelEn="Total Return"
                value={`${totalReturn >= 0 ? "+" : ""}$${fmt(totalReturn)}`}
                sub={`${((totalReturn / dualPrincipal) * 100).toFixed(2)}% 总回报率`}
                highlight={totalReturn >= 0}
              />
            </div>

            {/* LP split vis */}
            <div className="border border-border/30 bg-card/30 rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary/60 font-medium mb-4">
                LP 构成 · 资产配比
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-3 rounded-full overflow-hidden bg-black/30 flex">
                  <div className="h-full bg-blue-400" style={{ width: "50%" }} />
                  <div className="h-full bg-amber-400" style={{ width: "50%" }} />
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">50% / 50%</div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-400" />
                  <span className="text-muted-foreground">USDT：${fmt(usdtLeg)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="text-muted-foreground">
                    ATM：{fmt(atmUnits, 0)} 枚 × ${atmPriceEnd} = ${fmt(atmValueEnd)}
                  </span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="border border-border/20 rounded p-2">
                  <div className="text-[10px] text-muted-foreground">ATM 涨跌幅</div>
                  <div className={`text-lg font-bold num ${atmGain >= 0 ? "num-gold" : "text-red-400"}`}>
                    {atmGain >= 0 ? "+" : ""}{(((atmPriceEnd / atmPrice) - 1) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="border border-border/20 rounded p-2">
                  <div className="text-[10px] text-muted-foreground">做市月化</div>
                  <div className="text-lg font-bold num-gold">47.30%</div>
                </div>
                <div className="border border-border/20 rounded p-2">
                  <div className="text-[10px] text-muted-foreground">综合总回报</div>
                  <div className={`text-lg font-bold num ${totalReturn >= 0 ? "num-gold" : "text-red-400"}`}>
                    {totalReturn >= 0 ? "+" : ""}{((totalReturn / dualPrincipal) * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            {/* ATM price scenario table */}
            <div className="border border-border/30 bg-card/30 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30 text-[10px] uppercase tracking-[0.18em] text-primary/60 font-medium">
                ATM 价格情景分析 · 基于 ${fmt(dualPrincipal)} 投入
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/20 bg-black/20">
                      {["ATM 到期价", "ATM腿价值", "做市净收益", "综合总回报", "总回报率"].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[0.5, 0.8, 1.0, 1.2, 1.5, 2.0, 3.0].map(multiplier => {
                      const price = +(atmPrice * multiplier).toFixed(3);
                      const atmVal = atmUnits * price;
                      const gain = atmVal - atmLeg;
                      const net = dualPrincipal * TIERS[2].monthlyRate * (1 - FEE_RATIO);
                      const total = usdtLeg + atmVal + net - dualPrincipal;
                      const isCurrent = Math.abs(price - atmPriceEnd) < 0.001;
                      return (
                        <tr key={multiplier} className={`border-b border-border/20 transition-colors ${isCurrent ? "bg-primary/10" : "hover:bg-white/[0.02]"}`}>
                          <td className="px-3 py-2 num font-medium">${fmt(price, 3)}</td>
                          <td className={`px-3 py-2 num ${gain >= 0 ? "text-green-400" : "text-red-400"}`}>${fmt(atmVal)}</td>
                          <td className="px-3 py-2 num text-green-400">+${fmt(net)}</td>
                          <td className={`px-3 py-2 num font-bold ${total >= 0 ? "num-gold" : "text-red-400"}`}>
                            {total >= 0 ? "+" : ""} ${fmt(total)}
                          </td>
                          <td className={`px-3 py-2 num ${total >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {total >= 0 ? "+" : ""}{((total / dualPrincipal) * 100).toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ────────────── TAB 4: Params ────────────── */}
          <TabsContent value="params" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* system params */}
              <div className="border border-border/30 bg-card/30 rounded-lg p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-primary/60 font-medium mb-3">
                  核心系统参数
                </div>
                <div className="space-y-2">
                  {[
                    ["投资周期选项", "1天 / 15天 / 30天"],
                    ["结算机制", "每秒复利，非整天结算"],
                    ["LP 组成", "50% USDT + 50% ATM"],
                    ["强制复投时限", "4小时（超时利息回流）"],
                    ["手续费", "5%（从毛利润中自动扣除）"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm border-b border-border/20 pb-2">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* yield distribution */}
              <div className="border border-border/30 bg-card/30 rounded-lg p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-primary/60 font-medium mb-3">
                  收益分配结构
                </div>
                <div className="space-y-2">
                  {[
                    ["静态收益占比", "65%", "text-primary"],
                    ["动态 BUB 占比", "30%", "text-green-400"],
                    ["平台手续费", "5%", "text-red-400"],
                    ["节点地址分配", "额外激励"],
                    ["救助池（防跌-5%）", "触发保护机制"],
                    ["燃烧机制（防跌-10%）", "ATM通缩加速"],
                  ].map(([k, v, cls]) => (
                    <div key={k} className="flex justify-between text-sm border-b border-border/20 pb-2">
                      <span className="text-muted-foreground">{k}</span>
                      <span className={`font-bold ${cls ?? ""}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* tier table */}
            <div className="border border-border/30 bg-card/30 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30 text-[10px] uppercase tracking-[0.18em] text-primary/60 font-medium">
                三档收益方案速查 · 1000 USDT 示例（每秒复利，非整天结算）
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/20 bg-black/20">
                    {["投资周期", "日化收益率", "月化复利率", "净利润（1000U）", "期末总资产"].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-[10px] uppercase tracking-wide text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIERS.map((t, i) => {
                    const r = calcSinglePeriod(1000, i as TierIdx);
                    return (
                      <tr key={i} className="border-b border-border/20 hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-medium">{t.label}</td>
                        <td className="px-4 py-3 num-gold font-bold">{(t.dailyRate * 100).toFixed(2)}%</td>
                        <td className="px-4 py-3 num-gold font-bold">{(t.monthlyRate * 100).toFixed(2)}%</td>
                        <td className="px-4 py-3 num text-green-400 font-semibold">+${fmt(r.net)}</td>
                        <td className="px-4 py-3 num font-bold">${fmt(r.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border border-amber-500/20 bg-amber-950/10 rounded-lg p-4 text-xs text-amber-400/80 space-y-1">
              <div className="font-semibold text-amber-400">风险提示 Risk Disclosure</div>
              <div>高收益产品通常对应高风险。ATM腿暴露于代币价格波动，下跌10%将触发燃烧机制。</div>
              <div>强制复投时限4小时意味着需要主动管理仓位。收益数字基于系统公示参数计算，实际收益可能因市场条件而异。</div>
            </div>
          </TabsContent>
        </Tabs>
    </div>
  );
}
