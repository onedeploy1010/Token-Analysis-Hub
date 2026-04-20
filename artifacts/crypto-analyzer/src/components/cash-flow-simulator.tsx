import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLanguage } from "@/contexts/language-context";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { UsageHelpDialog } from "./help-dialogs";
import { StepIndicator } from "@/components/ui/step-indicator";
import { LoadingButton, PrimaryActionButton, ClosePanelButton } from "@/components/ui/loading-button";
import { AnimatedCurrency, AnimatedPercent, AnimatedPrice } from "@/components/ui/animated-value";
import { ResultPages, HelpPages } from "@/components/ui/swipeable-pages";
import {
  Play,
  RefreshCw,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  Wallet,
  Shield,
  Percent,
  HelpCircle,
  BookOpen,
  Coins,
  ChevronRight,
  ChevronLeft,
  Check,
  Calendar,
  Users,
  Activity,
  ChevronDown,
  Settings2,
  X,
  Settings,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts";
import { formatTokens } from "@/lib/tokenomics";
import {
  defaultStaticReleaseTax,
  defaultSystemState,
  StaticReleaseTax,
  defaultTokenDistribution,
  AMM_SLIPPAGE,
} from "@shared/schema";

interface CashFlowSimulatorProps {
  tokenPrice?: number;
  treasuryBalance?: number;
  lpPoolTokens?: number;
  lpPoolUsdt?: number;
  vestingBalance?: number;
  circulatingSupply?: number;
  totalBurned?: number;
}

interface SimulationParams {
  simulationDays: number;
  initialDailyRevenue: number;
  revenueGrowthRate: number;
  basePressure: number;
  stakingRatio360: number;
  stakingRatio180: number;
  stakingRatio90: number;
  stakingRatio30: number;
  releaseRatio30: number;
  releaseRatio15: number;
  releaseRatio7: number;
  releaseRatio1: number;
}

interface DayResult {
  day: number;
  dailyRevenue: number;
  dailyRelease: number;
  dailyTax: number;
  taxToDelivery: number;
  taxToBurn: number;
  taxToBonusPool: number;
  taxUsdcToSpp: number;
  taxB18ToSpp: number;
  sppBuybackUsdc: number;
  sppBuybackB18: number;
  sppSellB18: number;
  sppSellUsdc: number;
  sppUsdcPool: number;
  sppB18Pool: number;
  tokenPrice: number;
  lpPoolTokens: number;
  lpPoolUsdt: number;
  treasuryBalance: number;
  cumulativeRevenue: number;
  cumulativeTax: number;
  withdrawalPressure: number;
  is433Triggered: boolean;
  queuedAmount: number;
  priceChange: number;
  priceChangePercent: number;
  treasuryChange: number;
  lpTokensChange: number;
  lpUsdtChange: number;
  sppUsdcChange: number;
  sppB18Change: number;
  netCashFlow: number;
}

function getTaxRateForReleaseDays(
  releaseDays: number, 
  taxRates: StaticReleaseTax[] = defaultStaticReleaseTax
): number {
  const taxConfig = taxRates.find(t => t.releaseDays === releaseDays);
  return taxConfig ? taxConfig.taxRate : taxRates[0]?.taxRate || 0.03;
}

export function CashFlowSimulator({
  tokenPrice: initialTokenPrice = defaultSystemState.tokenPrice,
  treasuryBalance: initialTreasury = defaultSystemState.treasuryBalance,
  lpPoolTokens: initialLpTokens = defaultSystemState.lpPoolTokens,
  lpPoolUsdt: initialLpUsdt = defaultSystemState.lpPoolUsdt,
  staticReleaseTax = defaultStaticReleaseTax,
}: CashFlowSimulatorProps & { staticReleaseTax?: StaticReleaseTax[] } = {}) {
  const { language } = useLanguage();
  const { isMobile, isDesktop } = useBreakpoint();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSimulating, setIsSimulating] = useState(false);
  const [direction, setDirection] = useState(0); // For step animation direction
  const [params, setParams] = useState<SimulationParams>({
    simulationDays: 90,
    initialDailyRevenue: 50000,
    revenueGrowthRate: 5.0,
    basePressure: 50,
    stakingRatio360: 30,
    stakingRatio180: 35,
    stakingRatio90: 25,
    stakingRatio30: 10,
    releaseRatio30: 40,
    releaseRatio15: 30,
    releaseRatio7: 20,
    releaseRatio1: 10,
  });
  
  const [results, setResults] = useState<DayResult[] | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState("price");
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [simulationMode, setSimulationMode] = useState<'basic' | 'orders'>('basic');

  // 多订单模式状态
  interface SimulatedOrder {
    id: number;
    enabled: boolean;
    investment: number;
    stakingDays: number;
    dailyRate: number;
    releaseDays: number;
    taxRate: number;
  }

  const createDefaultOrders = (): SimulatedOrder[] =>
    Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      enabled: i === 0,
      investment: i === 0 ? 1000 : 0,
      stakingDays: 90,
      dailyRate: 0.002,
      releaseDays: 30,
      taxRate: 0.03,
    }));

  const [simulatedOrders, setSimulatedOrders] = useState<SimulatedOrder[]>(createDefaultOrders);
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);

  const getDailyRateByStakingDays = (days: number) => {
    switch (days) {
      case 360: return 0.003;
      case 180: return 0.0025;
      case 90: return 0.002;
      case 30: return 0.0015;
      default: return 0.002;
    }
  };

  const getTaxRateByReleaseDays = (days: number) => {
    switch (days) {
      case 30: return 0.03;
      case 15: return 0.06;
      case 7: return 0.10;
      case 1: return 0.20;
      default: return 0.03;
    }
  };

  const updateOrder = (index: number, updates: Partial<SimulatedOrder>) => {
    setSimulatedOrders(prev => prev.map((order, i) =>
      i === index ? { ...order, ...updates } : order
    ));
  };

  const toggleOrderEnabled = (index: number) => {
    setSimulatedOrders(prev => prev.map((order, i) =>
      i === index ? { ...order, enabled: !order.enabled } : order
    ));
  };

  // 市场参数状态 - 使用传入的实时数据作为默认值
  const [marketParams, setMarketParams] = useState({
    tokenPrice: initialTokenPrice > 0 ? initialTokenPrice : defaultSystemState.tokenPrice,
    treasury: initialTreasury >= 0 ? initialTreasury : defaultSystemState.treasuryBalance,
    lpTokens: initialLpTokens > 0 ? initialLpTokens : defaultSystemState.lpPoolTokens,
    lpUsdc: initialLpUsdt > 0 ? initialLpUsdt : defaultSystemState.lpPoolUsdt,
  });

  // 同步外部传入的市场数据
  useEffect(() => {
    if (initialTokenPrice > 0) {
      setMarketParams(p => ({ ...p, tokenPrice: initialTokenPrice }));
    }
    if (initialTreasury >= 0) {
      setMarketParams(p => ({ ...p, treasury: initialTreasury }));
    }
    if (initialLpTokens > 0) {
      setMarketParams(p => ({ ...p, lpTokens: initialLpTokens }));
    }
    if (initialLpUsdt > 0) {
      setMarketParams(p => ({ ...p, lpUsdc: initialLpUsdt }));
    }
  }, [initialTokenPrice, initialTreasury, initialLpTokens, initialLpUsdt]);

  // 参数设置弹窗状态
  const [showParamsDialog, setShowParamsDialog] = useState(false);

  const ordersSummary = useMemo(() => {
    const enabledOrders = simulatedOrders.filter(o => o.enabled && o.investment > 0);
    const totalInvestment = enabledOrders.reduce((sum, o) => sum + o.investment, 0);
    const totalNetTokens = enabledOrders.reduce((sum, o) => {
      const tokensBought = o.investment / marketParams.tokenPrice;
      const interest = tokensBought * o.dailyRate * o.stakingDays;
      const total = tokensBought + interest;
      const tax = total * o.taxRate;
      return sum + (total - tax);
    }, 0);
    const totalValue = totalNetTokens * marketParams.tokenPrice;
    const roi = totalInvestment > 0 ? ((totalValue - totalInvestment) / totalInvestment) * 100 : 0;
    return { enabledCount: enabledOrders.length, totalInvestment, totalNetTokens, totalValue, roi };
  }, [simulatedOrders, marketParams.tokenPrice]);

  const calculateOrderRelease = (order: SimulatedOrder) => {
    if (!order.enabled || order.investment <= 0) return null;
    const tokensBought = order.investment / marketParams.tokenPrice;
    const totalInterest = tokensBought * order.dailyRate * order.stakingDays;
    const totalTokens = tokensBought + totalInterest;
    const taxAmount = totalTokens * order.taxRate;
    const netTokens = totalTokens - taxAmount;
    const dailyRelease = netTokens / order.releaseDays;
    return { tokensBought, totalInterest, totalTokens, taxAmount, netTokens, dailyRelease };
  };

  // SPP价格调控参数
  const [sppParams, setSppParams] = useState({
    // 买入参数（价格下跌时托底）
    buyPriceThreshold: -5,   // 价格下跌超过5%时买入
    buyRatio: 20,            // 每次使用国库20%USDC买入
    minBuyAmount: 1000,      // 最小买入金额USDC
    // 卖出参数（价格上涨时平抑）
    sellPriceThreshold: 10,  // 价格上涨超过10%时卖出
    sellRatio: 30,           // 每次卖出SPP池中30%的B18
    minSellAmount: 100,      // 最小卖出量B18
  });

  const steps = [
    { id: 1, icon: Calendar, label: language === "zh" ? "基础设置" : "Basic Setup", shortLabel: language === "zh" ? "基础" : "Basic" },
    { id: 2, icon: Users, label: language === "zh" ? "用户行为" : "User Behavior", shortLabel: language === "zh" ? "行为" : "User" },
    { id: 3, icon: Play, label: language === "zh" ? "运行模拟" : "Run", shortLabel: language === "zh" ? "运行" : "Run" },
  ];

  const weightedTaxRate = useMemo(() => {
    const r30 = params.releaseRatio30 / 100 * 0.03;
    const r15 = params.releaseRatio15 / 100 * 0.06;
    const r7 = params.releaseRatio7 / 100 * 0.10;
    const r1 = params.releaseRatio1 / 100 * 0.20;
    return r30 + r15 + r7 + r1;
  }, [params.releaseRatio30, params.releaseRatio15, params.releaseRatio7, params.releaseRatio1]);

  const weightedReleaseDays = useMemo(() => {
    const r30 = params.releaseRatio30 / 100 * 30;
    const r15 = params.releaseRatio15 / 100 * 15;
    const r7 = params.releaseRatio7 / 100 * 7;
    const r1 = params.releaseRatio1 / 100 * 1;
    return r30 + r15 + r7 + r1;
  }, [params.releaseRatio30, params.releaseRatio15, params.releaseRatio7, params.releaseRatio1]);

  const taxRate = weightedTaxRate || 0.03;
  const dailyReleaseRatio = 1 / (weightedReleaseDays || 30);

  // 计算订单模式下每天的释放量
  const calculateOrdersDailyRelease = (day: number, currentPrice: number) => {
    let totalDailyReleaseB18 = 0;
    let totalDailyRevenueUsdc = 0;

    const enabledOrders = simulatedOrders.filter(o => o.enabled && o.investment > 0);

    for (const order of enabledOrders) {
      const tokensBought = order.investment / marketParams.tokenPrice; // 按初始价格计算购买的B18
      const totalInterest = tokensBought * order.dailyRate * order.stakingDays;
      const totalTokens = tokensBought + totalInterest; // 本利和

      // 判断当前天数是否在该订单的释放期内
      // 释放开始日 = 质押天数 + 1
      // 释放结束日 = 质押天数 + 释放天数
      const releaseStartDay = order.stakingDays + 1;
      const releaseEndDay = order.stakingDays + order.releaseDays;

      if (day >= releaseStartDay && day <= releaseEndDay) {
        // 每日释放量 = 本利和 / 释放天数
        const dailyReleaseB18 = totalTokens / order.releaseDays;
        totalDailyReleaseB18 += dailyReleaseB18;
      }

      // 收入：投资当天50%进国库（简化为第1天统一计入）
      if (day === 1) {
        totalDailyRevenueUsdc += order.investment * 0.5;
      }
    }

    // 转换为USDC价值
    const dailyReleaseUsdc = totalDailyReleaseB18 * currentPrice;
    return { dailyReleaseB18: totalDailyReleaseB18, dailyReleaseUsdc, dailyRevenueUsdc: totalDailyRevenueUsdc };
  };

  const runSimulation = () => {
    const timeline: DayResult[] = [];

    const startingTreasury = marketParams.treasury;
    const startingLpTokens = marketParams.lpTokens;
    const startingLpUsdt = marketParams.lpUsdc;
    const startingTokenPrice = marketParams.tokenPrice;

    let currentTokenPrice = startingTokenPrice;
    let currentLpTokens = startingLpTokens;
    let currentLpUsdt = startingLpUsdt;
    let currentTreasury = startingTreasury;
    let currentSppUsdcPool = 0;
    let currentSppB18Pool = 0;

    let cumulativeRevenue = 0;
    let cumulativeTax = 0;
    let queuedAmount = 0;

    // SPP参数：价格阈值（基于初始价格的百分比）
    const sppBuyThreshold = startingTokenPrice * (1 + sppParams.buyPriceThreshold / 100);
    const sppBuyRatio = sppParams.buyRatio / 100;
    const sppMinBuyAmount = sppParams.minBuyAmount;
    const sppSellThreshold = startingTokenPrice * (1 + sppParams.sellPriceThreshold / 100);
    const sppSellRatio = sppParams.sellRatio / 100;
    const sppMinSellAmount = sppParams.minSellAmount;

    for (let day = 1; day <= params.simulationDays; day++) {
      let dailyRevenue: number;
      let dailyRelease: number;
      let dailyTax: number;

      if (simulationMode === 'orders') {
        // ========== 订单模式 ==========
        // 根据每笔订单的质押和释放周期计算
        const ordersData = calculateOrdersDailyRelease(day, currentTokenPrice);
        dailyRevenue = ordersData.dailyRevenueUsdc;
        dailyRelease = ordersData.dailyReleaseUsdc;
        // 税率根据加权平均释放天数
        dailyTax = dailyRelease * taxRate;
      } else {
        // ========== 基础模式 ==========
        // 按营业增长率计算
        dailyRevenue = params.initialDailyRevenue * Math.pow(1 + params.revenueGrowthRate / 100, day - 1);
        const pressureMultiplier = params.basePressure / 100;
        dailyRelease = dailyRevenue * dailyReleaseRatio * pressureMultiplier;
        dailyTax = dailyRelease * taxRate;
      }
      
      // ========== 6.1 税收USDC全部去LP买B18 → B18进SPP ==========
      // 税收USDC全部用于回购B18
      const taxUsdcToLP = dailyTax;  // 全部税收USDC去LP

      // ========== 6.2 释放B18分配 (使用统一配置 50/20/20/10) ==========
      // 释放的B18（税后口径 unlockB18）按比例分配
      // 注：这里用净释放USDC/价格得到释放B18数量
      const netRelease = dailyRelease - dailyTax;
      const releaseB18 = netRelease / currentTokenPrice;  // 释放的净USDC对应的B18
      const taxToDelivery = releaseB18 * defaultTokenDistribution.deliveryContract;   // 50% B18进交付合约
      const taxToBurn = releaseB18 * defaultTokenDistribution.burn;                   // 20% B18销毁
      const taxToBonusPool = releaseB18 * defaultTokenDistribution.bonusPool;         // 20% B18进奖励池
      const taxB18ToSppDirect = releaseB18 * defaultTokenDistribution.spp;            // 10% B18直接进SPP

      let tempLpTokens = currentLpTokens;
      let tempLpUsdt = currentLpUsdt;
      let k = tempLpTokens * tempLpUsdt;

      // 税收USDC去LP购买B18（带滑点，USDC进入LP，B18出来进SPP）→ 价格上涨
      let taxB18BoughtFromLP = 0;
      if (taxUsdcToLP > 0) {
        const effectiveUsdc = taxUsdcToLP * (1 - AMM_SLIPPAGE);  // 扣除滑点
        const newLpUsdtAfterTaxBuy = tempLpUsdt + effectiveUsdc;
        const newLpTokensAfterTaxBuy = k / newLpUsdtAfterTaxBuy;
        taxB18BoughtFromLP = tempLpTokens - newLpTokensAfterTaxBuy;

        tempLpUsdt = newLpUsdtAfterTaxBuy;
        tempLpTokens = newLpTokensAfterTaxBuy;
        k = tempLpTokens * tempLpUsdt;
      }

      let sppBuybackUsdc = 0;
      let sppBuybackB18 = 0;
      let sppSellB18 = 0;
      let sppSellUsdc = 0;

      // SPP收到B18来自两条流向:
      // 1. 税收USDC从LP买到的B18 (taxB18BoughtFromLP)
      // 2. 释放B18分配的10% (taxB18ToSppDirect)
      let newSppB18Pool = currentSppB18Pool + taxB18BoughtFromLP + taxB18ToSppDirect;
      let newSppUsdcPool = 0; // SPP不保留USDC，卖出获得的USDC直接进国库
      let sppUsdcToTreasury = 0; // 卖出获得的USDC转入国库

      const currentPrice = tempLpUsdt / tempLpTokens;

      // SPP买入逻辑：当价格低于阈值时，使用国库USDC买入B18托底
      if (currentPrice < sppBuyThreshold && currentTreasury >= sppMinBuyAmount) {
        // 计算买入金额
        sppBuybackUsdc = Math.min(currentTreasury * sppBuyRatio, currentTreasury);

        // 确保不低于最小买入金额
        if (sppBuybackUsdc < sppMinBuyAmount) {
          sppBuybackUsdc = Math.min(sppMinBuyAmount, currentTreasury);
        }

        if (sppBuybackUsdc > 0) {
          const newLpUsdtAfterBuy = tempLpUsdt + sppBuybackUsdc;
          const newLpTokensAfterBuy = k / newLpUsdtAfterBuy;
          sppBuybackB18 = tempLpTokens - newLpTokensAfterBuy;

          tempLpUsdt = newLpUsdtAfterBuy;
          tempLpTokens = newLpTokensAfterBuy;
          k = tempLpTokens * tempLpUsdt;

          newSppB18Pool += sppBuybackB18;  // 买入的B18进入SPP
          currentTreasury -= sppBuybackUsdc;  // 从国库扣除USDC
        }
      }

      // 重新计算当前价格（买入后可能变化）
      const priceAfterBuy = tempLpUsdt / tempLpTokens;

      // SPP卖出逻辑：当价格超过阈值时，按比例卖出B18
      if (priceAfterBuy > sppSellThreshold && newSppB18Pool >= sppMinSellAmount) {
        // 根据设定比例卖出
        sppSellB18 = newSppB18Pool * sppSellRatio;

        // 确保不低于最小卖出量
        if (sppSellB18 < sppMinSellAmount) {
          sppSellB18 = Math.min(sppMinSellAmount, newSppB18Pool);
        }

        if (sppSellB18 > 0) {
          const newLpTokensAfterSell = tempLpTokens + sppSellB18;
          const newLpUsdtAfterSell = k / newLpTokensAfterSell;
          sppSellUsdc = tempLpUsdt - newLpUsdtAfterSell;

          tempLpTokens = newLpTokensAfterSell;
          tempLpUsdt = newLpUsdtAfterSell;
          k = tempLpTokens * tempLpUsdt;

          newSppB18Pool -= sppSellB18;
          // SPP卖出获得的USDC直接进入国库，不保留在SPP
          sppUsdcToTreasury = sppSellUsdc;
        }
      }
      
      const newTokenPrice = tempLpUsdt / tempLpTokens;

      // netRelease 已在前面计算: netRelease = dailyRelease - dailyTax
      const treasuryInflow = dailyRevenue * 0.5 + sppUsdcToTreasury; // 国库流入 = 50%收入 + SPP卖出所得USDC
      const withdrawalPressure = treasuryInflow > 0 ? (netRelease / treasuryInflow) * 100 : 100;

      // 433保护：国库不足时触发
      const is433Triggered = currentTreasury + treasuryInflow < netRelease;

      let actualPayout = netRelease;
      if (is433Triggered) {
        actualPayout = (currentTreasury + treasuryInflow) * 0.3;
        queuedAmount += (netRelease - actualPayout);
      } else {
        const canPayFromQueue = Math.min(queuedAmount, currentTreasury + treasuryInflow - netRelease);
        if (canPayFromQueue > 0) {
          actualPayout += canPayFromQueue;
          queuedAmount -= canPayFromQueue;
        }
      }

      const newTreasury = Math.max(0, currentTreasury + treasuryInflow - actualPayout);
      
      cumulativeRevenue += dailyRevenue;
      cumulativeTax += dailyTax;
      
      const priceChange = newTokenPrice - currentTokenPrice;
      const priceChangePercent = currentTokenPrice > 0 ? (priceChange / currentTokenPrice) * 100 : 0;
      const treasuryChange = newTreasury - currentTreasury;
      const lpTokensChange = tempLpTokens - currentLpTokens;
      const lpUsdtChange = tempLpUsdt - currentLpUsdt;
      const sppUsdcChange = newSppUsdcPool - currentSppUsdcPool;
      const sppB18Change = newSppB18Pool - currentSppB18Pool;
      const netCashFlow = treasuryInflow - actualPayout;
      
      timeline.push({
        day,
        dailyRevenue,
        dailyRelease,
        dailyTax,
        taxToDelivery,
        taxToBurn,
        taxToBonusPool,
        taxUsdcToSpp: taxUsdcToLP, // 税收USDC全部用于LP购买B18
        taxB18ToSpp: taxB18BoughtFromLP + taxB18ToSppDirect, // SPP收到的B18总量 = LP买到 + 释放分配10%
        sppBuybackUsdc,
        sppBuybackB18,
        sppSellB18,
        sppSellUsdc,
        sppUsdcPool: newSppUsdcPool,
        sppB18Pool: newSppB18Pool,
        tokenPrice: newTokenPrice,
        lpPoolTokens: tempLpTokens,
        lpPoolUsdt: tempLpUsdt,
        treasuryBalance: newTreasury,
        cumulativeRevenue,
        cumulativeTax,
        withdrawalPressure,
        is433Triggered,
        queuedAmount,
        priceChange,
        priceChangePercent,
        treasuryChange,
        lpTokensChange,
        lpUsdtChange,
        sppUsdcChange,
        sppB18Change,
        netCashFlow,
      });
      
      currentTokenPrice = newTokenPrice;
      currentLpTokens = tempLpTokens;
      currentLpUsdt = tempLpUsdt;
      currentTreasury = newTreasury;
      currentSppUsdcPool = newSppUsdcPool;
      currentSppB18Pool = newSppB18Pool;
    }
    
    // 模拟短暂延迟以显示loading动画
    setIsSimulating(true);
    setTimeout(() => {
      setResults(timeline);
      setShowResults(true);
      setIsSimulating(false);
    }, 500);
  };

  const resetSimulation = () => {
    setParams({
      simulationDays: 90,
      initialDailyRevenue: 50000,
      revenueGrowthRate: 5.0,
      basePressure: 50,
      stakingRatio360: 30,
      stakingRatio180: 35,
      stakingRatio90: 25,
      stakingRatio30: 10,
      releaseRatio30: 40,
      releaseRatio15: 30,
      releaseRatio7: 20,
      releaseRatio1: 10,
    });
    setMarketParams({
      tokenPrice: initialTokenPrice > 0 ? initialTokenPrice : defaultSystemState.tokenPrice,
      treasury: initialTreasury >= 0 ? initialTreasury : defaultSystemState.treasuryBalance,
      lpTokens: initialLpTokens > 0 ? initialLpTokens : defaultSystemState.lpPoolTokens,
      lpUsdc: initialLpUsdt > 0 ? initialLpUsdt : defaultSystemState.lpPoolUsdt,
    });
    setSppParams({
      buyPriceThreshold: -5,
      buyRatio: 20,
      minBuyAmount: 1000,
      sellPriceThreshold: 10,
      sellRatio: 30,
      minSellAmount: 100,
    });
    setResults(null);
    setShowResults(false);
    setCurrentStep(1);
  };

  type StakingRatioKey = 'stakingRatio360' | 'stakingRatio180' | 'stakingRatio90' | 'stakingRatio30';
  const normalizeStakingRatios = (key: StakingRatioKey, value: number) => {
    const allKeys: StakingRatioKey[] = ['stakingRatio360', 'stakingRatio180', 'stakingRatio90', 'stakingRatio30'];
    const otherKeys = allKeys.filter(k => k !== key);
    const otherTotal = otherKeys.reduce((sum, k) => sum + params[k], 0);
    
    if (otherTotal > 0) {
      const scale = Math.max(0, (100 - value)) / otherTotal;
      const newValues: Record<string, number> = { [key]: value };
      let remaining = 100 - value;
      otherKeys.forEach((k, i) => {
        if (i === otherKeys.length - 1) {
          newValues[k] = Math.max(0, remaining);
        } else {
          const v = Math.round(params[k] * scale);
          newValues[k] = v;
          remaining -= v;
        }
      });
      setParams(p => ({ ...p, ...newValues }));
    } else {
      setParams(p => ({ ...p, [key]: value }));
    }
  };

  const normalizeReleaseRatios = (key: 'releaseRatio30' | 'releaseRatio15' | 'releaseRatio7' | 'releaseRatio1', value: number) => {
    const otherKeys = ['releaseRatio30', 'releaseRatio15', 'releaseRatio7', 'releaseRatio1'].filter(k => k !== key) as ('releaseRatio30' | 'releaseRatio15' | 'releaseRatio7' | 'releaseRatio1')[];
    const otherTotal = otherKeys.reduce((sum, k) => sum + params[k], 0);

    if (otherTotal > 0) {
      const scale = Math.max(0, (100 - value)) / otherTotal;
      const newValues: Record<string, number> = { [key]: value };
      let remaining = 100 - value;
      otherKeys.forEach((k, i) => {
        if (i === otherKeys.length - 1) {
          newValues[k] = Math.max(0, remaining);
        } else {
          const v = Math.round(params[k] * scale);
          newValues[k] = v;
          remaining -= v;
        }
      });
      setParams(p => ({ ...p, ...newValues }));
    } else {
      setParams(p => ({ ...p, [key]: value }));
    }
  };

  const summary = useMemo(() => {
    if (!results || results.length === 0) return null;
    const last = results[results.length - 1];
    const triggeredDays = results.filter(r => r.is433Triggered).length;
    const maxPressure = Math.max(...results.map(r => r.withdrawalPressure));
    const avgPressure = results.reduce((sum, r) => sum + r.withdrawalPressure, 0) / results.length;
    
    const effectiveStartPrice = marketParams.tokenPrice;
    
    const totalTaxB18Bought = results.reduce((sum, r) => sum + (r.taxB18ToSpp || 0), 0);
    const totalTaxUsdcUsed = results.reduce((sum, r) => sum + (r.taxUsdcToSpp || 0), 0);
    const totalSppSellB18 = results.reduce((sum, r) => sum + r.sppSellB18, 0);
    const totalSppSellUsdc = results.reduce((sum, r) => sum + r.sppSellUsdc, 0);
    const totalWithdrawals = results.reduce((sum, r) => sum + r.dailyRelease, 0);

    return {
      finalPrice: last.tokenPrice,
      startPrice: effectiveStartPrice,
      endPrice: last.tokenPrice,
      priceChange: ((last.tokenPrice - effectiveStartPrice) / effectiveStartPrice) * 100,
      priceChangePercent: ((last.tokenPrice - effectiveStartPrice) / effectiveStartPrice) * 100,
      totalRevenue: last.cumulativeRevenue,
      totalTax: last.cumulativeTax,
      totalWithdrawals,
      endTreasury: last.treasuryBalance,
      finalSppUsdcPool: 0,
      finalSppB18Pool: last.sppB18Pool,
      finalTreasury: last.treasuryBalance,
      avgDailyRevenue: last.cumulativeRevenue / results.length,
      triggeredDays,
      triggerDays: triggeredDays,
      maxPressure,
      avgPressure,
      finalQueuedAmount: last.queuedAmount,
      taxB18Bought: totalTaxB18Bought,
      taxUsdcUsed: totalTaxUsdcUsed,
      sppSellB18: totalSppSellB18,
      sppSellUsdc: totalSppSellUsdc,
    };
  }, [results, marketParams.tokenPrice]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  const nextStep = () => {
    if (currentStep < 3) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= 3) {
      setDirection(step > currentStep ? 1 : -1);
      setCurrentStep(step);
    }
  };

  // 步骤切换动画变体
  const stepVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <div className="nav-gradient w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2">
          <Calendar className="h-6 w-6 text-white" />
        </div>
        <h3 className="font-semibold text-base">{language === "zh" ? "基础设置" : "Basic Setup"}</h3>
        <p className="text-xs text-muted-foreground">{language === "zh" ? "设置模拟周期和收入参数" : "Set simulation period and revenue"}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm flex items-center justify-between">
            <span>{language === "zh" ? "模拟天数" : "Simulation Days"}</span>
            <Badge variant="secondary">{params.simulationDays}{language === "zh" ? "天" : "d"}</Badge>
          </Label>
          <Slider 
            value={[params.simulationDays]} 
            onValueChange={([v]) => setParams(p => ({ ...p, simulationDays: v }))} 
            min={30} max={360} step={30} 
            data-testid="slider-sim-days" 
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>30{language === "zh" ? "天" : "d"}</span>
            <span>180{language === "zh" ? "天" : "d"}</span>
            <span>360{language === "zh" ? "天" : "d"}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm flex items-center justify-between">
            <span>{language === "zh" ? "日营业额" : "Daily Revenue"}</span>
            <Badge variant="secondary">{formatCurrency(params.initialDailyRevenue)}</Badge>
          </Label>
          <Slider 
            value={[params.initialDailyRevenue]} 
            onValueChange={([v]) => setParams(p => ({ ...p, initialDailyRevenue: v }))} 
            min={10000} max={500000} step={10000} 
            data-testid="slider-revenue" 
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>$10K</span>
            <span>$250K</span>
            <span>$500K</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm flex items-center justify-between">
            <span>{language === "zh" ? "日增长率" : "Daily Growth Rate"}</span>
            <Badge variant="secondary">{params.revenueGrowthRate.toFixed(1)}%</Badge>
          </Label>
          <Slider 
            value={[params.revenueGrowthRate * 10]} 
            onValueChange={([v]) => setParams(p => ({ ...p, revenueGrowthRate: v / 10 }))} 
            min={0} max={100} step={5} 
            data-testid="slider-growth" 
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0%</span>
            <span>5%</span>
            <span>10%</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const currentOrder = simulatedOrders[currentOrderIndex];
    const orderRelease = calculateOrderRelease(currentOrder);

    return (
      <div className="space-y-4">
        <div className="text-center mb-3">
          <div className="nav-gradient w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2">
            <Users className="h-6 w-6 text-white" />
          </div>
          <h3 className="font-semibold text-base">{language === "zh" ? "用户行为" : "User Behavior"}</h3>
          <p className="text-sm text-muted-foreground">{language === "zh" ? "选择模拟模式" : "Choose simulation mode"}</p>
        </div>

        {/* 模式切换 */}
        <div className="flex gap-2 p-1 bg-muted/50 rounded-lg">
          <Button
            variant={simulationMode === 'basic' ? "default" : "ghost"}
            className="flex-1 h-9 text-sm"
            onClick={() => setSimulationMode('basic')}
          >
            {language === "zh" ? "基础模式" : "Basic Mode"}
          </Button>
          <Button
            variant={simulationMode === 'orders' ? "default" : "ghost"}
            className="flex-1 h-9 text-sm"
            onClick={() => setSimulationMode('orders')}
          >
            {language === "zh" ? "订单模式" : "Orders Mode"}
          </Button>
        </div>

        {simulationMode === 'basic' ? (
          <>
            {/* 基础模式 - 提现压力 */}
            <div className="space-y-3">
              <Label className="text-sm flex items-center justify-between">
                <span>{language === "zh" ? "提现压力" : "Withdrawal Pressure"}</span>
                <Badge variant="secondary" className="text-sm">{params.basePressure}%</Badge>
              </Label>
              <Slider
                value={[params.basePressure]}
                onValueChange={([v]) => setParams(p => ({ ...p, basePressure: v }))}
                min={0} max={100} step={5}
                data-testid="slider-pressure"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{language === "zh" ? "低" : "Low"}</span>
                <span>{language === "zh" ? "中" : "Medium"}</span>
                <span>{language === "zh" ? "高" : "High"}</span>
              </div>
            </div>

            {/* 质押分布 */}
            <Collapsible open={expandedSection === "staking"} onOpenChange={(open) => setExpandedSection(open ? "staking" : null)}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-10 text-sm">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {language === "zh" ? "质押天数分布" : "Staking Distribution"}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{language === "zh" ? "平均" : "Avg"} {Math.round(params.stakingRatio360 * 3.6 + params.stakingRatio180 * 1.8 + params.stakingRatio90 * 0.9 + params.stakingRatio30 * 0.3)}{language === "zh" ? "天" : "d"}</Badge>
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedSection === "staking" ? "rotate-180" : ""}`} />
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                {[
                  { key: 'stakingRatio360' as const, days: 360, rate: '0.30%' },
                  { key: 'stakingRatio180' as const, days: 180, rate: '0.25%' },
                  { key: 'stakingRatio90' as const, days: 90, rate: '0.20%' },
                  { key: 'stakingRatio30' as const, days: 30, rate: '0.15%' },
                ].map(({ key, days, rate }) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{days}{language === "zh" ? "天" : "d"} ({rate})</span>
                      <Badge variant="secondary">{params[key]}%</Badge>
                    </div>
                    <Slider
                      value={[params[key]]}
                      onValueChange={([v]) => normalizeStakingRatios(key, v)}
                      min={0} max={100} step={5}
                    />
                  </div>
                ))}
                <div className="text-sm text-center text-muted-foreground pt-2 border-t">
                  {language === "zh" ? "总计" : "Total"}: {params.stakingRatio360 + params.stakingRatio180 + params.stakingRatio90 + params.stakingRatio30}%
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* 释放分布 */}
            <Collapsible open={expandedSection === "release"} onOpenChange={(open) => setExpandedSection(open ? "release" : null)}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-10 text-sm">
                  <span className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    {language === "zh" ? "释放天数分布" : "Release Distribution"}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{language === "zh" ? "税率" : "Tax"} {(weightedTaxRate * 100).toFixed(1)}%</Badge>
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedSection === "release" ? "rotate-180" : ""}`} />
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                {[
                  { key: 'releaseRatio30' as const, days: 30, tax: 3 },
                  { key: 'releaseRatio15' as const, days: 15, tax: 6 },
                  { key: 'releaseRatio7' as const, days: 7, tax: 10 },
                  { key: 'releaseRatio1' as const, days: 1, tax: 20 },
                ].map(({ key, days, tax }) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{days}{language === "zh" ? "天" : "d"} ({language === "zh" ? "税" : "Tax"} {tax}%)</span>
                      <Badge variant="secondary">{params[key]}%</Badge>
                    </div>
                    <Slider
                      value={[params[key]]}
                      onValueChange={([v]) => normalizeReleaseRatios(key, v)}
                      min={0} max={100} step={5}
                    />
                  </div>
                ))}
                <div className="text-sm text-center text-muted-foreground pt-2 border-t">
                  {language === "zh" ? "加权释放" : "Weighted"}: {weightedReleaseDays.toFixed(1)}{language === "zh" ? "天" : "d"} | {language === "zh" ? "税率" : "Tax"}: {(weightedTaxRate * 100).toFixed(1)}%
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        ) : (
          <>
            {/* 订单模式 - 订单汇总 */}
            <div className="bg-chart-2/10 rounded-lg p-3 border border-chart-2/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{language === "zh" ? "订单汇总" : "Orders Summary"}</span>
                <Badge variant="secondary" className="text-sm">{ordersSummary.enabledCount}/10 {language === "zh" ? "启用" : "active"}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "总投资" : "Invest"}</div>
                  <div className="text-base font-bold text-chart-2">{formatCurrency(ordersSummary.totalInvestment)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{language === "zh" ? "净B18" : "Net B18"}</div>
                  <div className="text-base font-bold">{formatTokens(ordersSummary.totalNetTokens)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">ROI</div>
                  <div className={`text-base font-bold ${ordersSummary.roi >= 0 ? "text-chart-2" : "text-destructive"}`}>
                    {ordersSummary.roi >= 0 ? "+" : ""}{ordersSummary.roi.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* 圆点导航 */}
            <div className="flex justify-center gap-2">
              {simulatedOrders.map((order, index) => (
                <motion.button
                  key={order.id}
                  onClick={() => setCurrentOrderIndex(index)}
                  className={`w-4 h-4 rounded-full transition-all ${
                    index === currentOrderIndex
                      ? "bg-primary scale-125"
                      : order.enabled && order.investment > 0
                      ? "bg-chart-2"
                      : "bg-muted-foreground/30"
                  }`}
                  whileTap={{ scale: 0.8 }}
                  title={`${language === "zh" ? "订单" : "Order"} ${order.id}`}
                />
              ))}
            </div>

            {/* 当前订单编辑 */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-3 border border-border/50">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">
                  {language === "zh" ? `订单 #${currentOrder.id}` : `Order #${currentOrder.id}`}
                </span>
                <Button
                  variant={currentOrder.enabled ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-sm"
                  onClick={() => toggleOrderEnabled(currentOrderIndex)}
                >
                  {currentOrder.enabled ? (language === "zh" ? "已启用" : "Enabled") : (language === "zh" ? "已禁用" : "Disabled")}
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-sm flex items-center justify-between">
                  <span>{language === "zh" ? "投资金额" : "Investment"} USDC</span>
                  <Badge variant="secondary" className="text-sm">{formatCurrency(currentOrder.investment)}</Badge>
                </Label>
                <Slider
                  value={[currentOrder.investment]}
                  onValueChange={([v]) => updateOrder(currentOrderIndex, { investment: v })}
                  min={0} max={50000} step={100}
                  disabled={!currentOrder.enabled}
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>$0</span>
                  <span>$25K</span>
                  <span>$50K</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">{language === "zh" ? "质押" : "Stake"}</Label>
                  <div className="flex gap-1">
                    {[30, 90, 180, 360].map(days => (
                      <Button
                        key={days}
                        variant={currentOrder.stakingDays === days ? "default" : "outline"}
                        size="sm"
                        className="flex-1 h-8 text-sm px-1"
                        disabled={!currentOrder.enabled}
                        onClick={() => updateOrder(currentOrderIndex, {
                          stakingDays: days,
                          dailyRate: getDailyRateByStakingDays(days)
                        })}
                      >
                        {days}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{language === "zh" ? "释放" : "Release"}</Label>
                  <div className="flex gap-1">
                    {[1, 7, 15, 30].map(days => (
                      <Button
                        key={days}
                        variant={currentOrder.releaseDays === days ? "default" : "outline"}
                        size="sm"
                        className="flex-1 h-8 text-sm px-1"
                        disabled={!currentOrder.enabled}
                        onClick={() => updateOrder(currentOrderIndex, {
                          releaseDays: days,
                          taxRate: getTaxRateByReleaseDays(days)
                        })}
                      >
                        {days}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 订单释放预览 */}
              {orderRelease && (
                <div className="bg-background/60 rounded-lg p-2.5 space-y-2 border border-border/30">
                  <div className="text-sm font-medium text-muted-foreground">{language === "zh" ? "释放预览" : "Release Preview"}</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === "zh" ? "购入" : "Bought"}</span>
                      <span className="font-mono">{formatTokens(orderRelease.tokensBought)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === "zh" ? "利息" : "Interest"}</span>
                      <span className="font-mono text-chart-2">+{formatTokens(orderRelease.totalInterest)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === "zh" ? "税收" : "Tax"} ({(currentOrder.taxRate * 100).toFixed(0)}%)</span>
                      <span className="font-mono text-destructive">-{formatTokens(orderRelease.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === "zh" ? "净得" : "Net"}</span>
                      <span className="font-mono font-bold">{formatTokens(orderRelease.netTokens)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <div className="nav-gradient w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2">
          <Play className="h-6 w-6 text-white" />
        </div>
        <h3 className="font-semibold text-base">{language === "zh" ? "运行模拟" : "Run Simulation"}</h3>
        <p className="text-sm text-muted-foreground">{language === "zh" ? "确认参数并开始模拟" : "Confirm parameters and start simulation"}</p>
      </div>

      <div className="bg-muted/30 rounded-lg p-3 space-y-2">
        <div className="text-sm font-medium text-muted-foreground mb-1">{language === "zh" ? "基础参数" : "Basic Parameters"}</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-sm text-muted-foreground">{language === "zh" ? "模拟周期" : "Period"}</div>
            <div className="font-bold text-base">{params.simulationDays}{language === "zh" ? "天" : "d"}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{language === "zh" ? "日营业额" : "Revenue"}</div>
            <div className="font-bold text-base">{formatCurrency(params.initialDailyRevenue)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{language === "zh" ? "增长率" : "Growth"}</div>
            <div className="font-bold text-base">{params.revenueGrowthRate}%</div>
          </div>
        </div>
        <div className="border-t border-border/50 pt-2 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-sm text-muted-foreground">{language === "zh" ? "提现压力" : "Pressure"}</div>
            <div className="font-bold text-base">{params.basePressure}%</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{language === "zh" ? "加权释放" : "Release"}</div>
            <div className="font-bold text-base">{weightedReleaseDays.toFixed(0)}d</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{language === "zh" ? "加权税率" : "Tax"}</div>
            <div className="font-bold text-base">{(weightedTaxRate * 100).toFixed(1)}%</div>
          </div>
        </div>
        {/* 当前系统状态显示 */}
        <div className="border-t border-border/50 pt-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-1">
            <Activity className="h-4 w-4" />
            {language === "zh" ? "当前系统状态" : "Current System State"}
          </div>
          <div className="grid grid-cols-4 gap-1 text-center">
            <div>
              <div className="text-xs text-muted-foreground">{language === "zh" ? "价格" : "Price"}</div>
              <div className="font-bold text-sm text-chart-1">${marketParams.tokenPrice.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{language === "zh" ? "国库" : "Treasury"}</div>
              <div className="font-bold text-sm">{formatCurrency(marketParams.treasury)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">LP B18</div>
              <div className="font-bold text-sm">{formatTokens(marketParams.lpTokens)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">LP USDC</div>
              <div className="font-bold text-sm">{formatCurrency(marketParams.lpUsdc)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 市场参数设置 - 可编辑 */}
      <Collapsible open={expandedSection === "market"} onOpenChange={(open) => setExpandedSection(open ? "market" : null)}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between h-10" data-testid="button-expand-market">
            <span className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              {language === "zh" ? "市场初始参数" : "Market Parameters"}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs h-6">${marketParams.tokenPrice.toFixed(2)}</Badge>
              <ChevronDown className={`h-4 w-4 transition-transform ${expandedSection === "market" ? "rotate-180" : ""}`} />
            </div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-sm">{language === "zh" ? "代币价格" : "Token Price"}</Label>
              <Input
                type="number"
                value={marketParams.tokenPrice}
                onChange={(e) => setMarketParams(p => ({ ...p, tokenPrice: Math.max(0.01, Number(e.target.value)) }))}
                className="h-10 text-base"
                step="0.01"
                min="0.01"
                data-testid="input-market-price"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">{language === "zh" ? "国库余额" : "Treasury"}</Label>
              <Input
                type="number"
                value={marketParams.treasury}
                onChange={(e) => setMarketParams(p => ({ ...p, treasury: Math.max(0, Number(e.target.value)) }))}
                className="h-10 text-base"
                step="10000"
                min="0"
                data-testid="input-market-treasury"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">LP B18</Label>
              <Input
                type="number"
                value={marketParams.lpTokens}
                onChange={(e) => setMarketParams(p => ({ ...p, lpTokens: Math.max(1, Number(e.target.value)) }))}
                className="h-10 text-base"
                step="1000"
                min="1"
                data-testid="input-market-lp-tokens"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">LP USDC</Label>
              <Input
                type="number"
                value={marketParams.lpUsdc}
                onChange={(e) => setMarketParams(p => ({ ...p, lpUsdc: Math.max(1, Number(e.target.value)) }))}
                className="h-10 text-base"
                step="1000"
                min="1"
                data-testid="input-market-lp-usdc"
              />
            </div>
          </div>
          <div className="text-sm text-muted-foreground text-center">
            {language === "zh" ? "LP价格" : "LP Price"}: ${(marketParams.lpUsdc / marketParams.lpTokens).toFixed(4)}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* SPP价格调控参数设置 */}
      <Collapsible open={expandedSection === "spp"} onOpenChange={(open) => setExpandedSection(open ? "spp" : null)}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between h-10" data-testid="button-expand-spp-params">
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {language === "zh" ? "SPP价格调控" : "SPP Price Control"}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs h-6 text-chart-2">{sppParams.buyPriceThreshold}%</Badge>
              <Badge variant="outline" className="text-xs h-6 text-chart-4">+{sppParams.sellPriceThreshold}%</Badge>
              <ChevronDown className={`h-4 w-4 transition-transform ${expandedSection === "spp" ? "rotate-180" : ""}`} />
            </div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          {/* 买入参数 - 价格下跌时托底 */}
          <div className="bg-chart-2/10 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-medium text-chart-2">
              <TrendingUp className="h-4 w-4 rotate-180" />
              {language === "zh" ? "托底买入（价格下跌时）" : "Support Buy (Price Down)"}
            </div>
            <div className="space-y-2">
              <Label className="text-sm flex items-center justify-between">
                <span>{language === "zh" ? "买入阈值" : "Buy Threshold"}</span>
                <Badge variant="secondary" className="text-sm text-chart-2">{sppParams.buyPriceThreshold}%</Badge>
              </Label>
              <Slider
                value={[Math.abs(sppParams.buyPriceThreshold)]}
                onValueChange={([v]) => setSppParams(p => ({ ...p, buyPriceThreshold: -v }))}
                min={1} max={30} step={1}
                data-testid="slider-spp-buy-threshold"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">{language === "zh" ? "买入比例" : "Buy Ratio"}</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[sppParams.buyRatio]}
                    onValueChange={([v]) => setSppParams(p => ({ ...p, buyRatio: v }))}
                    min={5} max={50} step={5}
                    className="flex-1"
                    data-testid="slider-spp-buy-ratio"
                  />
                  <span className="text-sm w-10 text-right font-mono">{sppParams.buyRatio}%</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">{language === "zh" ? "最小买入" : "Min Buy"}</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[sppParams.minBuyAmount]}
                    onValueChange={([v]) => setSppParams(p => ({ ...p, minBuyAmount: v }))}
                    min={100} max={10000} step={100}
                    className="flex-1"
                    data-testid="slider-spp-min-buy"
                  />
                  <span className="text-sm w-12 text-right font-mono">${(sppParams.minBuyAmount / 1000).toFixed(1)}K</span>
                </div>
              </div>
            </div>
          </div>

          {/* 卖出参数 - 价格上涨时平抑 */}
          <div className="bg-chart-4/10 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-medium text-chart-4">
              <TrendingUp className="h-4 w-4" />
              {language === "zh" ? "平抑卖出（价格上涨时）" : "Suppress Sell (Price Up)"}
            </div>
            <div className="space-y-2">
              <Label className="text-sm flex items-center justify-between">
                <span>{language === "zh" ? "卖出阈值" : "Sell Threshold"}</span>
                <Badge variant="secondary" className="text-sm text-chart-4">+{sppParams.sellPriceThreshold}%</Badge>
              </Label>
              <Slider
                value={[sppParams.sellPriceThreshold]}
                onValueChange={([v]) => setSppParams(p => ({ ...p, sellPriceThreshold: v }))}
                min={5} max={50} step={5}
                data-testid="slider-spp-sell-threshold"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">{language === "zh" ? "卖出比例" : "Sell Ratio"}</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[sppParams.sellRatio]}
                    onValueChange={([v]) => setSppParams(p => ({ ...p, sellRatio: v }))}
                    min={10} max={100} step={10}
                    className="flex-1"
                    data-testid="slider-spp-sell-ratio"
                  />
                  <span className="text-sm w-10 text-right font-mono">{sppParams.sellRatio}%</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">{language === "zh" ? "最小卖出" : "Min Sell"}</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[sppParams.minSellAmount]}
                    onValueChange={([v]) => setSppParams(p => ({ ...p, minSellAmount: v }))}
                    min={10} max={1000} step={10}
                    className="flex-1"
                    data-testid="slider-spp-min-sell"
                  />
                  <span className="text-sm w-12 text-right font-mono">{sppParams.minSellAmount}</span>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* 订单释放影响 - 仅在订单模式下显示 */}
      {simulationMode === 'orders' && ordersSummary.enabledCount > 0 && (
        <div className="bg-chart-2/10 rounded-lg p-3 border border-chart-2/20">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="h-4 w-4 text-chart-2" />
            <span className="font-medium text-sm">{language === "zh" ? "订单释放影响" : "Orders Release Impact"}</span>
          </div>
          <div className="text-sm text-muted-foreground mb-2">
            {language === "zh"
              ? `${ordersSummary.enabledCount}笔订单将在质押期满后释放，影响币价`
              : `${ordersSummary.enabledCount} orders will release after staking, affecting price`}
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-background/50 rounded p-2">
              <div className="text-sm text-muted-foreground">{language === "zh" ? "总投资" : "Total Invest"}</div>
              <div className="text-base font-bold text-chart-2">{formatCurrency(ordersSummary.totalInvestment)}</div>
            </div>
            <div className="bg-background/50 rounded p-2">
              <div className="text-sm text-muted-foreground">{language === "zh" ? "净收益B18" : "Est. Net B18"}</div>
              <div className="text-base font-bold">{formatTokens(ordersSummary.totalNetTokens)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-chart-1/10 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-chart-1" />
          <span className="font-medium text-sm">{language === "zh" ? "433合约保护" : "433 Protection"}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          {language === "zh" ? "当国库<需求时触发，仅兑付30%，70%进入LIFO队列" : "Triggers when treasury < demand, only 30% paid, 70% queued"}
        </div>
      </div>

      <PrimaryActionButton
        onClick={runSimulation}
        loading={isSimulating}
        loadingText={language === "zh" ? "模拟中..." : "Simulating..."}
        icon={<Play className="h-5 w-5" />}
        fullWidth
        data-testid="button-run-simulation"
      >
        {language === "zh" ? "开始模拟" : "Start Simulation"}
      </PrimaryActionButton>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={resetSimulation}
          className="flex-1"
          data-testid="button-reset-simulation"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {language === "zh" ? "重置参数" : "Reset"}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => setShowHelpDialog(true)}
          data-testid="button-help-cashflow-step3"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );

  // 桌面端渲染 - 左控制右数据
  if (isDesktop) {
    return (
      <>
      <div className="h-full flex gap-4">
        {/* 左区域：参数设置 + 运行按钮 */}
        <div className="flex-[2] flex flex-col gap-4 min-h-0 overflow-auto">
          {/* 左上：Header + 参数设置 */}
          <div className="bg-card rounded-2xl border shadow-lg p-6 shrink-0">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="nav-gradient w-12 h-12 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{language === "zh" ? "现金流模拟器" : "Cash Flow Simulator"}</h2>
                <p className="text-xs text-muted-foreground">{language === "zh" ? "模拟系统资金流动" : "Simulate cash flow"}</p>
              </div>
              <Button variant="outline" size="icon" className="ml-auto h-10 w-10" onClick={() => setShowHelpDialog(true)}>
                <HelpCircle className="h-5 w-5" />
              </Button>
            </div>

            {/* 模式切换 */}
            <div className="flex gap-2 mb-4 p-1 bg-muted/30 rounded-lg">
              <Button
                variant={simulationMode === 'basic' ? "default" : "ghost"}
                size="sm"
                className="flex-1"
                onClick={() => setSimulationMode('basic')}
              >
                {language === "zh" ? "基础模式" : "Basic Mode"}
              </Button>
              <Button
                variant={simulationMode === 'orders' ? "default" : "ghost"}
                size="sm"
                className="flex-1"
                onClick={() => setSimulationMode('orders')}
              >
                {language === "zh" ? "多订单模式" : "Orders Mode"}
              </Button>
            </div>

            {simulationMode === 'basic' ? (
              <>
                {/* 市场参数 - 从数据总台同步 */}
                <div className="bg-muted/30 rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-chart-1" />
                      <Label className="text-sm font-semibold">{language === "zh" ? "市场参数" : "Market"}</Label>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{language === "zh" ? "自动同步" : "Auto-sync"}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-background/60 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-muted-foreground">{language === "zh" ? "代币价格" : "Token Price"}</div>
                      <div className="text-base font-bold text-chart-1">${marketParams.tokenPrice.toFixed(4)}</div>
                    </div>
                    <div className="bg-background/60 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-muted-foreground">{language === "zh" ? "国库余额" : "Treasury"}</div>
                      <div className="text-base font-bold text-chart-2">{formatCurrency(marketParams.treasury)}</div>
                    </div>
                  </div>
                </div>

                {/* 基础设置 */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-chart-2" />
                    <Label className="text-sm font-semibold">{language === "zh" ? "模拟参数" : "Simulation"}</Label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">{language === "zh" ? "模拟天数" : "Days"}</Label>
                      <Badge variant="secondary" className="text-xs">{params.simulationDays}{language === "zh" ? "天" : "d"}</Badge>
                    </div>
                    <Slider value={[params.simulationDays]} onValueChange={([v]) => setParams(p => ({ ...p, simulationDays: v }))} min={30} max={360} step={30} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">{language === "zh" ? "日营业额" : "Revenue"}</Label>
                      <Badge variant="secondary" className="text-xs">{formatCurrency(params.initialDailyRevenue)}</Badge>
                    </div>
                    <Slider value={[params.initialDailyRevenue]} onValueChange={([v]) => setParams(p => ({ ...p, initialDailyRevenue: v }))} min={10000} max={500000} step={10000} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">{language === "zh" ? "日增长率" : "Growth"}</Label>
                      <Badge variant="secondary" className="text-xs">{params.revenueGrowthRate.toFixed(1)}%</Badge>
                    </div>
                    <Slider value={[params.revenueGrowthRate * 10]} onValueChange={([v]) => setParams(p => ({ ...p, revenueGrowthRate: v / 10 }))} min={0} max={100} step={5} />
                  </div>
                </div>

                {/* 用户行为 - 简化显示 */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-chart-2" />
                      <Label className="text-sm font-semibold">{language === "zh" ? "用户行为" : "User Behavior"}</Label>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowParamsDialog(true)}>
                      <Settings className="h-3 w-3 mr-1" />
                      {language === "zh" ? "详细设置" : "Settings"}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">{language === "zh" ? "提现压力" : "Pressure"}</Label>
                      <Badge variant="secondary" className="text-xs">{params.basePressure}%</Badge>
                    </div>
                    <Slider value={[params.basePressure]} onValueChange={([v]) => setParams(p => ({ ...p, basePressure: v }))} min={10} max={100} step={5} />
                  </div>

                  {/* 质押/释放分布预览 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/40 rounded-lg p-2">
                      <div className="text-[10px] text-muted-foreground text-center mb-1">{language === "zh" ? "质押分布" : "Staking"}</div>
                      <div className="flex justify-between text-[10px]">
                        <span>360d:{params.stakingRatio360}%</span>
                        <span>180d:{params.stakingRatio180}%</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span>90d:{params.stakingRatio90}%</span>
                        <span>30d:{params.stakingRatio30}%</span>
                      </div>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-2">
                      <div className="text-[10px] text-muted-foreground text-center mb-1">{language === "zh" ? "释放分布" : "Release"}</div>
                      <div className="flex justify-between text-[10px]">
                        <span>30d:{params.releaseRatio30}%</span>
                        <span>15d:{params.releaseRatio15}%</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span>7d:{params.releaseRatio7}%</span>
                        <span>1d:{params.releaseRatio1}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SPP调控预览 */}
                <div className="bg-chart-1/10 rounded-lg p-2 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-chart-1" />
                      <span className="text-xs font-medium">{language === "zh" ? "SPP价格调控" : "SPP Control"}</span>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-[10px] h-5 text-chart-2">{language === "zh" ? "买" : "Buy"} {sppParams.buyPriceThreshold}%</Badge>
                      <Badge variant="outline" className="text-[10px] h-5 text-chart-4">{language === "zh" ? "卖" : "Sell"} +{sppParams.sellPriceThreshold}%</Badge>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* 多订单模式 */}
                <div className="space-y-3">
                  {/* 市场参数 - 从数据总台同步 */}
                  <div className="bg-muted/30 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-chart-1" />
                        <Label className="text-sm font-semibold">{language === "zh" ? "市场参数" : "Market"}</Label>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{language === "zh" ? "自动同步" : "Auto-sync"}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-background/60 rounded-lg p-2 text-center">
                        <div className="text-[10px] text-muted-foreground">{language === "zh" ? "代币价格" : "Price"}</div>
                        <div className="text-base font-bold text-chart-1">${marketParams.tokenPrice.toFixed(4)}</div>
                      </div>
                      <div className="bg-background/60 rounded-lg p-2 text-center">
                        <div className="text-[10px] text-muted-foreground">{language === "zh" ? "国库" : "Treasury"}</div>
                        <div className="text-base font-bold text-chart-2">{formatCurrency(marketParams.treasury)}</div>
                      </div>
                    </div>
                  </div>

                  {/* 订单配置 */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-chart-2" />
                      <Label className="text-sm font-semibold">{language === "zh" ? "订单配置" : "Orders"}</Label>
                    </div>
                    <Badge variant="secondary">{ordersSummary.enabledCount}/10 {language === "zh" ? "启用" : "active"}</Badge>
                  </div>

                  {/* 订单汇总 */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-chart-2/10 rounded-lg p-2">
                      <div className="text-[10px] text-muted-foreground">{language === "zh" ? "总投资" : "Invest"}</div>
                      <div className="text-sm font-bold text-chart-2">{formatCurrency(ordersSummary.totalInvestment)}</div>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-2">
                      <div className="text-[10px] text-muted-foreground">{language === "zh" ? "净代币" : "Net B18"}</div>
                      <div className="text-sm font-bold">{formatTokens(ordersSummary.totalNetTokens)}</div>
                    </div>
                    <div className={`rounded-lg p-2 ${ordersSummary.roi >= 0 ? "bg-chart-2/10" : "bg-destructive/10"}`}>
                      <div className="text-[10px] text-muted-foreground">ROI</div>
                      <div className={`text-sm font-bold ${ordersSummary.roi >= 0 ? "text-chart-2" : "text-destructive"}`}>
                        {ordersSummary.roi >= 0 ? "+" : ""}{ordersSummary.roi.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* 订单网格 - 5x2 布局 */}
                  <div className="grid grid-cols-5 gap-2">
                    {simulatedOrders.map((order, index) => (
                      <div
                        key={order.id}
                        onClick={() => toggleOrderEnabled(index)}
                        className={`relative p-2 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] ${
                          order.enabled
                            ? 'bg-gradient-to-br from-chart-2/20 to-chart-2/5 border-chart-2/50 shadow-sm'
                            : 'bg-muted/30 border-transparent hover:border-muted-foreground/20'
                        }`}
                      >
                        {/* 订单编号 */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-bold ${order.enabled ? 'text-chart-2' : 'text-muted-foreground'}`}>
                            #{order.id}
                          </span>
                          <div className={`w-2.5 h-2.5 rounded-full transition-colors ${
                            order.enabled ? 'bg-chart-2 shadow-sm shadow-chart-2/50' : 'bg-muted-foreground/30'
                          }`} />
                        </div>

                        {order.enabled ? (
                          <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                            {/* 投资金额 */}
                            <Input
                              type="number"
                              value={order.investment}
                              onChange={(e) => updateOrder(index, { investment: parseFloat(e.target.value) || 0 })}
                              className="h-7 text-xs px-2 font-bold text-center"
                              placeholder="$"
                            />
                            {/* 质押/释放选择 */}
                            <div className="grid grid-cols-2 gap-1">
                              <select
                                value={order.stakingDays}
                                onChange={(e) => {
                                  const days = parseInt(e.target.value);
                                  updateOrder(index, { stakingDays: days, dailyRate: getDailyRateByStakingDays(days) });
                                }}
                                className="h-6 text-[10px] px-1 rounded-lg border bg-background/80 text-center font-medium"
                              >
                                <option value={360}>360d</option>
                                <option value={180}>180d</option>
                                <option value={90}>90d</option>
                                <option value={30}>30d</option>
                              </select>
                              <select
                                value={order.releaseDays}
                                onChange={(e) => {
                                  const days = parseInt(e.target.value);
                                  updateOrder(index, { releaseDays: days, taxRate: getTaxRateByReleaseDays(days) });
                                }}
                                className="h-6 text-[10px] px-1 rounded-lg border bg-background/80 text-center font-medium"
                              >
                                <option value={30}>30d</option>
                                <option value={15}>15d</option>
                                <option value={7}>7d</option>
                                <option value={1}>1d</option>
                              </select>
                            </div>
                            {/* 税率显示 */}
                            <div className="text-[10px] text-center text-muted-foreground">
                              {language === "zh" ? "税" : "Tax"}: <span className="font-bold text-chart-4">{(order.taxRate * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-[72px] flex items-center justify-center">
                            <span className="text-[10px] text-muted-foreground">{language === "zh" ? "点击启用" : "Click to enable"}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 用户行为设置 */}
                  <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-chart-2" />
                        <Label className="text-sm font-semibold">{language === "zh" ? "用户行为" : "User Behavior"}</Label>
                      </div>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowParamsDialog(true)}>
                        <Settings className="h-3 w-3 mr-1" />
                        {language === "zh" ? "详细设置" : "Settings"}
                      </Button>
                    </div>

                    {/* 质押/释放分布预览 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted/40 rounded-lg p-2">
                        <div className="text-[10px] text-muted-foreground text-center mb-1">{language === "zh" ? "质押分布" : "Staking"}</div>
                        <div className="flex justify-between text-[10px]">
                          <span>360d:{params.stakingRatio360}%</span>
                          <span>180d:{params.stakingRatio180}%</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span>90d:{params.stakingRatio90}%</span>
                          <span>30d:{params.stakingRatio30}%</span>
                        </div>
                      </div>
                      <div className="bg-muted/40 rounded-lg p-2">
                        <div className="text-[10px] text-muted-foreground text-center mb-1">{language === "zh" ? "释放分布" : "Release"}</div>
                        <div className="flex justify-between text-[10px]">
                          <span>30d:{params.releaseRatio30}%</span>
                          <span>15d:{params.releaseRatio15}%</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span>7d:{params.releaseRatio7}%</span>
                          <span>1d:{params.releaseRatio1}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SPP调控预览 */}
                  <div className="bg-chart-1/10 rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-chart-1" />
                        <span className="text-xs font-medium">{language === "zh" ? "SPP价格调控" : "SPP Control"}</span>
                      </div>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-[10px] h-5 text-chart-2">{language === "zh" ? "买" : "Buy"} {sppParams.buyPriceThreshold}%</Badge>
                        <Badge variant="outline" className="text-[10px] h-5 text-chart-4">{language === "zh" ? "卖" : "Sell"} +{sppParams.sellPriceThreshold}%</Badge>
                      </div>
                    </div>
                  </div>

                  {/* 模拟天数 */}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">{language === "zh" ? "模拟天数" : "Days"}</Label>
                      <Badge variant="secondary" className="text-xs">{params.simulationDays}{language === "zh" ? "天" : "d"}</Badge>
                    </div>
                    <Slider value={[params.simulationDays]} onValueChange={([v]) => setParams(p => ({ ...p, simulationDays: v }))} min={30} max={360} step={30} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 左下：运行按钮 */}
          <div className="bg-card rounded-2xl border shadow-lg p-4 shrink-0">
            <div className="flex gap-3">
              <LoadingButton
                onClick={runSimulation}
                isLoading={isSimulating}
                className="flex-1 h-12 text-base font-bold"
                data-testid="button-run-sim"
              >
                <Play className="h-5 w-5 mr-2" />
                {language === "zh" ? "运行模拟" : "Run Simulation"}
              </LoadingButton>
              {results && (
                <Button variant="outline" className="h-12 px-4" onClick={() => setShowResults(true)}>
                  <BarChart3 className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 右区域：模拟预览 + 结果 */}
        <div className="flex-[3] bg-card rounded-2xl border shadow-lg p-6 flex flex-col min-h-0 overflow-hidden">
          {/* 参数预览 */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-chart-1/10 rounded-xl p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">{language === "zh" ? "模拟周期" : "Period"}</div>
              <div className="font-bold text-2xl text-chart-1">{params.simulationDays}<span className="text-sm">{language === "zh" ? "天" : "d"}</span></div>
            </div>
            <div className="bg-muted/40 rounded-xl p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">{language === "zh" ? "日收入" : "Daily"}</div>
              <div className="font-bold text-lg">{formatCurrency(params.initialDailyRevenue)}</div>
            </div>
            <div className="bg-muted/40 rounded-xl p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">{language === "zh" ? "增长率" : "Growth"}</div>
              <div className="font-bold text-lg text-chart-2">{params.revenueGrowthRate}%</div>
            </div>
            <div className="bg-muted/40 rounded-xl p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">{language === "zh" ? "提现压力" : "Pressure"}</div>
              <div className="font-bold text-lg">{params.basePressure}%</div>
            </div>
          </div>

          {/* 模拟结果 */}
          <div className="flex-1 bg-muted/20 rounded-xl p-4 flex flex-col">
            <Label className="text-base font-semibold mb-3">{language === "zh" ? "模拟结果" : "Simulation Results"}</Label>

            {results && summary ? (
              <div className="flex-1 grid grid-cols-2 gap-4">
                {/* 左列：价格变化 */}
                <div className="space-y-3">
                  <div className={`rounded-xl p-4 text-center ${summary.priceChangePercent >= 0 ? "bg-chart-2/10" : "bg-destructive/10"}`}>
                    <div className="text-sm text-muted-foreground mb-1">{language === "zh" ? "最终价格" : "Final Price"}</div>
                    <div className={`text-3xl font-bold ${summary.priceChangePercent >= 0 ? "text-chart-2" : "text-destructive"}`}>
                      {formatCurrency(summary.endPrice)}
                    </div>
                    <div className={`text-sm ${summary.priceChangePercent >= 0 ? "text-chart-2" : "text-destructive"}`}>
                      {summary.priceChangePercent >= 0 ? "+" : ""}{summary.priceChangePercent.toFixed(2)}%
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-background/60 rounded-lg p-3 text-center">
                      <div className="text-xs text-muted-foreground">{language === "zh" ? "开始价" : "Start"}</div>
                      <div className="text-lg font-bold">{formatCurrency(summary.startPrice)}</div>
                    </div>
                    <div className="bg-background/60 rounded-lg p-3 text-center">
                      <div className="text-xs text-muted-foreground">{language === "zh" ? "结束价" : "End"}</div>
                      <div className="text-lg font-bold">{formatCurrency(summary.endPrice)}</div>
                    </div>
                  </div>
                </div>

                {/* 右列：资金数据 */}
                <div className="space-y-3">
                  <div className="bg-background/60 rounded-xl p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1">{language === "zh" ? "总收入" : "Total Revenue"}</div>
                    <div className="text-2xl font-bold text-chart-2">{formatCurrency(summary.totalRevenue)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-background/60 rounded-lg p-3 text-center">
                      <div className="text-xs text-muted-foreground">{language === "zh" ? "总提现" : "Withdrawals"}</div>
                      <div className="text-lg font-bold text-destructive">{formatCurrency(summary.totalWithdrawals)}</div>
                    </div>
                    <div className="bg-background/60 rounded-lg p-3 text-center">
                      <div className="text-xs text-muted-foreground">{language === "zh" ? "最终国库" : "Treasury"}</div>
                      <div className="text-lg font-bold">{formatCurrency(summary.endTreasury)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">{language === "zh" ? "点击运行模拟查看结果" : "Click Run to see results"}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 共用弹窗 - 详细版本 */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BarChart3 className="h-5 w-5 text-chart-1" />
              {language === "zh" ? "模拟结果" : "Simulation Results"}
            </DialogTitle>
            <DialogDescription>
              {params.simulationDays}{language === "zh" ? "天模拟" : "d simulation"} | {language === "zh" ? "日增长" : "Growth"} {params.revenueGrowthRate}%
            </DialogDescription>
          </DialogHeader>

          {summary && (
            <div className="space-y-4">
              {/* 核心指标 */}
              <div className="grid grid-cols-6 gap-3">
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {language === "zh" ? "开始价" : "Start"}
                  </div>
                  <div className="text-lg font-bold">{formatCurrency(summary.startPrice)}</div>
                </div>
                <div className={`rounded-lg p-3 text-center ${summary.priceChangePercent >= 0 ? "bg-chart-2/10" : "bg-destructive/10"}`}>
                  <div className="text-xs text-muted-foreground">{language === "zh" ? "结束价" : "End"}</div>
                  <div className={`text-lg font-bold ${summary.priceChangePercent >= 0 ? "text-chart-2" : "text-destructive"}`}>{formatCurrency(summary.endPrice)}</div>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground">{language === "zh" ? "变化" : "Change"}</div>
                  <div className={`text-lg font-bold ${summary.priceChangePercent >= 0 ? "text-chart-2" : "text-destructive"}`}>{summary.priceChangePercent >= 0 ? "+" : ""}{summary.priceChangePercent.toFixed(2)}%</div>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Wallet className="h-3 w-3" />
                    {language === "zh" ? "最终国库" : "Treasury"}
                  </div>
                  <div className="text-lg font-bold">{formatCurrency(summary.endTreasury)}</div>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {language === "zh" ? "平均压力" : "Pressure"}
                  </div>
                  <div className={`text-lg font-bold ${summary.avgPressure > 50 ? "text-destructive" : summary.avgPressure > 20 ? "text-yellow-500" : "text-chart-2"}`}>{summary.avgPressure.toFixed(1)}%</div>
                </div>
                <div className={`rounded-lg p-3 text-center ${summary.triggerDays > 0 ? "bg-destructive/10" : "bg-chart-2/10"}`}>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Shield className="h-3 w-3" />
                    {language === "zh" ? "433触发" : "433 Trig"}
                  </div>
                  <div className={`text-lg font-bold ${summary.triggerDays > 0 ? "text-destructive" : "text-chart-2"}`}>{summary.triggerDays}{language === "zh" ? "天" : "d"}</div>
                </div>
              </div>

              {/* 收入与税收 */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-chart-2/10 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground">{language === "zh" ? "总收入" : "Revenue"}</div>
                  <div className="text-xl font-bold text-chart-2">{formatCurrency(summary.totalRevenue)}</div>
                </div>
                <div className="bg-destructive/10 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground">{language === "zh" ? "总提现" : "Withdrawals"}</div>
                  <div className="text-xl font-bold text-destructive">{formatCurrency(summary.totalWithdrawals)}</div>
                </div>
                <div className="bg-chart-4/10 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground">{language === "zh" ? "总税收" : "Tax"}</div>
                  <div className="text-xl font-bold text-chart-4">{formatCurrency(summary.totalTax)}</div>
                </div>
                <div className="bg-chart-1/10 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground">{language === "zh" ? "SPP B18" : "SPP B18"}</div>
                  <div className="text-xl font-bold text-chart-1">{formatTokens(summary.finalSppB18Pool)}</div>
                </div>
              </div>

              {/* SPP回购详情 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-chart-2/10 rounded-lg p-3">
                  <div className="text-xs font-medium text-chart-2 mb-2">{language === "zh" ? "SPP托底买入（价格下跌时）" : "SPP Support Buy"}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-background/50 rounded p-2 text-center">
                      <div className="text-[10px] text-muted-foreground">{language === "zh" ? "使用USDC" : "USDC Used"}</div>
                      <div className="text-sm font-bold text-chart-2">{formatCurrency(summary.taxUsdcUsed)}</div>
                    </div>
                    <div className="bg-background/50 rounded p-2 text-center">
                      <div className="text-[10px] text-muted-foreground">{language === "zh" ? "购入B18" : "B18 Bought"}</div>
                      <div className="text-sm font-bold text-chart-2">{formatTokens(summary.taxB18Bought)}</div>
                    </div>
                  </div>
                </div>
                <div className="bg-chart-4/10 rounded-lg p-3">
                  <div className="text-xs font-medium text-chart-4 mb-2">{language === "zh" ? "SPP平抑卖出（价格上涨时）" : "SPP Suppress Sell"}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-background/50 rounded p-2 text-center">
                      <div className="text-[10px] text-muted-foreground">{language === "zh" ? "卖出B18" : "B18 Sold"}</div>
                      <div className="text-sm font-bold text-chart-4">{formatTokens(summary.sppSellB18)}</div>
                    </div>
                    <div className="bg-background/50 rounded p-2 text-center">
                      <div className="text-[10px] text-muted-foreground">{language === "zh" ? "获得USDC" : "USDC Got"}</div>
                      <div className="text-sm font-bold text-chart-4">{formatCurrency(summary.sppSellUsdc)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 图表切换 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {[
                    { key: "price", label: language === "zh" ? "价格走势" : "Price" },
                    { key: "pressure", label: language === "zh" ? "提现压力" : "Pressure" },
                    { key: "treasury", label: language === "zh" ? "国库/SPP" : "Treasury" },
                    { key: "tax", label: language === "zh" ? "税收分配" : "Tax" },
                  ].map(({ key, label }) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={activeChartTab === key ? "default" : "outline"}
                      className="h-8 text-xs"
                      onClick={() => setActiveChartTab(key)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>

                {activeChartTab === "price" && results && (
                  <div className="h-64 bg-muted/20 rounded-xl p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={results}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => `$${v.toFixed(2)}`} tick={{ fontSize: 11 }} domain={['dataMin - 0.1', 'dataMax + 0.1']} />
                        <Tooltip formatter={(value: number) => [`$${value.toFixed(4)}`, language === "zh" ? "价格" : "Price"]} labelFormatter={(day) => `${language === "zh" ? "第" : "Day "}${day}${language === "zh" ? "天" : ""}`} />
                        <Line type="monotone" dataKey="tokenPrice" name={language === "zh" ? "代币价格" : "Token Price"} stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {activeChartTab === "pressure" && results && (
                  <div className="h-64 bg-muted/20 rounded-xl p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={results}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]} labelFormatter={(day) => `${language === "zh" ? "第" : "Day "}${day}${language === "zh" ? "天" : ""}`} />
                        <ReferenceLine y={100} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: "100%", position: "right", fontSize: 10 }} />
                        <Area type="monotone" dataKey="withdrawalPressure" name={language === "zh" ? "提现压力" : "Pressure"} stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {activeChartTab === "treasury" && results && (
                  <div className="h-64 bg-muted/20 rounded-xl p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={results}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name]} labelFormatter={(day) => `${language === "zh" ? "第" : "Day "}${day}${language === "zh" ? "天" : ""}`} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="treasuryBalance" name={language === "zh" ? "国库" : "Treasury"} stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="sppUsdcPool" name="SPP USDC" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="queuedAmount" name={language === "zh" ? "排队队列" : "Queue"} stroke="hsl(var(--chart-4))" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {activeChartTab === "tax" && results && (
                  <div className="h-64 bg-muted/20 rounded-xl p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={results}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toFixed(0)} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value: number, name: string) => [formatTokens(value), name]} labelFormatter={(day) => `${language === "zh" ? "第" : "Day "}${day}${language === "zh" ? "天" : ""}`} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Area type="monotone" dataKey="taxToDelivery" name={language === "zh" ? "交付50%" : "Delivery"} stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.3} stackId="1" />
                        <Area type="monotone" dataKey="taxToBurn" name={language === "zh" ? "销毁20%" : "Burn"} stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.3} stackId="1" />
                        <Area type="monotone" dataKey="taxToBonusPool" name={language === "zh" ? "奖励20%" : "Bonus"} stroke="hsl(var(--chart-4))" fill="hsl(var(--chart-4))" fillOpacity={0.3} stackId="1" />
                        <Area type="monotone" dataKey="taxB18ToSpp" name="SPP 10%" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.3} stackId="1" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <Button className="w-full h-12" onClick={() => setShowResults(false)}>{language === "zh" ? "关闭" : "Close"}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 参数设置弹窗 */}
      <Dialog open={showParamsDialog} onOpenChange={setShowParamsDialog}>
        <DialogContent className="max-w-lg lg:max-w-3xl p-4 lg:p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-3">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Settings className="h-5 w-5 text-chart-1" />
              {language === "zh" ? "详细参数设置" : "Advanced Settings"}
            </DialogTitle>
            <DialogDescription>{language === "zh" ? "调整质押/释放分布和SPP价格调控参数" : "Adjust staking/release distribution and SPP parameters"}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 质押天数分布 */}
            <div className="bg-muted/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-chart-2" />
                <Label className="text-sm font-semibold">{language === "zh" ? "质押天数分布" : "Staking Distribution"}</Label>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {language === "zh" ? "总计" : "Total"}: {params.stakingRatio360 + params.stakingRatio180 + params.stakingRatio90 + params.stakingRatio30}%
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'stakingRatio360' as const, days: 360, rate: '0.30%' },
                  { key: 'stakingRatio180' as const, days: 180, rate: '0.25%' },
                  { key: 'stakingRatio90' as const, days: 90, rate: '0.20%' },
                  { key: 'stakingRatio30' as const, days: 30, rate: '0.15%' },
                ].map(({ key, days, rate }) => (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span>{days}{language === "zh" ? "天" : "d"} ({rate})</span>
                      <Badge variant="secondary" className="text-xs">{params[key]}%</Badge>
                    </div>
                    <Slider
                      value={[params[key]]}
                      onValueChange={([v]) => normalizeStakingRatios(key, v)}
                      min={0} max={100} step={5}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 释放天数分布 */}
            <div className="bg-muted/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Percent className="h-4 w-4 text-chart-4" />
                <Label className="text-sm font-semibold">{language === "zh" ? "释放天数分布" : "Release Distribution"}</Label>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {language === "zh" ? "税率" : "Tax"}: {(weightedTaxRate * 100).toFixed(1)}%
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'releaseRatio30' as const, days: 30, tax: '3%' },
                  { key: 'releaseRatio15' as const, days: 15, tax: '6%' },
                  { key: 'releaseRatio7' as const, days: 7, tax: '10%' },
                  { key: 'releaseRatio1' as const, days: 1, tax: '20%' },
                ].map(({ key, days, tax }) => (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span>{days === 1 ? "24h" : `${days}${language === "zh" ? "天" : "d"}`} ({tax})</span>
                      <Badge variant="secondary" className="text-xs">{params[key]}%</Badge>
                    </div>
                    <Slider
                      value={[params[key]]}
                      onValueChange={([v]) => normalizeReleaseRatios(key, v)}
                      min={0} max={100} step={5}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* SPP价格调控参数 */}
            <div className="space-y-3">
              {/* 买入参数 */}
              <div className="bg-chart-2/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-chart-2 rotate-180" />
                  <Label className="text-sm font-semibold text-chart-2">{language === "zh" ? "托底买入（价格下跌时）" : "Support Buy"}</Label>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span>{language === "zh" ? "阈值" : "Threshold"}</span>
                      <span className="font-mono">{sppParams.buyPriceThreshold}%</span>
                    </div>
                    <Slider value={[Math.abs(sppParams.buyPriceThreshold)]} onValueChange={([v]) => setSppParams(p => ({ ...p, buyPriceThreshold: -v }))} min={1} max={30} step={1} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span>{language === "zh" ? "比例" : "Ratio"}</span>
                      <span className="font-mono">{sppParams.buyRatio}%</span>
                    </div>
                    <Slider value={[sppParams.buyRatio]} onValueChange={([v]) => setSppParams(p => ({ ...p, buyRatio: v }))} min={5} max={50} step={5} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span>{language === "zh" ? "最小" : "Min"}</span>
                      <span className="font-mono">${(sppParams.minBuyAmount/1000).toFixed(0)}K</span>
                    </div>
                    <Slider value={[sppParams.minBuyAmount]} onValueChange={([v]) => setSppParams(p => ({ ...p, minBuyAmount: v }))} min={100} max={10000} step={100} />
                  </div>
                </div>
              </div>

              {/* 卖出参数 */}
              <div className="bg-chart-4/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-chart-4" />
                  <Label className="text-sm font-semibold text-chart-4">{language === "zh" ? "平抑卖出（价格上涨时）" : "Suppress Sell"}</Label>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span>{language === "zh" ? "阈值" : "Threshold"}</span>
                      <span className="font-mono">+{sppParams.sellPriceThreshold}%</span>
                    </div>
                    <Slider value={[sppParams.sellPriceThreshold]} onValueChange={([v]) => setSppParams(p => ({ ...p, sellPriceThreshold: v }))} min={5} max={50} step={5} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span>{language === "zh" ? "比例" : "Ratio"}</span>
                      <span className="font-mono">{sppParams.sellRatio}%</span>
                    </div>
                    <Slider value={[sppParams.sellRatio]} onValueChange={([v]) => setSppParams(p => ({ ...p, sellRatio: v }))} min={10} max={100} step={10} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span>{language === "zh" ? "最小" : "Min"}</span>
                      <span className="font-mono">{sppParams.minSellAmount}</span>
                    </div>
                    <Slider value={[sppParams.minSellAmount]} onValueChange={([v]) => setSppParams(p => ({ ...p, minSellAmount: v }))} min={10} max={1000} step={10} />
                  </div>
                </div>
              </div>
            </div>

            <Button className="w-full h-12" onClick={() => setShowParamsDialog(false)}>{language === "zh" ? "确认" : "Confirm"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <UsageHelpDialog open={showHelpDialog} onOpenChange={setShowHelpDialog} language={language} />
      </>
    );
  }

  // 移动端渲染
  return (
    <>
      <Card className="mobile-premium-card max-w-md mx-auto lg:max-w-3xl">
        <CardHeader className="pb-3 pt-4 px-4 lg:px-6 lg:pt-6">
          <CardTitle className="flex items-center gap-2">
            <div className="nav-gradient w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text-premium">{language === "zh" ? "现金流模拟器" : "Cash Flow Simulator"}</span>
          </CardTitle>

          {/* 增强版步骤指示器 */}
          <StepIndicator
            steps={steps.map(s => ({ id: s.id, label: s.label, shortLabel: s.shortLabel }))}
            currentStep={currentStep - 1}
            onStepClick={(index) => goToStep(index + 1)}
            allowNavigation={true}
            className="mt-4"
          />
        </CardHeader>

        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
          {/* 步骤内容带动画 */}
          <div className="step-transition-container min-h-[300px]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                className="step-content"
              >
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
              </motion.div>
            </AnimatePresence>
          </div>

          {currentStep < 3 && (
            <div className="flex gap-2 mt-6">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={prevStep}
                  className="flex-1"
                  data-testid="button-prev-step"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {language === "zh" ? "上一步" : "Back"}
                </Button>
              )}
              <Button
                onClick={nextStep}
                className="flex-1"
                data-testid="button-next-step"
              >
                {language === "zh" ? "下一步" : "Next"}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => setShowHelpDialog(true)}
                data-testid="button-help-cashflow"
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-sm lg:max-w-lg max-h-[85vh] overflow-y-auto p-3 lg:p-5">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-chart-1" />
              {language === "zh" ? "模拟结果" : "Simulation Results"}
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              {params.simulationDays}{language === "zh" ? "天模拟" : "d sim"} | {language === "zh" ? "增长" : "Growth"} {params.revenueGrowthRate}%
            </DialogDescription>
          </DialogHeader>
          
          {summary && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-1.5">
                <div className="mobile-stat text-center">
                  <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                    <TrendingUp className="h-2.5 w-2.5" />
                    {language === "zh" ? "最终价格" : "Price"}
                  </div>
                  <div className="text-sm font-bold font-mono" data-testid="text-final-price">
                    <AnimatedPrice value={summary.finalPrice} showFlash />
                  </div>
                  <div className={`text-[10px] ${summary.priceChange >= 0 ? "text-chart-2" : "text-destructive"}`}>
                    {summary.priceChange >= 0 ? "+" : ""}<AnimatedPercent value={summary.priceChange / 100} showFlash />
                  </div>
                </div>
                <div className="mobile-stat text-center">
                  <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                    <Wallet className="h-2.5 w-2.5" />
                    {language === "zh" ? "国库" : "Treasury"}
                  </div>
                  <div className="text-sm font-bold font-mono">
                    <AnimatedCurrency value={summary.finalTreasury} compact showFlash />
                  </div>
                </div>
                <div className="mobile-stat text-center">
                  <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {language === "zh" ? "压力" : "Pressure"}
                  </div>
                  <div className={`text-sm font-bold font-mono ${summary.avgPressure > 50 ? "text-destructive" : summary.avgPressure > 20 ? "text-yellow-500" : "text-chart-2"}`}>
                    <AnimatedPercent value={summary.avgPressure / 100} showFlash />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <div className="mobile-stat text-center">
                  <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                    <Shield className="h-2.5 w-2.5" />
                    {language === "zh" ? "433触发" : "433"}
                  </div>
                  <div className={`text-sm font-bold font-mono ${summary.triggeredDays > 0 ? "text-destructive" : "text-chart-2"}`}>{summary.triggeredDays}d</div>
                </div>
                <div className="mobile-stat text-center">
                  <div className="text-[10px] text-muted-foreground">{language === "zh" ? "累计税收" : "Tax"}</div>
                  <div className="text-sm font-bold font-mono" data-testid="text-total-tax">{formatCurrency(summary.totalTax)}</div>
                </div>
                <div className="mobile-stat text-center">
                  <div className="text-[10px] text-muted-foreground">{language === "zh" ? "SPP B18" : "SPP B18"}</div>
                  <div className="text-sm font-bold font-mono" data-testid="text-spp-b18">{formatTokens(summary.finalSppB18Pool)}</div>
                </div>
              </div>
              
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-9 text-xs" data-testid="button-expand-spp">
                    {language === "zh" ? "SPP回购详情" : "SPP Buyback Details"}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-2">
                  <div className="bg-chart-2/10 rounded-lg p-2">
                    <div className="text-[10px] font-medium text-chart-2 mb-1">{language === "zh" ? "税收自动购买（推高价格）" : "Tax Auto-Buy (Price Up)"}</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="mobile-stat text-center">
                        <div className="text-[10px] text-muted-foreground">{language === "zh" ? "使用USDC" : "USDC Used"}</div>
                        <div className="text-xs font-bold font-mono text-chart-2">{formatCurrency(summary.taxUsdcUsed)}</div>
                      </div>
                      <div className="mobile-stat text-center">
                        <div className="text-[10px] text-muted-foreground">{language === "zh" ? "购入B18" : "B18 Bought"}</div>
                        <div className="text-xs font-bold font-mono text-chart-2">{formatTokens(summary.taxB18Bought)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-chart-4/10 rounded-lg p-2">
                    <div className="text-[10px] font-medium text-chart-4 mb-1">{language === "zh" ? "阈值卖出（USDC进国库）" : "Threshold Sell (USDC→Treasury)"}</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="mobile-stat text-center">
                        <div className="text-[10px] text-muted-foreground">{language === "zh" ? "卖出B18" : "B18 Sold"}</div>
                        <div className="text-xs font-bold font-mono text-chart-4">{formatTokens(summary.sppSellB18)}</div>
                      </div>
                      <div className="mobile-stat text-center">
                        <div className="text-[10px] text-muted-foreground">{language === "zh" ? "获得USDC" : "USDC Got"}</div>
                        <div className="text-xs font-bold font-mono text-chart-4">{formatCurrency(summary.sppSellUsdc)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="mobile-stat text-center">
                    <div className="text-[10px] text-muted-foreground">{language === "zh" ? "SPP最终B18余额" : "Final SPP B18"}</div>
                    <div className="text-sm font-bold font-mono">{formatTokens(summary.finalSppB18Pool)}</div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 flex-wrap">
                    {[
                      { key: "price", label: language === "zh" ? "价格" : "Price" },
                      { key: "pressure", label: language === "zh" ? "压力" : "Pressure" },
                      { key: "treasury", label: language === "zh" ? "国库" : "Treasury" },
                      { key: "tax", label: language === "zh" ? "税收" : "Tax" },
                    ].map(({ key, label }) => (
                      <Button
                        key={key}
                        size="sm"
                        variant={activeChartTab === key ? "default" : "outline"}
                        className="h-7 px-2 text-[10px]"
                        onClick={() => setActiveChartTab(key)}
                        data-testid={`button-chart-${key}`}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {activeChartTab === "price" && results && (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={results}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                        <YAxis tickFormatter={(v) => `$${v.toFixed(2)}`} tick={{ fontSize: 9 }} domain={['dataMin - 0.1', 'dataMax + 0.1']} />
                        <Tooltip formatter={(value: number) => [`$${value.toFixed(4)}`, language === "zh" ? "价格" : "Price"]} labelFormatter={(day) => `${language === "zh" ? "第" : "Day "}${day}${language === "zh" ? "天" : ""}`} />
                        <Line type="monotone" dataKey="tokenPrice" name={language === "zh" ? "代币价格" : "Token Price"} stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {activeChartTab === "pressure" && results && (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={results}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                        <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 9 }} />
                        <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]} labelFormatter={(day) => `${language === "zh" ? "第" : "Day "}${day}${language === "zh" ? "天" : ""}`} />
                        <ReferenceLine y={100} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label="100%" />
                        <Area type="monotone" dataKey="withdrawalPressure" name={language === "zh" ? "提现压力" : "Pressure"} stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {activeChartTab === "treasury" && results && (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={results}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                        <YAxis tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 9 }} />
                        <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name]} labelFormatter={(day) => `${language === "zh" ? "第" : "Day "}${day}${language === "zh" ? "天" : ""}`} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Line type="monotone" dataKey="treasuryBalance" name={language === "zh" ? "国库" : "Treasury"} stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="sppUsdcPool" name="SPP USDC" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="queuedAmount" name={language === "zh" ? "队列" : "Queue"} stroke="hsl(var(--chart-4))" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {activeChartTab === "tax" && results && (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={results}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                        <YAxis tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toFixed(0)} tick={{ fontSize: 9 }} />
                        <Tooltip formatter={(value: number, name: string) => [formatTokens(value), name]} labelFormatter={(day) => `${language === "zh" ? "第" : "Day "}${day}${language === "zh" ? "天" : ""}`} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Area type="monotone" dataKey="taxToDelivery" name={language === "zh" ? "交付50%" : "Delivery"} stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.3} stackId="1" />
                        <Area type="monotone" dataKey="taxToBurn" name={language === "zh" ? "销毁20%" : "Burn"} stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.3} stackId="1" />
                        <Area type="monotone" dataKey="taxToBonusPool" name={language === "zh" ? "奖励20%" : "Bonus"} stroke="hsl(var(--chart-4))" fill="hsl(var(--chart-4))" fillOpacity={0.3} stackId="1" />
                        <Area type="monotone" dataKey="taxB18ToSpp" name="SPP 10%" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.3} stackId="1" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <ClosePanelButton className="flex-1" icon={<X className="h-4 w-4" />} onClick={() => setShowResults(false)}>
                  {language === "zh" ? "关闭" : "Close"}
                </ClosePanelButton>
                <ClosePanelButton variant="primary" className="flex-1" icon={<Settings className="h-4 w-4" />} onClick={() => { setShowResults(false); setCurrentStep(1); }}>
                  {language === "zh" ? "调整参数" : "Adjust"}
                </ClosePanelButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-sm p-4" aria-describedby="cashflow-help-description">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="nav-gradient w-8 h-8 rounded-lg flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              {language === "zh" ? "现金流模拟说明" : "Cash Flow Simulator Guide"}
            </DialogTitle>
            <DialogDescription id="cashflow-help-description" className="sr-only">
              {language === "zh" ? "了解现金流模拟和433合约保护机制" : "Learn about cash flow simulation and 433 protection mechanism"}
            </DialogDescription>
          </DialogHeader>

          <div className="h-[50vh]">
            <HelpPages
              pages={[
                {
                  title: language === "zh" ? "税收分配" : "Tax Distribution",
                  icon: <Coins className="h-4 w-4 text-chart-2" />,
                  content: (
                    <div className="bg-chart-2/10 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground space-y-2">
                        <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                          <span>50% B18</span>
                          <span className="font-medium text-foreground">{language === "zh" ? "→ 交付合约" : "→ Delivery"}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                          <span>20% B18</span>
                          <span className="font-medium text-destructive">{language === "zh" ? "→ 永久销毁" : "→ Burned"}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                          <span>20% B18</span>
                          <span className="font-medium text-chart-4">{language === "zh" ? "→ 奖金池" : "→ Bonus Pool"}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                          <span>10% USDC</span>
                          <span className="font-medium text-chart-2">{language === "zh" ? "→ LP买B18→SPP" : "→ Buy B18→SPP"}</span>
                        </div>
                        <div className="text-chart-2 font-medium text-center pt-2 border-t border-border/50">
                          {language === "zh" ? "→ 税收购买推高币价" : "→ Tax buying pushes price up"}
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  title: language === "zh" ? "参数说明" : "Parameters",
                  icon: <BarChart3 className="h-4 w-4 text-chart-3" />,
                  content: (
                    <div className="bg-chart-3/10 rounded-lg p-3">
                      <div className="text-xs space-y-2">
                        <div className="p-2 bg-background/50 rounded">
                          <div className="font-medium text-foreground">{language === "zh" ? "日收入" : "Daily Revenue"}</div>
                          <div className="text-muted-foreground">{language === "zh" ? "每日新增投资USDC金额" : "Daily new investment USDC amount"}</div>
                        </div>
                        <div className="p-2 bg-background/50 rounded">
                          <div className="font-medium text-foreground">{language === "zh" ? "增长率" : "Growth Rate"}</div>
                          <div className="text-muted-foreground">{language === "zh" ? "收入日增长百分比（复利）" : "Daily revenue growth % (compound)"}</div>
                        </div>
                        <div className="p-2 bg-background/50 rounded">
                          <div className="font-medium text-foreground">{language === "zh" ? "释放压力" : "Release Pressure"}</div>
                          <div className="text-muted-foreground">{language === "zh" ? "收入中释放提现的比例" : "% of revenue used for withdrawals"}</div>
                        </div>
                        <div className="p-2 bg-background/50 rounded">
                          <div className="font-medium text-foreground">{language === "zh" ? "质押/释放比例" : "Staking/Release Ratio"}</div>
                          <div className="text-muted-foreground">{language === "zh" ? "影响利率和税率分布" : "Affects rate and tax distribution"}</div>
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  title: language === "zh" ? "433保护 & SPP" : "433 & SPP",
                  icon: <Shield className="h-4 w-4 text-chart-1" />,
                  content: (
                    <div className="space-y-3">
                      <div className="bg-chart-1/10 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-4 w-4 text-chart-1" />
                          <span className="font-semibold text-sm">{language === "zh" ? "433合约保护" : "433 Protection"}</span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>{language === "zh" ? "当 (国库+SPP) < 需求时触发" : "Triggers when (treasury+SPP) < demand"}</div>
                          <div className="font-medium text-destructive">{language === "zh" ? "→ 仅兑付30%，70%进入LIFO队列" : "→ 30% paid, 70% enters LIFO queue"}</div>
                        </div>
                      </div>
                      <div className="bg-chart-4/10 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Wallet className="h-4 w-4 text-chart-4" />
                          <span className="font-semibold text-sm">{language === "zh" ? "SPP回购机制" : "SPP Buyback"}</span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="font-medium text-chart-2">{language === "zh" ? "税收自动购买:" : "Tax Auto-Buy:"}</div>
                          <div>{language === "zh" ? "• 10%税收USDC从LP购买B18" : "• 10% tax USDC buys B18 from LP"}</div>
                          <div className="font-medium text-chart-4 pt-1">{language === "zh" ? "阈值卖出:" : "Threshold Sell:"}</div>
                          <div>{language === "zh" ? "• 价格超阈值时卖出SPP的B18" : "• Sells SPP B18 when price > threshold"}</div>
                          <div>{language === "zh" ? "• USDC进入国库" : "• USDC goes to treasury"}</div>
                        </div>
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </div>

          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={() => setShowHelpDialog(false)}
          >
            {language === "zh" ? "我知道了" : "Got it"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
