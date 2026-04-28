import { useState, useMemo, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Droplets,
  Coins,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import { SecondaryMarketHelpDialog } from "./help-dialogs";
import {
  formatCurrency,
  formatTokens,
  formatPercent,
} from "@/lib/tokenomics";
import { AMM_SLIPPAGE } from "@shared/schema";
import { useLanguage } from "@/contexts/language-context";
import { useBreakpoint } from "@/hooks/use-breakpoint";

interface SecondaryCalculation {
  secondaryBuyUsdt: number;
  secondarySellTokens: number;
  secondaryProfit: number;
}

interface SecondaryMarketProps {
  tokenPrice: number;
  lpPoolTokens: number;
  lpPoolUsdt: number;
  sppBalance?: number;  // SPP合约USDC余额
  sppHeldB18?: number;  // SPP合约持有的B18（通过护盘买入）
  onTrade?: (result: { 
    type: "buy" | "sell" | "spp_buy" | "spp_sell"; 
    amount: number; 
    newPrice: number;
    tokensTraded?: number;  // SPP买入/卖出的B18数量
    tokensReceived?: number;  // SPP买入获得的B18
    usdtReceived?: number;  // SPP卖出获得的USDC
  }) => void;
  onCalculationChange?: (calc: SecondaryCalculation) => void;
}

export function SecondaryMarket({
  tokenPrice,
  lpPoolTokens,
  lpPoolUsdt,
  sppBalance = 0,
  sppHeldB18 = 0,
  onTrade,
  onCalculationChange,
}: SecondaryMarketProps) {
  const { t, language } = useLanguage();
  const { isDesktop } = useBreakpoint();
  const [tradeType, setTradeType] = useState<"buy" | "sell" | "spp_buy" | "spp_sell">("buy");
  const [buyAmount, setBuyAmount] = useState<number>(1000);
  const [sellAmount, setSellAmount] = useState<number>(1000);
  const [sppBuyAmount, setSppBuyAmount] = useState<number>(0);  // SPP买入金额，默认0
  const [sppSellAmount, setSppSellAmount] = useState<number>(0);  // SPP卖出B18数量，默认0
  const [showResultsDialog, setShowResultsDialog] = useState<boolean>(false);
  const [showHelpDialog, setShowHelpDialog] = useState<boolean>(false);

  const k = lpPoolTokens * lpPoolUsdt;

  const buySimulation = useMemo(() => {
    const effectiveAmount = buyAmount * (1 - AMM_SLIPPAGE);
    const slippageFee = buyAmount * AMM_SLIPPAGE;
    
    const newLpUsdt = lpPoolUsdt + effectiveAmount;
    const newLpTokens = k / newLpUsdt;
    const tokensReceived = lpPoolTokens - newLpTokens;
    const newPrice = newLpUsdt / newLpTokens;
    const priceImpact = (newPrice - tokenPrice) / tokenPrice;
    const effectivePrice = buyAmount / tokensReceived;

    return {
      tokensReceived,
      newLpTokens,
      newLpUsdt,
      newPrice,
      priceImpact,
      effectivePrice,
      slippageFee,
      effectiveAmount,
    };
  }, [buyAmount, lpPoolTokens, lpPoolUsdt, k, tokenPrice]);

  const sellSimulation = useMemo(() => {
    const newLpTokens = lpPoolTokens + sellAmount;
    const newLpUsdt = k / newLpTokens;
    const grossUsdtReceived = lpPoolUsdt - newLpUsdt;
    
    const slippageFee = grossUsdtReceived * AMM_SLIPPAGE;
    const usdtReceived = grossUsdtReceived * (1 - AMM_SLIPPAGE);
    
    const newPrice = newLpUsdt / newLpTokens;
    const priceImpact = (newPrice - tokenPrice) / tokenPrice;
    const effectivePrice = usdtReceived / sellAmount;

    return {
      usdtReceived,
      grossUsdtReceived,
      newLpTokens,
      newLpUsdt,
      newPrice,
      priceImpact,
      effectivePrice,
      slippageFee,
    };
  }, [sellAmount, lpPoolTokens, lpPoolUsdt, k, tokenPrice]);

  // SPP余额买入模拟 - 用于平衡币价（推高价格）
  const sppBuySimulation = useMemo(() => {
    const buyAmountUsdt = Math.min(sppBuyAmount, sppBalance);  // 不能超过SPP余额
    const effectiveAmount = buyAmountUsdt * (1 - AMM_SLIPPAGE);
    const slippageFee = buyAmountUsdt * AMM_SLIPPAGE;
    
    const newLpUsdt = lpPoolUsdt + effectiveAmount;
    const newLpTokens = k / newLpUsdt;
    const tokensReceived = lpPoolTokens - newLpTokens;
    const newPrice = newLpUsdt / newLpTokens;
    const priceImpact = (newPrice - tokenPrice) / tokenPrice;
    const effectivePrice = buyAmountUsdt / tokensReceived;
    const remainingSppBalance = sppBalance - buyAmountUsdt;

    return {
      buyAmountUsdt,
      tokensReceived,
      newLpTokens,
      newLpUsdt,
      newPrice,
      priceImpact,
      effectivePrice,
      slippageFee,
      effectiveAmount,
      remainingSppBalance,
      isInsufficient: sppBuyAmount > sppBalance,
    };
  }, [sppBuyAmount, sppBalance, lpPoolTokens, lpPoolUsdt, k, tokenPrice]);

  // SPP持有B18卖出模拟 - 在高价时卖出获取USDC（压低价格）
  const sppSellSimulation = useMemo(() => {
    const sellTokens = Math.min(sppSellAmount, sppHeldB18);  // 不能超过SPP持有的B18
    const newLpTokens = lpPoolTokens + sellTokens;
    const newLpUsdt = k / newLpTokens;
    const grossUsdtReceived = lpPoolUsdt - newLpUsdt;
    
    const slippageFee = grossUsdtReceived * AMM_SLIPPAGE;
    const usdtReceived = grossUsdtReceived * (1 - AMM_SLIPPAGE);
    
    const newPrice = newLpUsdt / newLpTokens;
    const priceImpact = (newPrice - tokenPrice) / tokenPrice;
    const effectivePrice = sellTokens > 0 ? usdtReceived / sellTokens : 0;
    const remainingSppB18 = sppHeldB18 - sellTokens;

    return {
      sellTokens,
      usdtReceived,
      grossUsdtReceived,
      newLpTokens,
      newLpUsdt,
      newPrice,
      priceImpact,
      effectivePrice,
      slippageFee,
      remainingSppB18,
      isInsufficient: sppSellAmount > sppHeldB18,
    };
  }, [sppSellAmount, sppHeldB18, lpPoolTokens, lpPoolUsdt, k, tokenPrice]);

  const onCalculationChangeRef = useRef(onCalculationChange);
  onCalculationChangeRef.current = onCalculationChange;

  useEffect(() => {
    if (onCalculationChangeRef.current) {
      const profit = tradeType === "buy"
        ? buySimulation.tokensReceived * tokenPrice - buyAmount
        : sellSimulation.usdtReceived - sellAmount * tokenPrice;
      onCalculationChangeRef.current({
        secondaryBuyUsdt: tradeType === "buy" ? buyAmount : 0,
        secondarySellTokens: tradeType === "sell" ? sellAmount : 0,
        secondaryProfit: profit,
      });
    }
  }, [tradeType, buyAmount, sellAmount, buySimulation.tokensReceived, sellSimulation.usdtReceived, tokenPrice]);

  const handleSimulate = () => {
    setShowResultsDialog(true);
  };

  const handleConfirmTrade = () => {
    if (tradeType === "buy") {
      onTrade?.({
        type: "buy",
        amount: buyAmount,
        newPrice: buySimulation.newPrice,
      });
    } else if (tradeType === "sell") {
      onTrade?.({
        type: "sell",
        amount: sellAmount,
        newPrice: sellSimulation.newPrice,
      });
    } else if (tradeType === "spp_buy") {
      // SPP护盘买入 - 消耗SPP USDC余额，获得B18
      onTrade?.({
        type: "spp_buy",
        amount: sppBuySimulation.buyAmountUsdt,
        newPrice: sppBuySimulation.newPrice,
        tokensTraded: sppBuySimulation.tokensReceived,
        tokensReceived: sppBuySimulation.tokensReceived,
      });
    } else if (tradeType === "spp_sell") {
      // SPP卖出B18 - 消耗SPP持有的B18，获得USDC回SPP余额
      onTrade?.({
        type: "spp_sell",
        amount: sppSellSimulation.sellTokens,  // B18数量
        newPrice: sppSellSimulation.newPrice,
        tokensTraded: sppSellSimulation.sellTokens,
        usdtReceived: sppSellSimulation.usdtReceived,  // 获得的USDC
      });
    }
    setShowResultsDialog(false);
  };

  const currentSimulation = tradeType === "buy" ? buySimulation : sellSimulation;
  const currentAmount = tradeType === "buy" ? buyAmount : sellAmount;

  // 桌面端渲染 - 左控制右数据
  if (isDesktop) {
    return (
      <>
      <div className="h-full flex gap-4">
        {/* 左区域：交易控制 */}
        <div className="flex-[2] flex flex-col gap-4 min-h-0 overflow-auto">
          {/* 左上：Header + 交易输入 */}
          <div className="bg-card rounded-2xl border shadow-lg p-6 shrink-0">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="nav-gradient w-12 h-12 rounded-xl flex items-center justify-center">
                <Droplets className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{t("secondary.title")}</h2>
                <p className="text-xs text-muted-foreground">{language === "zh" ? "AMM流动性池交易" : "AMM Trading"}</p>
              </div>
              <Button variant="outline" size="icon" className="ml-auto h-10 w-10" onClick={() => setShowHelpDialog(true)}>
                <HelpCircle className="h-5 w-5" />
              </Button>
            </div>

            {/* 交易类型选择 */}
            <Tabs value={tradeType} onValueChange={(v) => setTradeType(v as any)}>
              <TabsList className="grid grid-cols-2 gap-2 h-auto p-1 mb-4">
                <TabsTrigger value="buy" className="gap-2 py-2.5 text-sm"><ArrowUpRight className="h-4 w-4" />{t("secondary.buy")}</TabsTrigger>
                <TabsTrigger value="sell" className="gap-2 py-2.5 text-sm"><ArrowDownRight className="h-4 w-4" />{t("secondary.sell")}</TabsTrigger>
              </TabsList>
              <TabsList className="grid grid-cols-2 gap-2 h-auto p-1 mb-4">
                <TabsTrigger value="spp_buy" className="gap-2 py-2.5 text-sm"><TrendingUp className="h-4 w-4" />{language === "zh" ? "SPP买" : "SPP Buy"}</TabsTrigger>
                <TabsTrigger value="spp_sell" className="gap-2 py-2.5 text-sm"><TrendingDown className="h-4 w-4" />{language === "zh" ? "SPP卖" : "SPP Sell"}</TabsTrigger>
              </TabsList>

              <TabsContent value="buy" className="space-y-3 mt-0">
                <div className="space-y-2">
                  <Label className="text-sm">{t("secondary.buyAmount")}</Label>
                  <Input type="number" min={0} step={100} value={buyAmount} onChange={(e) => setBuyAmount(Number(e.target.value))} className="h-12 text-lg font-mono" />
                </div>
              </TabsContent>

              <TabsContent value="sell" className="space-y-3 mt-0">
                <div className="space-y-2">
                  <Label className="text-sm">{t("secondary.sellAmount")}</Label>
                  <Input type="number" min={0} step={100} value={sellAmount} onChange={(e) => setSellAmount(Number(e.target.value))} className="h-12 text-lg font-mono" />
                </div>
              </TabsContent>

              <TabsContent value="spp_buy" className="space-y-3 mt-0">
                <div className="bg-chart-2/10 rounded-lg p-2.5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{language === "zh" ? "SPP余额" : "SPP Balance"}</span>
                  <span className="font-bold text-chart-2">{formatCurrency(sppBalance)}</span>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{language === "zh" ? "买入金额" : "Buy Amount"}</Label>
                  <Input type="number" min={0} max={sppBalance} step={1000} value={sppBuyAmount} onChange={(e) => setSppBuyAmount(Math.min(Number(e.target.value), sppBalance))} className="h-12 text-lg font-mono" />
                </div>
              </TabsContent>

              <TabsContent value="spp_sell" className="space-y-3 mt-0">
                <div className="bg-chart-4/10 rounded-lg p-2.5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{language === "zh" ? "SPP持有B18" : "SPP B18"}</span>
                  <span className="font-bold text-chart-4">{formatTokens(sppHeldB18)}</span>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{language === "zh" ? "卖出数量" : "Sell Amount"}</Label>
                  <Input type="number" min={0} max={sppHeldB18} step={100} value={sppSellAmount} onChange={(e) => setSppSellAmount(Math.min(Number(e.target.value), sppHeldB18))} className="h-12 text-lg font-mono" />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* 左下：操作按钮 */}
          <div className="bg-card rounded-2xl border shadow-lg p-4 shrink-0">
            <Button className="w-full h-12 text-base font-bold" onClick={handleSimulate}>
              <Droplets className="h-5 w-5 mr-2" />
              {tradeType === "buy" ? t("secondary.simulateBuy") : tradeType === "sell" ? t("secondary.simulateSell") : tradeType === "spp_buy" ? (language === "zh" ? "模拟SPP买入" : "SPP Buy") : (language === "zh" ? "模拟SPP卖出" : "SPP Sell")}
            </Button>
          </div>
        </div>

        {/* 右区域：LP池信息 + 交易预览 */}
        <div className="flex-[3] bg-card rounded-2xl border shadow-lg p-6 flex flex-col min-h-0 overflow-hidden">
          {/* LP池信息 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-muted/40 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-sm mb-2">
                <TrendingUp className="h-4 w-4" />
                {t("secondary.currentPrice")}
              </div>
              <div className="font-mono font-bold text-2xl">{formatCurrency(tokenPrice)}</div>
            </div>
            <div className="bg-muted/40 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-sm mb-2">
                <Coins className="h-4 w-4" />
                {t("metrics.lpB18")}
              </div>
              <div className="font-mono font-bold text-xl">{formatTokens(lpPoolTokens)}</div>
            </div>
            <div className="bg-muted/40 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-sm mb-2">
                <DollarSign className="h-4 w-4" />
                {t("metrics.lpUsdt")}
              </div>
              <div className="font-mono font-bold text-xl">{formatCurrency(lpPoolUsdt)}</div>
            </div>
          </div>

          {/* 交易预览 */}
          <div className="flex-1 bg-muted/20 rounded-xl p-4 flex flex-col">
            <Label className="text-base font-semibold mb-4">{language === "zh" ? "交易预览" : "Trade Preview"}</Label>

            <div className="flex-1 grid grid-cols-2 gap-4">
              {/* 左列：交易结果 */}
              <div className="space-y-3">
                <div className={`rounded-xl p-4 text-center ${tradeType === "buy" || tradeType === "spp_buy" ? "bg-chart-2/10" : "bg-chart-4/10"}`}>
                  <div className="text-sm text-muted-foreground mb-1">
                    {tradeType === "buy" ? (language === "zh" ? "获得B18" : "Receive B18") : tradeType === "sell" ? (language === "zh" ? "获得USDC" : "Receive USDC") : tradeType === "spp_buy" ? (language === "zh" ? "买入B18" : "Buy B18") : (language === "zh" ? "获得USDC" : "Get USDC")}
                  </div>
                  <div className={`text-3xl font-bold ${tradeType === "buy" || tradeType === "spp_buy" ? "text-chart-2" : "text-chart-4"}`}>
                    {tradeType === "buy" ? formatTokens(buySimulation.tokensReceived)
                      : tradeType === "sell" ? formatCurrency(sellSimulation.usdtReceived)
                      : tradeType === "spp_buy" ? formatTokens(sppBuySimulation.tokensReceived)
                      : formatCurrency(sppSellSimulation.usdtReceived)}
                  </div>
                  {(tradeType === "buy" || tradeType === "spp_buy") && <div className="text-xs text-muted-foreground mt-1">B18</div>}
                </div>

                <div className="bg-destructive/10 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground">{language === "zh" ? "3%滑点费" : "3% Slippage"}</div>
                  <div className="text-lg font-bold text-destructive">
                    -{formatCurrency(tradeType === "buy" ? buySimulation.slippageFee
                      : tradeType === "sell" ? sellSimulation.slippageFee
                      : tradeType === "spp_buy" ? sppBuySimulation.slippageFee
                      : sppSellSimulation.slippageFee)}
                  </div>
                </div>
              </div>

              {/* 右列：价格信息 */}
              <div className="space-y-3">
                <div className="bg-muted/40 rounded-xl p-4 text-center">
                  <div className="text-sm text-muted-foreground mb-1">{language === "zh" ? "执行价格" : "Effective Price"}</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(tradeType === "buy" ? buySimulation.effectivePrice
                      : tradeType === "sell" ? sellSimulation.effectivePrice
                      : tradeType === "spp_buy" ? sppBuySimulation.effectivePrice
                      : sppSellSimulation.effectivePrice)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className={`rounded-lg p-3 text-center ${(tradeType === "buy" || tradeType === "spp_buy") ? "bg-chart-2/10" : "bg-destructive/10"}`}>
                    <div className="text-xs text-muted-foreground">{language === "zh" ? "价格影响" : "Impact"}</div>
                    <div className={`text-lg font-bold ${(tradeType === "buy" || tradeType === "spp_buy") ? "text-chart-2" : "text-destructive"}`}>
                      {formatPercent(tradeType === "buy" ? buySimulation.priceImpact
                        : tradeType === "sell" ? sellSimulation.priceImpact
                        : tradeType === "spp_buy" ? sppBuySimulation.priceImpact
                        : sppSellSimulation.priceImpact)}
                    </div>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">{language === "zh" ? "新价格" : "New Price"}</div>
                    <div className="text-lg font-bold">
                      {formatCurrency(tradeType === "buy" ? buySimulation.newPrice
                        : tradeType === "sell" ? sellSimulation.newPrice
                        : tradeType === "spp_buy" ? sppBuySimulation.newPrice
                        : sppSellSimulation.newPrice)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 共用弹窗 */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-md lg:max-w-2xl p-6">
          <DialogHeader className="pb-3">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CheckCircle2 className="h-5 w-5 text-chart-2" />
              {tradeType === "buy" ? t("secondary.buy") : tradeType === "sell" ? t("secondary.sell") : tradeType === "spp_buy" ? (language === "zh" ? "SPP买入" : "SPP Buy") : (language === "zh" ? "SPP卖出" : "SPP Sell")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-chart-2/10 rounded-xl p-4 text-center">
              <div className="text-base text-muted-foreground mb-1">{language === "zh" ? "交易结果" : "Result"}</div>
              <div className="text-3xl font-bold text-chart-2">
                {tradeType === "buy" ? formatTokens(buySimulation.tokensReceived) + " B18"
                  : tradeType === "sell" ? formatCurrency(sellSimulation.usdtReceived)
                  : tradeType === "spp_buy" ? formatTokens(sppBuySimulation.tokensReceived) + " B18"
                  : formatCurrency(sppSellSimulation.usdtReceived)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/40 rounded-lg p-3 text-center">
                <div className="text-sm text-muted-foreground">{language === "zh" ? "均价" : "Avg Price"}</div>
                <div className="text-lg font-bold">{formatCurrency(tradeType === "buy" ? buySimulation.effectivePrice : tradeType === "sell" ? sellSimulation.effectivePrice : tradeType === "spp_buy" ? sppBuySimulation.effectivePrice : sppSellSimulation.effectivePrice)}</div>
              </div>
              <div className={`rounded-lg p-3 text-center ${(tradeType === "buy" || tradeType === "spp_buy") ? "bg-chart-2/10" : "bg-destructive/10"}`}>
                <div className="text-sm text-muted-foreground">{language === "zh" ? "价格变化" : "Price Change"}</div>
                <div className={`text-lg font-bold ${(tradeType === "buy" || tradeType === "spp_buy") ? "text-chart-2" : "text-destructive"}`}>{formatPercent(tradeType === "buy" ? buySimulation.priceImpact : tradeType === "sell" ? sellSimulation.priceImpact : tradeType === "spp_buy" ? sppBuySimulation.priceImpact : sppSellSimulation.priceImpact)}</div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12" onClick={() => setShowResultsDialog(false)}>{t("button.cancel")}</Button>
              <Button className="flex-1 h-12" onClick={handleConfirmTrade}>{t("button.confirm")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SecondaryMarketHelpDialog open={showHelpDialog} onOpenChange={setShowHelpDialog} language={language} />
      </>
    );
  }

  // 移动端渲染
  return (
    <Card className="mobile-premium-card max-w-md mx-auto lg:max-w-2xl">
      <CardHeader className="pb-3 pt-4 px-4 lg:px-6 lg:pt-6 text-center">
        <CardTitle className="flex flex-col items-center gap-3">
          <div className="nav-gradient w-14 h-14 rounded-xl flex items-center justify-center shrink-0">
            <Droplets className="h-7 w-7 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text-premium">{t("secondary.title")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted/50 rounded-lg p-2.5 text-center overflow-hidden">
            <div className="flex items-center justify-center gap-0.5 text-muted-foreground text-[10px] mb-1 truncate">
              <TrendingUp className="h-3 w-3" />
              {t("secondary.currentPrice")}
            </div>
            <div className="font-mono font-semibold text-sm truncate">{formatCurrency(tokenPrice)}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2.5 text-center overflow-hidden">
            <div className="flex items-center justify-center gap-0.5 text-muted-foreground text-[10px] mb-1 truncate">
              <Coins className="h-3 w-3" />
              {t("metrics.lpB18")}
            </div>
            <div className="font-mono font-semibold text-sm truncate">{formatTokens(lpPoolTokens)}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2.5 text-center overflow-hidden">
            <div className="flex items-center justify-center gap-0.5 text-muted-foreground text-[10px] mb-1 truncate">
              <DollarSign className="h-3 w-3" />
              {t("metrics.lpUsdt")}
            </div>
            <div className="font-mono font-semibold text-sm truncate">{formatCurrency(lpPoolUsdt)}</div>
          </div>
        </div>

        <div className="gradient-card p-3">
        <Tabs value={tradeType} onValueChange={(v) => setTradeType(v as "buy" | "sell" | "spp_buy" | "spp_sell")}>
          <TabsList className="grid grid-cols-2 gap-1 h-auto p-1">
            <TabsTrigger value="buy" className="gap-1.5 text-sm py-2" data-testid="tab-buy">
              <ArrowUpRight className="h-4 w-4" />
              {t("secondary.buy")}
            </TabsTrigger>
            <TabsTrigger value="sell" className="gap-1.5 text-sm py-2" data-testid="tab-sell">
              <ArrowDownRight className="h-4 w-4" />
              {t("secondary.sell")}
            </TabsTrigger>
            <TabsTrigger value="spp_buy" className="gap-1.5 text-sm py-2" data-testid="tab-spp-buy">
              <TrendingUp className="h-4 w-4" />
              {language === "zh" ? "SPP买" : "SPP Buy"}
            </TabsTrigger>
            <TabsTrigger value="spp_sell" className="gap-1.5 text-sm py-2" data-testid="tab-spp-sell">
              <TrendingDown className="h-4 w-4" />
              {language === "zh" ? "SPP卖" : "SPP Sell"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-2 mt-3">
            <div className="space-y-1.5">
              <Label className="text-sm">{t("secondary.buyAmount")}</Label>
              <Input type="number" min={0} step={100} value={buyAmount} onChange={(e) => setBuyAmount(Number(e.target.value))} className="h-9 text-sm font-mono" data-testid="input-buy-amount" />
            </div>
            <div className="grid grid-cols-2 gap-1.5 overflow-hidden">
              <div className="mobile-stat text-center overflow-hidden">
                <div className="text-[10px] text-muted-foreground truncate">{language === "zh" ? "预计获得" : "Est."}</div>
                <div className="text-sm font-semibold text-chart-2 truncate">{formatTokens(buySimulation.tokensReceived)} B18</div>
              </div>
              <div className="mobile-stat text-center overflow-hidden">
                <div className="text-[10px] text-muted-foreground truncate">{language === "zh" ? "3%滑点" : "3% Fee"}</div>
                <div className="text-sm font-semibold text-destructive truncate">-{formatCurrency(buySimulation.slippageFee)}</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sell" className="space-y-2 mt-3">
            <div className="space-y-1.5">
              <Label className="text-sm">{t("secondary.sellAmount")}</Label>
              <Input type="number" min={0} step={100} value={sellAmount} onChange={(e) => setSellAmount(Number(e.target.value))} className="h-9 text-sm font-mono" data-testid="input-sell-amount" />
            </div>
            <div className="grid grid-cols-2 gap-1.5 overflow-hidden">
              <div className="mobile-stat text-center overflow-hidden">
                <div className="text-[10px] text-muted-foreground truncate">{language === "zh" ? "预计获得" : "Est."}</div>
                <div className="text-sm font-semibold text-chart-2 truncate">{formatCurrency(sellSimulation.usdtReceived)}</div>
              </div>
              <div className="mobile-stat text-center overflow-hidden">
                <div className="text-[10px] text-muted-foreground truncate">{language === "zh" ? "3%滑点" : "3% Fee"}</div>
                <div className="text-sm font-semibold text-destructive truncate">-{formatCurrency(sellSimulation.slippageFee)}</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="spp_buy" className="space-y-2 mt-3">
            <div className="bg-chart-2/10 rounded-md p-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{language === "zh" ? "SPP余额" : "SPP Balance"}</span>
              <span className="font-semibold text-chart-2">{formatCurrency(sppBalance)}</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{language === "zh" ? "买入金额" : "Amount"}</Label>
              <Input type="number" min={0} max={sppBalance} step={1000} value={sppBuyAmount} onChange={(e) => setSppBuyAmount(Math.min(Number(e.target.value), sppBalance))} className="h-9 text-sm font-mono" data-testid="input-spp-buy-amount" />
              {sppBuySimulation.isInsufficient && (
                <p className="text-[10px] text-destructive flex items-center gap-1"><AlertTriangle className="h-2.5 w-2.5" />{language === "zh" ? "超出余额" : "Exceeds"}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5 overflow-hidden">
              <div className="mobile-stat text-center overflow-hidden">
                <div className="text-[10px] text-muted-foreground truncate">{language === "zh" ? "买入B18" : "Buy B18"}</div>
                <div className="text-sm font-semibold text-chart-2 truncate">{formatTokens(sppBuySimulation.tokensReceived)}</div>
              </div>
              <div className="mobile-stat text-center overflow-hidden">
                <div className="text-[10px] text-muted-foreground truncate">{language === "zh" ? "价格提升" : "Price Up"}</div>
                <div className="text-sm font-semibold text-chart-2 truncate">+{formatPercent(sppBuySimulation.priceImpact)}</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="spp_sell" className="space-y-2 mt-3">
            <div className="bg-chart-4/10 rounded-md p-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{language === "zh" ? "SPP持有B18" : "SPP B18"}</span>
              <span className="font-semibold text-chart-4">{formatTokens(sppHeldB18)}</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{language === "zh" ? "卖出数量" : "Amount"}</Label>
              <Input type="number" min={0} max={sppHeldB18} step={100} value={sppSellAmount} onChange={(e) => setSppSellAmount(Math.min(Number(e.target.value), sppHeldB18))} className="h-8 text-sm font-mono" data-testid="input-spp-sell-amount" />
              {sppSellSimulation.isInsufficient && (
                <p className="text-[10px] text-destructive flex items-center gap-1"><AlertTriangle className="h-2.5 w-2.5" />{language === "zh" ? "超出持有量" : "Exceeds"}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5 overflow-hidden">
              <div className="mobile-stat text-center overflow-hidden">
                <div className="text-[10px] text-muted-foreground truncate">{language === "zh" ? "获得USDC" : "USDC"}</div>
                <div className="text-sm font-semibold text-chart-2 truncate">{formatCurrency(sppSellSimulation.usdtReceived)}</div>
              </div>
              <div className="mobile-stat text-center overflow-hidden">
                <div className="text-[10px] text-muted-foreground truncate">{language === "zh" ? "价格降低" : "Down"}</div>
                <div className="text-sm font-semibold text-destructive truncate">{formatPercent(sppSellSimulation.priceImpact)}</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 mt-3">
          <Button className="flex-1" size="sm" onClick={handleSimulate} data-testid="button-simulate-trade">
            <Droplets className="h-4 w-4 mr-1" />
            {tradeType === "buy" ? t("secondary.simulateBuy") : tradeType === "sell" ? t("secondary.simulateSell") : tradeType === "spp_buy" ? (language === "zh" ? "模拟SPP买入" : "SPP Buy") : (language === "zh" ? "模拟SPP卖出" : "SPP Sell")}
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            className="shrink-0"
            onClick={() => setShowHelpDialog(true)}
            data-testid="button-help-secondary"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-sm p-3">
          <DialogHeader className="pb-1">
            <DialogTitle className="flex items-center gap-1.5 text-base">
              <CheckCircle2 className="h-4 w-4 text-chart-2" />
              {tradeType === "buy" ? t("secondary.buy") : tradeType === "sell" ? t("secondary.sell") : tradeType === "spp_buy" ? (language === "zh" ? "SPP买入" : "SPP Buy") : (language === "zh" ? "SPP卖出" : "SPP Sell")}
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              {tradeType === "buy" ? `${formatCurrency(buyAmount)} USDC` : tradeType === "sell" ? `${formatTokens(sellAmount)} B18` : tradeType === "spp_buy" ? `${formatCurrency(sppBuySimulation.buyAmountUsdt)} USDC` : `${formatTokens(sppSellSimulation.sellTokens)} B18`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {tradeType === "spp_buy" ? (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-chart-2/10 rounded-md p-2 text-center">
                    <div className="text-[10px] text-chart-2">{language === "zh" ? "买入B18" : "B18"}</div>
                    <div className="text-sm font-semibold text-chart-2">{formatTokens(sppBuySimulation.tokensReceived)}</div>
                  </div>
                  <div className="bg-muted/50 rounded-md p-2 text-center">
                    <div className="text-[10px] text-muted-foreground">{language === "zh" ? "均价" : "Avg"}</div>
                    <div className="text-sm font-semibold">{formatCurrency(sppBuySimulation.effectivePrice)}</div>
                  </div>
                </div>
                <div className="bg-chart-2/10 rounded-md p-1.5 text-center">
                  <div className="text-[10px] text-chart-2">{language === "zh" ? "价格提升" : "Price Up"}</div>
                  <div className="text-sm font-semibold text-chart-2">{formatPercent(sppBuySimulation.priceImpact)}</div>
                  <div className="text-[9px] text-muted-foreground">{formatCurrency(tokenPrice)} → {formatCurrency(sppBuySimulation.newPrice)}</div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-muted/50 rounded-md p-1.5 text-center">
                    <div className="text-[10px] text-muted-foreground">{language === "zh" ? "消耗" : "Used"}</div>
                    <div className="text-sm font-semibold">{formatCurrency(sppBuySimulation.buyAmountUsdt)}</div>
                  </div>
                  <div className="bg-muted/50 rounded-md p-1.5 text-center">
                    <div className="text-[10px] text-muted-foreground">{language === "zh" ? "剩余" : "Left"}</div>
                    <div className="text-sm font-semibold">{formatCurrency(sppBuySimulation.remainingSppBalance)}</div>
                  </div>
                </div>
              </>
            ) : tradeType === "spp_sell" ? (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-chart-2/10 rounded-md p-2 text-center">
                    <div className="text-[10px] text-chart-2">{language === "zh" ? "获得USDC" : "USDC"}</div>
                    <div className="text-sm font-semibold text-chart-2">{formatCurrency(sppSellSimulation.usdtReceived)}</div>
                  </div>
                  <div className="bg-muted/50 rounded-md p-2 text-center">
                    <div className="text-[10px] text-muted-foreground">{language === "zh" ? "均价" : "Avg"}</div>
                    <div className="text-sm font-semibold">{formatCurrency(sppSellSimulation.effectivePrice)}</div>
                  </div>
                </div>
                <div className="bg-destructive/10 rounded-md p-1.5 text-center">
                  <div className="text-[10px] text-destructive">{language === "zh" ? "价格降低" : "Price Down"}</div>
                  <div className="text-sm font-semibold text-destructive">{formatPercent(sppSellSimulation.priceImpact)}</div>
                  <div className="text-[9px] text-muted-foreground">{formatCurrency(tokenPrice)} → {formatCurrency(sppSellSimulation.newPrice)}</div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-muted/50 rounded-md p-1.5 text-center">
                    <div className="text-[10px] text-muted-foreground">{language === "zh" ? "卖出" : "Sold"}</div>
                    <div className="text-sm font-semibold">{formatTokens(sppSellSimulation.sellTokens)}</div>
                  </div>
                  <div className="bg-muted/50 rounded-md p-1.5 text-center">
                    <div className="text-[10px] text-muted-foreground">{language === "zh" ? "剩余" : "Left"}</div>
                    <div className="text-sm font-semibold">{formatTokens(sppSellSimulation.remainingSppB18)}</div>
                  </div>
                </div>
              </>
            ) : tradeType === "buy" ? (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-chart-2/10 rounded-md p-2 text-center">
                    <div className="text-[10px] text-chart-2">{t("secondary.tokensReceived")}</div>
                    <div className="text-sm font-semibold text-chart-2" data-testid="text-tokens-received">{formatTokens(buySimulation.tokensReceived)}</div>
                  </div>
                  <div className="bg-muted/50 rounded-md p-2 text-center">
                    <div className="text-[10px] text-muted-foreground">{language === "zh" ? "均价" : "Avg"}</div>
                    <div className="text-sm font-semibold">{formatCurrency(buySimulation.effectivePrice)}</div>
                  </div>
                </div>
                <div className="bg-destructive/10 rounded-md p-1.5 text-center">
                  <div className="text-[10px] text-destructive">{t("secondary.slippage")} 3%</div>
                  <div className="text-sm font-semibold text-destructive">-{formatCurrency(buySimulation.slippageFee)}</div>
                  <div className="text-[9px] text-muted-foreground">{language === "zh" ? "进入LP" : "To LP"}: {formatCurrency(buySimulation.effectiveAmount)}</div>
                </div>
                <div className="bg-chart-2/10 rounded-md p-1.5 flex justify-between items-center text-[10px]">
                  <span className="flex items-center gap-1"><TrendingUp className="h-2.5 w-2.5" />{language === "zh" ? "价格影响" : "Price"}</span>
                  <span className="font-semibold">{formatCurrency(tokenPrice)} → {formatCurrency(buySimulation.newPrice)} <Badge variant="default" className="text-[8px] px-0.5 bg-chart-2">+{formatPercent(buySimulation.priceImpact)}</Badge></span>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-chart-2/10 rounded-md p-2 text-center">
                    <div className="text-[10px] text-chart-2">{t("secondary.usdtReceived")}</div>
                    <div className="text-sm font-semibold text-chart-2" data-testid="text-usdt-received">{formatCurrency(sellSimulation.usdtReceived)}</div>
                  </div>
                  <div className="bg-muted/50 rounded-md p-2 text-center">
                    <div className="text-[10px] text-muted-foreground">{language === "zh" ? "均价" : "Avg"}</div>
                    <div className="text-sm font-semibold">{formatCurrency(sellSimulation.effectivePrice)}</div>
                  </div>
                </div>
                <div className="bg-destructive/10 rounded-md p-1.5 text-center">
                  <div className="text-[10px] text-destructive">{t("secondary.slippage")} 3%</div>
                  <div className="text-sm font-semibold text-destructive">-{formatCurrency(sellSimulation.slippageFee)}</div>
                  <div className="text-[9px] text-muted-foreground">{language === "zh" ? "AMM总" : "Gross"}: {formatCurrency(sellSimulation.grossUsdtReceived)}</div>
                </div>
                <div className="bg-destructive/10 rounded-md p-1.5 flex justify-between items-center text-[10px]">
                  <span className="flex items-center gap-1"><TrendingDown className="h-2.5 w-2.5" />{language === "zh" ? "价格影响" : "Price"}</span>
                  <span className="font-semibold">{formatCurrency(tokenPrice)} → {formatCurrency(sellSimulation.newPrice)} <Badge variant="destructive" className="text-[8px] px-0.5">{formatPercent(sellSimulation.priceImpact)}</Badge></span>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowResultsDialog(false)}>{t("button.cancel")}</Button>
              <Button size="sm" className="flex-1" onClick={handleConfirmTrade} data-testid="button-confirm-trade">
                {t("button.confirm")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SecondaryMarketHelpDialog
        open={showHelpDialog}
        onOpenChange={setShowHelpDialog}
        language={language}
      />
      </CardContent>
    </Card>
  );
}
