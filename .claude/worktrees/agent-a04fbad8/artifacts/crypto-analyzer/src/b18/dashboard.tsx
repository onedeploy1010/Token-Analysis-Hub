import { useState, useCallback } from "react";
import { StakingPage } from "@/components/staking-page";
import { SecondaryMarket } from "@/components/secondary-market";
import { ReleaseWithdrawal } from "@/components/release-withdrawal";
import { DynamicRewards } from "@/components/dynamic-rewards";
import { TokenDistribution } from "@/components/token-distribution";
import { CashFlowSimulator } from "@/components/cash-flow-simulator";
import { MobileStepWizard, type SimulatedOrder, type ReleaseMode } from "@/components/mobile-step-wizard";
import { DesktopLayout } from "@/components/desktop-layout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/language-context";
import {
  defaultStakingPeriods,
  defaultStaticReleaseTax,
  defaultDynamicReleaseTax,
  defaultRewardTiers,
  defaultSystemState,
  WithdrawalEntry,
  StakingPeriod,
  AMM_SLIPPAGE,
} from "@shared/schema";
import {
  calculatePresalePurchase,
  calculateSecondaryBuy,
  calculateSecondarySell,
  calculateReleaseSimulation,
} from "@/lib/tokenomics";

interface CalculationSummary {
  stakingPurchaseUsdt: number; // 投资金额 USDC
  stakingTokens: number; // 购买的本金代币数（principal）
  stakingInterest: number;
  stakingReleaseTax: number;
  stakingNetReturn: number;
  stakingTotalValue: number; // 质押后总价值（本金+利息）USDC
  stakingTotalTokens: number; // 质押后总代币数（本金+利息）
  stakingPeriodDays: number; // 质押周期天数
  stakingDailyRate: number; // 日利率
  releaseDays: number; // 释放周期天数（在第1步设置）
  releaseMode: ReleaseMode; // 释放模式（在第1步设置）
  useCompound: boolean; // 兼容旧字段
  secondaryBuyUsdt: number;
  secondarySellTokens: number;
  secondaryProfit: number;
  releaseTokens: number;
  releaseUsdt: number;
  releaseTax: number;
  dynamicReward1: number;
  dynamicReward2: number;
}

interface SimulationState {
  tokenPrice: number;
  initialTokenPrice: number;
  slippage: number;
  circulatingSupply: number;
  treasuryBalance: number;
  previousTreasuryBalance: number;
  sppBalance: number;
  sppHeldB18: number;  // SPP合约持有的B18（通过护盘买入）
  vestingBalance: number;
  bonusPoolBalance: number;
  totalBurned: number;
  lpPoolTokens: number;
  lpPoolUsdt: number;
  pendingWithdrawals: number;
  withdrawalQueue: WithdrawalEntry[];
  lastWithdrawalTokens: number;
  staticRewardBase: number;
  bonusPoolTotal: number;
  lpUsdtAdded: number;
  lpB18Added: number;
  lpB18FromDelivery: number;
  totalStaked: number;
  totalReleased: number;
  totalScheduledRelease: number;  // 总计划释放金额（累计所有投资的计划释放）
  totalInvestment: number;  // 累计投资金额
  releaseProgressSum: number;  // 废弃，用totalReleased/totalScheduledRelease代替
  calculations: CalculationSummary;
}

const initialCalculations: CalculationSummary = {
  stakingPurchaseUsdt: 0, // 第1步投资金额，未投资时为0
  stakingTokens: 0, // 第1步购买的本金代币，未投资时为0
  stakingInterest: 0,
  stakingReleaseTax: 0,
  stakingNetReturn: 0,
  stakingTotalValue: 0, // 质押后总价值，未投资时为0
  stakingTotalTokens: 0, // 质押后总代币，未投资时为0
  stakingPeriodDays: 0, // 质押天数，未投资时为0（不显示默认值）
  stakingDailyRate: 0, // 日利率，未投资时为0
  releaseDays: 0, // 释放天数，未投资时为0（不显示默认值）
  releaseMode: 'amortizing' as ReleaseMode, // 释放模式，默认等额本金
  useCompound: false, // 兼容旧字段
  secondaryBuyUsdt: 0,
  secondarySellTokens: 0,
  secondaryProfit: 0,
  releaseTokens: 0,
  releaseUsdt: 0,
  releaseTax: 0,
  dynamicReward1: 0,
  dynamicReward2: 0,
};

