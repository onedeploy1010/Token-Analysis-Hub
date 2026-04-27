import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import type { SimulatedOrder, ReleaseMode } from "./mobile-step-wizard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowRightLeft,
  TrendingUp,
  Coins,
  CheckCircle2,
  Flame,
  Gift,
  FileText,
  Landmark,
  AlertTriangle,
  Calculator,
  HelpCircle,
  Repeat,
  Clock,
  ArrowDownToLine,
  ListOrdered,
  Timer,
  Wallet,
} from "lucide-react";
import { ReleaseHelpDialog } from "./help-dialogs";
import { useLanguage } from "@/contexts/language-context";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import {
  formatCurrency,
  formatTokens,
  formatPercent,
  calculateReleaseSimulation,
  calculateDailyReleaseSimulation,
  calculate334Status,
  type ExtendedReleaseResult,
  type DailyReleaseSchedule,
} from "@/lib/tokenomics";
import { StaticReleaseTax, defaultStaticReleaseTax, defaultTokenDistribution } from "@shared/schema";

interface ReleaseCalculation {
  releaseTokens: number;
  releaseUsdt: number;
  releaseTax: number;
}

interface ReleaseWithdrawalProps {
  tokenPrice: number;
  totalStaked: number;
  stakingTotalValue?: number;
  stakingTotalTokens?: number;
  stakingPurchaseUsdt?: number; // 投资金额（从第1步传入）
  stakingTokensPurchased?: number; // 本金代币数（从第1步传入）
  stakingPeriodDays?: number;
  stakingDailyRate?: number;
  releaseDays?: number;          // 从第1步传入的释放周期 (D)
  releaseMode?: ReleaseMode;     // 从第1步传入的释放模式
  useCompound?: boolean;         // 兼容旧字段
  lpPoolTokens: number;
  lpPoolUsdt: number;
  treasuryBalance: number;
  sppBalance?: number;
  previousTreasuryBalance?: number;
  dynamicRewardPool?: number;
  staticRewardPool?: number;
  staticReleaseTax?: StaticReleaseTax[];
  // 多订单支持
  simulatedOrders?: SimulatedOrder[];
  currentOrderIndex?: number;
  onOrderIndexChange?: (index: number) => void;
  onUpdateOrderReleasedDays?: (orderIndex: number, releasedDays: number) => void;
  onUpdateOrderReleasedUsdc?: (orderIndex: number, releasedUsdc: number) => void;
  onRelease?: (result: {
    tokensReleased: number;
    usdtReceived: number;
    newPrice: number;
    toDeliveryContract: number;
    toBurn: number;
    toBonusPool: number;
    newLpUsdt?: number;
    newLpTokens?: number;
    sppB18Received?: number;  // 10% B18进入SPP合约
    totalScheduledRelease?: number;  // 本次释放计划的总金额（首次确认时传入）
  }) => void;
  onCalculationChange?: (calc: ReleaseCalculation) => void;
}

