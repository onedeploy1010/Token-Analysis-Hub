import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowRightLeft,
  Award,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/tokenomics";
import { useLanguage } from "@/contexts/language-context";

interface CalculationSummary {
  stakingPurchaseUsdt: number;
  stakingTokens: number;
  stakingInterest: number;
  stakingReleaseTax: number;
  stakingNetReturn: number;
  secondaryBuyUsdt: number;
  secondarySellTokens: number;
  secondaryProfit: number;
  releaseTokens: number;
  releaseUsdt: number;
  releaseTax: number;
  dynamicReward1: number;
  dynamicReward2: number;
}

interface TotalSummaryProps {
  calculations: CalculationSummary;
}

export function TotalSummary({ calculations }: TotalSummaryProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(true);
  
  const totalInvestment =
    calculations.stakingPurchaseUsdt + calculations.secondaryBuyUsdt;
  
  const totalReturns =
    calculations.stakingNetReturn +
    calculations.secondaryProfit +
    calculations.releaseUsdt +
    calculations.dynamicReward1 +
    calculations.dynamicReward2;

  const totalTax =
    calculations.stakingReleaseTax + calculations.releaseTax;

  const netProfit = totalReturns - totalInvestment;
  const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;

  const hasData = totalInvestment > 0 || totalReturns > 0;

  return (
    <div className="gradient-card">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="p-5 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="nav-gradient w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <span className="mobile-subtitle">{t("summary.title")}</span>
            </div>
            <div className="flex items-center gap-2">
              {hasData && (
                <Badge
                  variant={netProfit >= 0 ? "default" : "destructive"}
                  className="font-mono"
                >
                  ROI: {roi >= 0 ? "+" : ""}{roi.toFixed(2)}%
                </Badge>
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="button-toggle-summary">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          {!isOpen && hasData && (
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="text-muted-foreground">{t("summary.investment")}: {formatCurrency(totalInvestment)}</span>
              <span className={netProfit >= 0 ? "text-chart-2" : "text-destructive"}>
                {t("summary.netProfit")}: {netProfit >= 0 ? "+" : ""}{formatCurrency(netProfit)}
              </span>
            </div>
          )}
        </div>
        <CollapsibleContent>
          <div className="px-5 pb-5">
            {!hasData ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("summary.noData")}
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="glass-stat p-3 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <PiggyBank className="h-3.5 w-3.5" />
                    {t("summary.stakingInput")}
                  </div>
                  <p className="font-mono text-sm font-medium" data-testid="text-staking-input">
                    {formatCurrency(calculations.stakingPurchaseUsdt)}
                  </p>
                  <p className="text-xs text-chart-2">
                    +{formatCurrency(calculations.stakingNetReturn)}
                  </p>
                </div>

                <div className="glass-stat p-3 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    {t("summary.secondaryMarket")}
                  </div>
                  <p className="font-mono text-sm font-medium" data-testid="text-secondary-input">
                    {formatCurrency(calculations.secondaryBuyUsdt)}
                  </p>
                  <p className={`text-xs ${calculations.secondaryProfit >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                    {calculations.secondaryProfit >= 0 ? '+' : ''}{formatCurrency(calculations.secondaryProfit)}
                  </p>
                </div>

                <div className="glass-stat p-3 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TrendingDown className="h-3.5 w-3.5" />
                    {t("summary.releaseWithdraw")}
                  </div>
                  <p className="font-mono text-sm font-medium" data-testid="text-release-output">
                    {formatCurrency(calculations.releaseUsdt)}
                  </p>
                  <p className="text-xs text-destructive">
                    -{formatCurrency(calculations.releaseTax)}
                  </p>
                </div>

                <div className="glass-stat p-3 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Award className="h-3.5 w-3.5" />
                    {t("summary.dynamicRewards")}
                  </div>
                  <p className="font-mono text-sm font-medium" data-testid="text-dynamic-rewards">
                    {formatCurrency(calculations.dynamicReward1 + calculations.dynamicReward2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("summary.tierAndPerformance")}
                  </p>
                </div>

                <div className="glass-stat p-3 rounded-xl space-y-1 bg-primary/5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {t("summary.totalInvestment")}
                  </div>
                  <p className="font-mono text-sm font-semibold" data-testid="text-total-investment">
                    {formatCurrency(totalInvestment)}
                  </p>
                  <p className="text-xs text-destructive">
                    {t("summary.tax")}: -{formatCurrency(totalTax)}
                  </p>
                </div>

                <div className="glass-stat p-3 rounded-xl space-y-1 bg-chart-2/5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Wallet className="h-3.5 w-3.5" />
                    {t("summary.netProfit")}
                  </div>
                  <p
                    className={`font-mono text-sm font-bold ${
                      netProfit >= 0 ? "text-chart-2" : "text-destructive"
                    }`}
                    data-testid="text-net-profit"
                  >
                    {netProfit >= 0 ? "+" : ""}{formatCurrency(netProfit)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("summary.totalReturns")}: {formatCurrency(totalReturns)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