// 初始状态: 从 defaultSystemState 统一获取参数
// 预售质押流程:
// 1. 用户购买B18预售质押，USDC 50%支付给国库，50%配比交付合约拨出的等值B18添加LP流动性
// 2. 交付合约拨出质押B18本金去质押合约
// 3. 释放方式: 本+息按B18市场价格由国库兑付USDC
// 4. 每日释放根据分批释放天数收取不同税收
// 5. 税收USDC自动购买二级市场B18，放入SPP平衡合约
const initialState: SimulationState = {
  tokenPrice: defaultSystemState.tokenPrice,
  initialTokenPrice: defaultSystemState.tokenPrice,
  slippage: AMM_SLIPPAGE,
  circulatingSupply: defaultSystemState.circulatingSupply,
  treasuryBalance: defaultSystemState.treasuryBalance,
  previousTreasuryBalance: 0,
  sppBalance: defaultSystemState.sppBalance,
  sppHeldB18: 0,
  vestingBalance: defaultSystemState.deliveryContractTokens,
  bonusPoolBalance: defaultSystemState.bonusPoolTokens,
  totalBurned: defaultSystemState.totalBurned,
  lpPoolTokens: defaultSystemState.lpPoolTokens,
  lpPoolUsdt: defaultSystemState.lpPoolUsdt,
  pendingWithdrawals: defaultSystemState.totalPendingWithdrawals,
  withdrawalQueue: [],
  lastWithdrawalTokens: 0,
  staticRewardBase: 0,
  bonusPoolTotal: 0,
  lpUsdtAdded: 0,
  lpB18Added: 0,
  lpB18FromDelivery: 0,
  totalStaked: 0,
  totalReleased: 0,
  totalScheduledRelease: 0,
  totalInvestment: 0,
  releaseProgressSum: 0,
  calculations: initialCalculations,
};

