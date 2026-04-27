import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Calculator,
  TrendingUp,
  Coins,
  Wallet,
  ArrowRight,
  RefreshCw,
  BarChart3,
  CheckCircle2,
  ArrowUpDown,
  HelpCircle,
  ArrowDownToLine,
  Clock,
  Repeat,
} from "lucide-react";
import { StakingHelpDialog } from "./help-dialogs";
import {
  calculateStakingReturns,
  calculateLinearRelease,
  formatCurrency,
  formatTokens,
  formatPercent,
} from "@/lib/tokenomics";
import { StakingPeriod, StaticReleaseTax, defaultStakingPeriods, defaultStaticReleaseTax, defaultPurchaseFundDistribution } from "@shared/schema";
import { useLanguage } from "@/contexts/language-context";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import type { ReleaseMode } from "./mobile-step-wizard";

interface StakingCalculation {
  stakingPurchaseUsdt: number;
  stakingTokens: number;
  stakingInterest: number;
  stakingReleaseTax: number;
  stakingNetReturn: number;
  stakingTotalValue: number;
  stakingTotalTokens: number;
  stakingPeriodDays: number;
  stakingDailyRate: number;
  releaseDays: number;        // 释放周期天数 (D)
  releaseMode: ReleaseMode;   // 释放模式
  useCompound: boolean;       // 兼容旧字段
}

interface StakingPageProps {
  tokenPrice: number;
  slippage: number;
  lpPoolTokens: number;  // LP池B18
  lpPoolUsdt: number;    // LP池USDC
  stakingPeriods?: StakingPeriod[];
  staticReleaseTax?: StaticReleaseTax[];
  onPurchase?: (result: { tokensPurchased: number; usdtSpent: number }) => void;
  onCalculationChange?: (calc: StakingCalculation) => void;
}

