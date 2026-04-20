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
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="space-y-2 border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight font-mono flex items-center gap-3">
          <Calculator className="h-8 w-8 text-primary" /> Economic Simulators
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          Advanced calculators for projecting DeFi yields, simulating long-term investment strategies, and quantifying impermanent loss risks.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border border-border h-12 inline-flex w-full md:w-auto p-1">
          <TabsTrigger value="apy" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary flex-1 md:w-48">APY Calculator</TabsTrigger>
          <TabsTrigger value="investment" className="data-[state=active]:bg-chart-2/20 data-[state=active]:text-chart-2 flex-1 md:w-48">Investment Simulator</TabsTrigger>
          <TabsTrigger value="il" className="data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive flex-1 md:w-48">Impermanent Loss</TabsTrigger>
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

  // Calculate on initial mount or when user changes sliders (debounced ideally, but button driven for now)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <Card className="lg:col-span-4 bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl font-mono flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Parameters
          </CardTitle>
          <CardDescription>Configure your yield parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Initial Principal ($)</Label>
              <span className="font-mono text-sm text-primary">{formatCurrency(principal)}</span>
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
              <Label>Expected APY (%)</Label>
              <span className="font-mono text-sm text-primary">{apy}%</span>
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
              <Label>Duration (Days)</Label>
              <span className="font-mono text-sm text-primary">{days} Days</span>
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
            <Label>Compound Frequency</Label>
            <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            className="w-full mt-4" 
            onClick={handleCalculate}
            disabled={calcMutation.isPending}
          >
            {calcMutation.isPending ? "Calculating..." : "Run Simulation"}
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-8 bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl font-mono">Projection Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {calcMutation.data ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-background border border-border rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Final Amount</p>
                  <p className="text-2xl font-bold font-mono text-primary">{formatCurrency(calcMutation.data.finalAmount)}</p>
                </div>
                <div className="p-4 bg-background border border-border rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Return</p>
                  <p className="text-xl font-bold font-mono text-chart-2">{formatCurrency(calcMutation.data.totalReturn)}</p>
                </div>
                <div className="p-4 bg-background border border-border rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">ROI %</p>
                  <p className="text-xl font-bold font-mono text-chart-2">+{formatPercent(calcMutation.data.returnPercent)}</p>
                </div>
                <div className="p-4 bg-background border border-border rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Principal</p>
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
            </>
          ) : (
            <div className="h-[400px] flex items-center justify-center border border-dashed border-border rounded-lg bg-background/50">
              <div className="text-center">
                <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Adjust parameters and run simulation to view projection.</p>
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
      <Card className="lg:col-span-4 bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl font-mono flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-chart-2" /> Parameters
          </CardTitle>
          <CardDescription>Long-term growth simulation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Initial Investment ($)</Label>
              <span className="font-mono text-sm text-chart-2">{formatCurrency(initial)}</span>
            </div>
            <Slider value={[initial]} min={100} max={100000} step={100} onValueChange={(v) => setInitial(v[0])} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Monthly Contribution ($)</Label>
              <span className="font-mono text-sm text-chart-2">{formatCurrency(monthly)}</span>
            </div>
            <Slider value={[monthly]} min={0} max={10000} step={50} onValueChange={(v) => setMonthly(v[0])} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Expected APY (%)</Label>
              <span className="font-mono text-sm text-chart-2">{apy}%</span>
            </div>
            <Slider value={[apy]} min={1} max={100} step={1} onValueChange={(v) => setApy(v[0])} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Time Horizon (Years)</Label>
              <span className="font-mono text-sm text-chart-2">{years} Years</span>
            </div>
            <Slider value={[years]} min={1} max={20} step={1} onValueChange={(v) => setYears(v[0])} />
          </div>

          <Button 
            className="w-full mt-4 bg-chart-2 hover:bg-chart-2/90 text-black" 
            onClick={handleCalculate}
            disabled={calcMutation.isPending}
          >
            {calcMutation.isPending ? "Simulating..." : "Run Simulation"}
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-8 bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl font-mono">Growth Trajectory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {calcMutation.data ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-background border border-border rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Final Value</p>
                  <p className="text-2xl font-bold font-mono text-chart-2">{formatCurrency(calcMutation.data.finalValue)}</p>
                </div>
                <div className="p-4 bg-background border border-border rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Contributions</p>
                  <p className="text-xl font-bold font-mono text-muted-foreground">{formatCurrency(calcMutation.data.totalContributed)}</p>
                </div>
                <div className="p-4 bg-background border border-border rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Yield</p>
                  <p className="text-xl font-bold font-mono text-primary">+{formatCurrency(calcMutation.data.totalReturn)}</p>
                </div>
                <div className="p-4 bg-background border border-border rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">ROI</p>
                  <p className="text-xl font-medium font-mono text-primary">+{formatPercent(calcMutation.data.returnPercent)}</p>
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
            </>
          ) : (
            <div className="h-[400px] flex items-center justify-center border border-dashed border-border rounded-lg bg-background/50">
              <div className="text-center">
                <TrendingUp className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Adjust parameters and run simulation to view projection.</p>
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
      <Card className="lg:col-span-4 bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl font-mono flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> Parameters
          </CardTitle>
          <CardDescription>Quantify LP divergence risk</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Initial Asset Price ($)</Label>
            <Input 
              type="number" 
              value={initialPrice} 
              onChange={(e) => setInitialPrice(Number(e.target.value))}
              className="bg-background border-border font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label>Current/Projected Asset Price ($)</Label>
            <Input 
              type="number" 
              value={currentPrice} 
              onChange={(e) => setCurrentPrice(Number(e.target.value))}
              className="bg-background border-border font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label>Initial Liquidity Value ($)</Label>
            <Input 
              type="number" 
              value={liquidity} 
              onChange={(e) => setLiquidity(Number(e.target.value))}
              className="bg-background border-border font-mono"
            />
          </div>

          <Button 
            variant="destructive"
            className="w-full mt-4" 
            onClick={handleCalculate}
            disabled={calcMutation.isPending}
          >
            {calcMutation.isPending ? "Calculating..." : "Calculate Risk"}
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-8 bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl font-mono">Risk Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {calcMutation.data ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl flex flex-col items-center justify-center text-center">
                  <p className="text-sm text-destructive uppercase tracking-wider mb-2">Impermanent Loss</p>
                  <p className="text-4xl font-bold font-mono text-destructive">-{formatPercent(calcMutation.data.ilPercent)}</p>
                  <p className="text-sm font-mono text-destructive/80 mt-1">-{formatCurrency(calcMutation.data.ilUsd)}</p>
                </div>
                
                <div className="p-6 bg-background border border-border rounded-xl flex flex-col items-center justify-center text-center">
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Value if Held (HODL)</p>
                  <p className="text-2xl font-bold font-mono">{formatCurrency(calcMutation.data.hodlValue)}</p>
                </div>
                
                <div className="p-6 bg-background border border-border rounded-xl flex flex-col items-center justify-center text-center">
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Value in LP</p>
                  <p className="text-2xl font-bold font-mono">{formatCurrency(calcMutation.data.lpValue)}</p>
                </div>
              </div>
              
              <div className="p-4 bg-muted/30 border border-border rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-muted-foreground" /> Divergence Context
                </h4>
                <p className="text-sm text-muted-foreground">
                  The asset price changed by <strong className="text-foreground">{formatPercent(calcMutation.data.priceChangePercent)}</strong>. 
                  Providing liquidity exposed you to <strong className="text-destructive font-mono">{formatCurrency(calcMutation.data.ilUsd)}</strong> of impermanent loss 
                  compared to simply holding the assets in your wallet. Ensure your yield from trading fees exceeds this amount.
                </p>
              </div>
            </>
          ) : (
            <div className="h-[400px] flex items-center justify-center border border-dashed border-border rounded-lg bg-background/50">
              <div className="text-center">
                <AlertTriangle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Input parameters to quantify impermanent loss risk.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