export function ReleaseWithdrawal({
  tokenPrice,
  totalStaked,
  stakingTotalValue = 0,
  stakingTotalTokens = 0,
  stakingPurchaseUsdt = 0, // 投资金额（从第1步传入）
  stakingTokensPurchased = 0, // 本金代币数（从第1步传入）
  stakingPeriodDays = 180,
  stakingDailyRate = 0.003,
  releaseDays = 30,                       // 从第1步传入，默认30天
  releaseMode = 'amortizing' as ReleaseMode, // 从第1步传入，默认等额本金
  useCompound = false,                    // 兼容旧字段
  lpPoolTokens,
  lpPoolUsdt,
  treasuryBalance,
  sppBalance = 0,
  previousTreasuryBalance,
  staticReleaseTax = defaultStaticReleaseTax,
  // 多订单支持
  simulatedOrders = [],
  currentOrderIndex = 0,
  onOrderIndexChange,
  onUpdateOrderReleasedDays,
  onUpdateOrderReleasedUsdc,
  onRelease,
  onCalculationChange,
}: ReleaseWithdrawalProps) {
  const [simulationDay, setSimulationDay] = useState<number>(1);
  const [showSimulationDialog, setShowSimulationDialog] = useState<boolean>(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState<boolean>(false);
  const [showHelpDialog, setShowHelpDialog] = useState<boolean>(false);
  // 本地追踪已释放天数和已兑付USDC（用于无订单时）
  const [propsReleasedDays, setPropsReleasedDays] = useState<number>(0);
  const [propsReleasedUsdc, setPropsReleasedUsdc] = useState<number>(0);

  // 当前选中的订单
  const currentOrder = simulatedOrders.length > 0 ? simulatedOrders[currentOrderIndex] : null;
  const hasOrders = simulatedOrders.length > 0;

  // 使用订单数据或props数据
  const activeInvestment = currentOrder?.investment ?? stakingPurchaseUsdt;
  const activeTokensPurchased = currentOrder?.tokensPurchased ?? stakingTokensPurchased;
  const activeTotalTokens = currentOrder?.totalTokens ?? stakingTotalTokens;
  const activeTotalValue = currentOrder?.totalValue ?? stakingTotalValue;
  const activeStakingDays = currentOrder?.stakingDays ?? stakingPeriodDays;
  const activeStakingDailyRate = currentOrder?.stakingDailyRate ?? stakingDailyRate;
  const activeReleaseDays = currentOrder?.releaseDays ?? releaseDays;
  const activeReleaseMode = currentOrder?.releaseMode ?? releaseMode;
  const activeUseCompound = activeReleaseMode === 'compound'; // 兼容
  // 已模拟释放天数：有订单用订单数据，无订单用本地状态
  const activeReleasedDays = hasOrders ? (currentOrder?.releasedDays ?? 0) : propsReleasedDays;
  // 已兑付USDC：有订单用订单数据，无订单用本地状态
  const activeReleasedUsdc = hasOrders ? (currentOrder?.releasedUsdc ?? 0) : propsReleasedUsdc;

  // 检查是否有投资数据（订单或props）
  const hasInvestment = hasOrders ? (activeInvestment > 0 && activeTotalTokens > 0) : (stakingPurchaseUsdt > 0 && stakingTotalTokens > 0);

  // 使用活跃订单的数据
  const purchasedTokens = hasInvestment ? activeTokensPurchased : 0;
  const investmentUsdc = hasInvestment ? activeInvestment : 0;
  const releaseAmount = hasInvestment ? activeTotalTokens : 0;

  // 有效的质押天数和释放天数
  const effectiveStakingDays = hasInvestment ? activeStakingDays : 0;
  const effectiveReleaseDays = hasInvestment ? activeReleaseDays : 0;

  // 使用新的每日释放模拟（支持三种模式）
  const dailyReleaseSimulation = useMemo(() => {
    if (!hasInvestment || purchasedTokens <= 0) {
      return null;
    }
    return calculateDailyReleaseSimulation(
      purchasedTokens,              // 本金B18 (P0)
      activeStakingDailyRate,       // 日利率 (r)
      effectiveReleaseDays || 1,    // 释放天数 (D)
      tokenPrice,
      lpPoolTokens,
      lpPoolUsdt,
      activeReleaseMode,            // 释放模式
      staticReleaseTax,
      effectiveStakingDays || 360   // 质押天数 (T)
    );
  }, [hasInvestment, purchasedTokens, activeStakingDailyRate, effectiveReleaseDays, tokenPrice, lpPoolTokens, lpPoolUsdt, activeReleaseMode, staticReleaseTax, effectiveStakingDays]);

  // 计算本利和 (USDC)
  const totalValueUsdc = hasInvestment ? stakingTotalValue : 0;

  // 兼容旧的 releaseSimulation 接口
  const releaseSimulation = useMemo(() => {
    if (!hasInvestment || !dailyReleaseSimulation) {
      return {
        usdtReceived: 0,
        taxTokens: 0,
        taxRate: 0,
        netTokens: 0,
        toDeliveryContract: 0,
        toBurn: 0,
        toBonusPool: 0,
        newPrice: tokenPrice,
        priceImpact: 0,
        newLpUsdt: lpPoolUsdt,
        newLpTokens: lpPoolTokens,
        sppB18Received: 0,
        sppUsdcReceived: 0,
        taxToDeliveryContract: 0,
        taxToBurn: 0,
        taxToBonusPool: 0,
        taxToSellLP: 0,
        taxUsdc: 0,
        grossUsdcPayout: 0,
        taxUsdcToLP: 0,
        b18BoughtFromLP: 0,
        b18Bought: 0,
        b18SoldToLP: 0,
        effectivePrice: 0,
        dailyRelease: 0,
        compoundedPrincipal: 0,
      };
    }
    return dailyReleaseSimulation;
  }, [hasInvestment, dailyReleaseSimulation, tokenPrice, lpPoolUsdt, lpPoolTokens]);

  // 每日释放计划（从新函数获取）
  const dailySchedule = dailyReleaseSimulation?.dailySchedule || [];
  
  // 每日释放B18量（从计划中获取，或按比例计算）
  const dailyTokens = dailySchedule.length > 0 
    ? dailySchedule[0]?.dailyTotalB18 || 0 
    : (hasInvestment && effectiveReleaseDays > 0 ? releaseAmount / effectiveReleaseDays : 0);
  
  // 累计到第N天的模拟数据（从计划中获取）
  const cumulativeData = useMemo(() => {
    if (!dailySchedule.length || simulationDay <= 0) {
      return {
        cumulativeB18Released: 0,
        cumulativeNetUsdc: 0,
        cumulativeGrossUsdc: 0,
        cumulativeTaxUsdc: 0,
        cumulativeB18BoughtFromLP: 0,
        cumulativeDeliveryB18: 0,
        cumulativeWithdrawnB18: 0,
        cumulativeInterest: 0,
      };
    }

    const totalDayIndex = Math.min(simulationDay - 1, dailySchedule.length - 1);
    const dayData = dailySchedule[totalDayIndex];

    // 计算累计税收USDC从LP买的B18
    let cumulativeB18BoughtFromLP = 0;
    let cumulativeGrossUsdc = 0;
    let cumulativeTaxUsdc = 0;
    let cumulativeDeliveryB18 = 0;
    for (let i = 0; i <= totalDayIndex; i++) {
      cumulativeB18BoughtFromLP += dailySchedule[i].dailyB18BoughtFromLP;
      cumulativeGrossUsdc += dailySchedule[i].dailyGrossUsdc;
      cumulativeTaxUsdc += dailySchedule[i].dailyTaxUsdc;
      cumulativeDeliveryB18 += dailySchedule[i].dailyDeliveryB18;
    }

    return {
      cumulativeB18Released: dayData.cumulativeB18Released,
      cumulativeNetUsdc: dayData.cumulativeNetUsdc,
      cumulativeGrossUsdc,
      cumulativeTaxUsdc,
      cumulativeB18BoughtFromLP,
      cumulativeDeliveryB18,
      cumulativeWithdrawnB18: dayData.cumulativeWithdrawnB18,
      cumulativeInterest: dayData.cumulativeInterest,
    };
  }, [dailySchedule, simulationDay]);
  
  const cumulativeTokens = cumulativeData.cumulativeB18Released;
  
  // 兼容旧的 cumulativeSimulation 接口（使用累计数据）
  const cumulativeSimulation = useMemo(() => {
    if (!hasInvestment || !dailyReleaseSimulation) {
      return releaseSimulation;
    }

    const totalDayIndex = Math.min(simulationDay - 1, dailySchedule.length - 1);

    // 计算到第N天的累计LP影响
    let currentLpUsdt = lpPoolUsdt;
    let currentLpTokens = lpPoolTokens;

    for (let i = 0; i <= totalDayIndex && i < dailySchedule.length; i++) {
      if (dailySchedule[i].dailyTaxUsdc > 0) {
        const k = currentLpTokens * currentLpUsdt;
        currentLpUsdt += dailySchedule[i].dailyTaxUsdc;
        currentLpTokens = k / currentLpUsdt;
      }
    }

    const newPrice = currentLpUsdt / currentLpTokens;
    const priceImpact = tokenPrice > 0 ? (newPrice - tokenPrice) / tokenPrice : 0;

    // 累计B18分配 (使用统一配置 50/20/20/10) - 基于累计提现的B18（不是累计释放）
    // 释放的B18分配：50%交付合约, 20%销毁, 20%奖励池, 10%SPP
    const totalReleasedB18 = cumulativeData.cumulativeWithdrawnB18 / (1 - releaseSimulation.taxRate); // 税前总释放
    const taxToDeliveryContract = totalReleasedB18 * defaultTokenDistribution.deliveryContract;
    const taxToBurn = totalReleasedB18 * defaultTokenDistribution.burn;
    const taxToBonusPool = totalReleasedB18 * defaultTokenDistribution.bonusPool;
    const taxToSellLP = totalReleasedB18 * defaultTokenDistribution.spp;

    // SPP收到的B18：10%直接分配 + 税收USDC从LP买入的B18
    // 税收USDC从LP买B18后进入SPP合约（价格上涨）
    const sppB18Received = taxToSellLP + cumulativeData.cumulativeB18BoughtFromLP;

    return {
      ...releaseSimulation,
      usdtReceived: cumulativeData.cumulativeNetUsdc,
      grossUsdcPayout: cumulativeData.cumulativeGrossUsdc,
      taxUsdc: cumulativeData.cumulativeTaxUsdc,
      taxToDeliveryContract,
      taxToBurn,
      taxToBonusPool,
      taxToSellLP,
      b18BoughtFromLP: cumulativeData.cumulativeB18BoughtFromLP,
      sppB18Received,
      newPrice,
      priceImpact,
      newLpUsdt: currentLpUsdt,
      newLpTokens: currentLpTokens,
    };
  }, [hasInvestment, dailyReleaseSimulation, simulationDay, dailySchedule, lpPoolUsdt, lpPoolTokens, tokenPrice, cumulativeData, releaseSimulation]);
  
  // 确认模拟天数范围
  // 如果订单已经模拟释放过，从已释放天数的下一天开始
  // compound模式：到期后才开始释放本金
  // amortizing/interestOnly模式：从第1天开始就释放
  const modeStartDay = activeReleaseMode === 'compound' ? effectiveStakingDays + 1 : 1;
  const totalPeriod = effectiveStakingDays + effectiveReleaseDays;
  // 最小选择日 = max(模式起始日, 已释放天数 + 1)，但不能超过总周期
  const minDay = Math.min(Math.max(modeStartDay, activeReleasedDays + 1), totalPeriod);
  // 判断订单是否已完全释放
  const isFullyReleased = activeReleasedDays >= totalPeriod;

  // 当释放模式或质押天数改变时，自动调整到正确的起始日
  useEffect(() => {
    if (simulationDay < minDay) {
      setSimulationDay(minDay);
    }
  }, [activeReleaseMode, effectiveStakingDays, minDay, simulationDay, activeReleasedDays]);

  // 当数据重置时（无订单且无投资），清除本地释放天数和已兑付USDC
  useEffect(() => {
    if (!hasOrders && stakingPurchaseUsdt <= 0) {
      setPropsReleasedDays(0);
      setPropsReleasedUsdc(0);
      setSimulationDay(1);
    }
  }, [hasOrders, stakingPurchaseUsdt]);

  const setDay = (val: number) => {
    setSimulationDay(Math.min(Math.max(minDay, val), totalPeriod));
  };

  const totalDayIndex = Math.min(simulationDay - 1, dailySchedule.length - 1);
  const dayData = dailySchedule[totalDayIndex] || { dailyPrincipal: 0, dailyInterest: 0, dailyTotalB18: 0, dailyNetUsdc: 0 };
  
  // 每日释放量 (本金 + 利息) = 本利释放（等额本息）
  // 公式：(质押本金/释放天数) + 质押本金*质押日利率
  // 每日释放本金 = 本金 / 释放天数（分批释放）
  // 每日利息 = 本金 * 日利率
  const dayPrincipalBase = effectiveReleaseDays > 0 ? purchasedTokens / effectiveReleaseDays : 0;
  const dayInterestBase = purchasedTokens * stakingDailyRate;
  const dailyB18Total = dayPrincipalBase + dayInterestBase;
  
  // 单日累计提现额度 = (本利释放 - 税收部分) / 释放天数
  const dailyTax = dailyB18Total * (releaseSimulation.taxRate || 0);
  const singleRelease = (dailyB18Total - dailyTax) / (effectiveReleaseDays || 1);

  const totalRelease = releaseSimulation.usdtReceived;
  const cumulativePayoutAmount = cumulativeSimulation.usdtReceived;
  const dailyRelease = dailyB18Total * (1 - (releaseSimulation.taxRate || 0)); // 每日净收

  // 334合约状态计算
  // 使用当前国库余额与上一次交易前的余额比较，判断资金趋势
  const prevBalance = previousTreasuryBalance ?? treasuryBalance;
  
  const status334 = useMemo(() => {
    // 传入当前余额，用于判断能否完成累计兑付
    return calculate334Status(
      treasuryBalance,
      prevBalance,
      cumulativeSimulation.usdtReceived,
      { treasury: 0.4, staticRewards: 0.3, dynamicRewards: 0.3 }
    );
  }, [treasuryBalance, prevBalance, cumulativeSimulation.usdtReceived]);

  // 计算本次增量（减去已释放的部分）
  const incrementalUsdcNeeded = cumulativeSimulation.usdtReceived - activeReleasedUsdc;
  const incrementalGrossUsdc = cumulativeData.cumulativeGrossUsdc - (activeReleasedUsdc / (1 - (cumulativeSimulation.taxRate || 0.03)));
  const incrementalTaxUsdc = incrementalGrossUsdc * (cumulativeSimulation.taxRate || 0.03);

  // 现金流充足性检查 - 基于本次增量兑付金额（不是累计）
  const isCashFlowSufficient = treasuryBalance >= incrementalUsdcNeeded;
  const cashFlowDeficit = isCashFlowSufficient ? 0 : incrementalUsdcNeeded - treasuryBalance;

  // 433保护机制：当国库余额低于本次增量需求的40%时触发排队
  const treasury433Threshold = incrementalUsdcNeeded * 0.4;
  const needsQueue = treasuryBalance < treasury433Threshold;

  // 排队提现状态
  const [queuedWithdrawals, setQueuedWithdrawals] = useState<Array<{
    id: number;
    amount: number;
    day: number;
    createdAt: number;
  }>>([]);
  const [showQueueDialog, setShowQueueDialog] = useState(false);

  // 计算可立即提现金额和排队金额
  // 433协议：当国库低于需求40%时，立即释放国库的30%，剩余排队
  const immediateWithdrawal = needsQueue ? Math.min(treasuryBalance * 0.3, incrementalUsdcNeeded) : incrementalUsdcNeeded;
  const queuedAmount = needsQueue ? incrementalUsdcNeeded - immediateWithdrawal : 0;

  // 计算排队中的总金额
  const totalQueuedAmount = queuedWithdrawals.reduce((sum, w) => sum + w.amount, 0);

  // 自动赎回：当国库有足够资金时，尝试自动兑付排队提现
  useEffect(() => {
    if (queuedWithdrawals.length > 0 && treasuryBalance > 0) {
      let availableFunds = treasuryBalance;
      const completedIds: number[] = [];

      for (const withdrawal of queuedWithdrawals) {
        if (availableFunds >= withdrawal.amount) {
          availableFunds -= withdrawal.amount;
          completedIds.push(withdrawal.id);
          // TODO: 触发实际提现逻辑（需要连接到 onRelease）
        } else {
          break; // 资金不足，停止处理
        }
      }

      if (completedIds.length > 0) {
        setQueuedWithdrawals(prev => prev.filter(w => !completedIds.includes(w.id)));
      }
    }
  }, [treasuryBalance, queuedWithdrawals]);

  useEffect(() => {
    if (onCalculationChange) {
      onCalculationChange({
        releaseTokens: releaseAmount,
        releaseUsdt: releaseSimulation.usdtReceived,
        releaseTax: releaseSimulation.taxUsdc, // 税收是USDC，不是B18
      });
    }
  }, [releaseAmount, releaseSimulation, onCalculationChange]);

  const { t, language } = useLanguage();
  const { isDesktop } = useBreakpoint();

  const handleConfirmRelease = (forcePartial: boolean = false) => {
    if (!onRelease || !hasInvestment) return;

    // 用户确认释放：使用累计到第N天的模拟数据（不是总体数据）
    // 累计数据包含到选定日期的所有释放
    const tokensToRemove = cumulativeData.cumulativeWithdrawnB18 / (1 - cumulativeSimulation.taxRate);
    const tokensRemaining = Math.max(0, stakingTotalTokens - tokensToRemove);

    // 计算增量USDC = 本次累计 - 上次已兑付
    // 国库只需扣除增量部分，避免重复扣款
    const incrementalUsdc = cumulativeSimulation.usdtReceived - activeReleasedUsdc;

    // 433协议处理：部分提现+排队
    if (needsQueue && forcePartial) {
      // 立即提现部分（国库的30%）
      const actualImmediate = Math.min(treasuryBalance * 0.3, incrementalUsdc);
      const actualQueued = incrementalUsdc - actualImmediate;

      // 添加到排队列表
      if (actualQueued > 0) {
        setQueuedWithdrawals(prev => [...prev, {
          id: Date.now(),
          amount: actualQueued,
          day: simulationDay,
          createdAt: Date.now(),
        }]);
      }

      // 只释放立即可用部分
      onRelease({
        tokensReleased: tokensToRemove * (actualImmediate / incrementalUsdc),
        usdtReceived: actualImmediate,
        newPrice: cumulativeSimulation.newPrice,
        toDeliveryContract: cumulativeSimulation.taxToDeliveryContract * (actualImmediate / incrementalUsdc),
        toBurn: cumulativeSimulation.taxToBurn * (actualImmediate / incrementalUsdc),
        toBonusPool: cumulativeSimulation.taxToBonusPool * (actualImmediate / incrementalUsdc),
        sppB18Received: cumulativeSimulation.sppB18Received * (actualImmediate / incrementalUsdc),
        newLpUsdt: cumulativeSimulation.newLpUsdt,
        newLpTokens: cumulativeSimulation.newLpTokens,
        totalScheduledRelease: tokensRemaining
      });

      // 更新已释放天数和已兑付USDC（包含排队部分在内的累计）
      if (hasOrders) {
        onUpdateOrderReleasedDays?.(currentOrderIndex, simulationDay);
        onUpdateOrderReleasedUsdc?.(currentOrderIndex, cumulativeSimulation.usdtReceived);
      } else {
        setPropsReleasedDays(simulationDay);
        setPropsReleasedUsdc(cumulativeSimulation.usdtReceived);
      }
    } else if (!needsQueue) {
      // 正常提现（国库充足）
      onRelease({
        tokensReleased: tokensToRemove,
        usdtReceived: incrementalUsdc,
        newPrice: cumulativeSimulation.newPrice,
        toDeliveryContract: cumulativeSimulation.taxToDeliveryContract,
        toBurn: cumulativeSimulation.taxToBurn,
        toBonusPool: cumulativeSimulation.taxToBonusPool,
        sppB18Received: cumulativeSimulation.sppB18Received,
        newLpUsdt: cumulativeSimulation.newLpUsdt,
        newLpTokens: cumulativeSimulation.newLpTokens,
        totalScheduledRelease: tokensRemaining
      });

      // 更新已释放天数和已兑付USDC
      if (hasOrders) {
        onUpdateOrderReleasedDays?.(currentOrderIndex, simulationDay);
        onUpdateOrderReleasedUsdc?.(currentOrderIndex, cumulativeSimulation.usdtReceived);
      } else {
        setPropsReleasedDays(simulationDay);
        setPropsReleasedUsdc(cumulativeSimulation.usdtReceived);
      }
    }

    setShowSimulationDialog(false);
  };

  // 桌面端渲染 - 左边控制，右边数据
  if (isDesktop) {
    return (
      <>
      <div className="h-full flex gap-4">
        {/* 左区域：滑动条 + 按钮 */}
        <div className="flex-[2] flex flex-col gap-4 min-h-0 overflow-auto">
          {/* 左上：Header + 日期选择器 */}
          <div className="bg-card rounded-2xl border shadow-lg p-6 shrink-0">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="nav-gradient w-14 h-14 rounded-xl flex items-center justify-center">
                <ArrowRightLeft className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{t("release.simulator")}</h2>
                <p className="text-sm text-muted-foreground">
                  {hasOrders
                    ? `${language === "zh" ? "订单" : "Order"} ${currentOrderIndex + 1}/${simulatedOrders.length}`
                    : (language === "zh" ? "模拟释放兑付" : "Simulate release payout")}
                </p>
              </div>
              <Button variant="outline" size="icon" className="ml-auto h-12 w-12" onClick={() => setShowHelpDialog(true)}>
                <HelpCircle className="h-6 w-6" />
              </Button>
            </div>

            {/* 日期选择器 */}
            <div className="bg-muted/30 rounded-xl p-4">
              {isFullyReleased ? (
                /* 已全部释放状态 */
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <CheckCircle2 className="h-12 w-12 text-chart-2 mb-3" />
                  <span className="text-lg font-bold text-chart-2">
                    {language === "zh" ? "已全部释放" : "Fully Released"}
                  </span>
                  <span className="text-sm text-muted-foreground mt-1">
                    {language === "zh"
                      ? `共释放 ${totalPeriod} 天，已完成全部提现`
                      : `${totalPeriod} days released, all withdrawals completed`}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold">{language === "zh" ? "投资后第几天" : "Day After Investment"}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={minDay}
                        max={totalPeriod}
                        value={simulationDay}
                        onChange={(e) => setDay(parseInt(e.target.value) || minDay)}
                        className="w-20 font-mono h-10 text-center text-lg"
                        disabled={!hasInvestment}
                      />
                      <span className="text-sm text-muted-foreground">/ {totalPeriod}</span>
                    </div>
                  </div>
                  <Slider
                    value={[simulationDay]}
                    onValueChange={(v) => setDay(v[0])}
                    min={minDay}
                    max={totalPeriod}
                    step={1}
                    className="w-full"
                    disabled={!hasInvestment}
                  />
                  {activeReleasedDays > 0 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground bg-chart-2/10 rounded-lg px-3 py-2 mt-3">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-chart-2" />
                        {language === "zh" ? "已模拟释放" : "Simulated"}
                      </span>
                      <span className="font-mono font-bold text-chart-2">{activeReleasedDays} / {totalPeriod} {language === "zh" ? "天" : "days"}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 释放模式显示 */}
            <div className={`flex items-center gap-3 rounded-xl p-3 border mt-4 ${
              activeReleaseMode === 'compound' ? 'bg-chart-1/10 border-chart-1/20'
                : activeReleaseMode === 'interestOnly' ? 'bg-chart-4/10 border-chart-4/20'
                : 'bg-chart-2/10 border-chart-2/20'
            }`}>
              <div className={`p-2.5 rounded-lg ${
                activeReleaseMode === 'compound' ? 'bg-chart-1/20'
                  : activeReleaseMode === 'interestOnly' ? 'bg-chart-4/20'
                  : 'bg-chart-2/20'
              }`}>
                {activeReleaseMode === 'compound' ? <Repeat className="h-6 w-6 text-chart-1" />
                  : activeReleaseMode === 'interestOnly' ? <Clock className="h-6 w-6 text-chart-4" />
                  : <ArrowDownToLine className="h-6 w-6 text-chart-2" />}
              </div>
              <div>
                <Label className={`text-base font-bold ${
                  activeReleaseMode === 'compound' ? 'text-chart-1'
                    : activeReleaseMode === 'interestOnly' ? 'text-chart-4'
                    : 'text-chart-2'
                }`}>
                  {activeReleaseMode === 'compound' ? (language === "zh" ? "复利滚存" : "Compound")
                    : activeReleaseMode === 'interestOnly' ? (language === "zh" ? "按期付息" : "Interest Only")
                    : (language === "zh" ? "等额本金" : "Amortizing")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {activeReleaseMode === 'compound' ? (language === "zh" ? "到期本利一起释放" : "All at maturity")
                    : activeReleaseMode === 'interestOnly' ? (language === "zh" ? "利息先行，本金到期" : "Interest first")
                    : (language === "zh" ? "每日本金+利息" : "Daily P+I")}
                </p>
              </div>
            </div>

            {/* 订单导航 */}
            {hasOrders && simulatedOrders.length > 1 && (
              <div className="flex justify-center gap-2 mt-4 pt-4 border-t">
                {simulatedOrders.map((order, index) => (
                  <button
                    key={order.id}
                    onClick={() => onOrderIndexChange?.(index)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index === currentOrderIndex ? "bg-primary scale-125 ring-2 ring-primary/30" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 左下：操作按钮 */}
          <div className="bg-card rounded-2xl border shadow-lg p-4 shrink-0">
            <div className="grid grid-cols-2 gap-3">
              <Button
                className="h-14 text-base font-bold"
                onClick={() => setShowSimulationDialog(true)}
                disabled={!hasInvestment || isFullyReleased}
              >
                <Calculator className="h-5 w-5 mr-2" />
                {isFullyReleased
                  ? (language === "zh" ? "已全部释放" : "Fully Released")
                  : (language === "zh" ? "模拟释放" : "Simulate")}
              </Button>
              <Button
                variant="outline"
                className="h-14 text-base font-bold"
                onClick={() => setShowHistoryDialog(true)}
                disabled={!hasInvestment}
              >
                <FileText className="h-5 w-5 mr-2" />
                {language === "zh" ? "日详情" : "Details"}
              </Button>
            </div>
            {/* 排队提现按钮 */}
            {queuedWithdrawals.length > 0 && (
              <Button
                variant="outline"
                className="w-full h-12 mt-3 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                onClick={() => setShowQueueDialog(true)}
              >
                <ListOrdered className="h-5 w-5 mr-2" />
                {language === "zh" ? `排队提现 (${queuedWithdrawals.length}笔 ${formatCurrency(totalQueuedAmount)})` : `Queue (${queuedWithdrawals.length}, ${formatCurrency(totalQueuedAmount)})`}
              </Button>
            )}
          </div>
        </div>

        {/* 右区域（大）：释放数据 */}
        <div className="flex-[3] bg-card rounded-2xl border shadow-lg p-6 flex flex-col min-h-0 overflow-hidden">
          {/* 订单摘要 */}
          {hasOrders && currentOrder && (
            <div className="bg-muted/30 rounded-xl p-4 border border-border/50 mb-4">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "投资" : "Invest"}</div>
                  <div className="font-bold text-xl text-chart-2">{formatCurrency(currentOrder.investment)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "质押" : "Stake"}</div>
                  <div className="font-bold text-xl">{currentOrder.stakingDays}{language === "zh" ? "天" : "d"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "释放" : "Release"}</div>
                  <div className="font-bold text-xl">{currentOrder.releaseDays}{language === "zh" ? "天" : "d"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "本利合计" : "Total"}</div>
                  <div className="font-bold text-xl text-primary">{formatTokens(currentOrder.totalTokens)} B18</div>
                </div>
              </div>
            </div>
          )}

          {/* 释放数据 - 横向大卡片 */}
          <div className="flex-1 grid grid-cols-2 gap-4">
            {/* 每日释放 */}
            <div className="bg-muted/40 rounded-xl p-4 flex flex-col">
              <div className="text-sm font-semibold text-muted-foreground mb-3">{language === "zh" ? "每日释放" : "Daily Release"}</div>
              <div className="space-y-2 flex-1">
                {activeReleaseMode === 'amortizing' ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{language === "zh" ? "每日本金" : "Daily Principal"}</span>
                      <span className="font-mono font-bold">{formatTokens(purchasedTokens / (effectiveReleaseDays || 1))} B18</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{language === "zh" ? "当日(本+利)" : "Daily (P+I)"}</span>
                      <span className="font-mono font-bold">{formatTokens(dailyB18Total)} B18</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{language === "zh" ? "质押本金" : "Principal"}</span>
                      <span className="font-mono font-bold">{formatTokens(purchasedTokens)} B18</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{activeReleaseMode === 'compound' ? (language === "zh" ? "到期本息" : "Maturity") : (language === "zh" ? "每日利息" : "Daily Int")}</span>
                      <span className="font-mono font-bold">{activeReleaseMode === 'compound' ? formatTokens(releaseSimulation.compoundedPrincipal || purchasedTokens) : formatTokens(purchasedTokens * stakingDailyRate)} B18</span>
                    </div>
                  </>
                )}
              </div>
              <div className="bg-chart-2/10 rounded-lg p-3 mt-auto border border-chart-2/20">
                <div className="text-xs text-muted-foreground mb-1">{language === "zh" ? "当日可提现" : "Daily Withdrawable"}</div>
                <div className="font-mono font-bold text-2xl text-chart-2">{formatTokens(dayData.dailyWithdrawableB18 || 0, 4)} B18</div>
              </div>
            </div>

            {/* 累计收益 */}
            <div className="bg-muted/40 rounded-xl p-4 flex flex-col">
              <div className="text-sm font-semibold text-muted-foreground mb-3">{language === "zh" ? "累计收益" : "Cumulative"}</div>
              <div className="grid grid-cols-2 gap-3 flex-1">
                <div className="bg-background/60 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground">{language === "zh" ? "累计提现B18" : "Withdrawn B18"}</div>
                  <div className="font-mono font-bold text-lg">{formatTokens(cumulativeData.cumulativeWithdrawnB18, 4)}</div>
                </div>
                <div className="bg-background/60 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground">{language === "zh" ? "累计提现USDC" : "Withdrawn USDC"}</div>
                  <div className="font-mono font-bold text-lg text-chart-2">{formatCurrency(cumulativeData.cumulativeWithdrawnB18 * tokenPrice)}</div>
                </div>
                <div className="bg-background/60 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground">{language === "zh" ? "累计利息B18" : "Total Interest"}</div>
                  <div className="font-mono font-bold text-lg text-chart-4">{formatTokens(cumulativeData.cumulativeInterest, 4)}</div>
                </div>
                <div className="bg-background/60 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground">{language === "zh" ? "累计释放B18" : "Total Released"}</div>
                  <div className="font-mono font-bold text-lg">{formatTokens(cumulativeTokens, 4)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs - 共用 */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-lg lg:max-w-3xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <div className="nav-gradient p-4 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <FileText className="h-5 w-5" />
                {language === "zh" ? "每日释放记录明细" : "Daily Release History"}
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-3">
              {dailySchedule.map((dayData, idx) => {
                const isCompoundingPhase = dayData.isCompoundingPhase === true;
                return (
                  <div key={idx} className={`rounded-xl p-3 border transition-colors ${
                    isCompoundingPhase ? "bg-amber-500/5 border-amber-500/20" : "bg-muted/30 border-border/50"
                  }`}>
                    <div className="flex justify-between items-center mb-2">
                      <Badge variant="outline">{language === "zh" ? `第 ${dayData.day} 天` : `Day ${dayData.day}`}</Badge>
                      {isCompoundingPhase && <Badge variant="secondary" className="text-xs">{language === "zh" ? "滚存中" : "Compounding"}</Badge>}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">{language === "zh" ? "本金" : "Principal"}: </span><span className="font-bold">{formatTokens(dayData.dailyPrincipal, 4)}</span></div>
                      <div><span className="text-muted-foreground">{language === "zh" ? "利息" : "Interest"}: </span><span className="font-bold text-chart-4">{formatTokens(dayData.dailyInterest, 4)}</span></div>
                      <div><span className="text-muted-foreground">{language === "zh" ? "可提现" : "Withdraw"}: </span><span className="font-bold text-chart-2">{formatTokens(dayData.dailyWithdrawableB18, 4)}</span></div>
                      <div><span className="text-muted-foreground">{language === "zh" ? "累计" : "Cumulative"}: </span><span className="font-bold">{formatTokens(dayData.cumulativeWithdrawnB18, 4)}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="p-4 border-t">
            <Button className="w-full" onClick={() => setShowHistoryDialog(false)}>{language === "zh" ? "关闭" : "Close"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSimulationDialog} onOpenChange={setShowSimulationDialog}>
        <DialogContent className="max-w-lg lg:max-w-3xl p-4 lg:p-6">
          <DialogHeader className="pb-3">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Calculator className="h-5 w-5 text-chart-1" />
              {language === "zh" ? `累计到释放第${simulationDay}天` : `Cumulative Release D1-${simulationDay}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-chart-2/10 rounded-xl p-4">
              <div className="text-sm text-muted-foreground text-center mb-2">{language === "zh" ? "USDC兑付" : "USDC Payout"}</div>
              {activeReleasedUsdc > 0 && (
                <div className="bg-muted/50 rounded-lg p-2 mb-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === "zh" ? "已释放(1-" + activeReleasedDays + "天)" : `Released (D1-${activeReleasedDays})`}</span>
                    <span className="font-semibold text-chart-2">{formatCurrency(activeReleasedUsdc)}</span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-xs text-muted-foreground">{language === "zh" ? (activeReleasedUsdc > 0 ? "本次毛额" : "毛额") : (activeReleasedUsdc > 0 ? "This Gross" : "Gross")}</div>
                  <div className="text-lg font-semibold">{formatCurrency(activeReleasedUsdc > 0 ? (cumulativeSimulation.grossUsdcPayout - activeReleasedUsdc / (1 - (cumulativeSimulation.taxRate || 0.03))) : cumulativeSimulation.grossUsdcPayout)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{language === "zh" ? (activeReleasedUsdc > 0 ? "本次税收" : "税收") : (activeReleasedUsdc > 0 ? "This Tax" : "Tax")}</div>
                  <div className="text-lg font-semibold text-destructive">-{formatCurrency(activeReleasedUsdc > 0 ? incrementalTaxUsdc : cumulativeSimulation.taxUsdc)}</div>
                </div>
                <div className="bg-chart-2/20 rounded-lg p-2">
                  <div className="text-xs text-muted-foreground">{language === "zh" ? (activeReleasedUsdc > 0 ? "本次净收" : "净收") : (activeReleasedUsdc > 0 ? "This Net" : "Net")}</div>
                  <div className="text-xl font-bold text-chart-2">{formatCurrency(incrementalUsdcNeeded)}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-sm">
              <div className="bg-chart-3/10 rounded-lg p-2">
                <FileText className="h-4 w-4 mx-auto text-chart-3 mb-1" />
                <div className="font-semibold">{formatTokens(cumulativeSimulation.taxToDeliveryContract)}</div>
                <div className="text-xs text-muted-foreground">50%</div>
              </div>
              <div className="bg-destructive/10 rounded-lg p-2">
                <Flame className="h-4 w-4 mx-auto text-destructive mb-1" />
                <div className="font-semibold">{formatTokens(cumulativeSimulation.taxToBurn)}</div>
                <div className="text-xs text-muted-foreground">20%</div>
              </div>
              <div className="bg-chart-4/10 rounded-lg p-2">
                <Gift className="h-4 w-4 mx-auto text-chart-4 mb-1" />
                <div className="font-semibold">{formatTokens(cumulativeSimulation.taxToBonusPool)}</div>
                <div className="text-xs text-muted-foreground">20%</div>
              </div>
              <div className="bg-chart-1/10 rounded-lg p-2">
                <Landmark className="h-4 w-4 mx-auto text-chart-1 mb-1" />
                <div className="font-semibold">{formatTokens(cumulativeSimulation.taxToSellLP)}</div>
                <div className="text-xs text-muted-foreground">10%</div>
              </div>
            </div>

            <div className={`rounded-xl p-3 ${isCashFlowSufficient ? 'bg-chart-2/10' : needsQueue ? 'bg-amber-500/10' : 'bg-destructive/10'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isCashFlowSufficient ? (
                    <CheckCircle2 className="h-5 w-5 text-chart-2" />
                  ) : needsQueue ? (
                    <Timer className="h-5 w-5 text-amber-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  )}
                  <span className="font-medium">
                    {isCashFlowSufficient
                      ? (language === "zh" ? '现金流充足' : 'Cash Flow OK')
                      : needsQueue
                      ? (language === "zh" ? '433协议启动' : '433 Protocol Active')
                      : (language === "zh" ? '现金流不足' : 'Low Cash Flow')}
                  </span>
                </div>
                <Badge variant="outline" className={needsQueue ? 'border-amber-500 text-amber-600' : ''}>
                  433: {needsQueue ? (language === "zh" ? '启动' : 'On') : (language === "zh" ? '关' : 'Off')}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {language === "zh" ? "库" : "Treasury"}: {formatCurrency(treasuryBalance)} | {language === "zh" ? "本次需" : "Need"}: {formatCurrency(incrementalUsdcNeeded)}
              </div>
              {needsQueue && (
                <div className="mt-2 pt-2 border-t border-amber-500/20 text-sm">
                  <div className="flex justify-between text-amber-600 dark:text-amber-400">
                    <span>{language === "zh" ? "立即释放(30%)" : "Immediate (30%)"}</span>
                    <span className="font-bold">{formatCurrency(immediateWithdrawal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{language === "zh" ? "排队等待" : "Queued"}</span>
                    <span className="font-mono">{formatCurrency(queuedAmount)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 排队提现查看按钮 */}
            {queuedWithdrawals.length > 0 && (
              <Button variant="outline" className="w-full" onClick={() => setShowQueueDialog(true)}>
                <ListOrdered className="h-4 w-4 mr-2" />
                {language === "zh" ? `查看排队提现 (${queuedWithdrawals.length}笔, ${formatCurrency(totalQueuedAmount)})` : `View Queue (${queuedWithdrawals.length}, ${formatCurrency(totalQueuedAmount)})`}
              </Button>
            )}

            <div className="flex gap-2">
              {needsQueue ? (
                <>
                  <Button
                    variant="outline"
                    className="flex-1 h-12 text-base"
                    onClick={() => setShowSimulationDialog(false)}
                  >
                    {language === "zh" ? "取消" : "Cancel"}
                  </Button>
                  <Button
                    className="flex-1 h-12 text-base font-bold bg-amber-500 hover:bg-amber-600"
                    onClick={() => handleConfirmRelease(true)}
                    disabled={!hasInvestment}
                  >
                    <Timer className="h-5 w-5 mr-2" />
                    {language === "zh" ? "部分释放+排队" : "Partial + Queue"}
                  </Button>
                </>
              ) : (
                <Button
                  className="w-full h-12 text-lg font-bold"
                  onClick={() => handleConfirmRelease(false)}
                  disabled={!hasInvestment || !isCashFlowSufficient}
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  {!hasInvestment
                    ? (language === "zh" ? "需先在第1步投资" : "Invest first")
                    : !isCashFlowSufficient
                    ? (language === "zh" ? "现金流不足" : "Low Cash")
                    : t("release.confirmRelease")}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 排队提现Dialog */}
      <Dialog open={showQueueDialog} onOpenChange={setShowQueueDialog}>
        <DialogContent className="max-w-lg lg:max-w-2xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <div className="bg-amber-500 p-4 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <ListOrdered className="h-5 w-5" />
                {language === "zh" ? "排队提现列表" : "Queued Withdrawals"}
              </DialogTitle>
              <DialogDescription className="text-white/80 text-sm">
                {language === "zh" ? "433协议：当新订单注入资金后自动赎回" : "433 Protocol: Auto-redeem when new orders inject funds"}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {queuedWithdrawals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{language === "zh" ? "暂无排队提现" : "No queued withdrawals"}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {queuedWithdrawals.map((withdrawal, idx) => (
                  <div key={withdrawal.id} className="rounded-xl p-4 border border-amber-500/20 bg-amber-500/5">
                    <div className="flex justify-between items-center mb-2">
                      <Badge variant="outline" className="border-amber-500 text-amber-600">
                        #{idx + 1}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(withdrawal.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">{language === "zh" ? "排队金额" : "Amount"}</div>
                        <div className="font-bold text-lg text-amber-600">{formatCurrency(withdrawal.amount)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">{language === "zh" ? "释放日" : "Release Day"}</div>
                        <div className="font-bold text-lg">{language === "zh" ? `第${withdrawal.day}天` : `Day ${withdrawal.day}`}</div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="bg-muted/30 rounded-xl p-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{language === "zh" ? "排队总额" : "Total Queued"}</span>
                    <span className="font-bold text-xl text-amber-600">{formatCurrency(totalQueuedAmount)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {language === "zh"
                      ? "当第一步新增订单后，资金充足时将自动赎回"
                      : "Will auto-redeem when Step 1 adds new orders with sufficient funds"}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t">
            <Button className="w-full" onClick={() => setShowQueueDialog(false)}>{language === "zh" ? "关闭" : "Close"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ReleaseHelpDialog open={showHelpDialog} onOpenChange={setShowHelpDialog} language={language} />
      </>
    );
  }

  // 移动端渲染
  return (
    <Card className="mobile-premium-card max-w-md mx-auto lg:max-w-2xl">
      <CardHeader className="pb-3 pt-4 px-4 lg:px-6 lg:pt-6">
        <CardTitle className="flex items-center gap-2.5">
          <div className="nav-gradient w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0">
            <ArrowRightLeft className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="min-w-0">
            <span className="text-base sm:text-lg font-bold gradient-text-premium">{t("release.simulator")}</span>
            {hasOrders && (
              <div className="text-[11px] sm:text-xs text-muted-foreground">
                {language === "zh" ? `订单 ${currentOrderIndex + 1}/${simulatedOrders.length}` : `Order ${currentOrderIndex + 1}/${simulatedOrders.length}`}
              </div>
            )}
          </div>
        </CardTitle>

        {/* 订单圆点导航 */}
        {hasOrders && simulatedOrders.length > 1 && (
          <div className="flex justify-center gap-2 mt-3 pt-2 border-t border-border/50">
            {simulatedOrders.map((order, index) => (
              <motion.button
                key={order.id}
                onClick={() => onOrderIndexChange?.(index)}
                className={`w-3.5 h-3.5 rounded-full transition-all ${
                  index === currentOrderIndex
                    ? "bg-primary scale-125 ring-2 ring-primary/30"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                whileTap={{ scale: 0.8 }}
                title={`${language === "zh" ? "订单" : "Order"} ${index + 1}: ${formatCurrency(order.investment)}`}
              />
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
          {/* 当前订单摘要 */}
          {hasOrders && currentOrder && (
            <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <div className="text-muted-foreground">{language === "zh" ? "投资" : "Invest"}</div>
                  <div className="font-bold text-chart-2">{formatCurrency(currentOrder.investment)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{language === "zh" ? "质押" : "Stake"}</div>
                  <div className="font-bold">{currentOrder.stakingDays}{language === "zh" ? "天" : "d"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{language === "zh" ? "释放" : "Release"}</div>
                  <div className="font-bold">{currentOrder.releaseDays}{language === "zh" ? "天" : "d"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{language === "zh" ? "本利B18" : "Total B18"}</div>
                  <div className="font-bold text-primary">{formatTokens(currentOrder.totalTokens)}</div>
                </div>
              </div>
            </div>
          )}

          {/* 释放模式显示 */}
          <div className={`flex items-center gap-3 rounded-xl p-3 border ${
            activeReleaseMode === 'compound'
              ? 'bg-chart-1/10 border-chart-1/20'
              : activeReleaseMode === 'interestOnly'
              ? 'bg-chart-4/10 border-chart-4/20'
              : 'bg-chart-2/10 border-chart-2/20'
          }`}>
            <div className={`p-2 rounded-lg ${
              activeReleaseMode === 'compound'
                ? 'bg-chart-1/20'
                : activeReleaseMode === 'interestOnly'
                ? 'bg-chart-4/20'
                : 'bg-chart-2/20'
            }`}>
              {activeReleaseMode === 'compound' ? (
                <Repeat className="h-5 w-5 text-chart-1" />
              ) : activeReleaseMode === 'interestOnly' ? (
                <Clock className="h-5 w-5 text-chart-4" />
              ) : (
                <ArrowDownToLine className="h-5 w-5 text-chart-2" />
              )}
            </div>
            <div>
              <Label className={`text-sm font-bold ${
                activeReleaseMode === 'compound'
                  ? 'text-chart-1'
                  : activeReleaseMode === 'interestOnly'
                  ? 'text-chart-4'
                  : 'text-chart-2'
              }`}>
                {activeReleaseMode === 'compound'
                  ? (language === "zh" ? "复利滚存" : "Compound")
                  : activeReleaseMode === 'interestOnly'
                  ? (language === "zh" ? "按期付息" : "Interest Only")
                  : (language === "zh" ? "等额本金" : "Amortizing")}
              </Label>
              <p className="text-[11px] text-muted-foreground">
                {activeReleaseMode === 'compound'
                  ? (language === "zh" ? "利息复投，到期后本利一起释放" : "Interest compounds, all released at maturity")
                  : activeReleaseMode === 'interestOnly'
                  ? (language === "zh" ? "利息质押期释放，本金到期后释放" : "Interest during staking, principal at maturity")
                  : (language === "zh" ? "每日释放本金+利息，线性释放" : "Daily P+I release during staking")}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {isFullyReleased ? (
              /* 已全部释放状态 (移动端) */
              <div className="flex flex-col items-center justify-center py-4 text-center bg-chart-2/10 rounded-xl">
                <CheckCircle2 className="h-10 w-10 text-chart-2 mb-2" />
                <span className="text-base font-bold text-chart-2">
                  {language === "zh" ? "已全部释放" : "Fully Released"}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {language === "zh"
                    ? `共 ${totalPeriod} 天，已完成`
                    : `${totalPeriod} days completed`}
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">
                    {language === "zh" ? "投资后第几天" : "Day After Investment"}
                  </Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={minDay}
                      max={totalPeriod}
                      value={simulationDay}
                      onChange={(e) => setDay(parseInt(e.target.value) || minDay)}
                      className="w-16 font-mono h-8 text-center text-sm p-1"
                      data-testid="input-simulation-day"
                      disabled={!hasInvestment}
                    />
                    <span className="text-xs text-muted-foreground">/ {totalPeriod}</span>
                  </div>
                </div>
                <Slider
                  value={[simulationDay]}
                  onValueChange={(v) => setDay(v[0])}
                  min={minDay}
                  max={totalPeriod}
                  step={1}
                  className="w-full py-2"
                  data-testid="slider-simulation-day"
                  disabled={!hasInvestment}
                />
                {/* 已释放天数指示器 */}
                {activeReleasedDays > 0 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground bg-chart-2/10 rounded-lg px-2 py-1">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-chart-2" />
                      {language === "zh" ? "已模拟释放" : "Simulated"}
                    </span>
                    <span className="font-mono font-bold text-chart-2">{activeReleasedDays} / {totalPeriod} {language === "zh" ? "天" : "days"}</span>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-2">
              {/* 核心计算展示 - 根据释放模式显示不同内容 */}
              <div className="bg-muted/40 rounded-xl p-3 space-y-2.5">
                {/* 等额本金模式：显示每日释放本金 */}
                {activeReleaseMode === 'amortizing' ? (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{language === "zh" ? "每日释放本金" : "Daily Principal"}</span>
                      <span className="font-mono font-bold text-chart-4">{formatTokens(purchasedTokens / (effectiveReleaseDays || 1))} B18</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-border/50 pt-2 text-sm">
                      <span className="text-muted-foreground">{language === "zh" ? "当日(本+利)释放" : "Daily Gross (P+I)"}</span>
                      <span className="font-mono font-bold">{formatTokens(dailyB18Total)} B18</span>
                    </div>
                  </>
                ) : (
                  /* 按期付息/复利模式：本金到期释放 */
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{language === "zh" ? "质押本金" : "Staked Principal"}</span>
                      <span className="font-mono font-bold text-chart-4">{formatTokens(purchasedTokens)} B18</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-border/50 pt-2 text-sm">
                      <span className="text-muted-foreground">
                        {activeReleaseMode === 'compound'
                          ? (language === "zh" ? "到期本息合计" : "Total at Maturity")
                          : (language === "zh" ? "每日利息释放" : "Daily Interest")}
                      </span>
                      <span className="font-mono font-bold">
                        {activeReleaseMode === 'compound'
                          ? formatTokens(releaseSimulation.compoundedPrincipal || purchasedTokens)
                          : formatTokens(purchasedTokens * stakingDailyRate)} B18
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{language === "zh" ? "本金释放时间" : "Principal Release"}</span>
                      <Badge variant="outline" className="text-xs">
                        {language === "zh" ? `第${effectiveStakingDays + 1}天起` : `From Day ${effectiveStakingDays + 1}`}
                      </Badge>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{language === "zh" ? "单笔金额" : "Per Installment"}</span>
                  <span className="font-mono">{formatTokens(singleRelease, 4)} B18</span>
                </div>
                <div className="bg-chart-2/10 rounded-lg p-2.5 flex justify-between items-center border border-chart-2/20">
                  <span className="text-sm font-bold text-chart-2">{language === "zh" ? "当日可提现" : "Daily Withdrawable"}</span>
                  <div className="text-right">
                    <span className="font-mono font-bold text-lg text-chart-2" data-testid="text-daily-withdrawable">{formatTokens(dayData.dailyWithdrawableB18 || 0, 4)}</span>
                    <span className="text-[11px] text-muted-foreground block leading-none">B18</span>
                  </div>
                </div>
              </div>

              {/* 累计收益 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                  <div className="text-[11px] text-muted-foreground uppercase mb-1">{language === "zh" ? "累计提现B18" : "Withdrawn B18"}</div>
                  <div className="font-mono font-bold text-base">{formatTokens(cumulativeData.cumulativeWithdrawnB18, 4)}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                  <div className="text-[11px] text-muted-foreground uppercase mb-1">{language === "zh" ? "累计提现USDC" : "Withdrawn USDC"}</div>
                  <div className="font-mono font-bold text-base text-chart-2">{formatCurrency(cumulativeData.cumulativeWithdrawnB18 * tokenPrice)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                  <div className="text-[11px] text-muted-foreground uppercase mb-1">{language === "zh" ? "累计利息B18" : "Total Interest"}</div>
                  <div className="font-mono font-bold text-base text-chart-4">{formatTokens(cumulativeData.cumulativeInterest, 4)}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                  <div className="text-[11px] text-muted-foreground uppercase mb-1">{language === "zh" ? "累计释放B18" : "Total Released"}</div>
                  <div className="font-mono font-bold text-base">{formatTokens(cumulativeTokens, 4)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1 h-12 text-sm font-bold rounded-xl px-2 flex flex-col items-center justify-center gap-1"
              onClick={() => setShowSimulationDialog(true)}
              data-testid="button-calculate-release"
              disabled={!hasInvestment || isFullyReleased}
            >
              <Calculator className="h-4 w-4" />
              <span className="leading-none">
                {isFullyReleased
                  ? (language === "zh" ? "已全部释放" : "Released")
                  : (language === "zh" ? "模拟释放" : "Simulate")}
              </span>
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-12 text-sm font-bold rounded-xl px-2 border-primary/20 hover:bg-primary/5 flex flex-col items-center justify-center gap-1"
              onClick={() => setShowHistoryDialog(true)}
              data-testid="button-history-release"
              disabled={!hasInvestment}
            >
              <FileText className="h-4 w-4" />
              <span className="leading-none">{language === "zh" ? `日详情` : `Details`}</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 shrink-0 rounded-xl"
              onClick={() => setShowHelpDialog(true)}
              data-testid="button-help-release"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>

          <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
            <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-none shadow-2xl" aria-describedby="history-dialog-description">
              <span id="history-dialog-description" className="sr-only">
                {language === "zh" ? "每日释放历史记录列表" : "Daily release history record list"}
              </span>
              <div className="nav-gradient p-4 text-white">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-white">
                    <FileText className="h-5 w-5" />
                    {language === "zh" ? "每日释放记录明细" : "Daily Release History"}
                  </DialogTitle>
                </DialogHeader>
              </div>
              
              <div className="p-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-3">
                  {dailySchedule.map((dayData, idx) => {
                    const isCompoundingPhase = dayData.isCompoundingPhase === true;
                    return (
                      <div key={idx} className={`rounded-xl p-3 border transition-colors ${
                        isCompoundingPhase
                          ? "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10"
                          : "bg-muted/30 border-border/50 hover:bg-muted/50"
                      }`}>
                        <div className="flex justify-between items-center mb-2">
                          <Badge variant="outline" className={isCompoundingPhase
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                            : "bg-primary/5 text-primary border-primary/10"
                          }>
                            {language === "zh" ? `第 ${dayData.day} 天` : `Day ${dayData.day}`}
                          </Badge>
                          {isCompoundingPhase ? (
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[11px]">
                              {language === "zh" ? "滚存中" : "Compounding"}
                            </Badge>
                          ) : activeUseCompound ? (
                            <Badge variant="secondary" className="bg-chart-2/10 text-chart-2 border-chart-2/20 text-[11px]">
                              {language === "zh" ? "释放期" : "Release"}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          {/* 本金计算过程 */}
                          <div className="bg-muted/50 rounded-lg p-2 space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">{language === "zh" ? "当日本金" : "Principal"}</span>
                              <span className="font-mono font-bold">{formatTokens(dayData.dailyPrincipal, 4)}</span>
                            </div>
                            {isCompoundingPhase ? (
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">{language === "zh" ? "+ 利息复投" : "+ Interest"}</span>
                                <span className="font-mono text-amber-600 dark:text-amber-400">+{formatTokens(dayData.dailyInterest, 4)}</span>
                              </div>
                            ) : activeUseCompound ? (
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">{language === "zh" ? "- 释放" : "- Release"}</span>
                                <span className="font-mono text-destructive">-{formatTokens(dayData.dailyPrincipalRelease, 4)}</span>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">{language === "zh" ? "- 本金释放" : "- Release"}</span>
                                <span className="font-mono text-destructive">-{formatTokens(dayData.dailyPrincipalRelease, 4)}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center text-xs border-t border-border/50 pt-1">
                              <span className="font-bold">{language === "zh" ? "= 次日本金" : "= Next Princ."}</span>
                              <span className="font-mono font-bold text-chart-2">{formatTokens(dayData.nextDayPrincipal, 4)} B18</span>
                            </div>
                          </div>

                          {/* 收益数据 - 滚存阶段显示不同内容 */}
                          {isCompoundingPhase ? (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <div className="text-[11px] text-muted-foreground uppercase">{language === "zh" ? "当日利息" : "Interest"}</div>
                                <div className="text-xs font-bold text-amber-600 dark:text-amber-400">{formatTokens(dayData.dailyInterest, 4)} B18</div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-[11px] text-muted-foreground uppercase">{language === "zh" ? "累计利息" : "Cum. Interest"}</div>
                                <div className="text-xs font-bold text-chart-4">{formatTokens(dayData.cumulativeInterest, 4)} B18</div>
                              </div>
                              <div className="col-span-2 text-center text-[11px] text-amber-600 dark:text-amber-400 py-1">
                                {language === "zh" ? "🔄 滚存阶段：利息自动复投，不可提现" : "🔄 Compounding: Interest auto-reinvested"}
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <div className="text-[11px] text-muted-foreground uppercase">{language === "zh" ? "当日利息" : "Interest"}</div>
                                <div className="text-xs font-bold text-chart-4">{formatTokens(dayData.dailyInterest, 4)} B18</div>
                              </div>
                              <div className="space-y-1 overflow-hidden">
                                <div className="text-[11px] text-muted-foreground uppercase truncate">{language === "zh" ? "单日提现" : "Daily Withdraw"}</div>
                                <div className="text-xs font-bold text-chart-2 truncate">{formatTokens(dayData.dailyWithdrawableB18, 4)} B18</div>
                              </div>
                              <div className="space-y-1 overflow-hidden">
                                <div className="text-[11px] text-muted-foreground uppercase truncate">{language === "zh" ? "累计提现B18" : "Cum. B18"}</div>
                                <div className="text-xs font-bold truncate">{formatTokens(dayData.cumulativeWithdrawnB18, 4)}</div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-[11px] text-muted-foreground uppercase">{language === "zh" ? "累计提现USDC" : "Cum. USDC"}</div>
                                <div className="text-xs font-bold text-chart-1">{formatCurrency(dayData.cumulativeWithdrawnB18 * tokenPrice)}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="p-4 border-t bg-muted/20">
                <Button className="w-full rounded-xl font-bold" onClick={() => setShowHistoryDialog(false)}>
                  {language === "zh" ? "关闭" : "Close"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showSimulationDialog} onOpenChange={setShowSimulationDialog}>
            <DialogContent className="max-w-sm lg:max-w-lg p-3 lg:p-5" aria-describedby="simulation-dialog-description">
              <span id="simulation-dialog-description" className="sr-only">
                {language === "zh" ? "模拟特定日期的释放兑付情况" : "Simulate release payout for a specific day"}
              </span>
              <DialogHeader className="pb-1">
                <DialogTitle className="flex items-center gap-1.5 text-base">
                  <Calculator className="h-4 w-4 text-chart-1" />
                  {language === "zh" ? `累计到释放第${simulationDay}天` : `Cumulative Release D1-${simulationDay}`}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-2">
                {/* 已释放提示和本次新增 */}
                {activeReleasedUsdc > 0 && (
                  <div className="bg-muted/50 rounded-md p-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === "zh" ? `已释放(1-${activeReleasedDays}天)` : `Released (D1-${activeReleasedDays})`}</span>
                      <span className="font-semibold text-chart-2">{formatCurrency(activeReleasedUsdc)}</span>
                    </div>
                    <div className="flex justify-between mt-1 border-t pt-1">
                      <span className="font-bold">{language === "zh" ? "本次新增" : "This Release"}</span>
                      <span className="font-bold text-primary">{formatCurrency(cumulativeSimulation.usdtReceived - activeReleasedUsdc)}</span>
                    </div>
                  </div>
                )}
                {/* 累计到第N天的USDC兑付 */}
                <div className="bg-chart-2/10 rounded-md p-2">
                  <div className="text-[11px] text-muted-foreground text-center mb-1">{language === "zh" ? `累计到第${simulationDay}天 USDC兑付` : `Cumulative Day 1-${simulationDay} USDC`}</div>
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <div>
                      <div className="text-[11px] text-muted-foreground">{language === "zh" ? "累计毛额" : "Gross"}</div>
                      <div className="text-sm font-semibold">{formatCurrency(cumulativeSimulation.grossUsdcPayout)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">{language === "zh" ? "累计税收" : "Tax"} ({formatPercent(cumulativeSimulation.taxRate)})</div>
                      <div className="text-sm font-semibold text-destructive">-{formatCurrency(cumulativeSimulation.taxUsdc)}</div>
                    </div>
                    <div className="bg-chart-2/20 rounded p-0.5">
                      <div className="text-[11px] text-muted-foreground">{language === "zh" ? "累计净收" : "Total Net"}</div>
                      <div className="text-sm font-bold text-chart-2">{formatCurrency(cumulativeSimulation.usdtReceived)}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div className="bg-muted/50 rounded-md p-1.5 text-center">
                    <div className="text-[11px] text-muted-foreground">{language === "zh" ? "累计释放B18" : "Cumulative B18"}</div>
                    <div className="text-sm font-semibold">{formatTokens(cumulativeTokens)}</div>
                  </div>
                  <div className="bg-muted/50 rounded-md p-1.5 text-center">
                    <div className="text-[11px] text-muted-foreground">{language === "zh" ? "总周期净收" : "Period Total"}</div>
                    <div className="text-sm font-semibold">{formatCurrency(totalRelease)}</div>
                  </div>
                  <div className="bg-chart-1/10 rounded-md p-1.5 text-center">
                    <div className="text-[11px] text-muted-foreground">{language === "zh" ? "每日净收" : "Daily Net"}</div>
                    <div className="text-sm font-semibold text-chart-1">{formatCurrency(dailyRelease)}</div>
                  </div>
                </div>

                {/* 累计B18释放分配 */}
                <div className="text-[11px] text-muted-foreground text-center">{language === "zh" ? `累计B18分配: ${formatTokens(cumulativeTokens)} B18` : `Cumulative B18: ${formatTokens(cumulativeTokens)} B18`}</div>
                <div className="grid grid-cols-4 gap-1 text-[11px]">
                  <div className="bg-chart-3/10 rounded p-1 text-center">
                    <FileText className="h-2.5 w-2.5 mx-auto text-chart-3" />
                    <div className="font-semibold">{formatTokens(cumulativeSimulation.taxToDeliveryContract)}</div>
                    <div className="text-muted-foreground">50%</div>
                  </div>
                  <div className="bg-destructive/10 rounded p-1 text-center">
                    <Flame className="h-2.5 w-2.5 mx-auto text-destructive" />
                    <div className="font-semibold">{formatTokens(cumulativeSimulation.taxToBurn)}</div>
                    <div className="text-muted-foreground">20%</div>
                  </div>
                  <div className="bg-chart-4/10 rounded p-1 text-center">
                    <Gift className="h-2.5 w-2.5 mx-auto text-chart-4" />
                    <div className="font-semibold">{formatTokens(cumulativeSimulation.taxToBonusPool)}</div>
                    <div className="text-muted-foreground">20%</div>
                  </div>
                  <div className="bg-chart-1/10 rounded p-1 text-center">
                    <Landmark className="h-2.5 w-2.5 mx-auto text-chart-1" />
                    <div className="font-semibold">{formatTokens(cumulativeSimulation.taxToSellLP)}</div>
                    <div className="text-muted-foreground">10%</div>
                  </div>
                </div>
                
                {/* 税收买入SPP */}
                <div className="bg-chart-1/10 rounded-md p-1.5 text-center text-[11px]">
                  <div className="text-muted-foreground">{language === "zh" ? "累计税收USDC从LP买B18 → SPP" : "Cumulative Tax USDC → LP → SPP"}</div>
                  <div className="font-semibold">{formatCurrency(cumulativeSimulation.taxUsdc)} → {formatTokens(cumulativeSimulation.b18BoughtFromLP)} B18</div>
                  <div className="text-muted-foreground">{language === "zh" ? "SPP累计收" : "SPP Total"}: {formatTokens(cumulativeSimulation.sppB18Received)} B18</div>
                </div>

                <div className="bg-muted/30 rounded-md p-1.5 flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-2.5 w-2.5" />
                    {language === "zh" ? "累计价格影响" : "Cumulative Price Impact"}
                  </span>
                  <span className="font-semibold">{formatCurrency(tokenPrice)} → {formatCurrency(cumulativeSimulation.newPrice)} <Badge variant="outline" className="text-[11px] px-0.5 ml-0.5">+{formatPercent(cumulativeSimulation.priceImpact)}</Badge></span>
                </div>

                <div className={`rounded-md p-1.5 overflow-hidden ${isCashFlowSufficient ? 'bg-chart-2/10' : needsQueue ? 'bg-amber-500/10' : 'bg-destructive/10'}`} data-testid="status-cash-flow">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      {isCashFlowSufficient ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-chart-2 shrink-0" />
                      ) : needsQueue ? (
                        <Timer className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      )}
                      <span className="text-[11px] font-medium truncate" data-testid="text-cash-flow-status">
                        {isCashFlowSufficient
                          ? (language === "zh" ? '现金流充足' : 'OK')
                          : needsQueue
                          ? (language === "zh" ? '433协议' : '433')
                          : (language === "zh" ? '现金流不足' : 'Low')}
                      </span>
                    </div>
                    <Badge variant="outline" className={`text-[11px] px-0.5 shrink-0 ${needsQueue ? 'border-amber-500 text-amber-600' : ''}`} data-testid="badge-334">
                      433: {needsQueue ? (language === "zh" ? '启动' : 'On') : (language === "zh" ? '关' : 'Off')}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate" data-testid="text-cash-flow-details">
                    {language === "zh" ? "库" : "T"}: {formatCurrency(treasuryBalance)} | {language === "zh" ? "本次需" : "N"}: {formatCurrency(incrementalUsdcNeeded)}
                  </div>
                  {needsQueue && (
                    <div className="text-[11px] mt-1 pt-1 border-t border-amber-500/20">
                      <div className="flex justify-between text-amber-600">
                        <span>{language === "zh" ? "立即" : "Now"}: {formatCurrency(immediateWithdrawal)}</span>
                        <span>{language === "zh" ? "排队" : "Queue"}: {formatCurrency(queuedAmount)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 排队查看按钮 (移动端) */}
                {queuedWithdrawals.length > 0 && (
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setShowQueueDialog(true)}>
                    <ListOrdered className="h-3 w-3 mr-1" />
                    {language === "zh" ? `排队 ${queuedWithdrawals.length}笔` : `Queue ${queuedWithdrawals.length}`}
                  </Button>
                )}

                {needsQueue ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setShowSimulationDialog(false)}
                    >
                      {language === "zh" ? "取消" : "Cancel"}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-amber-500 hover:bg-amber-600"
                      onClick={() => handleConfirmRelease(true)}
                      disabled={!hasInvestment}
                      data-testid="button-confirm-release"
                    >
                      <Timer className="h-3.5 w-3.5 mr-1" />
                      {language === "zh" ? "部分+排队" : "Partial+Q"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => handleConfirmRelease(false)}
                    disabled={!hasInvestment || !isCashFlowSufficient}
                    data-testid="button-confirm-release"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    {!hasInvestment
                      ? (language === "zh" ? "需先在第1步投资" : "Invest first in Step 1")
                      : !isCashFlowSufficient
                      ? (language === "zh" ? "现金流不足" : "Low Cash Flow")
                      : t("release.confirmRelease")}
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* 排队提现Dialog (移动端) */}
          <Dialog open={showQueueDialog} onOpenChange={setShowQueueDialog}>
            <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl border-none shadow-2xl" aria-describedby="queue-dialog-description">
              <span id="queue-dialog-description" className="sr-only">
                {language === "zh" ? "排队提现列表" : "Queued withdrawals list"}
              </span>
              <div className="bg-amber-500 p-3 text-white">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-white text-base">
                    <ListOrdered className="h-4 w-4" />
                    {language === "zh" ? "排队提现" : "Queued Withdrawals"}
                  </DialogTitle>
                </DialogHeader>
              </div>
              <div className="p-3 max-h-[50vh] overflow-y-auto">
                {queuedWithdrawals.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>{language === "zh" ? "暂无排队" : "No queue"}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {queuedWithdrawals.map((withdrawal, idx) => (
                      <div key={withdrawal.id} className="rounded-lg p-2.5 border border-amber-500/20 bg-amber-500/5">
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <Badge variant="outline" className="border-amber-500 text-amber-600 text-[11px]">
                            #{idx + 1}
                          </Badge>
                          <span className="text-muted-foreground">
                            {language === "zh" ? `第${withdrawal.day}天` : `Day ${withdrawal.day}`}
                          </span>
                        </div>
                        <div className="font-bold text-amber-600">{formatCurrency(withdrawal.amount)}</div>
                      </div>
                    ))}
                    <div className="bg-muted/30 rounded-lg p-2.5 mt-3">
                      <div className="flex justify-between items-center text-sm">
                        <span>{language === "zh" ? "总额" : "Total"}</span>
                        <span className="font-bold text-amber-600">{formatCurrency(totalQueuedAmount)}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {language === "zh" ? "新订单资金充足时自动赎回" : "Auto-redeem on new order funds"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3 border-t">
                <Button size="sm" className="w-full" onClick={() => setShowQueueDialog(false)}>
                  {language === "zh" ? "关闭" : "Close"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

        <ReleaseHelpDialog
          open={showHelpDialog}
          onOpenChange={setShowHelpDialog}
          language={language}
        />
        </CardContent>
      </Card>
  );
}