export function StakingPage({
  tokenPrice,
  slippage,
  lpPoolTokens,
  lpPoolUsdt,
  stakingPeriods = defaultStakingPeriods,
  staticReleaseTax = defaultStaticReleaseTax,
  onPurchase,
  onCalculationChange,
}: StakingPageProps) {
  const { t, language } = useLanguage();
  const { isDesktop } = useBreakpoint();
  const [investment, setInvestment] = useState<number>(1000);
  const [stakingDays, setStakingDays] = useState<number>(90);
  const [releaseDays, setReleaseDays] = useState<number>(30);
  const [releaseMode, setReleaseMode] = useState<ReleaseMode>('amortizing');
  const [showResultsDialog, setShowResultsDialog] = useState<boolean>(false);
  const [showComparisonDialog, setShowComparisonDialog] = useState<boolean>(false);
  const [showHelpDialog, setShowHelpDialog] = useState<boolean>(false);

  // 兼容旧字段
  const isCompounding = releaseMode === 'compound';

  const simulation = useMemo(() => {
    // 预售质押：投资金额直接除以单价，无滑点
    const tokensPurchased = investment / tokenPrice;
    const effectiveUsdt = investment;
    const usdtToTreasury = effectiveUsdt * defaultPurchaseFundDistribution.treasury;  // 50%
    const usdtToLP = effectiveUsdt * defaultPurchaseFundDistribution.lpPool;          // 50%
    const b18ToLP = usdtToLP / tokenPrice;
    
    // 使用实际LP池状态（从props传入）
    const newLpUsdt = lpPoolUsdt + usdtToLP;
    const newLpTokens = lpPoolTokens + b18ToLP;
    const priceAfterPurchase = newLpUsdt / newLpTokens;
    const priceImpact = (priceAfterPurchase - tokenPrice) / tokenPrice;
    
    const staking = calculateStakingReturns(
      tokensPurchased,
      tokenPrice,
      stakingDays,
      stakingPeriods,
      isCompounding
    );
    
    const release = calculateLinearRelease(
      staking.totalValue,
      releaseDays,
      true,
      staticReleaseTax
    );

    const compoundGain = isCompounding 
      ? (staking.compoundInterestRate - staking.simpleInterestRate) * tokensPurchased * tokenPrice
      : 0;

    const netProfit = release.netAfterTax - investment;
    const roi = investment > 0 ? (netProfit / investment) * 100 : 0;
    const totalDays = stakingDays + releaseDays;
    const dailyProfit = totalDays > 0 ? netProfit / totalDays : 0;

    const dailyIncome = staking.interestEarned / stakingDays;
    const monthlyIncome = dailyIncome * 30;
    const dailyRelease = release.dailyRelease;
    const monthlyRelease = dailyRelease * 30;
    const totalIncome = staking.interestEarned;
    const totalRelease = release.netAfterTax;

    return {
      effectiveUsdt,
      tokensPurchased,
      usdtToTreasury,
      usdtToLP,
      b18ToLP,
      staking,
      release,
      netProfit,
      roi,
      dailyProfit,
      totalDays,
      priceBeforePurchase: tokenPrice,
      priceAfterPurchase,
      priceImpact,
      isCompounding,
      compoundGain,
      dailyIncome,
      monthlyIncome,
      dailyRelease,
      monthlyRelease,
      totalIncome,
      totalRelease,
    };
  }, [investment, tokenPrice, stakingDays, releaseDays, stakingPeriods, staticReleaseTax, isCompounding, lpPoolTokens, lpPoolUsdt]);

  useEffect(() => {
    if (onCalculationChange) {
      onCalculationChange({
        stakingPurchaseUsdt: investment,
        stakingTokens: simulation.tokensPurchased,
        stakingInterest: simulation.staking.interestEarned,
        stakingReleaseTax: simulation.release.taxAmount,
        stakingNetReturn: simulation.release.netAfterTax,
        stakingTotalValue: simulation.staking.totalValue,
        stakingTotalTokens: simulation.staking.totalTokens,
        stakingPeriodDays: stakingDays,
        stakingDailyRate: simulation.staking.dailyInterestRate,
        releaseDays: releaseDays,     // 释放周期 (D)
        releaseMode: releaseMode,     // 释放模式
        useCompound: isCompounding,   // 兼容旧字段
      });
    }
  }, [investment, simulation.tokensPurchased, simulation.staking.interestEarned, simulation.release.taxAmount, simulation.release.netAfterTax, simulation.staking.totalValue, simulation.staking.totalTokens, stakingDays, simulation.staking.dailyInterestRate, releaseDays, releaseMode, isCompounding, onCalculationChange]);

  const handleSimulate = () => {
    setShowResultsDialog(true);
  };

  const handleConfirmPurchase = () => {
    onPurchase?.({
      tokensPurchased: simulation.tokensPurchased,
      usdtSpent: investment,
    });
    setShowResultsDialog(false);
  };

  // 三种模式的计算结果
  const modeCalculations = useMemo(() => {
    const P0 = simulation.tokensPurchased; // 初始本金 B18
    const r = simulation.staking.dailyInterestRate; // 日利率
    const T = stakingDays; // 质押天数
    const D = releaseDays; // 释放天数
    const taxRate = simulation.release.taxAmount / simulation.staking.totalValue || 0;

    // 1. Amortizing (等额本金): 每日释放 (P0/T) + P*r，P递减
    // 总利息 = P0*r*T - r*(P0/T)*T*(T-1)/2 = P0*r*(T+1)/2 (等差递减)
    const amortizingInterest = P0 * r * (T + 1) / 2;
    const amortizingTotal = P0 + amortizingInterest;
    const amortizingNet = amortizingTotal * (1 - taxRate);
    const amortizingDailyGross = (P0 / T) + (P0 * r); // 第一天的释放量（最大）

    // 2. InterestOnly (按期付息): 利息按P0固定计算
    // 总利息 = P0 * r * T
    const interestOnlyInterest = P0 * r * T;
    const interestOnlyTotal = P0 + interestOnlyInterest;
    const interestOnlyNet = interestOnlyTotal * (1 - taxRate);
    const interestOnlyDailyInterest = P0 * r; // 每日利息固定

    // 3. Compound (复利): P_final = P0 × (1 + r)^(T - 1) + P0 × r
    // 封顶: 180天 593.74%, 360天 3600%
    let compoundTotal = P0 * Math.pow(1 + r, T - 1) + P0 * r;
    let compoundInterest = compoundTotal - P0;
    const interestRateRaw = compoundInterest / P0;

    // 封顶逻辑
    if (T >= 360 && interestRateRaw > 36) {
      compoundInterest = P0 * 36;  // 3600%
      compoundTotal = P0 + compoundInterest;
    } else if (T >= 180 && interestRateRaw > 5.9374) {
      compoundInterest = P0 * 5.9374;  // 593.74%
      compoundTotal = P0 + compoundInterest;
    }

    const compoundNet = compoundTotal * (1 - taxRate);
    const compoundDailyRelease = compoundTotal / D; // 到期后每日释放

    return {
      amortizing: {
        principal: P0,
        interest: amortizingInterest,
        total: amortizingTotal,
        netAfterTax: amortizingNet,
        dailyGross: amortizingDailyGross,
        dailyNet: amortizingDailyGross * (1 - taxRate) / D,
        interestRate: amortizingInterest / P0,
      },
      interestOnly: {
        principal: P0,
        interest: interestOnlyInterest,
        total: interestOnlyTotal,
        netAfterTax: interestOnlyNet,
        dailyInterest: interestOnlyDailyInterest,
        dailyNet: interestOnlyDailyInterest * (1 - taxRate) / D,
        interestRate: interestOnlyInterest / P0,
      },
      compound: {
        principal: P0,
        interest: compoundInterest,
        total: compoundTotal,
        netAfterTax: compoundNet,
        dailyRelease: compoundDailyRelease,
        dailyNet: compoundDailyRelease * (1 - taxRate),
        interestRate: compoundInterest / P0,
      },
      taxRate,
    };
  }, [simulation, stakingDays, releaseDays]);

  // 当前选择的模式的计算结果
  const currentModeCalc = useMemo(() => {
    return modeCalculations[releaseMode];
  }, [modeCalculations, releaseMode]);

  // 兼容旧代码
  const simpleInterestStaking = useMemo(() => {
    return calculateStakingReturns(
      simulation.tokensPurchased,
      tokenPrice,
      stakingDays,
      stakingPeriods,
      false
    );
  }, [simulation.tokensPurchased, tokenPrice, stakingDays, stakingPeriods]);

  const compoundInterestStaking = useMemo(() => {
    return calculateStakingReturns(
      simulation.tokensPurchased,
      tokenPrice,
      stakingDays,
      stakingPeriods,
      true
    );
  }, [simulation.tokensPurchased, tokenPrice, stakingDays, stakingPeriods]);

  // 桌面端渲染 - 左大右小布局
  if (isDesktop) {
    return (
      <>
      <div className="h-full flex gap-4">
        {/* 左区域（大）：参数输入 */}
        <div className="flex-[3] bg-card rounded-2xl border shadow-lg p-6 flex flex-col min-h-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="nav-gradient w-14 h-14 rounded-xl flex items-center justify-center">
              <Calculator className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{t("staking.title")}</h2>
              <p className="text-sm text-muted-foreground">{language === "zh" ? "设置投资参数" : "Set investment parameters"}</p>
            </div>
            <Button variant="outline" size="icon" className="ml-auto h-12 w-12" onClick={() => setShowHelpDialog(true)} data-testid="button-help-staking">
              <HelpCircle className="h-6 w-6" />
            </Button>
          </div>

          {/* 参数输入区 - 横向布局 */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* 投资金额 */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">{language === "zh" ? "投资金额" : "Investment"}</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={100}
                  step={100}
                  value={investment}
                  onChange={(e) => setInvestment(Math.max(100, Number(e.target.value)))}
                  className="font-mono h-14 text-2xl text-center pr-16"
                  data-testid="input-investment"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-base font-bold text-muted-foreground">USDC</span>
              </div>
            </div>

            {/* 质押周期 */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">{language === "zh" ? "质押周期" : "Staking Period"}</Label>
              <Select value={String(stakingDays)} onValueChange={(v) => setStakingDays(Number(v))}>
                <SelectTrigger className="h-14 text-lg" data-testid="select-staking-days">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stakingPeriods.map((p) => (
                    <SelectItem key={p.days} value={String(p.days)} className="text-base py-2">
                      {p.days}{language === "zh" ? "天" : "d"} ({formatPercent(p.dailyRate)}/日)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 释放周期 */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">{language === "zh" ? "释放周期" : "Release Period"}</Label>
              <Select value={String(releaseDays)} onValueChange={(v) => setReleaseDays(Number(v))}>
                <SelectTrigger className="h-14 text-lg" data-testid="select-release-days">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {staticReleaseTax.map((tax) => (
                    <SelectItem key={tax.releaseDays} value={String(tax.releaseDays)} className="text-base py-2">
                      {tax.releaseDays === 1 ? "24h" : `${tax.releaseDays}${language === "zh" ? "天" : "d"}`} ({formatPercent(tax.taxRate)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 质押信息 - 本金、收益率、利息 */}
          <div className="flex-1 grid grid-cols-3 gap-6 min-h-0">
            <div className="bg-muted/40 rounded-2xl p-6 flex flex-col items-center justify-center border">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="h-6 w-6 text-chart-1" />
                <span className="text-base font-semibold text-muted-foreground">{language === "zh" ? "质押本金" : "Principal"}</span>
              </div>
              <div className="font-mono font-bold text-3xl gradient-text-premium" data-testid="text-tokens">{formatTokens(simulation.tokensPurchased)}</div>
              <div className="text-base text-muted-foreground mt-1">B18 ≈ {formatCurrency(investment)}</div>
            </div>
            <div className="bg-chart-1/10 rounded-2xl p-6 flex flex-col items-center justify-center border border-chart-1/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-6 w-6 text-chart-1" />
                <span className="text-base font-semibold text-muted-foreground">{language === "zh" ? "收益率" : "Return Rate"}</span>
              </div>
              <div className="font-mono font-bold text-4xl text-chart-1" data-testid="text-total-return">{formatPercent(currentModeCalc.interestRate)}</div>
              <div className="text-base text-muted-foreground mt-1">{language === "zh" ? "日利率" : "Daily"}: {formatPercent(stakingPeriods.find(p => p.days === stakingDays)?.dailyRate || 0)}</div>
            </div>
            <div className="bg-chart-2/10 rounded-2xl p-6 flex flex-col items-center justify-center border border-chart-2/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-6 w-6 text-chart-2" />
                <span className="text-base font-semibold text-muted-foreground">{language === "zh" ? "质押利息" : "Interest"}</span>
              </div>
              <div className="font-mono font-bold text-3xl text-chart-2" data-testid="text-interest">+{formatTokens(currentModeCalc.interest)}</div>
              <div className="text-base text-muted-foreground mt-1">B18 ≈ {formatCurrency(currentModeCalc.interest * tokenPrice)}</div>
            </div>
          </div>
        </div>

        {/* 右区域（小）：上下分割，与左侧等高 */}
        <div className="flex-[2] flex flex-col gap-4 min-h-0">
          {/* 右上：释放模式选择 - flex-1 让它自动填充 */}
          <div className="bg-card rounded-2xl border shadow-lg p-5 flex-1 flex flex-col">
            <Label className="text-base font-semibold mb-4">{language === "zh" ? "选择释放模式" : "Release Mode"}</Label>

            <div className="space-y-3 flex-1 flex flex-col justify-center">
              {/* 等额本金 */}
              <button
                type="button"
                onClick={() => setReleaseMode('amortizing')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                  releaseMode === 'amortizing'
                    ? 'border-chart-2 bg-chart-2/10'
                    : 'border-border bg-muted/20 hover:bg-muted/40'
                }`}
                data-testid="button-mode-amortizing"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  releaseMode === 'amortizing' ? 'bg-chart-2/20' : 'bg-muted/50'
                }`}>
                  <ArrowDownToLine className={`h-6 w-6 ${releaseMode === 'amortizing' ? 'text-chart-2' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold">{language === "zh" ? "等额本金" : "Amortizing"}</div>
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "每日本金+利息，线性释放" : "Daily Principal + Interest"}</div>
                </div>
                {releaseMode === 'amortizing' && <CheckCircle2 className="h-5 w-5 text-chart-2 shrink-0" />}
              </button>

              {/* 按期付息 */}
              <button
                type="button"
                onClick={() => setReleaseMode('interestOnly')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                  releaseMode === 'interestOnly'
                    ? 'border-chart-4 bg-chart-4/10'
                    : 'border-border bg-muted/20 hover:bg-muted/40'
                }`}
                data-testid="button-mode-interest-only"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  releaseMode === 'interestOnly' ? 'bg-chart-4/20' : 'bg-muted/50'
                }`}>
                  <Clock className={`h-6 w-6 ${releaseMode === 'interestOnly' ? 'text-chart-4' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold">{language === "zh" ? "按期付息" : "Interest Only"}</div>
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "利息先行释放，本金到期释放" : "Interest first, Principal at maturity"}</div>
                </div>
                {releaseMode === 'interestOnly' && <CheckCircle2 className="h-5 w-5 text-chart-4 shrink-0" />}
              </button>

              {/* 复利滚存 */}
              <button
                type="button"
                onClick={() => setReleaseMode('compound')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                  releaseMode === 'compound'
                    ? 'border-chart-1 bg-chart-1/10'
                    : 'border-border bg-muted/20 hover:bg-muted/40'
                }`}
                data-testid="button-mode-compound"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  releaseMode === 'compound' ? 'bg-chart-1/20' : 'bg-muted/50'
                }`}>
                  <Repeat className={`h-6 w-6 ${releaseMode === 'compound' ? 'text-chart-1' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold">{language === "zh" ? "复利滚存" : "Compound"}</div>
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "利息复投，到期本利一起释放" : "Interest reinvested, all at maturity"}</div>
                </div>
                {releaseMode === 'compound' && <CheckCircle2 className="h-5 w-5 text-chart-1 shrink-0" />}
              </button>
            </div>
          </div>

          {/* 右下：操作按钮 */}
          <div className="bg-card rounded-2xl border shadow-lg p-5 shrink-0">
            <Button className="w-full h-16 text-lg font-bold" onClick={handleSimulate} data-testid="button-simulate">
              <Calculator className="h-6 w-6 mr-2" />
              {language === "zh" ? "模拟质押下单" : "Simulate Order"}
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Results Dialog - 完整版本 */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-4xl p-6 max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CheckCircle2 className="h-5 w-5 text-chart-2" />
              {language === "zh" ? "质押收益计算结果" : "Staking Returns"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {formatCurrency(investment)} | {stakingDays}{language === "zh" ? "天质押" : "d staking"} | {releaseDays}{language === "zh" ? "天释放" : "d release"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1">
            {/* 质押本息 - 以B18为单位 */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
              <Coins className="h-4 w-4" />
              {language === "zh" ? "质押本息 (B18)" : "Staking P&I (B18)"}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-sm text-muted-foreground">{language === "zh" ? "本金" : "Principal"}</div>
                <div className="text-xl font-semibold">{formatTokens(simulation.tokensPurchased)}</div>
                <div className="text-xs text-muted-foreground">≈{formatCurrency(investment)}</div>
              </div>
              <div className="bg-chart-2/10 rounded-lg p-4 text-center">
                <div className="text-sm text-muted-foreground">{language === "zh" ? "利息" : "Interest"}</div>
                <div className="text-xl font-semibold text-chart-2">+{formatTokens(simulation.staking.totalTokens - simulation.tokensPurchased)}</div>
                <div className="text-xs text-muted-foreground">≈{formatCurrency(simulation.totalIncome)}</div>
              </div>
              <div className="bg-chart-2/10 rounded-lg p-4 text-center">
                <div className="text-sm text-muted-foreground">{language === "zh" ? "本+利" : "Total"}</div>
                <div className="text-xl font-semibold text-chart-2">{formatTokens(simulation.staking.totalTokens)}</div>
                <div className="text-xs text-muted-foreground">≈{formatCurrency(simulation.staking.totalValue)}</div>
              </div>
            </div>

            {/* 质押收益 - USDC换算 */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium pt-2">
              <TrendingUp className="h-4 w-4" />
              {language === "zh" ? "收益明细 (USDC)" : "Returns (USDC)"}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-chart-2/10 rounded-lg p-4 text-center">
                <div className="text-sm text-muted-foreground">{language === "zh" ? "日奖励" : "Daily"}</div>
                <div className="text-xl font-semibold text-chart-2">+{formatCurrency(simulation.dailyIncome)}</div>
              </div>
              <div className="bg-chart-2/10 rounded-lg p-4 text-center">
                <div className="text-sm text-muted-foreground">{language === "zh" ? "月奖励" : "Monthly"}</div>
                <div className="text-xl font-semibold text-chart-2">+{formatCurrency(simulation.monthlyIncome)}</div>
              </div>
              <div className="bg-chart-2/10 rounded-lg p-4 text-center">
                <div className="text-sm text-muted-foreground">{language === "zh" ? `总(${stakingDays}天)` : `Total`}</div>
                <div className="text-xl font-semibold text-chart-2">+{formatCurrency(simulation.totalIncome)}</div>
                <div className="text-xs text-muted-foreground">{formatPercent(simulation.staking.totalInterestRate)}</div>
              </div>
            </div>

            {/* 释放到账 */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium pt-2">
              <ArrowRight className="h-4 w-4" />
              {language === "zh" ? "释放到账" : "Release"}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-sm text-muted-foreground">{language === "zh" ? "每日" : "Daily"}</div>
                <div className="text-lg font-semibold">{formatTokens(simulation.staking.totalTokens / releaseDays)} B18</div>
                <div className="text-xs text-muted-foreground">≈{formatCurrency(simulation.dailyRelease)}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-sm text-muted-foreground">{language === "zh" ? "月释放" : "Monthly"}</div>
                <div className="text-lg font-semibold">{formatTokens(simulation.staking.totalTokens / releaseDays * 30)} B18</div>
                <div className="text-xs text-muted-foreground">≈{formatCurrency(simulation.monthlyRelease)}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-sm text-muted-foreground">{language === "zh" ? `税后(${releaseDays}天)` : `Net`}</div>
                <div className="text-lg font-semibold">{formatTokens(simulation.staking.totalTokens * (1 - simulation.release.taxAmount / simulation.staking.totalValue))} B18</div>
                <div className="text-xs text-muted-foreground">≈{formatCurrency(simulation.totalRelease)}</div>
                <div className="text-xs text-destructive">-{formatPercent(simulation.release.taxAmount / simulation.staking.totalValue)}{language === "zh" ? "税" : " tax"}</div>
              </div>
            </div>

            {/* 净收益 */}
            <div className="bg-chart-2/10 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                <span className="text-base font-medium">{t("staking.netProfit")}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className={`text-2xl font-bold ${simulation.netProfit >= 0 ? "text-chart-2" : "text-destructive"}`}>
                    {simulation.netProfit >= 0 ? "+" : ""}{formatTokens(simulation.netProfit / tokenPrice)} B18
                  </span>
                  <div className="text-xs text-muted-foreground">≈{formatCurrency(simulation.netProfit)}</div>
                </div>
                <Badge variant={simulation.roi >= 0 ? "default" : "destructive"} className="text-sm px-3 py-1">
                  {simulation.roi.toFixed(1)}%
                </Badge>
              </div>
            </div>

          </div>

          {/* 操作按钮 - 固定在底部 */}
          <div className="flex gap-4 pt-4 shrink-0 border-t mt-4">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 h-14 text-lg"
              onClick={() => setShowComparisonDialog(true)}
            >
              <ArrowUpDown className="h-5 w-5 mr-2" />
              {language === "zh" ? "对比模式" : "Compare"}
            </Button>
            <Button
              size="lg"
              className="flex-1 h-14 text-lg"
              onClick={handleConfirmPurchase}
              data-testid="button-confirm"
            >
              {language === "zh" ? "确认质押" : "Confirm Staking"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Desktop Comparison Dialog - 完整版本 */}
      <Dialog open={showComparisonDialog} onOpenChange={setShowComparisonDialog}>
        <DialogContent className="max-w-5xl p-6">
          <DialogHeader className="pb-3">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BarChart3 className="h-5 w-5 text-chart-1" />
              {language === "zh" ? "三种释放模式对比" : "Release Mode Comparison"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {formatCurrency(investment)} | {stakingDays}{language === "zh" ? "天质押" : "d stake"} | {releaseDays}{language === "zh" ? "天释放" : "d release"} | {language === "zh" ? "日利率" : "rate"} {formatPercent(simulation.staking.dailyInterestRate)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 三列对比 */}
            <div className="grid grid-cols-3 gap-4">
              {/* 等额本金 */}
              <div className={`space-y-3 p-4 rounded-xl border-2 ${releaseMode === 'amortizing' ? 'border-chart-2 bg-chart-2/5' : 'border-transparent bg-muted/30'}`}>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <ArrowDownToLine className="h-5 w-5 text-chart-2" />
                    <span className="text-base font-bold text-chart-2">{language === "zh" ? "等额本金" : "Amortizing"}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "每日本金+利息" : "Daily P+I"}</div>
                </div>
                <div className="bg-background/80 rounded-lg p-3 text-center">
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "总利息" : "Interest"}</div>
                  <div className="text-lg font-semibold">{formatTokens(modeCalculations.amortizing.interest)}</div>
                  <div className="text-xs text-muted-foreground">≈{formatCurrency(modeCalculations.amortizing.interest * tokenPrice)}</div>
                </div>
                <div className="bg-background/80 rounded-lg p-3 text-center">
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "收益率" : "Rate"}</div>
                  <div className="text-lg font-semibold">{formatPercent(modeCalculations.amortizing.interestRate)}</div>
                </div>
                <div className="bg-background/80 rounded-lg p-3 text-center">
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "本利合计" : "Total"}</div>
                  <div className="text-lg font-semibold">{formatTokens(modeCalculations.amortizing.total)}</div>
                  <div className="text-xs text-muted-foreground">≈{formatCurrency(modeCalculations.amortizing.total * tokenPrice)}</div>
                </div>
                <div className="bg-chart-2/10 rounded-lg p-3 text-center">
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "税后净收" : "Net"}</div>
                  <div className="text-lg font-bold text-chart-2">{formatCurrency(modeCalculations.amortizing.netAfterTax * tokenPrice)}</div>
                </div>
              </div>

              {/* 按期付息 */}
              <div className={`space-y-3 p-4 rounded-xl border-2 ${releaseMode === 'interestOnly' ? 'border-chart-4 bg-chart-4/5' : 'border-transparent bg-muted/30'}`}>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-5 w-5 text-chart-4" />
                    <span className="text-base font-bold text-chart-4">{language === "zh" ? "按期付息" : "Interest Only"}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "利息先行" : "Interest first"}</div>
                </div>
                <div className="bg-background/80 rounded-lg p-3 text-center">
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "总利息" : "Interest"}</div>
                  <div className="text-lg font-semibold">{formatTokens(modeCalculations.interestOnly.interest)}</div>
                  <div className="text-xs text-muted-foreground">≈{formatCurrency(modeCalculations.interestOnly.interest * tokenPrice)}</div>
                </div>
                <div className="bg-background/80 rounded-lg p-3 text-center">
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "收益率" : "Rate"}</div>
                  <div className="text-lg font-semibold">{formatPercent(modeCalculations.interestOnly.interestRate)}</div>
                </div>
                <div className="bg-background/80 rounded-lg p-3 text-center">
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "本利合计" : "Total"}</div>
                  <div className="text-lg font-semibold">{formatTokens(modeCalculations.interestOnly.total)}</div>
                  <div className="text-xs text-muted-foreground">≈{formatCurrency(modeCalculations.interestOnly.total * tokenPrice)}</div>
                </div>
                <div className="bg-chart-4/10 rounded-lg p-3 text-center">
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "税后净收" : "Net"}</div>
                  <div className="text-lg font-bold text-chart-4">{formatCurrency(modeCalculations.interestOnly.netAfterTax * tokenPrice)}</div>
                </div>
              </div>

              {/* 复利滚存 */}
              <div className={`space-y-3 p-4 rounded-xl border-2 ${releaseMode === 'compound' ? 'border-chart-1 bg-chart-1/5' : 'border-transparent bg-muted/30'}`}>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Repeat className="h-5 w-5 text-chart-1" />
                    <span className="text-base font-bold text-chart-1">{language === "zh" ? "复利滚存" : "Compound"}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "到期释放" : "At maturity"}</div>
                </div>
                <div className="bg-background/80 rounded-lg p-3 text-center">
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "总利息" : "Interest"}</div>
                  <div className="text-lg font-semibold">{formatTokens(modeCalculations.compound.interest)}</div>
                  <div className="text-xs text-muted-foreground">≈{formatCurrency(modeCalculations.compound.interest * tokenPrice)}</div>
                </div>
                <div className="bg-background/80 rounded-lg p-3 text-center">
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "收益率" : "Rate"}</div>
                  <div className="text-lg font-semibold">{formatPercent(modeCalculations.compound.interestRate)}</div>
                </div>
                <div className="bg-background/80 rounded-lg p-3 text-center">
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "本利合计" : "Total"}</div>
                  <div className="text-lg font-semibold">{formatTokens(modeCalculations.compound.total)}</div>
                  <div className="text-xs text-muted-foreground">≈{formatCurrency(modeCalculations.compound.total * tokenPrice)}</div>
                </div>
                <div className="bg-chart-1/10 rounded-lg p-3 text-center">
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "税后净收" : "Net"}</div>
                  <div className="text-lg font-bold text-chart-1">{formatCurrency(modeCalculations.compound.netAfterTax * tokenPrice)}</div>
                </div>
              </div>
            </div>

            {/* 收益排名 */}
            <div className="bg-gradient-to-r from-chart-1/10 to-chart-2/10 rounded-xl p-4">
              <div className="text-sm font-bold text-center mb-3">{language === "zh" ? "收益排名（税后净收）" : "Ranking (Net After Tax)"}</div>
              <div className="flex items-center justify-center gap-6">
                {[
                  { mode: 'compound', value: modeCalculations.compound.netAfterTax, color: 'chart-1', label: language === "zh" ? "复利" : "Compound" },
                  { mode: 'interestOnly', value: modeCalculations.interestOnly.netAfterTax, color: 'chart-4', label: language === "zh" ? "按期付息" : "Interest" },
                  { mode: 'amortizing', value: modeCalculations.amortizing.netAfterTax, color: 'chart-2', label: language === "zh" ? "等额本金" : "Amortizing" },
                ].sort((a, b) => b.value - a.value).map((item, index) => (
                  <div key={item.mode} className="text-center">
                    <div className={`text-2xl font-bold ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : 'text-amber-700'}`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </div>
                    <div className={`text-sm font-medium text-${item.color}`}>{item.label}</div>
                    <div className="text-xs text-muted-foreground">{formatCurrency(item.value * tokenPrice)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 复利增益 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-chart-1/10 rounded-xl p-4 text-center">
                <div className="text-sm text-muted-foreground">{language === "zh" ? "复利比等额本金多" : "Compound vs Amortizing"}</div>
                <div className="text-xl font-bold text-chart-1">
                  +{formatCurrency((modeCalculations.compound.netAfterTax - modeCalculations.amortizing.netAfterTax) * tokenPrice)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatPercent((modeCalculations.compound.netAfterTax - modeCalculations.amortizing.netAfterTax) / modeCalculations.amortizing.netAfterTax)}
                </div>
              </div>
              <div className="bg-chart-1/10 rounded-xl p-4 text-center">
                <div className="text-sm text-muted-foreground">{language === "zh" ? "复利比按期付息多" : "Compound vs Interest Only"}</div>
                <div className="text-xl font-bold text-chart-1">
                  +{formatCurrency((modeCalculations.compound.netAfterTax - modeCalculations.interestOnly.netAfterTax) * tokenPrice)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatPercent((modeCalculations.compound.netAfterTax - modeCalculations.interestOnly.netAfterTax) / modeCalculations.interestOnly.netAfterTax)}
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              {language === "zh"
                ? "等额本金：利息随本金递减 | 按期付息：利息固定 | 复利：利息滚入本金"
                : "Amortizing: decreasing interest | Interest Only: fixed interest | Compound: reinvested"}
            </p>

            <Button
              variant="outline"
              size="lg"
              className="w-full h-12"
              onClick={() => setShowComparisonDialog(false)}
            >
              {language === "zh" ? "关闭" : "Close"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Desktop Help Dialog */}
      <StakingHelpDialog
        open={showHelpDialog}
        onOpenChange={setShowHelpDialog}
        language={language}
      />
      </>
    );
  }

  // 移动端渲染
  return (
    <>
    <Card className="mobile-premium-card max-w-md mx-auto">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="flex items-center gap-2.5">
          <div className="nav-gradient w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
            <Calculator className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <span className="text-base font-bold gradient-text-premium">{t("staking.title")}</span>
            <div className="text-[11px] text-muted-foreground">{language === "zh" ? "计算质押收益和释放" : "Calculate staking returns"}</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-4">
          {/* 移动端竖向布局 */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="investment" className="text-sm font-semibold ml-1">{t("staking.amount")}</Label>
              <div className="relative">
                <Input
                  id="investment"
                  type="number"
                  min={100}
                  step={100}
                  value={investment}
                  onChange={(e) => setInvestment(Math.max(100, Number(e.target.value)))}
                  className="font-mono h-12 text-xl text-center pr-12"
                  data-testid="input-investment"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">USDC</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold ml-1">{t("staking.period")}</Label>
                <Select value={String(stakingDays)} onValueChange={(v) => setStakingDays(Number(v))}>
                  <SelectTrigger data-testid="select-staking-days" className="h-12 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stakingPeriods.map((p) => (
                      <SelectItem key={p.days} value={String(p.days)}>
                        {p.days}{language === "zh" ? "天" : "d"} ({formatPercent(p.dailyRate)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold ml-1">{t("staking.releasePeriod")}</Label>
                <Select value={String(releaseDays)} onValueChange={(v) => setReleaseDays(Number(v))}>
                  <SelectTrigger data-testid="select-release-days" className="h-12 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {staticReleaseTax.map((tax) => (
                      <SelectItem key={tax.releaseDays} value={String(tax.releaseDays)}>
                        {tax.releaseDays === 1 ? "24h" : `${tax.releaseDays}${language === "zh" ? "天" : "d"}`} ({formatPercent(tax.taxRate)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 质押本金和总收益率 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/40 rounded-xl p-3 text-center border border-border/50">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Coins className="h-4 w-4 text-chart-1" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase">{language === "zh" ? "质押本金" : "Principal"}</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <span className="font-mono font-bold text-lg gradient-text-premium" data-testid="text-tokens">{formatTokens(simulation.tokensPurchased)}</span>
                <span className="text-[11px] font-bold text-muted-foreground">B18</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">≈ {formatCurrency(investment)}</div>
            </div>
            <div className="bg-chart-2/10 rounded-xl p-3 text-center border border-chart-2/20">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <TrendingUp className="h-4 w-4 text-chart-2" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase">{t("staking.totalReturn")}</span>
              </div>
              <span className="font-mono font-bold text-xl text-chart-2" data-testid="text-total-return">
                {formatPercent(isCompounding
                  ? stakingPeriods.find(p => p.days === stakingDays)?.totalReturn || 0
                  : (stakingPeriods.find(p => p.days === stakingDays)?.dailyRate || 0) * stakingDays
                )}
              </span>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {language === "zh" ? "日利" : "Daily"}: {formatPercent(stakingPeriods.find(p => p.days === stakingDays)?.dailyRate || 0)}
              </div>
            </div>
          </div>

          {/* 释放模式选择 - 移动端竖向 */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {language === "zh" ? "释放模式" : "Release Mode"}
            </Label>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setReleaseMode('amortizing')}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  releaseMode === 'amortizing' ? 'border-chart-2 bg-chart-2/10' : 'border-border/50 bg-muted/20'
                }`}
                data-testid="button-mode-amortizing"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${releaseMode === 'amortizing' ? 'bg-chart-2/20' : 'bg-muted/50'}`}>
                  <ArrowDownToLine className={`h-4 w-4 ${releaseMode === 'amortizing' ? 'text-chart-2' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold">{language === "zh" ? "等额本金" : "Amortizing"}</div>
                  <div className="text-[11px] text-muted-foreground">{language === "zh" ? "每日释放本金+利息" : "Daily P+I release"}</div>
                </div>
                {releaseMode === 'amortizing' && <CheckCircle2 className="h-5 w-5 text-chart-2" />}
              </button>
              <button
                type="button"
                onClick={() => setReleaseMode('interestOnly')}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  releaseMode === 'interestOnly' ? 'border-chart-4 bg-chart-4/10' : 'border-border/50 bg-muted/20'
                }`}
                data-testid="button-mode-interest-only"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${releaseMode === 'interestOnly' ? 'bg-chart-4/20' : 'bg-muted/50'}`}>
                  <Clock className={`h-4 w-4 ${releaseMode === 'interestOnly' ? 'text-chart-4' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold">{language === "zh" ? "按期付息" : "Interest Only"}</div>
                  <div className="text-[11px] text-muted-foreground">{language === "zh" ? "利息先行，本金到期" : "Interest first"}</div>
                </div>
                {releaseMode === 'interestOnly' && <CheckCircle2 className="h-5 w-5 text-chart-4" />}
              </button>
              <button
                type="button"
                onClick={() => setReleaseMode('compound')}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  releaseMode === 'compound' ? 'border-chart-1 bg-chart-1/10' : 'border-border/50 bg-muted/20'
                }`}
                data-testid="button-mode-compound"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${releaseMode === 'compound' ? 'bg-chart-1/20' : 'bg-muted/50'}`}>
                  <Repeat className={`h-4 w-4 ${releaseMode === 'compound' ? 'text-chart-1' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold">{language === "zh" ? "复利滚存" : "Compound"}</div>
                  <div className="text-[11px] text-muted-foreground">{language === "zh" ? "到期本利一起释放" : "All at maturity"}</div>
                </div>
                {releaseMode === 'compound' && <CheckCircle2 className="h-5 w-5 text-chart-1" />}
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button className="flex-1 h-12 text-base font-bold" onClick={handleSimulate} data-testid="button-simulate">
              <Calculator className="h-5 w-5 mr-2" />
              {t("staking.simulate")}
            </Button>
            <Button variant="outline" size="icon" className="h-12 w-12" onClick={() => setShowHelpDialog(true)} data-testid="button-help-staking">
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-sm p-3">
          <DialogHeader className="pb-1">
            <DialogTitle className="flex items-center gap-1.5 text-base">
              <CheckCircle2 className="h-4 w-4 text-chart-2" />
              {language === "zh" ? "质押收益计算结果" : "Staking Returns"}
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              {formatCurrency(investment)} | {stakingDays}{language === "zh" ? "天" : "d"} | {releaseDays}{language === "zh" ? "天释放" : "d rel"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {/* 质押本息 - 以B18为单位 */}
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
              <Coins className="h-2.5 w-2.5" />
              {language === "zh" ? "质押本息 (B18)" : "Staking P&I (B18)"}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-muted/50 rounded-md p-2 text-center">
                <div className="text-[11px] text-muted-foreground">{language === "zh" ? "本金" : "Principal"}</div>
                <div className="text-sm font-semibold" data-testid="text-principal-b18">
                  {formatTokens(simulation.tokensPurchased)}
                </div>
                <div className="text-[11px] text-muted-foreground">≈{formatCurrency(investment)}</div>
              </div>
              <div className="bg-chart-2/10 rounded-md p-2 text-center">
                <div className="text-[11px] text-muted-foreground">{language === "zh" ? "利息" : "Interest"}</div>
                <div className="text-sm font-semibold text-chart-2" data-testid="text-interest-b18">
                  +{formatTokens(simulation.staking.totalTokens - simulation.tokensPurchased)}
                </div>
                <div className="text-[11px] text-muted-foreground">≈{formatCurrency(simulation.totalIncome)}</div>
              </div>
              <div className="bg-chart-2/10 rounded-md p-2 text-center">
                <div className="text-[11px] text-muted-foreground">{language === "zh" ? "本+利" : "Total"}</div>
                <div className="text-sm font-semibold text-chart-2" data-testid="text-total-b18">
                  {formatTokens(simulation.staking.totalTokens)}
                </div>
                <div className="text-[11px] text-muted-foreground">≈{formatCurrency(simulation.staking.totalValue)}</div>
              </div>
            </div>

            {/* 质押收益 - USDC换算 */}
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium pt-1">
              <TrendingUp className="h-2.5 w-2.5" />
              {language === "zh" ? "收益明细 (USDC)" : "Returns (USDC)"}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-chart-2/10 rounded-md p-2 text-center">
                <div className="text-[11px] text-muted-foreground">{language === "zh" ? "日奖励" : "Daily"}</div>
                <div className="text-sm font-semibold text-chart-2" data-testid="text-daily-income">
                  +{formatCurrency(simulation.dailyIncome)}
                </div>
              </div>
              <div className="bg-chart-2/10 rounded-md p-2 text-center">
                <div className="text-[11px] text-muted-foreground">{language === "zh" ? "月奖励" : "Monthly"}</div>
                <div className="text-sm font-semibold text-chart-2" data-testid="text-monthly-income">
                  +{formatCurrency(simulation.monthlyIncome)}
                </div>
              </div>
              <div className="bg-chart-2/10 rounded-md p-2 text-center">
                <div className="text-[11px] text-muted-foreground">{language === "zh" ? `总(${stakingDays}天)` : `Total`}</div>
                <div className="text-sm font-semibold text-chart-2" data-testid="text-total-income">
                  +{formatCurrency(simulation.totalIncome)}
                </div>
                <div className="text-[11px] text-muted-foreground">{formatPercent(simulation.staking.totalInterestRate)}</div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium pt-1">
              <ArrowRight className="h-2.5 w-2.5" />
              {language === "zh" ? "释放到账" : "Release"}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-muted/50 rounded-md p-2 text-center">
                <div className="text-[11px] text-muted-foreground">{language === "zh" ? "每日" : "Daily"}</div>
                <div className="text-sm font-semibold" data-testid="text-daily-release">
                  {formatTokens(simulation.staking.totalTokens / releaseDays)} B18
                </div>
                <div className="text-[11px] text-muted-foreground">≈{formatCurrency(simulation.dailyRelease)}</div>
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-center">
                <div className="text-[11px] text-muted-foreground">{language === "zh" ? "月释放" : "Monthly"}</div>
                <div className="text-sm font-semibold" data-testid="text-monthly-release">
                  {formatTokens(simulation.staking.totalTokens / releaseDays * 30)} B18
                </div>
                <div className="text-[11px] text-muted-foreground">≈{formatCurrency(simulation.monthlyRelease)}</div>
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-center">
                <div className="text-[11px] text-muted-foreground">{language === "zh" ? `税后(${releaseDays}天)` : `Net`}</div>
                <div className="text-sm font-semibold" data-testid="text-total-release">
                  {formatTokens(simulation.staking.totalTokens * (1 - simulation.release.taxAmount / simulation.staking.totalValue))} B18
                </div>
                <div className="text-[11px] text-muted-foreground">≈{formatCurrency(simulation.totalRelease)}</div>
                <div className="text-[11px] text-destructive">-{formatPercent(simulation.release.taxAmount / simulation.staking.totalValue)}{language === "zh" ? "税" : " tax"}</div>
              </div>
            </div>

            <div className="bg-chart-2/10 rounded-md p-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{t("staking.netProfit")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className={`text-base font-bold ${simulation.netProfit >= 0 ? "text-chart-2" : "text-destructive"}`} data-testid="text-net-profit">
                    {simulation.netProfit >= 0 ? "+" : ""}{formatTokens(simulation.netProfit / tokenPrice)} B18
                  </span>
                  <div className="text-[11px] text-muted-foreground">≈{formatCurrency(simulation.netProfit)}</div>
                </div>
                <Badge variant={simulation.roi >= 0 ? "default" : "destructive"} className="text-[11px]">
                  {simulation.roi.toFixed(1)}%
                </Badge>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1"
                onClick={() => setShowComparisonDialog(true)}
                data-testid="button-compare"
              >
                <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                {language === "zh" ? "对比" : "Compare"}
              </Button>
              <Button 
                size="sm"
                className="flex-1"
                onClick={handleConfirmPurchase}
                data-testid="button-confirm-purchase"
              >
                {t("button.confirm")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showComparisonDialog} onOpenChange={setShowComparisonDialog}>
        <DialogContent className="max-w-lg p-3">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-chart-1" />
              {language === "zh" ? "三种释放模式对比" : "Release Mode Comparison"}
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              {formatCurrency(investment)} | {stakingDays}{language === "zh" ? "天质押" : "d stake"} | {releaseDays}{language === "zh" ? "天释放" : "d release"} | {language === "zh" ? "日利率" : "rate"} {formatPercent(simulation.staking.dailyInterestRate)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* 三列对比 */}
            <div className="grid grid-cols-3 gap-2">
              {/* 等额本金 */}
              <div className={`space-y-2 p-2 rounded-lg border-2 ${releaseMode === 'amortizing' ? 'border-chart-2 bg-chart-2/5' : 'border-transparent bg-muted/30'}`}>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <ArrowDownToLine className="h-3 w-3 text-chart-2" />
                    <span className="text-[11px] font-bold text-chart-2">{language === "zh" ? "等额本金" : "Amortizing"}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{language === "zh" ? "每日本金+利息" : "Daily P+I"}</div>
                </div>
                <div className="bg-background/80 rounded p-1.5 text-center">
                  <div className="text-[11px] text-muted-foreground">{language === "zh" ? "总利息" : "Interest"}</div>
                  <div className="text-xs font-semibold">{formatTokens(modeCalculations.amortizing.interest)}</div>
                  <div className="text-[11px] text-muted-foreground">≈{formatCurrency(modeCalculations.amortizing.interest * tokenPrice)}</div>
                </div>
                <div className="bg-background/80 rounded p-1.5 text-center">
                  <div className="text-[11px] text-muted-foreground">{language === "zh" ? "收益率" : "Rate"}</div>
                  <div className="text-xs font-semibold">{formatPercent(modeCalculations.amortizing.interestRate)}</div>
                </div>
                <div className="bg-background/80 rounded p-1.5 text-center">
                  <div className="text-[11px] text-muted-foreground">{language === "zh" ? "本利合计" : "Total"}</div>
                  <div className="text-xs font-semibold">{formatTokens(modeCalculations.amortizing.total)}</div>
                  <div className="text-[11px] text-muted-foreground">≈{formatCurrency(modeCalculations.amortizing.total * tokenPrice)}</div>
                </div>
                <div className="bg-chart-2/10 rounded p-1.5 text-center">
                  <div className="text-[11px] text-muted-foreground">{language === "zh" ? "税后净收" : "Net"}</div>
                  <div className="text-xs font-bold text-chart-2">{formatCurrency(modeCalculations.amortizing.netAfterTax * tokenPrice)}</div>
                </div>
              </div>

              {/* 按期付息 */}
              <div className={`space-y-2 p-2 rounded-lg border-2 ${releaseMode === 'interestOnly' ? 'border-chart-4 bg-chart-4/5' : 'border-transparent bg-muted/30'}`}>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3 text-chart-4" />
                    <span className="text-[11px] font-bold text-chart-4">{language === "zh" ? "按期付息" : "Interest Only"}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{language === "zh" ? "利息先行" : "Interest first"}</div>
                </div>
                <div className="bg-background/80 rounded p-1.5 text-center">
                  <div className="text-[11px] text-muted-foreground">{language === "zh" ? "总利息" : "Interest"}</div>
                  <div className="text-xs font-semibold">{formatTokens(modeCalculations.interestOnly.interest)}</div>
                  <div className="text-[11px] text-muted-foreground">≈{formatCurrency(modeCalculations.interestOnly.interest * tokenPrice)}</div>
                </div>
                <div className="bg-background/80 rounded p-1.5 text-center">
                  <div className="text-[11px] text-muted-foreground">{language === "zh" ? "收益率" : "Rate"}</div>
                  <div className="text-xs font-semibold">{formatPercent(modeCalculations.interestOnly.interestRate)}</div>
                </div>
                <div className="bg-background/80 rounded p-1.5 text-center">
                  <div className="text-[11px] text-muted-foreground">{language === "zh" ? "本利合计" : "Total"}</div>
                  <div className="text-xs font-semibold">{formatTokens(modeCalculations.interestOnly.total)}</div>
                  <div className="text-[11px] text-muted-foreground">≈{formatCurrency(modeCalculations.interestOnly.total * tokenPrice)}</div>
                </div>
                <div className="bg-chart-4/10 rounded p-1.5 text-center">
                  <div className="text-[11px] text-muted-foreground">{language === "zh" ? "税后净收" : "Net"}</div>
                  <div className="text-xs font-bold text-chart-4">{formatCurrency(modeCalculations.interestOnly.netAfterTax * tokenPrice)}</div>
                </div>
              </div>

              {/* 复利滚存 */}
              <div className={`space-y-2 p-2 rounded-lg border-2 ${releaseMode === 'compound' ? 'border-chart-1 bg-chart-1/5' : 'border-transparent bg-muted/30'}`}>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Repeat className="h-3 w-3 text-chart-1" />
                    <span className="text-[11px] font-bold text-chart-1">{language === "zh" ? "复利滚存" : "Compound"}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{language === "zh" ? "到期释放" : "At maturity"}</div>
                </div>
                <div className="bg-background/80 rounded p-1.5 text-center">
                  <div className="text-[11px] text-muted-foreground">{language === "zh" ? "总利息" : "Interest"}</div>
                  <div className="text-xs font-semibold">{formatTokens(modeCalculations.compound.interest)}</div>
                  <div className="text-[11px] text-muted-foreground">≈{formatCurrency(modeCalculations.compound.interest * tokenPrice)}</div>
                </div>
                <div className="bg-background/80 rounded p-1.5 text-center">
                  <div className="text-[11px] text-muted-foreground">{language === "zh" ? "收益率" : "Rate"}</div>
                  <div className="text-xs font-semibold">{formatPercent(modeCalculations.compound.interestRate)}</div>
                </div>
                <div className="bg-background/80 rounded p-1.5 text-center">
                  <div className="text-[11px] text-muted-foreground">{language === "zh" ? "本利合计" : "Total"}</div>
                  <div className="text-xs font-semibold">{formatTokens(modeCalculations.compound.total)}</div>
                  <div className="text-[11px] text-muted-foreground">≈{formatCurrency(modeCalculations.compound.total * tokenPrice)}</div>
                </div>
                <div className="bg-chart-1/10 rounded p-1.5 text-center">
                  <div className="text-[11px] text-muted-foreground">{language === "zh" ? "税后净收" : "Net"}</div>
                  <div className="text-xs font-bold text-chart-1">{formatCurrency(modeCalculations.compound.netAfterTax * tokenPrice)}</div>
                </div>
              </div>
            </div>

            {/* 收益排名 */}
            <div className="bg-gradient-to-r from-chart-1/10 to-chart-2/10 rounded-lg p-3">
              <div className="text-[11px] font-bold text-center mb-2">{language === "zh" ? "收益排名（税后净收）" : "Ranking (Net After Tax)"}</div>
              <div className="flex items-center justify-center gap-3">
                {[
                  { mode: 'compound', value: modeCalculations.compound.netAfterTax, color: 'chart-1', label: language === "zh" ? "复利" : "Compound" },
                  { mode: 'interestOnly', value: modeCalculations.interestOnly.netAfterTax, color: 'chart-4', label: language === "zh" ? "按期付息" : "Interest" },
                  { mode: 'amortizing', value: modeCalculations.amortizing.netAfterTax, color: 'chart-2', label: language === "zh" ? "等额本金" : "Amortizing" },
                ].sort((a, b) => b.value - a.value).map((item, index) => (
                  <div key={item.mode} className="text-center">
                    <div className={`text-lg font-bold ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : 'text-amber-700'}`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </div>
                    <div className={`text-[11px] font-medium text-${item.color}`}>{item.label}</div>
                    <div className="text-[11px] text-muted-foreground">{formatCurrency(item.value * tokenPrice)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 复利增益 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-chart-1/10 rounded-lg p-2 text-center">
                <div className="text-[11px] text-muted-foreground">{language === "zh" ? "复利比等额本金多" : "Compound vs Amortizing"}</div>
                <div className="text-sm font-bold text-chart-1">
                  +{formatCurrency((modeCalculations.compound.netAfterTax - modeCalculations.amortizing.netAfterTax) * tokenPrice)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {formatPercent((modeCalculations.compound.netAfterTax - modeCalculations.amortizing.netAfterTax) / modeCalculations.amortizing.netAfterTax)}
                </div>
              </div>
              <div className="bg-chart-1/10 rounded-lg p-2 text-center">
                <div className="text-[11px] text-muted-foreground">{language === "zh" ? "复利比按期付息多" : "Compound vs Interest Only"}</div>
                <div className="text-sm font-bold text-chart-1">
                  +{formatCurrency((modeCalculations.compound.netAfterTax - modeCalculations.interestOnly.netAfterTax) * tokenPrice)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {formatPercent((modeCalculations.compound.netAfterTax - modeCalculations.interestOnly.netAfterTax) / modeCalculations.interestOnly.netAfterTax)}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              {language === "zh"
                ? "等额本金：利息随本金递减 | 按期付息：利息固定 | 复利：利息滚入本金"
                : "Amortizing: decreasing interest | Interest Only: fixed interest | Compound: reinvested"}
            </p>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowComparisonDialog(false)}
            >
              {language === "zh" ? "关闭" : "Close"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <StakingHelpDialog
        open={showHelpDialog}
        onOpenChange={setShowHelpDialog}
        language={language}
      />
    </>
  );
}
