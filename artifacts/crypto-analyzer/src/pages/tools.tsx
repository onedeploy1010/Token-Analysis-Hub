import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Activity, Calculator, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { useCalculateApy, useSimulateInvestment, useCalculateImpermanentLoss, ApyCalculatorInputCompoundFrequency } from "@workspace/api-client-react";
import { formatCurrency, formatPercent } from "@/lib/format";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

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
          Advanced calculators for projecting DeFi yields, simulating long-term investment strategies, and quantifying impermanent loss risks.<br/>
          <span className="text-sm opacity-80">高级计算器，用于预测 DeFi 收益、模拟长期投资策略，以及量化无常损失风险。</span>
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-transparent border-b border-border w-full justify-start h-auto p-0 space-x-8 rounded-none flex-wrap">
          <TabsTrigger 
            value="apy" 
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 py-3 font-medium transition-all flex flex-col items-start gap-0.5"
          >
            <span>APY Calculator</span>
            <span className="text-[10px] opacity-70 font-normal">年化收益计算器</span>
          </TabsTrigger>
          <TabsTrigger 
            value="investment" 
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-chart-2 border-b-2 border-transparent data-[state=active]:border-chart-2 rounded-none px-0 py-3 font-medium transition-all flex flex-col items-start gap-0.5"
          >
            <span>Investment Simulator</span>
            <span className="text-[10px] opacity-70 font-normal">投资模拟器</span>
          </TabsTrigger>
          <TabsTrigger 
            value="il" 
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-destructive border-b-2 border-transparent data-[state=active]:border-destructive rounded-none px-0 py-3 font-medium transition-all flex flex-col items-start gap-0.5"
          >
            <span>Impermanent Loss</span>
            <span className="text-[10px] opacity-70 font-normal">无常损失计算</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="apy">
          <ApyCalculator />
        </TabsContent>
        <TabsContent value="investment">
          <InvestmentSimulator />
        </TabsContent>
        <TabsContent value="il">
          <ImpermanentLossCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ApyCalculator() {
  const [principal, setPrincipal] = useState(1000);
  const [apy, setApy] = useState(15);
  const [days, setDays] = useState(365);
  const [frequency, setFrequency] = useState<ApyCalculatorInputCompoundFrequency>("daily");

  const calcMutation = useCalculateApy();

  const handleCalculate = () => {
    calcMutation.mutate({
      data: {
        principal,
        apy,
        durationDays: days,
        compoundFrequency: frequency
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <Card className="lg:col-span-4 bg-card/80 backdrop-blur border-border shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4 mb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Parameters <span className="text-sm font-normal text-muted-foreground ml-1">参数设置</span>
          </CardTitle>
          <CardDescription>Configure your yield parameters<br/><span className="text-xs">配置您的收益参数</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-muted-foreground flex gap-2">
                <span>Initial Principal ($)</span>
                <span className="text-xs opacity-70">初始本金</span>
              </Label>
              <span className="font-mono text-sm font-semibold text-primary">{formatCurrency(principal)}</span>
            </div>
            <Slider
              value={[principal]}
              min={100}
              max={100000}
              step={100}
              onValueChange={(v) => setPrincipal(v[0])}
              className="py-2"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-muted-foreground flex gap-2">
                <span>Expected APY (%)</span>
                <span className="text-xs opacity-70">预期年化</span>
              </Label>
              <span className="font-mono text-sm font-semibold">{apy}%</span>
            </div>
            <Slider
              value={[apy]}
              min={1}
              max={200}
              step={1}
              onValueChange={(v) => setApy(v[0])}
              className="py-2"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-muted-foreground flex gap-2">
                <span>Duration (Days)</span>
                <span className="text-xs opacity-70">持续时间(天)</span>
              </Label>
              <span className="font-mono text-sm font-semibold">{days}</span>
            </div>
            <Slider
              value={[days]}
              min={7}
              max={1095}
              step={7}
              onValueChange={(v) => setDays(v[0])}
              className="py-2"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-muted-foreground flex justify-between mb-2">
              <span>Compound Frequency</span>
              <span className="text-xs opacity-70">复利频率</span>
            </Label>
            <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
              <SelectTrigger className="bg-background/50 backdrop-blur border-border focus-visible:ring-primary">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily 每日</SelectItem>
                <SelectItem value="weekly">Weekly 每周</SelectItem>
                <SelectItem value="monthly">Monthly 每月</SelectItem>
                <SelectItem value="yearly">Yearly 每年</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            className="w-full mt-6 shadow-[0_0_15px_rgba(var(--primary),0.3)]" 
            onClick={handleCalculate}
            disabled={calcMutation.isPending}
          >
            {calcMutation.isPending ? "Calculating..." : "Run Simulation 运行模拟"}
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-8 bg-card/80 backdrop-blur border-border shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4 mb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            Projection Results <span className="text-sm font-normal text-muted-foreground ml-1">预测结果</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {calcMutation.data ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-b border-border/50 pb-6">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 flex justify-between">
                    <span>Final Amount</span>
                    <span className="opacity-70">最终金额</span>
                  </p>
                  <p className="text-2xl font-bold font-mono text-foreground">{formatCurrency(calcMutation.data.finalAmount)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 flex justify-between">
                    <span>Total Return</span>
                    <span className="opacity-70">总收益</span>
                  </p>
                  <p className="text-xl font-semibold font-mono text-chart-2">+{formatCurrency(calcMutation.data.totalReturn)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 flex justify-between">
                    <span>ROI %</span>
                    <span className="opacity-70">回报率</span>
                  </p>
                  <p className="text-xl font-semibold font-mono text-chart-2">+{formatPercent(calcMutation.data.returnPercent)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 flex justify-between">
                    <span>Principal</span>
                    <span className="opacity-70">本金</span>
                  </p>
                  <p className="text-xl font-medium font-mono text-muted-foreground">{formatCurrency(calcMutation.data.principal)}</p>
                </div>
              </div>

              <div className="h-[300px] w-full mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={calcMutation.data.dailyBreakdown} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="day" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `Day ${v}`}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${v}`}
                      domain={['dataMin', 'dataMax']}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))', fontFamily: 'monospace' }}
                      formatter={(value: number) => [formatCurrency(value), 'Value']}
                      labelFormatter={(label) => `Day ${label}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorAmount)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center border border-dashed border-border rounded-lg bg-background/30">
              <div className="text-center flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
                  <Activity className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground">
                  Adjust parameters and run simulation to view projection.<br/>
                  <span className="text-sm opacity-80">调整参数并运行模拟以查看预测结果。</span>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InvestmentSimulator() {
  const [initial, setInitial] = useState(10000);
  const [monthly, setMonthly] = useState(500);
  const [apy, setApy] = useState(12);
  const [years, setYears] = useState(5);

  const calcMutation = useSimulateInvestment();

  const handleCalculate = () => {
    calcMutation.mutate({
      data: {
        initialInvestment: initial,
        monthlyContribution: monthly,
        expectedApy: apy,
        years,
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <Card className="lg:col-span-4 bg-card/80 backdrop-blur border-border shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4 mb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-chart-2" /> Parameters <span className="text-sm font-normal text-muted-foreground ml-1">参数设置</span>
          </CardTitle>
          <CardDescription>Long-term growth simulation<br/><span className="text-xs">长期增长模拟</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-muted-foreground flex gap-2">
                <span>Initial Investment ($)</span>
                <span className="text-xs opacity-70">初始投资</span>
              </Label>
              <span className="font-mono text-sm font-semibold text-chart-2">{formatCurrency(initial)}</span>
            </div>
            <Slider value={[initial]} min={100} max={100000} step={100} onValueChange={(v) => setInitial(v[0])} className="py-2" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-muted-foreground flex gap-2">
                <span>Monthly Contribution ($)</span>
                <span className="text-xs opacity-70">每月定投</span>
              </Label>
              <span className="font-mono text-sm font-semibold">{formatCurrency(monthly)}</span>
            </div>
            <Slider value={[monthly]} min={0} max={10000} step={50} onValueChange={(v) => setMonthly(v[0])} className="py-2" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-muted-foreground flex gap-2">
                <span>Expected APY (%)</span>
                <span className="text-xs opacity-70">预期年化</span>
              </Label>
              <span className="font-mono text-sm font-semibold">{apy}%</span>
            </div>
            <Slider value={[apy]} min={1} max={100} step={1} onValueChange={(v) => setApy(v[0])} className="py-2" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-muted-foreground flex gap-2">
                <span>Time Horizon (Years)</span>
                <span className="text-xs opacity-70">投资年限</span>
              </Label>
              <span className="font-mono text-sm font-semibold">{years}</span>
            </div>
            <Slider value={[years]} min={1} max={20} step={1} onValueChange={(v) => setYears(v[0])} className="py-2" />
          </div>

          <Button 
            className="w-full mt-6 bg-chart-2 hover:bg-chart-2/90 text-white shadow-[0_0_15px_rgba(var(--chart-2),0.3)]" 
            onClick={handleCalculate}
            disabled={calcMutation.isPending}
          >
            {calcMutation.isPending ? "Simulating..." : "Run Simulation 运行模拟"}
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-8 bg-card/80 backdrop-blur border-border shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4 mb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            Growth Trajectory <span className="text-sm font-normal text-muted-foreground ml-1">增长轨迹</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {calcMutation.data ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-b border-border/50 pb-6">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 flex justify-between">
                    <span>Final Value</span>
                    <span className="opacity-70">最终价值</span>
                  </p>
                  <p className="text-2xl font-bold font-mono text-foreground">{formatCurrency(calcMutation.data.finalValue)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 flex justify-between">
                    <span>Total Contributions</span>
                    <span className="opacity-70">总投入</span>
                  </p>
                  <p className="text-xl font-medium font-mono text-muted-foreground">{formatCurrency(calcMutation.data.totalContributed)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 flex justify-between">
                    <span>Total Yield</span>
                    <span className="opacity-70">总收益</span>
                  </p>
                  <p className="text-xl font-semibold font-mono text-chart-2">+{formatCurrency(calcMutation.data.totalReturn)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 flex justify-between">
                    <span>ROI</span>
                    <span className="opacity-70">回报率</span>
                  </p>
                  <p className="text-xl font-semibold font-mono text-chart-2">+{formatPercent(calcMutation.data.returnPercent)}</p>
                </div>
              </div>

              <div className="h-[300px] w-full mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={calcMutation.data.yearlyBreakdown} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorContrib" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="year" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `Yr ${v}`}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${v > 1000 ? (v/1000).toFixed(0) + 'k' : v}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))', fontFamily: 'monospace' }}
                      formatter={(value: number, name: string) => [formatCurrency(value), name === 'value' ? 'Total Value' : 'Contributions']}
                      labelFormatter={(label) => `Year ${label}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="contributed" 
                      stackId="1"
                      stroke="hsl(var(--muted-foreground))" 
                      fill="url(#colorContrib)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center border border-dashed border-border rounded-lg bg-background/30">
              <div className="text-center flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground">
                  Adjust parameters and run simulation to view projection.<br/>
                  <span className="text-sm opacity-80">调整参数并运行模拟以查看预测结果。</span>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ImpermanentLossCalculator() {
  const [initialPrice, setInitialPrice] = useState(100);
  const [currentPrice, setCurrentPrice] = useState(150);
  const [liquidity, setLiquidity] = useState(1000);

  const calcMutation = useCalculateImpermanentLoss();

  const handleCalculate = () => {
    calcMutation.mutate({
      data: {
        initialPrice,
        currentPrice,
        liquidityValue: liquidity,
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <Card className="lg:col-span-4 bg-card/80 backdrop-blur border-border">
        <CardHeader>
          <CardTitle className="text-xl font-mono flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> Parameters <span className="text-sm font-sans font-normal text-muted-foreground ml-1">参数设置</span>
          </CardTitle>
          <CardDescription>Quantify LP divergence risk<br/><span className="text-xs">量化流动性提供者价格偏离风险</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="flex justify-between">
              <span>Initial Asset Price ($)</span>
              <span className="text-xs opacity-70">初始资产价格</span>
            </Label>
            <Input 
              type="number" 
              value={initialPrice} 
              onChange={(e) => setInitialPrice(Number(e.target.value))}
              className="bg-background/50 border-border font-mono focus-visible:ring-destructive"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex justify-between">
              <span>Current/Projected Asset Price ($)</span>
              <span className="text-xs opacity-70">当前/预期资产价格</span>
            </Label>
            <Input 
              type="number" 
              value={currentPrice} 
              onChange={(e) => setCurrentPrice(Number(e.target.value))}
              className="bg-background/50 border-border font-mono focus-visible:ring-destructive"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex justify-between">
              <span>Initial Liquidity Value ($)</span>
              <span className="text-xs opacity-70">初始流动性价值</span>
            </Label>
            <Input 
              type="number" 
              value={liquidity} 
              onChange={(e) => setLiquidity(Number(e.target.value))}
              className="bg-background/50 border-border font-mono focus-visible:ring-destructive"
            />
          </div>

          <Button 
            variant="destructive"
            className="w-full mt-6 shadow-[0_0_15px_rgba(var(--destructive),0.3)]" 
            onClick={handleCalculate}
            disabled={calcMutation.isPending}
          >
            {calcMutation.isPending ? "Calculating..." : "Calculate Risk 计算风险"}
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-8 bg-card/80 backdrop-blur border-border">
        <CardHeader>
          <CardTitle className="text-xl font-mono flex items-center gap-2">
            Risk Analysis <span className="text-sm font-sans font-normal text-muted-foreground ml-1">风险分析</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {calcMutation.data ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-destructive/40 transition-colors">
                  <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent pointer-events-none" />
                  <p className="text-sm text-destructive uppercase tracking-wider mb-2 flex flex-col gap-1">
                    <span>Impermanent Loss</span>
                    <span className="text-[10px] opacity-80">无常损失比例</span>
                  </p>
                  <p className="text-4xl font-bold font-mono text-destructive">-{formatPercent(calcMutation.data.ilPercent)}</p>
                  <p className="text-sm font-mono text-destructive/80 mt-1">-{formatCurrency(calcMutation.data.ilUsd)}</p>
                </div>
                
                <div className="p-6 bg-background/50 border border-border rounded-xl flex flex-col items-center justify-center text-center">
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2 flex flex-col gap-1">
                    <span>Value if Held (HODL)</span>
                    <span className="text-[10px] opacity-80">如果持有不提供流动性的价值</span>
                  </p>
                  <p className="text-2xl font-bold font-mono">{formatCurrency(calcMutation.data.hodlValue)}</p>
                </div>
                
                <div className="p-6 bg-background/50 border border-border rounded-xl flex flex-col items-center justify-center text-center">
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2 flex flex-col gap-1">
                    <span>Value in LP</span>
                    <span className="text-[10px] opacity-80">在流动性池中的价值</span>
                  </p>
                  <p className="text-2xl font-bold font-mono">{formatCurrency(calcMutation.data.lpValue)}</p>
                </div>
              </div>
              
              <div className="p-5 bg-card border border-border rounded-xl mt-6 shadow-sm">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-muted-foreground" /> 
                  <span>Divergence Context</span>
                  <span className="text-sm font-normal text-muted-foreground">偏离情况分析</span>
                </h4>
                <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">
                  <p>When the asset price moves from <span className="font-mono text-foreground font-medium">{formatCurrency(initialPrice)}</span> to <span className="font-mono text-foreground font-medium">{formatCurrency(currentPrice)}</span>, your LP position suffers a <span className="font-mono text-destructive font-medium">{formatPercent(calcMutation.data.ilPercent)}</span> divergence loss compared to simply holding the assets.</p>
                  <p className="text-xs opacity-80 border-t border-border/50 pt-2 mt-2">当资产价格从 {formatCurrency(initialPrice)} 变动到 {formatCurrency(currentPrice)} 时，与单纯持有资产相比，您的流动性做市仓位将承受 {formatPercent(calcMutation.data.ilPercent)} 的无常损失。</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center border border-dashed border-border rounded-xl bg-background/30">
              <div className="text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground">
                  Enter parameters to calculate IL risk.<br/>
                  <span className="text-sm opacity-80">输入参数以计算无常损失风险。</span>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
