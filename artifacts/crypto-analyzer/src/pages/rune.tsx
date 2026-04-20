import { useState } from "react";
import { useGetRuneOverview, useCalculateRuneReturns, RuneCalculatorInputMode } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent, formatCompactCurrency, formatNumber } from "@/lib/format";
import { Activity, ArrowRight, BarChart2, Coins, Layers, Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Slider } from "@/components/ui/slider";

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
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="space-y-2 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-2 rounded-full border border-primary/30">
            <Coins className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-mono">THORChain Analytics</h1>
        </div>
        <p className="text-muted-foreground max-w-3xl">
          Deep dive into RUNE metrics, network security, and yield generation strategies across nodes and liquidity pools.
        </p>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isOverviewLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl bg-card border-border" />)
        ) : overview ? (
          <>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">RUNE Price</p>
                <p className="text-2xl font-bold font-mono text-primary">{formatCurrency(overview.price)}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Network TVL</p>
                <p className="text-2xl font-bold font-mono">{overview.tvl.startsWith("$") ? overview.tvl : `$${overview.tvl}`}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Active Nodes</p>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-chart-2" />
                  <p className="text-2xl font-bold font-mono text-chart-2">{formatNumber(overview.nodesCount)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Base APR</p>
                <p className="text-2xl font-bold font-mono text-primary">{formatPercent(overview.currentApr)}</p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calculator Form */}
        <Card className="lg:col-span-1 bg-card border-border h-fit">
          <CardHeader>
            <CardTitle className="text-xl font-mono flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Yield Simulator
            </CardTitle>
            <CardDescription>Project returns for RUNE strategies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Strategy Mode</Label>
              <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v as RuneCalculatorInputMode)} className="justify-start">
                <ToggleGroupItem value="bond" aria-label="Bond node" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border border-border px-4 font-mono text-xs">
                  NODE BOND
                </ToggleGroupItem>
                <ToggleGroupItem value="pool" aria-label="Pool single sided" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border border-border px-4 font-mono text-xs">
                  SAVER (SINGLE)
                </ToggleGroupItem>
                <ToggleGroupItem value="lp" aria-label="LP dual sided" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border border-border px-4 font-mono text-xs">
                  LP (DUAL)
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>RUNE Amount</Label>
                <span className="font-mono text-sm text-primary">{formatNumber(runeAmount)} RUNE</span>
              </div>
              <Input 
                type="number" 
                value={runeAmount} 
                onChange={(e) => setRuneAmount(Number(e.target.value))}
                className="bg-background border-border font-mono"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Duration (Days)</Label>
                <span className="font-mono text-sm text-primary">{durationDays} Days</span>
              </div>
              <Slider 
                value={[durationDays]} 
                min={7} 
                max={365} 
                step={7} 
                onValueChange={(v) => setDurationDays(v[0])} 
              />
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

        {/* Calculator Results & Deep Metrics */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-card border-border overflow-hidden">
            <div className="bg-muted/30 border-b border-border p-4">
              <h3 className="font-mono font-semibold flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary" /> Simulation Results
              </h3>
            </div>
            <CardContent className="p-0">
              {calcMutation.data ? (
                <div>
                  <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border">
                    <div className="p-6 space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Input Value</p>
                      <p className="text-xl font-bold font-mono">{formatCurrency(calcMutation.data.inputUsdValue)}</p>
                    </div>
                    <div className="p-6 space-y-1 bg-primary/5">
                      <p className="text-xs text-primary uppercase tracking-wider font-semibold">Proj. APY</p>
                      <p className="text-2xl font-bold font-mono text-primary">{formatPercent(calcMutation.data.apyPercent)}</p>
                    </div>
                    <div className="p-6 space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Est. Yield</p>
                      <p className="text-xl font-bold font-mono text-chart-2">+{formatNumber(calcMutation.data.estimatedReturn)} RUNE</p>
                    </div>
                    <div className="p-6 space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Yield USD</p>
                      <p className="text-xl font-bold font-mono text-chart-2">+{formatCurrency(calcMutation.data.estimatedReturnUsd)}</p>
                    </div>
                  </div>
                  
                  {calcMutation.data.warnings && calcMutation.data.warnings.length > 0 && (
                    <div className="p-4 bg-destructive/10 border-t border-destructive/20 text-sm">
                      <div className="flex items-start gap-2 text-destructive">
                        <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                        <ul className="space-y-1">
                          {calcMutation.data.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-6 border-t border-border">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Breakdown</h4>
                    <div className="space-y-3">
                      {calcMutation.data.breakdown.map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-mono font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-muted-foreground">
                  Run a simulation to view projected yields and strategy breakdown.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Key Metrics */}
          {overview?.keyMetrics && overview.keyMetrics.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-xl font-mono flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" /> Economic State
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {overview.keyMetrics.map((metric, i) => (
                    <div key={i} className="p-4 border border-border rounded-lg bg-background">
                      <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                      <p className="text-xl font-bold font-mono">{metric.value}</p>
                      {metric.description && (
                        <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">
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
