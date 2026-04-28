import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lock, TrendingUp, Coins, Percent, RefreshCw } from "lucide-react";
import { calculateStakingReturns, formatCurrency, formatTokens, formatPercent } from "@/lib/tokenomics";
import { StakingPeriod, defaultStakingPeriods, StaticReleaseTax, defaultStaticReleaseTax } from "@shared/schema";

interface StakingCalculatorProps {
  tokenPrice: number;
  stakingPeriods?: StakingPeriod[];
  staticReleaseTax?: StaticReleaseTax[];
  onStake?: (result: ReturnType<typeof calculateStakingReturns> & { days: number }) => void;
}

export function StakingCalculator({
  tokenPrice,
  stakingPeriods = defaultStakingPeriods,
  staticReleaseTax = defaultStaticReleaseTax,
  onStake,
}: StakingCalculatorProps) {
  const [tokenAmount, setTokenAmount] = useState<number>(1000);
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [releaseDays, setReleaseDays] = useState<number>(30);
  const [compoundPeriods, setCompoundPeriods] = useState<number>(3);

  const result = calculateStakingReturns(tokenAmount, tokenPrice, selectedDays, stakingPeriods);
  const selectedPeriod = stakingPeriods.find(p => p.days === selectedDays);
  const taxConfig = staticReleaseTax.find(t => t.releaseDays === releaseDays) || staticReleaseTax[0];

  const dailyReleaseCalc = useMemo(() => {
    const taxRate = taxConfig.taxRate;
    const netAfterTax = result.totalValue * (1 - taxRate);
    const dailyWithoutCompound = netAfterTax / releaseDays;
    
    let compoundedTotal = result.totalValue;
    if (selectedPeriod) {
      let currentPrincipal = tokenAmount * tokenPrice;
      for (let i = 0; i < compoundPeriods; i++) {
        currentPrincipal = currentPrincipal * (1 + selectedPeriod.totalReturn);
      }
      compoundedTotal = currentPrincipal;
    }
    const compoundedNetAfterTax = compoundedTotal * (1 - taxRate);
    const dailyWithCompound = compoundedNetAfterTax / releaseDays;
    
    return {
      taxRate,
      netAfterTax,
      dailyWithoutCompound,
      compoundedTotal,
      compoundedNetAfterTax,
      dailyWithCompound,
      dailyDifference: dailyWithCompound - dailyWithoutCompound,
    };
  }, [result.totalValue, releaseDays, taxConfig, compoundPeriods, selectedPeriod, tokenAmount, tokenPrice]);

  return (
    <Card className="mobile-premium-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl nav-gradient flex items-center justify-center">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <span className="mobile-title gradient-text-premium">质押计算器</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          <Label htmlFor="stake-amount" className="mobile-label">质押数量 (B18)</Label>
          <Input
            id="stake-amount"
            type="number"
            min={0}
            step={100}
            value={tokenAmount}
            onChange={(e) => setTokenAmount(Number(e.target.value))}
            className="font-mono mobile-input"
            data-testid="input-stake-amount"
          />
          <p className="mobile-small text-muted-foreground">
            价值: {formatCurrency(tokenAmount * tokenPrice)}
          </p>
        </div>

        <div className="space-y-3">
          <Label className="mobile-label">质押周期</Label>
          <Select
            value={String(selectedDays)}
            onValueChange={(v) => setSelectedDays(Number(v))}
          >
            <SelectTrigger data-testid="select-staking-period" className="mobile-select-trigger">
              <SelectValue placeholder="选择质押周期" />
            </SelectTrigger>
            <SelectContent>
              {stakingPeriods.map((period) => (
                <SelectItem key={period.days} value={String(period.days)}>
                  <div className="flex items-center justify-between gap-4">
                    <span>{period.days}天</span>
                    <span className="text-muted-foreground">
                      日化 {formatPercent(period.dailyRate)}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPeriod && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                <Percent className="h-3 w-3" />
                日化利率
              </div>
              <div className="font-mono font-semibold" data-testid="text-daily-rate">
                {formatPercent(selectedPeriod.dailyRate)}
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                <TrendingUp className="h-3 w-3" />
                复利收益
              </div>
              <div className="font-mono font-semibold" data-testid="text-total-return">
                {formatPercent(selectedPeriod.totalReturn)}
              </div>
            </div>
          </div>
        )}

        <Separator />

        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">本金价值</span>
            <span className="font-mono">{formatCurrency(result.principalValue)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">利息收益</span>
            <span className="font-mono text-chart-2">
              +{formatCurrency(result.interestEarned)}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="font-medium flex items-center gap-1">
              <Coins className="h-4 w-4" />
              总价值
            </span>
            <div className="text-right">
              <div className="font-mono font-semibold text-lg" data-testid="text-total-value">
                {formatCurrency(result.totalValue)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatTokens(result.totalTokens)} B18
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="font-medium text-sm">复投 vs 不复投 释放对比</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>释放周期</Label>
              <Select
                value={String(releaseDays)}
                onValueChange={(v) => setReleaseDays(Number(v))}
              >
                <SelectTrigger data-testid="select-release-days">
                  <SelectValue placeholder="选择释放周期" />
                </SelectTrigger>
                <SelectContent>
                  {staticReleaseTax.map((t) => (
                    <SelectItem key={t.releaseDays} value={String(t.releaseDays)}>
                      {t.releaseDays === 1 ? "24h" : `${t.releaseDays}天`} (税{formatPercent(t.taxRate)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <RefreshCw className="h-3 w-3" />
                复投期数
              </Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={compoundPeriods}
                onChange={(e) => setCompoundPeriods(Number(e.target.value))}
                className="font-mono"
                data-testid="input-compound-periods"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-destructive/10 rounded-lg p-4 space-y-3 border border-destructive/20">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <TrendingUp className="h-4 w-4" />
                不复投 (产生释放压力)
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">单期本利</span>
                <span className="font-mono">{formatCurrency(result.totalValue)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">税后 (-{formatPercent(dailyReleaseCalc.taxRate)})</span>
                <span className="font-mono">{formatCurrency(dailyReleaseCalc.netAfterTax)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-medium">每日释放</span>
                <span className="font-mono font-semibold text-destructive">
                  {formatCurrency(dailyReleaseCalc.dailyWithoutCompound)}/天
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                立即释放 = 每天卖压
              </div>
            </div>

            <div className="bg-chart-2/10 rounded-lg p-4 space-y-3 border border-chart-2/20">
              <div className="flex items-center gap-2 text-sm font-medium text-chart-2">
                <RefreshCw className="h-4 w-4" />
                复投 {compoundPeriods} 期后释放
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">复投后本利</span>
                <span className="font-mono">{formatCurrency(dailyReleaseCalc.compoundedTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">税后 (-{formatPercent(dailyReleaseCalc.taxRate)})</span>
                <span className="font-mono">{formatCurrency(dailyReleaseCalc.compoundedNetAfterTax)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-medium">每日释放</span>
                <span className="font-mono font-semibold text-chart-2">
                  {formatCurrency(dailyReleaseCalc.dailyWithCompound)}/天
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                延迟 {compoundPeriods * selectedDays} 天后释放
              </div>
            </div>
          </div>

          <div className="bg-chart-1/10 rounded-lg p-3 border border-chart-1/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">复投收益差额</span>
              <span className="font-mono font-semibold text-chart-1">
                +{formatCurrency(dailyReleaseCalc.dailyDifference)}/天
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              复投 {compoundPeriods} 期比不复投每天多释放 {formatCurrency(dailyReleaseCalc.dailyDifference)}
            </div>
          </div>
        </div>

        <Button
          className="w-full mobile-cta mobile-cta-primary"
          onClick={() => onStake?.({ ...result, days: selectedDays })}
          data-testid="button-stake"
        >
          <Lock className="h-5 w-5 mr-2" />
          <span className="mobile-body font-semibold">模拟质押</span>
        </Button>
      </CardContent>
    </Card>
  );
}
