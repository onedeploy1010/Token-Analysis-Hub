import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Activity, Calculator, TrendingDown, TrendingUp, AlertTriangle, Coins, Droplets, BarChart3, Users, Zap, Target } from "lucide-react";
import { useCalculateApy, useSimulateInvestment, useCalculateImpermanentLoss, ApyCalculatorInputCompoundFrequency } from "@workspace/api-client-react";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ReferenceLine, Legend,
} from "recharts";
import {
  projectStakingRelease,
  simulateAAMPoolStandalone,
  analyzeCLMMPosition,
  calculateTradingProfitBreakdown,
  calculateBrokerLayerBreakdown,
  calculateBrokerDividendEarnings,
  BROKER_LEVEL_MAX_LAYERS,
} from "@/lib/afx-calculations";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  borderColor: "hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function fmt(n: number, d = 2) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(d)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(d)}K`;
  return n.toFixed(d);
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Tools() {
  const [activeTab, setActiveTab] = useState("apy");

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 animate-slide-up">
      <div className="space-y-2 border-b border-border/50 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-baseline gap-3">
          Economic Simulators
          <span className="text-xl text-muted-foreground font-normal">经济模拟器</span>
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          Advanced calculators for DeFi yields, investment projections, LP risks, and protocol-level economic simulations.<br />
          <span className="text-sm opacity-80">高级计算器，涵盖 DeFi 收益、投资预测、流动性风险及协议经济模拟。</span>
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        {/* ── Group 1: General DeFi ── */}
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-medium px-1">
            General DeFi Tools &nbsp;·&nbsp; 通用工具
          </p>
          <TabsList className="bg-transparent border-b border-border w-full justify-start h-auto p-0 space-x-6 rounded-none flex-wrap">
            {[
              { value: "apy", label: "APY Calculator", sub: "年化收益计算器", Icon: Activity, color: "primary" },
              { value: "investment", label: "Investment Simulator", sub: "投资模拟器", Icon: TrendingUp, color: "chart-2" },
              { value: "il", label: "Impermanent Loss", sub: "无常损失计算", Icon: AlertTriangle, color: "destructive" },
            ].map(({ value, label, sub, Icon, color }) => (
              <TabsTrigger
                key={value}
                value={value}
                className={`data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-${color} border-b-2 border-transparent data-[state=active]:border-${color} rounded-none px-0 py-3 font-medium transition-all flex flex-col items-start gap-0.5`}
              >
                <span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" />{label}</span>
                <span className="text-[10px] opacity-70 font-normal">{sub}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ── Group 2: Protocol Simulators ── */}
        <div className="space-y-1 -mt-4">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-medium px-1">
            Protocol Simulators &nbsp;·&nbsp; 协议模拟器
          </p>
          <TabsList className="bg-transparent border-b border-border w-full justify-start h-auto p-0 space-x-6 rounded-none flex-wrap">
            {[
              { value: "staking", label: "Staking Projector", sub: "铸造收益预测", Icon: Coins, color: "chart-3" },
              { value: "aam", label: "AAM Pool Simulator", sub: "流动性池模拟", Icon: Droplets, color: "chart-4" },
              { value: "clmm", label: "CLMM Analyzer", sub: "集中流动性分析", Icon: Target, color: "chart-5" },
              { value: "trading", label: "Trading Profit", sub: "交易分红计算", Icon: BarChart3, color: "primary" },
              { value: "broker", label: "Broker Earnings", sub: "推荐层级收益", Icon: Users, color: "chart-2" },
            ].map(({ value, label, sub, Icon, color }) => (
              <TabsTrigger
                key={value}
                value={value}
                className={`data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-${color} border-b-2 border-transparent data-[state=active]:border-${color} rounded-none px-0 py-3 font-medium transition-all flex flex-col items-start gap-0.5`}
              >
                <span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" />{label}</span>
                <span className="text-[10px] opacity-70 font-normal">{sub}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="apy"><ApyCalculator /></TabsContent>
        <TabsContent value="investment"><InvestmentSimulator /></TabsContent>
        <TabsContent value="il"><ImpermanentLossCalculator /></TabsContent>
        <TabsContent value="staking"><StakingProjector /></TabsContent>
        <TabsContent value="aam"><AAMPoolSimulator /></TabsContent>
        <TabsContent value="clmm"><CLMMAnalyzer /></TabsContent>
        <TabsContent value="trading"><TradingProfitCalculator /></TabsContent>
        <TabsContent value="broker"><BrokerEarningsCalculator /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── APY Calculator ───────────────────────────────────────────────────────────

function ApyCalculator() {
  const [principal, setPrincipal] = useState(1000);
  const [apy, setApy] = useState(15);
  const [days, setDays] = useState(365);
  const [frequency, setFrequency] = useState<ApyCalculatorInputCompoundFrequency>("daily");
  const calcMutation = useCalculateApy();
  const handleCalculate = () => calcMutation.mutate({ data: { principal, apy, durationDays: days, compoundFrequency: frequency } });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <Card className="lg:col-span-4 bg-card/80 backdrop-blur border-border shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4 mb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Parameters <span className="text-sm font-normal text-muted-foreground ml-1">参数设置</span>
          </CardTitle>
          <CardDescription>Configure your yield parameters<br /><span className="text-xs">配置您的收益参数</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {[
            { label: "Initial Principal ($)", sub: "初始本金", val: principal, set: setPrincipal, min: 100, max: 100000, step: 100, color: "text-primary" },
            { label: "Expected APY (%)", sub: "预期年化", val: apy, set: setApy, min: 1, max: 200, step: 1, suffix: "%" },
            { label: "Duration (Days)", sub: "持续时间(天)", val: days, set: setDays, min: 7, max: 1095, step: 7, suffix: "" },
          ].map(({ label, sub, val, set, min, max, step, color, suffix }) => (
            <div key={label} className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-muted-foreground flex gap-2"><span>{label}</span><span className="text-xs opacity-70">{sub}</span></Label>
                <span className={`font-mono text-sm font-semibold ${color ?? ""}`}>{suffix === "%" ? `${val}%` : suffix === "" ? val : formatCurrency(val)}</span>
              </div>
              <Slider value={[val]} min={min} max={max} step={step} onValueChange={(v) => set(v[0])} className="py-2" />
            </div>
          ))}
          <div className="space-y-3">
            <Label className="text-muted-foreground flex justify-between mb-2"><span>Compound Frequency</span><span className="text-xs opacity-70">复利频率</span></Label>
            <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
              <SelectTrigger className="bg-background/50 border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily 每日</SelectItem>
                <SelectItem value="weekly">Weekly 每周</SelectItem>
                <SelectItem value="monthly">Monthly 每月</SelectItem>
                <SelectItem value="yearly">Yearly 每年</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full mt-6" onClick={handleCalculate} disabled={calcMutation.isPending}>
            {calcMutation.isPending ? "Calculating..." : "Run Simulation 运行模拟"}
          </Button>
        </CardContent>
      </Card>
      <Card className="lg:col-span-8 bg-card/80 backdrop-blur border-border shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4 mb-4">
          <CardTitle className="text-lg font-semibold">Projection Results <span className="text-sm font-normal text-muted-foreground ml-1">预测结果</span></CardTitle>
        </CardHeader>
        <CardContent>
          {calcMutation.data ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-b border-border/50 pb-6">
                {[
                  { label: "Final Amount", sub: "最终金额", val: formatCurrency(calcMutation.data.finalAmount), large: true },
                  { label: "Total Return", sub: "总收益", val: `+${formatCurrency(calcMutation.data.totalReturn)}`, color: "text-chart-2" },
                  { label: "ROI %", sub: "回报率", val: `+${formatPercent(calcMutation.data.returnPercent)}`, color: "text-chart-2" },
                  { label: "Principal", sub: "本金", val: formatCurrency(calcMutation.data.principal), muted: true },
                ].map(({ label, sub, val, large, color, muted }) => (
                  <div key={label}>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 flex justify-between"><span>{label}</span><span className="opacity-70">{sub}</span></p>
                    <p className={`${large ? "text-2xl font-bold" : "text-xl font-semibold"} font-mono ${color ?? (muted ? "text-muted-foreground" : "")}`}>{val}</p>
                  </div>
                ))}
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={calcMutation.data.dailyBreakdown}>
                    <defs>
                      <linearGradient id="gradApy" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `D${v}`} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${fmt(v, 0)}`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatCurrency(v), "Value"]} labelFormatter={(l) => `Day ${l}`} />
                    <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gradApy)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : <EmptyState icon={<Activity className="h-8 w-8 text-muted-foreground/50" />} msg="Adjust parameters and run simulation to view projection." sub="调整参数并运行模拟以查看预测结果。" />}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Investment Simulator ─────────────────────────────────────────────────────

function InvestmentSimulator() {
  const [initial, setInitial] = useState(10000);
  const [monthly, setMonthly] = useState(500);
  const [apy, setApy] = useState(12);
  const [years, setYears] = useState(5);
  const calcMutation = useSimulateInvestment();
  const handleCalculate = () => calcMutation.mutate({ data: { initialInvestment: initial, monthlyContribution: monthly, expectedApy: apy, years } });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <Card className="lg:col-span-4 bg-card/80 backdrop-blur border-border shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4 mb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-chart-2" /> Parameters <span className="text-sm font-normal text-muted-foreground ml-1">参数设置</span></CardTitle>
          <CardDescription>Long-term growth simulation<br /><span className="text-xs">长期增长模拟</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {[
            { label: "Initial Investment ($)", sub: "初始投资", val: initial, set: setInitial, min: 100, max: 100000, step: 100 },
            { label: "Monthly Contribution ($)", sub: "每月定投", val: monthly, set: setMonthly, min: 0, max: 10000, step: 50 },
            { label: "Expected APY (%)", sub: "预期年化", val: apy, set: setApy, min: 1, max: 100, step: 1, suffix: "%" },
            { label: "Time Horizon (Years)", sub: "投资年限", val: years, set: setYears, min: 1, max: 20, step: 1, suffix: "" },
          ].map(({ label, sub, val, set, min, max, step, suffix }) => (
            <div key={label} className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-muted-foreground flex gap-2"><span>{label}</span><span className="text-xs opacity-70">{sub}</span></Label>
                <span className="font-mono text-sm font-semibold">{suffix === "%" ? `${val}%` : suffix === "" ? val : formatCurrency(val)}</span>
              </div>
              <Slider value={[val]} min={min} max={max} step={step} onValueChange={(v) => set(v[0])} className="py-2" />
            </div>
          ))}
          <Button className="w-full mt-6 bg-chart-2 hover:bg-chart-2/90 text-white" onClick={handleCalculate} disabled={calcMutation.isPending}>
            {calcMutation.isPending ? "Simulating..." : "Run Simulation 运行模拟"}
          </Button>
        </CardContent>
      </Card>
      <Card className="lg:col-span-8 bg-card/80 backdrop-blur border-border shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4 mb-4"><CardTitle className="text-lg font-semibold">Growth Trajectory <span className="text-sm font-normal text-muted-foreground ml-1">增长轨迹</span></CardTitle></CardHeader>
        <CardContent>
          {calcMutation.data ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-b border-border/50 pb-6">
                {[
                  { label: "Final Value", sub: "最终价值", val: formatCurrency(calcMutation.data.finalValue), large: true },
                  { label: "Total Contributions", sub: "总投入", val: formatCurrency(calcMutation.data.totalContributed), muted: true },
                  { label: "Total Yield", sub: "总收益", val: `+${formatCurrency(calcMutation.data.totalReturn)}`, color: "text-chart-2" },
                  { label: "ROI", sub: "回报率", val: `+${formatPercent(calcMutation.data.returnPercent)}`, color: "text-chart-2" },
                ].map(({ label, sub, val, large, color, muted }) => (
                  <div key={label}>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 flex justify-between"><span>{label}</span><span className="opacity-70">{sub}</span></p>
                    <p className={`${large ? "text-2xl font-bold" : "text-xl font-semibold"} font-mono ${color ?? (muted ? "text-muted-foreground" : "")}`}>{val}</p>
                  </div>
                ))}
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={calcMutation.data.yearlyBreakdown}>
                    <defs>
                      <linearGradient id="gradInv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `Yr${v}`} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${fmt(v, 0)}`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [formatCurrency(v), n === "value" ? "Total Value" : "Contributions"]} labelFormatter={(l) => `Year ${l}`} />
                    <Area type="monotone" dataKey="contributed" stackId="1" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground)/0.15)" />
                    <Area type="monotone" dataKey="value" stroke="hsl(var(--chart-2))" strokeWidth={2} fill="url(#gradInv)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : <EmptyState icon={<TrendingUp className="h-8 w-8 text-muted-foreground/50" />} msg="Adjust parameters and run simulation to view projection." sub="调整参数并运行模拟以查看预测结果。" />}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Impermanent Loss ─────────────────────────────────────────────────────────

function ImpermanentLossCalculator() {
  const [initialPrice, setInitialPrice] = useState(100);
  const [currentPrice, setCurrentPrice] = useState(150);
  const [liquidity, setLiquidity] = useState(1000);
  const calcMutation = useCalculateImpermanentLoss();
  const handleCalculate = () => calcMutation.mutate({ data: { initialPrice, currentPrice, liquidityValue: liquidity } });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <Card className="lg:col-span-4 bg-card/80 backdrop-blur border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Parameters <span className="text-sm font-normal text-muted-foreground ml-1">参数设置</span></CardTitle>
          <CardDescription>Quantify LP divergence risk<br /><span className="text-xs">量化流动性提供者价格偏离风险</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {[
            { label: "Initial Asset Price ($)", sub: "初始资产价格", val: initialPrice, set: setInitialPrice },
            { label: "Current/Projected Price ($)", sub: "当前/预期资产价格", val: currentPrice, set: setCurrentPrice },
            { label: "Initial Liquidity Value ($)", sub: "初始流动性价值", val: liquidity, set: setLiquidity },
          ].map(({ label, sub, val, set }) => (
            <div key={label} className="space-y-2">
              <Label className="flex justify-between"><span>{label}</span><span className="text-xs opacity-70">{sub}</span></Label>
              <Input type="number" value={val} onChange={(e) => set(Number(e.target.value))} className="bg-background/50 border-border font-mono" />
            </div>
          ))}
          <Button variant="destructive" className="w-full mt-4" onClick={handleCalculate} disabled={calcMutation.isPending}>
            {calcMutation.isPending ? "Calculating..." : "Calculate Risk 计算风险"}
          </Button>
        </CardContent>
      </Card>
      <Card className="lg:col-span-8 bg-card/80 backdrop-blur border-border">
        <CardHeader><CardTitle className="text-lg font-semibold">Risk Analysis <span className="text-sm font-normal text-muted-foreground ml-1">风险分析</span></CardTitle></CardHeader>
        <CardContent>
          {calcMutation.data ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl flex flex-col items-center text-center">
                  <p className="text-sm text-destructive uppercase tracking-wider mb-2 flex flex-col gap-1"><span>Impermanent Loss</span><span className="text-[10px] opacity-80">无常损失比例</span></p>
                  <p className="text-4xl font-bold font-mono text-destructive">-{formatPercent(calcMutation.data.ilPercent)}</p>
                  <p className="text-sm font-mono text-destructive/80 mt-1">-{formatCurrency(calcMutation.data.ilUsd)}</p>
                </div>
                <div className="p-6 bg-background/50 border border-border rounded-xl flex flex-col items-center text-center">
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2 flex flex-col gap-1"><span>HODL Value</span><span className="text-[10px] opacity-80">持有不参与流动性的价值</span></p>
                  <p className="text-2xl font-bold font-mono">{formatCurrency(calcMutation.data.hodlValue)}</p>
                </div>
                <div className="p-6 bg-background/50 border border-border rounded-xl flex flex-col items-center text-center">
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2 flex flex-col gap-1"><span>LP Value</span><span className="text-[10px] opacity-80">在流动性池中的价值</span></p>
                  <p className="text-2xl font-bold font-mono">{formatCurrency(calcMutation.data.lpValue)}</p>
                </div>
              </div>
              <div className="p-5 bg-card border border-border rounded-xl text-sm text-muted-foreground space-y-2 leading-relaxed">
                <p>Price moved from <span className="font-mono text-foreground font-medium">{formatCurrency(initialPrice)}</span> → <span className="font-mono text-foreground font-medium">{formatCurrency(currentPrice)}</span>, causing <span className="font-mono text-destructive font-medium">{formatPercent(calcMutation.data.ilPercent)}</span> divergence loss vs HODL.</p>
                <p className="text-xs opacity-80 border-t border-border/50 pt-2">资产价格从 {formatCurrency(initialPrice)} 变动至 {formatCurrency(currentPrice)}，与持有资产相比，流动性仓位产生 {formatPercent(calcMutation.data.ilPercent)} 无常损失。</p>
              </div>
            </div>
          ) : <EmptyState icon={<AlertTriangle className="h-7 w-7 text-muted-foreground/50" />} msg="Enter parameters to calculate IL risk." sub="输入参数以计算无常损失风险。" />}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Staking Projector ────────────────────────────────────────────────────────

function StakingProjector() {
  const [tokenName, setTokenName] = useState("MS");
  const [investment, setInvestment] = useState(1000);
  const [msPrice, setMsPrice] = useState(0.5);
  const [multiplier, setMultiplier] = useState(3);
  const [stakingDays, setStakingDays] = useState(180);
  const [mode, setMode] = useState<"gold_standard" | "coin_standard">("gold_standard");

  const result = useMemo(
    () => projectStakingRelease(investment, msPrice, multiplier, stakingDays, mode),
    [investment, msPrice, multiplier, stakingDays, mode]
  );

  const chartData = result.releaseSchedule.filter((_, i) => i % Math.ceil(result.releaseSchedule.length / 60) === 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <Card className="lg:col-span-4 bg-card/80 backdrop-blur border-border shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4 mb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2"><Coins className="h-4 w-4 text-chart-3" /> Parameters <span className="text-sm font-normal text-muted-foreground ml-1">参数设置</span></CardTitle>
          <CardDescription>Staking release projector<br /><span className="text-xs">铸造释放量预测</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Token Name <span className="opacity-70">代币名称</span></Label>
              <Input value={tokenName} onChange={(e) => setTokenName(e.target.value)} className="bg-background/50 border-border font-mono h-9 text-sm" placeholder="MS" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Token Price ($) <span className="opacity-70">代币价格</span></Label>
              <Input type="number" value={msPrice} onChange={(e) => setMsPrice(Number(e.target.value))} min={0.0001} step={0.01} className="bg-background/50 border-border font-mono h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Release Mode <span className="opacity-70">释放模式</span></Label>
            <Select value={mode} onValueChange={(v: any) => setMode(v)}>
              <SelectTrigger className="bg-background/50 border-border h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gold_standard">Gold Standard — USDC 倍数 (美元标准)</SelectItem>
                <SelectItem value="coin_standard">Coin Standard — Token 倍数 (代币标准)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {[
            { label: `Investment (USDC)`, sub: "投资金额", val: investment, set: setInvestment, min: 100, max: 100000, step: 100, fmt: formatCurrency },
            { label: `Release Multiplier`, sub: "释放倍率", val: multiplier, set: setMultiplier, min: 1, max: 10, step: 0.5, fmt: (v: number) => `${v}×` },
            { label: `Staking Days`, sub: "铸造天数", val: stakingDays, set: setStakingDays, min: 30, max: 720, step: 30, fmt: (v: number) => `${v}d` },
          ].map(({ label, sub, val, set, min, max, step, fmt: fmtFn }) => (
            <div key={label} className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-muted-foreground flex gap-1.5"><span>{label}</span><span className="opacity-70">{sub}</span></Label>
                <span className="font-mono text-sm font-semibold text-chart-3">{fmtFn(val)}</span>
              </div>
              <Slider value={[val]} min={min} max={max} step={step} onValueChange={(v) => set(v[0])} className="py-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="lg:col-span-8 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Daily Release", sub: "每日释放", val: `${fmt(result.dailyMs)} ${tokenName}`, color: "text-chart-3" },
            { label: "Total Release", sub: "总释放量", val: `${fmt(result.totalMs)} ${tokenName}`, color: "text-foreground" },
            { label: "Total USDC Value", sub: "总USDC价值", val: formatCurrency(result.totalUsdcValue), color: "text-foreground" },
            { label: "Staking Period", sub: "铸造周期", val: `${result.stakingDays}d`, color: "text-muted-foreground" },
          ].map(({ label, sub, val, color }) => (
            <Card key={label} className="bg-card/60 border-border p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex justify-between"><span>{label}</span><span className="opacity-70">{sub}</span></p>
              <p className={`text-xl font-bold font-mono ${color}`}>{val}</p>
            </Card>
          ))}
        </div>
        <Card className="bg-card/80 backdrop-blur border-border shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Cumulative Release Schedule <span className="text-sm font-normal text-muted-foreground ml-1">累计释放曲线</span></CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradStaking" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `D${v}`} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${fmt(v)}`} />
                  <Tooltip contentStyle={tooltipStyle}
                    formatter={(v: number, n: string) => [n === "cumulativeMs" ? `${fmt(v)} ${tokenName}` : formatCurrency(v), n === "cumulativeMs" ? `Cumulative ${tokenName}` : "USDC Value"]}
                    labelFormatter={(l) => `Day ${l}`}
                  />
                  <Area type="monotone" dataKey="cumulativeMs" stroke="hsl(var(--chart-3))" strokeWidth={2} fill="url(#gradStaking)" name="cumulativeMs" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-chart-3/10 border border-chart-3/20 text-sm text-muted-foreground">
              {mode === "gold_standard"
                ? `Gold Standard: Total USDC = ${formatCurrency(investment)} × ${multiplier}× = ${formatCurrency(investment * multiplier)}. Daily ${tokenName} = ${fmt(result.dailyMs)} at $${msPrice}/token.`
                : `Coin Standard: Total ${tokenName} = (${formatCurrency(investment)} ÷ $${msPrice}) × ${multiplier}× = ${fmt(result.totalMs)} ${tokenName}. Daily ${tokenName} = ${fmt(result.dailyMs)}.`}
              <p className="text-xs opacity-70 mt-1">{mode === "gold_standard" ? `美元标准：总释放 = 投资额 × 倍率，以代币计量。` : `代币标准：总释放 = (投资额 ÷ 代币价格) × 倍率。`}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── AAM Pool Simulator ───────────────────────────────────────────────────────

function AAMPoolSimulator() {
  const [tokenName, setTokenName] = useState("MS");
  const [initUsdc, setInitUsdc] = useState(50000);
  const [initMs, setInitMs] = useState(200000);
  const [days, setDays] = useState(90);
  const [dailyDeposit, setDailyDeposit] = useState(2000);
  const [lpRatio, setLpRatio] = useState(30);
  const [buybackRatio, setBuybackRatio] = useState(20);
  const [sellPressure, setSellPressure] = useState(500);

  const initialPrice = initMs > 0 ? initUsdc / initMs : 0;

  const data = useMemo(
    () => simulateAAMPoolStandalone(initUsdc, initMs, days, dailyDeposit, lpRatio, buybackRatio, sellPressure),
    [initUsdc, initMs, days, dailyDeposit, lpRatio, buybackRatio, sellPressure]
  );

  const last = data[data.length - 1];
  const priceChange = initialPrice > 0 ? ((last.price - initialPrice) / initialPrice) * 100 : 0;
  const displayData = data.filter((_, i) => i % Math.max(1, Math.ceil(data.length / 90)) === 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <Card className="lg:col-span-4 bg-card/80 backdrop-blur border-border shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4 mb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2"><Droplets className="h-4 w-4 text-chart-4" /> Parameters <span className="text-sm font-normal text-muted-foreground ml-1">参数设置</span></CardTitle>
          <CardDescription>AMM constant-product pool<br /><span className="text-xs">AMM 恒积流动性池模拟</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Token Name <span className="opacity-70">代币名称</span></Label>
              <Input value={tokenName} onChange={(e) => setTokenName(e.target.value)} className="bg-background/50 border-border font-mono h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Sim Days <span className="opacity-70">模拟天数</span></Label>
              <Input type="number" value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value)))} min={1} max={365} className="bg-background/50 border-border font-mono h-9 text-sm" />
            </div>
          </div>
          {[
            { label: "Initial Pool USDC", sub: "初始 USDC", val: initUsdc, set: setInitUsdc, min: 1000, max: 1000000, step: 1000 },
            { label: `Initial Pool ${tokenName}`, sub: "初始代币数量", val: initMs, set: setInitMs, min: 1000, max: 10000000, step: 10000 },
            { label: "Daily Deposit (USDC)", sub: "每日新增存款", val: dailyDeposit, set: setDailyDeposit, min: 0, max: 50000, step: 500 },
          ].map(({ label, sub, val, set, min, max, step }) => (
            <div key={label} className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-muted-foreground flex gap-1"><span>{label}</span><span className="opacity-70">{sub}</span></Label>
                <span className="font-mono text-xs font-semibold text-chart-4">{fmt(val, 0)}</span>
              </div>
              <Slider value={[val]} min={min} max={max} step={step} onValueChange={(v) => set(v[0])} className="py-2" />
            </div>
          ))}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-muted-foreground">LP Add Ratio <span className="opacity-70">LP注入比例 %</span></Label>
              <span className="font-mono text-xs font-semibold">{lpRatio}%</span>
            </div>
            <Slider value={[lpRatio]} min={0} max={80} step={5} onValueChange={(v) => setLpRatio(v[0])} className="py-2" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-muted-foreground">Buyback Ratio <span className="opacity-70">回购比例 %</span></Label>
              <span className="font-mono text-xs font-semibold">{buybackRatio}%</span>
            </div>
            <Slider value={[buybackRatio]} min={0} max={80} step={5} onValueChange={(v) => setBuybackRatio(v[0])} className="py-2" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-muted-foreground">Daily Sell Pressure ({tokenName}) <span className="opacity-70">每日抛压</span></Label>
              <span className="font-mono text-xs font-semibold text-destructive">{fmt(sellPressure)}</span>
            </div>
            <Slider value={[sellPressure]} min={0} max={10000} step={100} onValueChange={(v) => setSellPressure(v[0])} className="py-2" />
          </div>
        </CardContent>
      </Card>

      <div className="lg:col-span-8 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Initial Price", sub: "初始价格", val: `$${initialPrice.toFixed(4)}`, color: "text-muted-foreground" },
            { label: "Final Price", sub: "最终价格", val: `$${last.price.toFixed(4)}`, color: priceChange >= 0 ? "text-chart-2" : "text-destructive" },
            { label: "Price Change", sub: "价格变化", val: `${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(2)}%`, color: priceChange >= 0 ? "text-chart-2" : "text-destructive" },
            { label: "Final TVL", sub: "最终总锁仓", val: `$${fmt(last.tvl)}`, color: "text-chart-4" },
          ].map(({ label, sub, val, color }) => (
            <Card key={label} className="bg-card/60 border-border p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex justify-between"><span>{label}</span><span className="opacity-70">{sub}</span></p>
              <p className={`text-xl font-bold font-mono ${color}`}>{val}</p>
            </Card>
          ))}
        </div>
        <Card className="bg-card/80 backdrop-blur border-border shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">{tokenName} Price Trajectory <span className="text-sm font-normal text-muted-foreground ml-1">价格走势</span></CardTitle></CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={displayData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `D${v}`} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(3)}`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toFixed(4)}`, `${tokenName} Price`]} labelFormatter={(l) => `Day ${l}`} />
                  <ReferenceLine y={initialPrice} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeOpacity={0.5} />
                  <Line type="monotone" dataKey="price" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur border-border shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Pool TVL & Buyback <span className="text-sm font-normal text-muted-foreground ml-1">总锁仓 & 累计回购</span></CardTitle></CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradTvl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `D${v}`} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${fmt(v, 0)}`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`$${fmt(v)}`, n === "tvl" ? "TVL" : "Cumulative Buyback"]} labelFormatter={(l) => `Day ${l}`} />
                  <Area type="monotone" dataKey="tvl" stroke="hsl(var(--chart-4))" strokeWidth={2} fill="url(#gradTvl)" />
                  <Line type="monotone" dataKey="cumulativeBuyback" stroke="hsl(var(--chart-2))" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── CLMM Analyzer ────────────────────────────────────────────────────────────

function CLMMAnalyzer() {
  const [tokenName, setTokenName] = useState("MS");
  const [tokenPrice, setTokenPrice] = useState(0.5);
  const [depositX, setDepositX] = useState(10000);
  const [depositY, setDepositY] = useState(5000);
  const [rangeWidth, setRangeWidth] = useState(20);
  const [feeTier, setFeeTier] = useState(0.003);
  const [dailyVolume, setDailyVolume] = useState(50000);
  const [totalPoolLiq, setTotalPoolLiq] = useState(1000000);
  const [days, setDays] = useState(90);
  const [volatility, setVolatility] = useState(3);
  const [drift, setDrift] = useState(0);

  const analysis = useMemo(
    () => analyzeCLMMPosition(depositX, depositY, tokenPrice, rangeWidth, feeTier, dailyVolume, totalPoolLiq, days, volatility, drift),
    [depositX, depositY, tokenPrice, rangeWidth, feeTier, dailyVolume, totalPoolLiq, days, volatility, drift]
  );

  const trajData = analysis.priceTrajectory.filter((_, i) => i % Math.max(1, Math.ceil(analysis.priceTrajectory.length / 90)) === 0);
  const priceLower = tokenPrice * (1 - rangeWidth / 100);
  const priceUpper = tokenPrice * (1 + rangeWidth / 100);
  const depositValue = depositX * tokenPrice + depositY;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <Card className="lg:col-span-4 bg-card/80 backdrop-blur border-border shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4 mb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2"><Target className="h-4 w-4 text-chart-5" /> Parameters <span className="text-sm font-normal text-muted-foreground ml-1">参数设置</span></CardTitle>
          <CardDescription>Concentrated liquidity position<br /><span className="text-xs">集中流动性区间分析</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Token Name <span className="opacity-70">代币名称</span></Label>
              <Input value={tokenName} onChange={(e) => setTokenName(e.target.value)} className="bg-background/50 border-border font-mono h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Token Price ($) <span className="opacity-70">代币价格</span></Label>
              <Input type="number" value={tokenPrice} onChange={(e) => setTokenPrice(Number(e.target.value))} min={0.0001} step={0.01} className="bg-background/50 border-border font-mono h-9 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Deposit {tokenName} <span className="opacity-70">代币数量</span></Label>
              <Input type="number" value={depositX} onChange={(e) => setDepositX(Number(e.target.value))} className="bg-background/50 border-border font-mono h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Deposit USDC <span className="opacity-70">USDC数量</span></Label>
              <Input type="number" value={depositY} onChange={(e) => setDepositY(Number(e.target.value))} className="bg-background/50 border-border font-mono h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Fee Tier <span className="opacity-70">手续费档位</span></Label>
            <Select value={String(feeTier)} onValueChange={(v) => setFeeTier(Number(v))}>
              <SelectTrigger className="bg-background/50 border-border h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0.0005">0.05% (稳定对)</SelectItem>
                <SelectItem value="0.003">0.3% (标准)</SelectItem>
                <SelectItem value="0.01">1% (高波动)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {[
            { label: "Price Range Width ±%", sub: "价格区间宽度", val: rangeWidth, set: setRangeWidth, min: 5, max: 100, step: 5, suffix: "%" },
            { label: "Daily Volume (USDC)", sub: "每日交易量", val: dailyVolume, set: setDailyVolume, min: 1000, max: 500000, step: 5000, suffix: "$" },
            { label: "Simulation Days", sub: "模拟天数", val: days, set: setDays, min: 7, max: 180, step: 7, suffix: "d" },
            { label: "Daily Volatility %", sub: "每日波动率", val: volatility, set: setVolatility, min: 0.5, max: 10, step: 0.5, suffix: "%" },
            { label: "Daily Drift %", sub: "每日趋势漂移", val: drift, set: setDrift, min: -5, max: 5, step: 0.5, suffix: "%" },
          ].map(({ label, sub, val, set, min, max, step, suffix }) => (
            <div key={label} className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-muted-foreground flex gap-1"><span>{label}</span><span className="opacity-70">{sub}</span></Label>
                <span className="font-mono text-xs font-semibold text-chart-5">{suffix === "$" ? `$${fmt(val, 0)}` : `${val}${suffix}`}</span>
              </div>
              <Slider value={[val]} min={min} max={max} step={step} onValueChange={(v) => set(v[0])} className="py-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="lg:col-span-8 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Capital Efficiency", sub: "资本效率", val: `${analysis.capitalEfficiency.toFixed(1)}×`, color: "text-chart-5" },
            { label: "Fees 30d", sub: "30天费用收入", val: formatCurrency(analysis.feesEarned30d), color: "text-chart-2" },
            { label: "Fees 90d", sub: "90天费用收入", val: formatCurrency(analysis.feesEarned90d), color: "text-chart-2" },
            { label: "Break-even Days", sub: "费用覆盖IL天数", val: analysis.breakEvenDays > 999 ? ">999d" : `${analysis.breakEvenDays}d`, color: analysis.breakEvenDays < 60 ? "text-chart-2" : "text-muted-foreground" },
          ].map(({ label, sub, val, color }) => (
            <Card key={label} className="bg-card/60 border-border p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex justify-between"><span>{label}</span><span className="opacity-70">{sub}</span></p>
              <p className={`text-xl font-bold font-mono ${color}`}>{val}</p>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card/60 border-border p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">IL at Lower Bound 下界无常损失</p>
            <p className="text-xl font-bold font-mono text-destructive">-{analysis.ilAtLower.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground mt-1">Price → ${priceLower.toFixed(4)}</p>
          </Card>
          <Card className="bg-card/60 border-border p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">IL at Upper Bound 上界无常损失</p>
            <p className="text-xl font-bold font-mono text-destructive">-{analysis.ilAtUpper.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground mt-1">Price → ${priceUpper.toFixed(4)}</p>
          </Card>
        </div>
        <Card className="bg-card/80 backdrop-blur border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Price + Cumulative Fees <span className="text-sm font-normal text-muted-foreground ml-1">价格 & 累计手续费</span></span>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px] border-chart-5/40 text-chart-5">Range: ${priceLower.toFixed(3)} – ${priceUpper.toFixed(3)}</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trajData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `D${v}`} />
                  <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(3)}`} />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${fmt(v)}`} />
                  <Tooltip contentStyle={tooltipStyle}
                    formatter={(v: number, n: string) => [n === "price" ? `$${v.toFixed(4)}` : formatCurrency(v), n === "price" ? `${tokenName} Price` : n === "cumulativeFees" ? "Cum. Fees" : "Position Value"]}
                    labelFormatter={(l) => `Day ${l}`}
                  />
                  <ReferenceLine yAxisId="left" y={priceLower} stroke="hsl(var(--destructive))" strokeDasharray="4 4" strokeOpacity={0.5} />
                  <ReferenceLine yAxisId="left" y={priceUpper} stroke="hsl(var(--chart-2))" strokeDasharray="4 4" strokeOpacity={0.5} />
                  <Line yAxisId="left" type="monotone" dataKey="price" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={false}
                    stroke-dasharray={trajData.map(d => d.inRange ? "0" : "4 4").join("")}
                  />
                  <Line yAxisId="right" type="monotone" dataKey="cumulativeFees" stroke="hsl(var(--chart-2))" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Deposit value: <span className="font-mono">{formatCurrency(depositValue)}</span> &nbsp;·&nbsp; Capital efficiency vs V2: <span className="font-mono text-chart-5">{analysis.capitalEfficiency.toFixed(1)}×</span></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Trading Profit Calculator ────────────────────────────────────────────────

function TradingProfitCalculator() {
  const [tokenName, setTokenName] = useState("MS");
  const [capital, setCapital] = useState(10000);
  const [volumePct, setVolumePct] = useState(50);
  const [profitRate, setProfitRate] = useState(5);
  const [feeRate, setFeeRate] = useState(15);
  const [profitShare, setProfitShare] = useState(70);
  const [lpRatio, setLpRatio] = useState(30);
  const [buybackRatio, setBuybackRatio] = useState(20);
  const [reserveRatio, setReserveRatio] = useState(50);

  const daily = useMemo(
    () => calculateTradingProfitBreakdown(capital, volumePct, profitRate, feeRate, profitShare, lpRatio, buybackRatio, reserveRatio),
    [capital, volumePct, profitRate, feeRate, profitShare, lpRatio, buybackRatio, reserveRatio]
  );

  const monthly = {
    grossProfit: daily.grossProfit * 30,
    userProfit: daily.userProfit * 30,
    platformProfit: daily.platformProfit * 30,
    brokerProfit: daily.brokerProfit * 30,
    tradingFee: daily.tradingFee * 30,
  };

  const pieData = [
    { name: "User Profit 用户分红", value: daily.userProfit, color: "hsl(var(--chart-2))" },
    { name: "Platform 平台", value: daily.platformProfit, color: "hsl(var(--primary))" },
    { name: "Broker 推荐商", value: daily.brokerProfit, color: "hsl(var(--chart-3))" },
    { name: "Trading Fee 手续费", value: daily.tradingFee, color: "hsl(var(--muted-foreground))" },
  ].filter(d => d.value > 0);

  const flowData = [
    { name: "LP Pool", value: daily.lpContributionUsdc, color: "hsl(var(--chart-4))" },
    { name: "Buyback", value: daily.buybackAmount, color: "hsl(var(--chart-2))" },
    { name: "Reserve", value: daily.reserveAmount, color: "hsl(var(--chart-5))" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <Card className="lg:col-span-4 bg-card/80 backdrop-blur border-border shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4 mb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Parameters <span className="text-sm font-normal text-muted-foreground ml-1">参数设置</span></CardTitle>
          <CardDescription>Daily trading profit distribution<br /><span className="text-xs">每日交易收益分配模拟</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Token Name <span className="opacity-70">代币</span></Label>
              <Input value={tokenName} onChange={(e) => setTokenName(e.target.value)} className="bg-background/50 border-border font-mono h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Trading Capital (USDC) <span className="opacity-70">交易资本</span></Label>
              <Input type="number" value={capital} onChange={(e) => setCapital(Number(e.target.value))} className="bg-background/50 border-border font-mono h-9 text-sm" />
            </div>
          </div>
          {[
            { label: "Daily Volume %", sub: "每日交易量%", val: volumePct, set: setVolumePct, min: 1, max: 200, step: 5, suffix: "%" },
            { label: "Daily Profit Rate %", sub: "日盈利率%", val: profitRate, set: setProfitRate, min: 0.1, max: 20, step: 0.5, suffix: "%" },
            { label: "Trading Fee %", sub: "手续费率%", val: feeRate, set: setFeeRate, min: 0, max: 50, step: 1, suffix: "%" },
            { label: "User Profit Share %", sub: "用户分润比%", val: profitShare, set: setProfitShare, min: 50, max: 90, step: 5, suffix: "%" },
          ].map(({ label, sub, val, set, min, max, step, suffix }) => (
            <div key={label} className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-muted-foreground flex gap-1"><span>{label}</span><span className="opacity-70">{sub}</span></Label>
                <span className="font-mono text-xs font-semibold text-primary">{val}{suffix}</span>
              </div>
              <Slider value={[val]} min={min} max={max} step={step} onValueChange={(v) => set(v[0])} className="py-2" />
            </div>
          ))}
          <div className="pt-2 border-t border-border/50">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-3">Fund Flow Ratios 资金流向比例</p>
            {[
              { label: "LP Pool Ratio %", sub: "注入流动池", val: lpRatio, set: setLpRatio },
              { label: "Buyback Ratio %", sub: "回购比例", val: buybackRatio, set: setBuybackRatio },
              { label: "Reserve Ratio %", sub: "储备金比例", val: reserveRatio, set: setReserveRatio },
            ].map(({ label, sub, val, set }) => (
              <div key={label} className="space-y-1.5 mb-3">
                <div className="flex justify-between items-center">
                  <Label className="text-xs text-muted-foreground flex gap-1"><span>{label}</span><span className="opacity-70">{sub}</span></Label>
                  <span className="font-mono text-xs font-semibold">{val}%</span>
                </div>
                <Slider value={[val]} min={0} max={80} step={5} onValueChange={(v) => set(v[0])} className="py-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="lg:col-span-8 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "User Daily Profit", sub: "用户每日收益", val: formatCurrency(daily.userProfit), color: "text-chart-2" },
            { label: "User Monthly", sub: "用户每月收益", val: formatCurrency(monthly.userProfit), color: "text-chart-2" },
            { label: "Daily ROI", sub: "日收益率", val: `${daily.roi.toFixed(3)}%`, color: "text-primary" },
            { label: "Gross Profit/day", sub: "每日毛利", val: formatCurrency(daily.grossProfit), color: "text-muted-foreground" },
          ].map(({ label, sub, val, color }) => (
            <Card key={label} className="bg-card/60 border-border p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex justify-between"><span>{label}</span><span className="opacity-70">{sub}</span></p>
              <p className={`text-xl font-bold font-mono ${color}`}>{val}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="bg-card/80 backdrop-blur border-border shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Daily Profit Split <span className="text-sm font-normal text-muted-foreground ml-1">每日收益分配</span></CardTitle></CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" nameKey="name" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [formatCurrency(v), n]} />
                    <Legend iconSize={8} iconType="circle" formatter={(v) => <span className="text-[11px] text-muted-foreground">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur border-border shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Fund Flow Allocation <span className="text-sm font-normal text-muted-foreground ml-1">资金流向</span></CardTitle></CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flowData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${fmt(v)}`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatCurrency(v), "Daily Flow"]} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {flowData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/80 backdrop-blur border-border shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Monthly Projection <span className="text-sm font-normal text-muted-foreground ml-1">月度汇总</span></CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: "Gross Profit", sub: "毛利润", val: formatCurrency(monthly.grossProfit) },
                { label: "Trading Fee", sub: "手续费", val: formatCurrency(monthly.tradingFee) },
                { label: "User Profit", sub: "用户分红", val: formatCurrency(monthly.userProfit), highlight: true },
                { label: "Platform", sub: "平台收入", val: formatCurrency(monthly.platformProfit) },
                { label: "Broker", sub: "推荐商", val: formatCurrency(monthly.brokerProfit) },
              ].map(({ label, sub, val, highlight }) => (
                <div key={label} className={`p-3 rounded-lg border ${highlight ? "bg-chart-2/10 border-chart-2/30" : "bg-background/30 border-border"}`}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex justify-between"><span>{label}</span><span className="opacity-70">{sub}</span></p>
                  <p className={`text-base font-bold font-mono mt-1 ${highlight ? "text-chart-2" : ""}`}>{val}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Broker Earnings Calculator ───────────────────────────────────────────────

function BrokerEarningsCalculator() {
  const [tokenName, setTokenName] = useState("MS");
  const [brokerLevel, setBrokerLevel] = useState("V3");
  const [msPerLayer, setMsPerLayer] = useState(200);
  const [grossProfit, setGrossProfit] = useState(5000);
  const [feeRate, setFeeRate] = useState(15);
  const [profitShare, setProfitShare] = useState(70);
  const [subLevel, setSubLevel] = useState<string>("none");

  const breakdown = useMemo(
    () => calculateBrokerLayerBreakdown(msPerLayer, brokerLevel),
    [msPerLayer, brokerLevel]
  );

  const dividend = useMemo(
    () => calculateBrokerDividendEarnings(grossProfit, feeRate, profitShare, brokerLevel, subLevel === "none" ? null : subLevel),
    [grossProfit, feeRate, profitShare, brokerLevel, subLevel]
  );

  const maxLayer = BROKER_LEVEL_MAX_LAYERS[brokerLevel] ?? 5;
  const barData = breakdown.layers.map(l => ({
    layer: `L${l.layer}`,
    earnings: l.earningsPerDay,
    fill: l.accessible ? "hsl(var(--chart-2))" : "hsl(var(--muted-foreground)/0.3)",
    accessible: l.accessible,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <Card className="lg:col-span-4 bg-card/80 backdrop-blur border-border shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4 mb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-chart-2" /> Parameters <span className="text-sm font-normal text-muted-foreground ml-1">参数设置</span></CardTitle>
          <CardDescription>20-layer broker system<br /><span className="text-xs">20层级推荐商系统</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Token Name <span className="opacity-70">代币名称</span></Label>
              <Input value={tokenName} onChange={(e) => setTokenName(e.target.value)} className="bg-background/50 border-border font-mono h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Broker Level <span className="opacity-70">推荐商等级</span></Label>
              <Select value={brokerLevel} onValueChange={setBrokerLevel}>
                <SelectTrigger className="bg-background/50 border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(BROKER_LEVEL_MAX_LAYERS).map(([lvl, maxL]) => (
                    <SelectItem key={lvl} value={lvl}>{lvl} (≤{maxL} layers)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-muted-foreground">{tokenName}/Layer/Day <span className="opacity-70">每层每日释放量</span></Label>
              <span className="font-mono text-xs font-semibold text-chart-2">{fmt(msPerLayer)}</span>
            </div>
            <Slider value={[msPerLayer]} min={10} max={5000} step={50} onValueChange={(v) => setMsPerLayer(v[0])} className="py-2" />
          </div>
          <div className="pt-2 border-t border-border/50">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-3">Dividend Pool 分红池参数</p>
            <div className="space-y-1.5 mb-3">
              <Label className="text-xs text-muted-foreground">Subordinate Broker Level <span className="opacity-70">下级推荐商等级</span></Label>
              <Select value={subLevel} onValueChange={setSubLevel}>
                <SelectTrigger className="bg-background/50 border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (直接下线)</SelectItem>
                  {Object.keys(BROKER_LEVEL_MAX_LAYERS).map(lvl => (
                    <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {[
              { label: "Gross Profit (USDC/day)", sub: "每日毛利润", val: grossProfit, set: setGrossProfit, min: 100, max: 100000, step: 500 },
              { label: "Trading Fee Rate %", sub: "手续费率", val: feeRate, set: setFeeRate, min: 0, max: 50, step: 1 },
              { label: "User Profit Share %", sub: "用户分润%", val: profitShare, set: setProfitShare, min: 50, max: 90, step: 5 },
            ].map(({ label, sub, val, set, min, max, step }) => (
              <div key={label} className="space-y-1.5 mb-3">
                <div className="flex justify-between items-center">
                  <Label className="text-xs text-muted-foreground flex gap-1"><span>{label}</span><span className="opacity-70">{sub}</span></Label>
                  <span className="font-mono text-xs font-semibold">{fmt(val)}</span>
                </div>
                <Slider value={[val]} min={min} max={max} step={step} onValueChange={(v) => set(v[0])} className="py-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="lg:col-span-8 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: `${tokenName} Layer Income/Day`, sub: "每日层级收益", val: `${fmt(breakdown.totalAccessible)} ${tokenName}`, color: "text-chart-2" },
            { label: "Locked (Upgrade needed)", sub: "需升级解锁", val: `${fmt(breakdown.totalLocked)} ${tokenName}`, color: "text-muted-foreground" },
            { label: "Dividend Earnings/Day", sub: "分红收益/日", val: formatCurrency(dividend.earnings), color: "text-primary" },
            { label: "Accessible Layers", sub: "可访问层数", val: `${maxLayer} / 20`, color: "text-chart-3" },
          ].map(({ label, sub, val, color }) => (
            <Card key={label} className="bg-card/60 border-border p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex justify-between"><span>{label}</span><span className="opacity-70">{sub}</span></p>
              <p className={`text-lg font-bold font-mono ${color}`}>{val}</p>
            </Card>
          ))}
        </div>

        <Card className="bg-card/80 backdrop-blur border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Layer Breakdown <span className="text-sm font-normal text-muted-foreground ml-1">20层收益明细</span></span>
              <div className="flex gap-2">
                <Badge className="text-[10px] bg-chart-2/20 text-chart-2 border-chart-2/30 border">Accessible</Badge>
                <Badge variant="outline" className="text-[10px] text-muted-foreground/50">Locked</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="layer" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${fmt(v)}`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, _, p) => [`${fmt(v)} ${tokenName}`, p.payload.accessible ? "Layer Earnings (Accessible)" : "Layer Earnings (Locked)"]} />
                  <Bar dataKey="earnings" radius={[3, 3, 0, 0]}>
                    {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur border-border shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Dividend System Breakdown <span className="text-sm font-normal text-muted-foreground ml-1">分红池级差计算</span></CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "User Share", sub: "用户分红", val: formatCurrency(dividend.userShare) },
                { label: "Broker Dividend Pool", sub: "推荐商分红池", val: formatCurrency(dividend.brokerDividendPool), highlight: true },
                { label: `${brokerLevel} Dividend Rate`, sub: `${brokerLevel}分红率`, val: `${dividend.brokerRate}%` },
                { label: "Differential Rate", sub: "级差比率", val: `${dividend.differentialRate}%`, highlight2: true },
              ].map(({ label, sub, val, highlight, highlight2 }) => (
                <div key={label} className={`p-3 rounded-lg border ${highlight ? "bg-primary/10 border-primary/30" : highlight2 ? "bg-chart-2/10 border-chart-2/30" : "bg-background/30 border-border"}`}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex justify-between"><span>{label}</span><span className="opacity-70">{sub}</span></p>
                  <p className={`text-base font-bold font-mono mt-1 ${highlight ? "text-primary" : highlight2 ? "text-chart-2" : ""}`}>{val}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 p-3 bg-background/30 rounded-lg border border-border">
              {brokerLevel} has access to up to {maxLayer} layers. Dividend rate: <span className="font-mono text-primary">{dividend.brokerRate}%</span>
              {subLevel ? ` — Subordinate ${subLevel} rate: ${dividend.subRate}%, differential: ${dividend.differentialRate}%` : " (no subordinate broker)"}.
              Daily dividend earnings: <span className="font-mono text-chart-2 font-semibold">{formatCurrency(dividend.earnings)}</span>
              <span className="block text-[11px] opacity-75 mt-1">{brokerLevel} 可访问 {maxLayer} 层。分红率 {dividend.brokerRate}%，级差 {dividend.differentialRate}%，每日分红收益 {formatCurrency(dividend.earnings)}。</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Shared: Empty State ──────────────────────────────────────────────────────

function EmptyState({ icon, msg, sub }: { icon: React.ReactNode; msg: string; sub: string }) {
  return (
    <div className="h-[380px] flex items-center justify-center border border-dashed border-border rounded-lg bg-background/30">
      <div className="text-center flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">{icon}</div>
        <p className="text-muted-foreground">{msg}<br /><span className="text-sm opacity-80">{sub}</span></p>
      </div>
    </div>
  );
}