export default function Dashboard() {
  const [state, setState] = useState<SimulationState>(initialState);
  const [mobileStep, setMobileStep] = useState(0);
  const isMobile = useIsMobile();
  const [stakingPeriods, setStakingPeriods] = useState<StakingPeriod[]>(defaultStakingPeriods);
  const [staticReleaseTax, setStaticReleaseTax] = useState(defaultStaticReleaseTax);
  const [dynamicReleaseTax, setDynamicReleaseTax] = useState(defaultDynamicReleaseTax);
  const [rewardTiers, setRewardTiers] = useState(defaultRewardTiers);

  // 模拟订单状态（最多10笔）
  const [simulatedOrders, setSimulatedOrders] = useState<SimulatedOrder[]>([]);
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);

  // 添加新订单
  const handleAddOrder = useCallback((order: Omit<SimulatedOrder, 'id' | 'createdAt'>) => {
    if (simulatedOrders.length >= 10) return;
    setSimulatedOrders(prev => [
      ...prev,
      {
        ...order,
        id: prev.length + 1,
        createdAt: Date.now(),
      }
    ]);
    // 自动跳转到第2步查看订单
    setMobileStep(1);
    // 选中新添加的订单
    setCurrentOrderIndex(simulatedOrders.length);
  }, [simulatedOrders.length]);

  const handleReset = useCallback(() => {
    setState(initialState);
    setStakingPeriods(defaultStakingPeriods);
    setStaticReleaseTax(defaultStaticReleaseTax);
    setDynamicReleaseTax(defaultDynamicReleaseTax);
    setRewardTiers(defaultRewardTiers);
    setSimulatedOrders([]);
    setCurrentOrderIndex(0);
  }, []);

  // 更新订单的已释放天数
  const handleUpdateOrderReleasedDays = useCallback((orderIndex: number, releasedDays: number) => {
    setSimulatedOrders(prev => prev.map((order, i) =>
      i === orderIndex ? { ...order, releasedDays } : order
    ));
  }, []);

  // 更新订单的已兑付USDC
  const handleUpdateOrderReleasedUsdc = useCallback((orderIndex: number, releasedUsdc: number) => {
    setSimulatedOrders(prev => prev.map((order, i) =>
      i === orderIndex ? { ...order, releasedUsdc } : order
    ));
  }, []);

  const updateCalculations = useCallback((updates: Partial<CalculationSummary>) => {
    setState((prev) => ({
      ...prev,
      calculations: { ...prev.calculations, ...updates },
    }));
  }, []);

  const handlePurchase = useCallback(
    (result: { tokensPurchased: number; usdtSpent: number }) => {
      setState((prev) => {
        // 使用共享计算函数
        const purchaseResult = calculatePresalePurchase(
          result.usdtSpent,
          prev.tokenPrice,
          prev.lpPoolTokens,
          prev.lpPoolUsdt,
          prev.vestingBalance,
          prev.treasuryBalance,
          prev.circulatingSupply
        );
        
        // 检查是否购买成功
        if (purchaseResult.tokensPurchased === 0) {
          console.warn("交付合约余额不足");
          return prev;
        }
        
        return {
          ...prev,
          circulatingSupply: purchaseResult.newCirculatingSupply,
          previousTreasuryBalance: prev.treasuryBalance,
          treasuryBalance: purchaseResult.newTreasuryBalance,
          lpPoolTokens: purchaseResult.newLpTokens,
          lpPoolUsdt: purchaseResult.newLpUsdt,
          tokenPrice: purchaseResult.priceAfterPurchase,
          totalStaked: prev.totalStaked + purchaseResult.tokensPurchased,
          lpUsdtAdded: prev.lpUsdtAdded + purchaseResult.usdtToLP,
          lpB18Added: prev.lpB18Added + purchaseResult.b18ToLP,
          totalInvestment: prev.totalInvestment + result.usdtSpent,
          lpB18FromDelivery: prev.lpB18FromDelivery + purchaseResult.b18ToLP,
          vestingBalance: purchaseResult.newVestingBalance,
        };
      });
    },
    []
  );

  // 桌面版购买并创建订单
  const handleDesktopPurchase = useCallback(
    (result: { tokensPurchased: number; usdtSpent: number }) => {
      // 先创建订单
      if (simulatedOrders.length < 10 && state.calculations.stakingPurchaseUsdt > 0) {
        const calc = state.calculations;
        const releaseMode = calc.releaseMode || (calc.useCompound ? 'compound' : 'amortizing');
        handleAddOrder({
          investment: result.usdtSpent,
          tokensPurchased: result.tokensPurchased,
          stakingDays: calc.stakingPeriodDays,
          stakingDailyRate: calc.stakingDailyRate,
          releaseDays: calc.releaseDays,
          releaseMode,
          taxRate: calc.stakingTotalValue > 0 ? (calc.stakingReleaseTax / calc.stakingTotalValue) : 0,
          totalTokens: calc.stakingTotalTokens,
          totalValue: calc.stakingTotalValue,
          releasedDays: 0,
          releasedUsdc: 0,
        });
      }
      // 然后执行购买
      handlePurchase(result);
    },
    [simulatedOrders.length, state.calculations, handleAddOrder, handlePurchase]
  );

  const handleTrade = useCallback((result: { type: "buy" | "sell" | "spp_buy" | "spp_sell"; amount: number; newPrice: number; tokensReceived?: number; usdtReceived?: number }) => {
    setState((prev) => {
      if (result.type === "buy") {
        // 使用共享计算函数
        const tradeResult = calculateSecondaryBuy(
          result.amount,
          prev.lpPoolTokens,
          prev.lpPoolUsdt
        );
        return {
          ...prev,
          lpPoolTokens: tradeResult.newLpTokens,
          lpPoolUsdt: tradeResult.newLpUsdt,
          tokenPrice: tradeResult.priceAfterTrade,
          lpUsdtAdded: prev.lpUsdtAdded + (result.amount - tradeResult.slippageCost),
        };
      } else if (result.type === "sell") {
        // 使用共享计算函数
        const tradeResult = calculateSecondarySell(
          result.amount,
          prev.lpPoolTokens,
          prev.lpPoolUsdt
        );
        return {
          ...prev,
          lpPoolTokens: tradeResult.newLpTokens,
          lpPoolUsdt: tradeResult.newLpUsdt,
          tokenPrice: tradeResult.priceAfterTrade,
          lpB18Added: prev.lpB18Added + tradeResult.tokensTraded,
        };
      } else if (result.type === "spp_buy") {
        // SPP买入：消耗SPP的USDC余额，从LP买入B18（推高价格）
        const actualBuyAmount = Math.min(result.amount, prev.sppBalance);
        const tradeResult = calculateSecondaryBuy(
          actualBuyAmount,
          prev.lpPoolTokens,
          prev.lpPoolUsdt
        );
        return {
          ...prev,
          lpPoolTokens: tradeResult.newLpTokens,
          lpPoolUsdt: tradeResult.newLpUsdt,
          tokenPrice: tradeResult.priceAfterTrade,
          sppBalance: prev.sppBalance - actualBuyAmount,
          sppHeldB18: prev.sppHeldB18 + (result.tokensReceived || tradeResult.tokensTraded),
        };
      } else {
        // SPP卖出：卖出SPP持有的B18，获得USDC（拉低价格，平衡市场）
        const actualSellAmount = Math.min(result.amount, prev.sppHeldB18);
        const tradeResult = calculateSecondarySell(
          actualSellAmount,
          prev.lpPoolTokens,
          prev.lpPoolUsdt
        );
        return {
          ...prev,
          lpPoolTokens: tradeResult.newLpTokens,
          lpPoolUsdt: tradeResult.newLpUsdt,
          tokenPrice: tradeResult.priceAfterTrade,
          sppHeldB18: prev.sppHeldB18 - actualSellAmount,
          sppBalance: prev.sppBalance + (result.usdtReceived || tradeResult.usdtTraded),
        };
      }
    });
  }, []);

  const handleRelease = useCallback((result: { 
    tokensReleased: number; 
    usdtReceived: number; 
    newPrice: number;
    toDeliveryContract: number;
    toBurn: number;
    toBonusPool: number;
    newLpUsdt?: number;
    newLpTokens?: number;
    sppUsdcReceived?: number; // 兼容旧字段
    sppB18Received?: number;  // 10% B18进入SPP合约
    totalScheduledRelease?: number; // 本次释放计划的总金额
    releaseDays?: number; // 废弃
    stakingPeriodDays?: number; // 废弃
  }) => {
    setState((prev) => {
      const newTotalStaked = Math.max(0, prev.totalStaked - result.tokensReleased);
      const newTotalReleased = prev.totalReleased + result.usdtReceived;
      
      // 计划释放总额：使用MAX而非SUM，避免同一批次多次确认导致重复计算
      // 每次确认都传入完整批次总额，取最大值即为实际计划释放
      const scheduledAdd = result.totalScheduledRelease ?? 0;
      const newTotalScheduledRelease = Math.max(prev.totalScheduledRelease, scheduledAdd);
      
      // 国库支付USDC给用户
      const newTreasuryBalance = Math.max(0, prev.treasuryBalance - result.usdtReceived);
      
      // 兑付后B18分配: 50%回交付合约, 20%销毁, 20%奖金池, 10%进入SPP（不自动交易）
      const newVestingBalance = prev.vestingBalance + result.toDeliveryContract;
      const newTotalBurned = prev.totalBurned + result.toBurn;
      const newBonusPoolBalance = prev.bonusPoolBalance + result.toBonusPool;
      
      // SPP合约: 10%税收等值USDC从LP买入B18，B18进入SPP
      const sppB18Added = result.sppB18Received ?? 0;
      const newSppHeldB18 = prev.sppHeldB18 + sppB18Added;
      
      // LP池变化: 10%税收USDC进入LP买入B18（价格上涨）
      const newLpUsdt = result.newLpUsdt ?? prev.lpPoolUsdt;
      const newLpTokens = result.newLpTokens ?? prev.lpPoolTokens;
      
      // 流通量减少（用户释放的代币被分配）
      const newCirculatingSupply = Math.max(0, prev.circulatingSupply - result.tokensReleased);
      
      return {
        ...prev,
        tokenPrice: result.newPrice,  // 税收买入后价格上涨
        lpPoolUsdt: newLpUsdt,        // LP USDC增加
        lpPoolTokens: newLpTokens,    // LP B18减少
        totalStaked: result.totalScheduledRelease ?? newTotalStaked, // 使用传回的剩余本金作为新的利息基数
        totalReleased: newTotalReleased,
        totalScheduledRelease: newTotalScheduledRelease,
        previousTreasuryBalance: prev.treasuryBalance,
        treasuryBalance: newTreasuryBalance,
        sppHeldB18: newSppHeldB18,  // SPP收到从LP买入的B18
        vestingBalance: newVestingBalance,
        totalBurned: newTotalBurned,
        bonusPoolBalance: newBonusPoolBalance,
        circulatingSupply: newCirculatingSupply,
      };
    });
  }, []);

  // 计算代币价格增长百分比 (相对于初始价格)
  const priceChange =
    state.initialTokenPrice > 0
      ? (state.tokenPrice - state.initialTokenPrice) / state.initialTokenPrice
      : 0;

  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      {/* 移动端：直接渲染MobileStepWizard（全屏布局） */}
      {isMobile && (
        <MobileStepWizard
          currentStep={mobileStep}
          onStepChange={setMobileStep}
          onReset={handleReset}
          simulatedOrders={simulatedOrders}
          onAddOrder={handleAddOrder}
          currentOrderIndex={currentOrderIndex}
          onOrderIndexChange={setCurrentOrderIndex}
          onUpdateOrderReleasedDays={handleUpdateOrderReleasedDays}
          onUpdateOrderReleasedUsdc={handleUpdateOrderReleasedUsdc}
          metrics={{
            tokenPrice: state.tokenPrice,
            priceChange: priceChange,
            circulatingSupply: state.circulatingSupply,
            treasuryBalance: state.treasuryBalance,
            sppBalance: state.sppBalance,
            totalBurned: state.totalBurned,
            vestingBalance: state.vestingBalance,
            bonusPoolBalance: state.bonusPoolBalance,
            lpPoolTokens: state.lpPoolTokens,
            lpPoolUsdt: state.lpPoolUsdt,
            lpUsdtAdded: state.lpUsdtAdded,
            lpB18Added: state.lpB18Added,
            lpB18FromDelivery: state.lpB18FromDelivery,
            totalInvestment: state.totalInvestment,
            totalReleased: state.totalReleased,
            totalScheduledRelease: state.totalScheduledRelease,
          }}
        >
              <StakingPage
                tokenPrice={state.tokenPrice}
                slippage={state.slippage}
                lpPoolTokens={state.lpPoolTokens}
                lpPoolUsdt={state.lpPoolUsdt}
                stakingPeriods={stakingPeriods}
                staticReleaseTax={staticReleaseTax}
                onPurchase={handlePurchase}
                onCalculationChange={(calc) => updateCalculations(calc)}
              />
              <ReleaseWithdrawal
                tokenPrice={state.tokenPrice}
                totalStaked={state.totalStaked}
                stakingTotalValue={state.calculations.stakingTotalValue}
                stakingTotalTokens={state.calculations.stakingTotalTokens}
                stakingPurchaseUsdt={state.calculations.stakingPurchaseUsdt}
                stakingTokensPurchased={state.calculations.stakingTokens}
                stakingPeriodDays={state.calculations.stakingPeriodDays}
                stakingDailyRate={state.calculations.stakingDailyRate}
                releaseDays={state.calculations.releaseDays}
                releaseMode={state.calculations.releaseMode}
                useCompound={state.calculations.useCompound}
                lpPoolTokens={state.lpPoolTokens}
                lpPoolUsdt={state.lpPoolUsdt}
                treasuryBalance={state.treasuryBalance}
                sppBalance={state.sppBalance}
                previousTreasuryBalance={state.previousTreasuryBalance}
                staticReleaseTax={staticReleaseTax}
                onRelease={handleRelease}
                onCalculationChange={(calc) => updateCalculations(calc)}
              />
              <SecondaryMarket
                tokenPrice={state.tokenPrice}
                lpPoolTokens={state.lpPoolTokens}
                lpPoolUsdt={state.lpPoolUsdt}
                sppBalance={state.sppBalance}
                sppHeldB18={state.sppHeldB18}
                onTrade={handleTrade}
                onCalculationChange={(calc) => updateCalculations(calc)}
              />
              <DynamicRewards
                tokenPrice={state.tokenPrice}
                rewardTiers={rewardTiers}
                dynamicReleaseTax={dynamicReleaseTax}
                bonusPoolB18={state.bonusPoolBalance}
                onCalculationChange={(calc) => updateCalculations(calc)}
              />
              <TokenDistribution
                circulatingSupply={state.circulatingSupply}
                vestingBalance={state.vestingBalance}
                burnedTokens={state.totalBurned}
                bonusPoolTokens={state.bonusPoolBalance}
                lpPoolTokens={state.lpPoolTokens}
                lastWithdrawalTokens={state.lastWithdrawalTokens}
              />
              <CashFlowSimulator
                tokenPrice={state.tokenPrice}
                treasuryBalance={state.treasuryBalance}
                lpPoolTokens={state.lpPoolTokens}
                lpPoolUsdt={state.lpPoolUsdt}
                vestingBalance={state.vestingBalance}
                circulatingSupply={state.circulatingSupply}
                totalBurned={state.totalBurned}
                staticReleaseTax={staticReleaseTax}
              />
        </MobileStepWizard>
      )}

      {/* 桌面端：新版侧边栏布局 */}
      {!isMobile && (
        <DesktopLayout
          currentStep={mobileStep}
          onStepChange={setMobileStep}
          onReset={handleReset}
          simulatedOrders={simulatedOrders}
          currentOrderIndex={currentOrderIndex}
          onOrderIndexChange={setCurrentOrderIndex}
          onUpdateOrderReleasedDays={handleUpdateOrderReleasedDays}
          onUpdateOrderReleasedUsdc={handleUpdateOrderReleasedUsdc}
          onDesktopPurchase={handleDesktopPurchase}
          metrics={{
            tokenPrice: state.tokenPrice,
            priceChange: priceChange,
            circulatingSupply: state.circulatingSupply,
            treasuryBalance: state.treasuryBalance,
            sppBalance: state.sppBalance,
            totalBurned: state.totalBurned,
            vestingBalance: state.vestingBalance,
            bonusPoolBalance: state.bonusPoolBalance,
            lpPoolTokens: state.lpPoolTokens,
            lpPoolUsdt: state.lpPoolUsdt,
            lpUsdtAdded: state.lpUsdtAdded,
            lpB18Added: state.lpB18Added,
            lpB18FromDelivery: state.lpB18FromDelivery,
            totalInvestment: state.totalInvestment,
            totalReleased: state.totalReleased,
            totalScheduledRelease: state.totalScheduledRelease,
          }}
        >
          <StakingPage
            tokenPrice={state.tokenPrice}
            slippage={state.slippage}
            lpPoolTokens={state.lpPoolTokens}
            lpPoolUsdt={state.lpPoolUsdt}
            stakingPeriods={stakingPeriods}
            staticReleaseTax={staticReleaseTax}
            onPurchase={handlePurchase}
            onCalculationChange={(calc) => updateCalculations(calc)}
          />
          <ReleaseWithdrawal
            tokenPrice={state.tokenPrice}
            totalStaked={state.totalStaked}
            stakingTotalValue={state.calculations.stakingTotalValue}
            stakingTotalTokens={state.calculations.stakingTotalTokens}
            stakingPurchaseUsdt={state.calculations.stakingPurchaseUsdt}
            stakingTokensPurchased={state.calculations.stakingTokens}
            stakingPeriodDays={state.calculations.stakingPeriodDays}
            stakingDailyRate={state.calculations.stakingDailyRate}
            releaseDays={state.calculations.releaseDays}
            releaseMode={state.calculations.releaseMode}
            useCompound={state.calculations.useCompound}
            lpPoolTokens={state.lpPoolTokens}
            lpPoolUsdt={state.lpPoolUsdt}
            treasuryBalance={state.treasuryBalance}
            sppBalance={state.sppBalance}
            previousTreasuryBalance={state.previousTreasuryBalance}
            staticReleaseTax={staticReleaseTax}
            onRelease={handleRelease}
            onCalculationChange={(calc) => updateCalculations(calc)}
          />
          <SecondaryMarket
            tokenPrice={state.tokenPrice}
            lpPoolTokens={state.lpPoolTokens}
            lpPoolUsdt={state.lpPoolUsdt}
            sppBalance={state.sppBalance}
            sppHeldB18={state.sppHeldB18}
            onTrade={handleTrade}
            onCalculationChange={(calc) => updateCalculations(calc)}
          />
          <DynamicRewards
            tokenPrice={state.tokenPrice}
            rewardTiers={rewardTiers}
            dynamicReleaseTax={dynamicReleaseTax}
            bonusPoolB18={state.bonusPoolBalance}
            onCalculationChange={(calc) => updateCalculations(calc)}
          />
          <TokenDistribution
            circulatingSupply={state.circulatingSupply}
            vestingBalance={state.vestingBalance}
            burnedTokens={state.totalBurned}
            bonusPoolTokens={state.bonusPoolBalance}
            lpPoolTokens={state.lpPoolTokens}
            lastWithdrawalTokens={state.lastWithdrawalTokens}
          />
          <CashFlowSimulator
            tokenPrice={state.tokenPrice}
            treasuryBalance={state.treasuryBalance}
            lpPoolTokens={state.lpPoolTokens}
            lpPoolUsdt={state.lpPoolUsdt}
            vestingBalance={state.vestingBalance}
            circulatingSupply={state.circulatingSupply}
            totalBurned={state.totalBurned}
            staticReleaseTax={staticReleaseTax}
          />
        </DesktopLayout>
      )}
    </div>
  );
}
