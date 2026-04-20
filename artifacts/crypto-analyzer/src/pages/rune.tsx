import { useState } from "react";
import { useGetRuneOverview, useCalculateRuneReturns, RuneCalculatorInputMode } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent, formatCompactCurrency, formatNumber } from "@/lib/format";
import { Activity, ArrowLeft, ArrowRight, BarChart2, Coins, Layers, Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Slider } from "@/components/ui/slider";
import { Link } from "wouter";

export default function Rune() {
  const { data: overview, isLoading: isOverviewLoading } = useGetRuneOverview();
  
  const [mode, setMode] = useState<RuneCalculatorInputMode>("bond");
  const [runeAmount, setRuneAmount] = useState(10000);
  const [durationDays, setDurationDays] = useState(30);

  const calcMutation = useCalculateRuneReturns();

  const handleCalculate = () => {
    calcMutation.mutate({
      data: {
        mode,
        runeAmount,
        durationDays,
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 animate-slide-up">
      <Link href="/projects" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> ← 返回项目库 Back to Projects
      </Link>

      <div className="space-y-2 border-b border-border/50 pb-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg border border-primary/20 animate-pulse-glow">
            <Coins className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-baseline gap-3">
            THORChain Analytics
            <span className="text-xl text-muted-foreground font-normal">THORChain 深度分析报告</span>
          </h1>
        </div>
        <p className="text-muted-foreground max-w-3xl">
          Deep dive into RUNE metrics, network security, and yield generation strategies across nodes and liquidity pools.
        </p>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-border/50 pb-8">
        {isOverviewLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl bg-card border-border" />)
        ) : overview ? (
          <>
            <div className="p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm shadow-sm hover:border-primary/30 transition-colors">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 flex justify-between">
                <span>RUNE Price</span>
                <span className="opacity-70">RUNE 价格</span>
              </p>
              <p className="text-2xl font-bold font-mono text-foreground">{formatCurrency(overview.price)}</p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm shadow-sm hover:border-primary/30 transition-colors">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 flex justify-between">
                <span>Network TVL</span>
                <span className="opacity-70">网络锁仓量</span>
              </p>
              <p className="text-2xl font-bold font-mono">{overview.tvl.startsWith("$") ? overview.tvl : `$${overview.tvl}`}</p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm shadow-sm hover:border-primary/30 transition-colors">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 flex justify-between">
                <span>Active Nodes</span>
                <span className="opacity-70">活跃节点</span>
              </p>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <p className="text-2xl font-bold font-mono">{formatNumber(overview.nodesCount)}</p>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm shadow-sm border-t-[3px] border-t-primary hover:border-primary/30 transition-colors">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 flex justify-between">
                <span>Base APR</span>
                <span className="opacity-70">基础年化</span>
              </p>
              <p className="text-2xl font-bold font-mono text-primary">{formatPercent(overview.currentApr)}</p>
            </div>
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calculator Form */}
        <Card className="lg:col-span-1 bg-card/80 backdrop-blur border-border h-fit shadow-sm">
          <CardHeader className="border-b border-border/50 pb-4 mb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Yield Simulator
            </CardTitle>
            <CardDescription>Project returns for RUNE strategies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-muted-foreground flex justify-between">
                <span>Strategy Mode</span>
                <span className="text-xs">策略模式</span>
              </Label>
              <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v as RuneCalculatorInputMode)} className="justify-start flex-wrap">
                <ToggleGroupItem value="bond" aria-label="Bond node" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border border-border px-3 py-6 h-auto flex flex-col gap-1 text-xs font-medium tracking-wide">
                  <span>NODE BOND</span>
                  <span className="text-[10px] opacity-80 font-normal">节点质押</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="pool" aria-label="Pool single sided" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border border-border px-3 py-6 h-auto flex flex-col gap-1 text-xs font-medium tracking-wide">
                  <span>SAVER</span>
                  <span className="text-[10px] opacity-80 font-normal">储蓄金库</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="lp" aria-label="LP dual sided" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border border-border px-3 py-6 h-auto flex flex-col gap-1 text-xs font-medium tracking-wide">
                  <span>LP DUAL</span>
                  <span className="text-[10px] opacity-80 font-normal">双向流动性</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-muted-foreground flex gap-2">
                  <span>RUNE Amount</span>
                  <span className="text-xs opacity-70">RUNE 数量</span>
                </Label>
                <span className="font-mono text-sm font-semibold text-primary">{formatNumber(runeAmount)}</span>
              </div>
              <Input 
                type="number" 
                value={runeAmount} 
                onChange={(e) => setRuneAmount(Number(e.target.value))}
                className="bg-background/50 border-border font-mono shadow-inner focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-muted-foreground flex gap-2">
                  <span>Duration (Days)</span>
                  <span className="text-xs opacity-70">持仓周期</span>
                </Label>
                <span className="font-mono text-sm font-semibold">{durationDays}</span>
              </div>
              <Slider 
                value={[durationDays]} 
                min={7} 
                max={365} 
                step={7} 
                onValueChange={(v) => setDurationDays(v[0])} 
                className="py-2"
              />
            </div>

            <Button 
              className="w-full mt-6 shadow-[0_0_15px_rgba(var(--primary),0.3)]" 
              onClick={handleCalculate}
              disabled={calcMutation.isPending}
            >
              {calcMutation.isPending ? "Calculating..." : "Run Simulation 开始模拟"}
            </Button>
          </CardContent>
        </Card>

        {/* Calculator Results & Deep Metrics */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-card/80 backdrop-blur border-border overflow-hidden shadow-sm">
            <div className="bg-muted/30 border-b border-border/50 p-4 px-6">
              <h3 className="font-semibold text-lg flex items-center gap-3">
                <BarChart2 className="h-5 w-5 text-primary" /> 
                <span>Simulation Results</span>
                <span className="text-sm font-normal text-muted-foreground">模拟结果</span>
              </h3>
            </div>
            <CardContent className="p-0">
              {calcMutation.data ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border/50">
                    <div className="p-6 space-y-1">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Input Value</p>
                      <p className="text-xl font-bold font-mono">{formatCurrency(calcMutation.data.inputUsdValue)}</p>
                    </div>
                    <div className="p-6 space-y-1 bg-primary/5 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                      <p className="text-[11px] text-primary uppercase tracking-wider font-semibold relative z-10">Proj. APY</p>
                      <p className="text-2xl font-bold font-mono text-primary relative z-10">{formatPercent(calcMutation.data.apyPercent)}</p>
                    </div>
                    <div className="p-6 space-y-1">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Est. Yield</p>
                      <p className="text-xl font-bold font-mono text-chart-2">+{formatNumber(calcMutation.data.estimatedReturn)} RUNE</p>
                    </div>
                    <div className="p-6 space-y-1">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Yield USD</p>
                      <p className="text-xl font-bold font-mono text-chart-2">+{formatCurrency(calcMutation.data.estimatedReturnUsd)}</p>
                    </div>
                  </div>
                  
                  {calcMutation.data.warnings && calcMutation.data.warnings.length > 0 && (
                    <div className="p-4 bg-destructive/10 border-y border-destructive/20 text-sm">
                      <div className="flex items-start gap-2 text-destructive">
                        <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                        <ul className="space-y-1 font-medium">
                          {calcMutation.data.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-6 border-t border-border/50">
                    <table className="w-full text-sm">
                      <tbody>
                        {calcMutation.data.breakdown.map((item, i) => (
                          <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="py-3 text-muted-foreground px-2">{item.label}</td>
                            <td className="py-3 text-right font-mono font-medium px-2">{item.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-16 text-center text-muted-foreground flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
                    <BarChart2 className="h-8 w-8 opacity-20" />
                  </div>
                  <p>Run a simulation to view projected yields and strategy breakdown.<br/><span className="text-xs opacity-70">运行模拟以查看预期收益和策略分解</span></p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Key Metrics */}
          {overview?.keyMetrics && overview.keyMetrics.length > 0 && (
            <Card className="bg-card/80 backdrop-blur border-border shadow-sm">
              <CardHeader className="border-b border-border/50 pb-4 mb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-3">
                  <Layers className="h-4 w-4 text-primary" /> 
                  <span>Economic State</span>
                  <span className="text-sm font-normal text-muted-foreground">经济状态指标</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {overview.keyMetrics.map((metric, i) => (
                    <div key={i} className="p-4 border border-border/50 rounded-xl bg-background/30 shadow-inner hover:border-primary/20 transition-colors group">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 group-hover:text-primary/70 transition-colors">{metric.label}</p>
                      <p className="text-xl font-bold font-mono">{metric.value}</p>
                      {metric.description && (
                        <p className="text-xs text-muted-foreground mt-3 border-t border-border/50 pt-2 leading-relaxed">
                          {metric.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
