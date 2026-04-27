import { useState, useEffect, useMemo } from "react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Calculator,
  TrendingUp,
  Calendar,
  Coins,
  ArrowRight,
  Receipt,
  Wallet,
  List,
  Percent,
  Droplets,
} from "lucide-react";
import {
  calculatePurchase,
  calculateStakingReturns,
  calculateLinearRelease,
  formatCurrency,
  formatTokens,
  formatPercent,
} from "@/lib/tokenomics";
import { StakingPeriod, StaticReleaseTax, defaultStakingPeriods, defaultStaticReleaseTax } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InvestmentSimulatorProps {
  tokenPrice: number;
  slippage: number;
  stakingPeriods?: StakingPeriod[];
  staticReleaseTax?: StaticReleaseTax[];
  onPurchase?: (result: ReturnType<typeof calculatePurchase> & { stakingAmount: number }) => void;
  onStakedValueChange?: (value: number) => void;
}

export function InvestmentSimulator({
  tokenPrice,
  slippage,
  stakingPeriods = defaultStakingPeriods,
  staticReleaseTax = defaultStaticReleaseTax,
  onPurchase,
  onStakedValueChange,
}: InvestmentSimulatorProps) {
  const [investment, setInvestment] = useState<number>(1000);
  const [stakingDays, setStakingDays] = useState<number>(90);
  const [releaseDays, setReleaseDays] = useState<number>(30);

  const simulation = useMemo(() => {
    const purchase = calculatePurchase(investment, tokenPrice, slippage);
    const staking = calculateStakingReturns(
      purchase.tokensPurchased,
      tokenPrice,
      stakingDays,
      stakingPeriods
    );
    const release = calculateLinearRelease(
      staking.totalValue,
      releaseDays,
      true,
      staticReleaseTax
    );

    const netProfit = release.netAfterTax - investment;
    const roi = investment > 0 ? (netProfit / investment) * 100 : 0;
    const totalDays = stakingDays + releaseDays;
    const dailyProfit = totalDays > 0 ? netProfit / totalDays : 0;

    return {
      purchase,
      staking,
      release,
      netProfit,
      roi,
      dailyProfit,
      totalDays,
    };
  }, [investment, tokenPrice, slippage, stakingDays, releaseDays, stakingPeriods, staticReleaseTax]);

  useEffect(() => {
    onStakedValueChange?.(simulation.staking.totalValue);
  }, [simulation.staking.totalValue, onStakedValueChange]);

  const handlePurchase = () => {
    onPurchase?.({
      ...simulation.purchase,
      stakingAmount: investment,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5" />
          投资模拟器
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="investment" className="text-xs">投入金额 (USDC)</Label>
            <Input
              id="investment"
              type="number"
              min={0}
              step={100}
              value={investment}
              onChange={(e) => setInvestment(Number(e.target.value))}
              className="font-mono text-sm"
              data-testid="input-investment"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">质押周期</Label>
            <Select
              value={String(stakingDays)}
              onValueChange={(v) => setStakingDays(Number(v))}
            >
              <SelectTrigger data-testid="select-staking-days" className="text-sm">
                <SelectValue placeholder="选择" />
              </SelectTrigger>
              <SelectContent>
                {stakingPeriods.map((p) => (
                  <SelectItem key={p.days} value={String(p.days)}>
                    {p.days}天 ({formatPercent(p.dailyRate)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">释放周期</Label>
            <Select
              value={String(releaseDays)}
              onValueChange={(v) => setReleaseDays(Number(v))}
            >
              <SelectTrigger data-testid="select-release-days" className="text-sm">
                <SelectValue placeholder="选择" />
              </SelectTrigger>
              <SelectContent>
                {staticReleaseTax.map((t) => (
                  <SelectItem key={t.releaseDays} value={String(t.releaseDays)}>
                    {t.releaseDays === 1 ? "24h" : `${t.releaseDays}天`} ({formatPercent(t.taxRate)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-[11px] mb-0.5">
              <Coins className="h-3 w-3" />
              获得代币
            </div>
            <div className="font-mono font-semibold text-sm truncate" data-testid="text-tokens">
              {formatTokens(simulation.purchase.tokensPurchased)}
            </div>
            <div className="text-[11px] text-muted-foreground">B18</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-[11px] mb-0.5">
              <TrendingUp className="h-3 w-3" />
              质押收益
            </div>
            <div className="font-mono font-semibold text-sm text-chart-2 truncate" data-testid="text-staking-return">
              +{formatCurrency(simulation.staking.interestEarned)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {formatPercent(simulation.staking.totalInterestRate)}
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-[11px] mb-0.5">
              <Receipt className="h-3 w-3" />
              税收扣除
            </div>
            <div className="font-mono font-semibold text-sm text-destructive truncate" data-testid="text-tax">
              -{formatCurrency(simulation.release.taxAmount)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {formatPercent(simulation.release.taxRate)}
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-[11px] mb-0.5">
              <Calendar className="h-3 w-3" />
              总周期
            </div>
            <div className="font-mono font-semibold text-sm" data-testid="text-total-days">
              {simulation.totalDays}
            </div>
            <div className="text-[11px] text-muted-foreground">天</div>
          </div>
        </div>

        <Separator />

        <div className="bg-muted/50 rounded-lg p-3 space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
            <div className="flex items-center justify-between gap-1">
              <span className="text-muted-foreground truncate">投入本金</span>
              <span className="font-mono shrink-0">{formatCurrency(investment)}</span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-muted-foreground truncate flex items-center gap-1">
                <Percent className="h-2.5 w-2.5" />滑点损失
              </span>
              <span className="font-mono text-destructive shrink-0">
                -{formatCurrency(simulation.purchase.slippageCost)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-muted-foreground truncate">质押本利</span>
              <span className="font-mono shrink-0">{formatCurrency(simulation.staking.totalValue)}</span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-muted-foreground truncate">税后到账</span>
              <span className="font-mono shrink-0">{formatCurrency(simulation.release.netAfterTax)}</span>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between gap-1">
              <span className="font-medium flex items-center gap-1">
                <Wallet className="h-3 w-3" />
                净收益
              </span>
              <span
                className={`font-mono font-semibold shrink-0 ${
                  simulation.netProfit >= 0 ? "text-chart-2" : "text-destructive"
                }`}
                data-testid="text-net-profit"
              >
                {simulation.netProfit >= 0 ? "+" : ""}
                {formatCurrency(simulation.netProfit)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-muted-foreground truncate">日均收益</span>
              <span
                className={`font-mono shrink-0 ${
                  simulation.dailyProfit >= 0 ? "text-chart-2" : "text-destructive"
                }`}
              >
                {simulation.dailyProfit >= 0 ? "+" : ""}
                {formatCurrency(simulation.dailyProfit)}/天
              </span>
            </div>
          </div>
          
          <div className="flex justify-center">
            <Badge variant={simulation.roi >= 0 ? "default" : "destructive"} className="text-xs">
              ROI {simulation.roi.toFixed(1)}%
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 rounded-lg p-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Droplets className="h-3 w-3" />
              进入LP池
            </span>
            <span className="font-mono">
              {formatTokens(simulation.purchase.tokensToLP)} + {formatCurrency(simulation.purchase.usdtToLP)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Wallet className="h-3 w-3" />
              进入国库
            </span>
            <span className="font-mono">{formatCurrency(simulation.purchase.usdtToTreasury)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            className="flex-1" 
            onClick={handlePurchase}
            data-testid="button-purchase"
          >
            模拟购买
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" data-testid="button-view-schedule">
                <List className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh]">
              <SheetHeader className="pb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  每日释放明细 ({releaseDays}天)
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3 text-xs">
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <div className="text-muted-foreground mb-1">每日释放</div>
                    <div className="font-mono font-semibold">{formatCurrency(simulation.release.dailyRelease)}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <div className="text-muted-foreground mb-1">税率</div>
                    <div className="font-mono font-semibold text-destructive">{formatPercent(simulation.release.taxRate)}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <div className="text-muted-foreground mb-1">总税收</div>
                    <div className="font-mono font-semibold text-destructive">-{formatCurrency(simulation.release.taxAmount)}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <div className="text-muted-foreground mb-1">税后总额</div>
                    <div className="font-mono font-semibold text-chart-2">{formatCurrency(simulation.release.netAfterTax)}</div>
                  </div>
                </div>
                <ScrollArea className="h-[calc(70vh-180px)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">天数</TableHead>
                        <TableHead className="text-xs text-right">释放</TableHead>
                        <TableHead className="text-xs text-right">税收</TableHead>
                        <TableHead className="text-xs text-right">实际</TableHead>
                        <TableHead className="text-xs text-right">累计</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {simulation.release.schedule.map((day, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-xs">{day.day}</TableCell>
                          <TableCell className="font-mono text-xs text-right">
                            {formatCurrency(day.released)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-right text-destructive">
                            -{formatCurrency(day.tax)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-right text-chart-2">
                            {formatCurrency(day.net)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-right">
                            {formatCurrency(day.cumulative)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </CardContent>
    </Card>
  );
}
