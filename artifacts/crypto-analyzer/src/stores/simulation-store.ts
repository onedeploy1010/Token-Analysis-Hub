import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  defaultStakingPeriods,
  defaultStaticReleaseTax,
  defaultDynamicReleaseTax,
  defaultRewardTiers,
  StakingPeriod,
  StaticReleaseTax,
  DynamicReleaseTax,
  RewardTier,
  B18_DISTRIBUTION,
  FUND_DISTRIBUTION,
} from '@shared/schema';
import {
  calculatePresalePurchase,
  calculateSecondaryBuy,
  calculateSecondarySell,
} from '@/lib/tokenomics';

// ============================================================
// 类型定义
// ============================================================

/**
 * 单笔解锁记录 - 每日解锁的金额进入独立释放队列
 */
export interface UnlockEntry {
  id: string;
  investmentId: string;       // 所属投资ID
  unlockDay: number;          // 解锁日 (质押期间的第几天)
  unlockAmount: number;       // 解锁金额 (USDC)
  unlockTokens: number;       // 解锁代币数 (B18)
  releasePeriodDays: number;  // 释放周期天数
  taxRate: number;            // 释放税率
  dailyReleaseAmount: number; // 每日释放金额 = unlockAmount / releasePeriodDays
  dailyReleaseTokens: number; // 每日释放代币 = unlockTokens / releasePeriodDays
  releasedDays: number;       // 已释放天数
  totalReleasedUsdc: number;  // 已释放USDC
  status: 'releasing' | 'completed';
}

/**
 * 单笔投资记录
 */
export interface Investment {
  id: string;
  timestamp: number;
  investmentUsdc: number;        // 初始投资金额 (USDC)
  initialTokens: number;         // 初始购买的B18代币数
  stakingPeriodDays: number;     // 质押天数
  releasePeriodDays: number;     // 释放天数
  dailyRate: number;             // 日利率
  useCompound: boolean;          // 是否复利
  startDay: number;              // 开始日 (模拟日)

  // 动态累计 (复利模式会变化)
  currentPrincipal: number;      // 当前本金 (USDC) - 复利模式会增加
  currentTokens: number;         // 当前本金代币数 - 复利模式会增加
  accumulatedInterest: number;   // 累计利息 (USDC)

  // 每日解锁金额 = (本金 + 利息) / 质押天数
  dailyUnlockAmount: number;     // 每日解锁USDC (初始计算, 复利模式会变)
  dailyUnlockTokens: number;     // 每日解锁B18

  // 进度跟踪
  unlockedDays: number;          // 已解锁天数 (质押期内)
  totalUnlockedUsdc: number;     // 已解锁USDC总额
  totalReleasedUsdc: number;     // 已实际释放USDC总额

  status: 'staking' | 'completed';
}

/**
 * 每日释放汇总记录
 */
export interface DailyReleaseRecord {
  day: number;
  // 解锁相关
  newUnlocks: number;            // 当日新解锁数量
  totalUnlockAmount: number;     // 当日新解锁金额
  // 释放相关
  activeReleaseQueues: number;   // 活跃释放队列数
  grossReleaseUsdc: number;      // 毛释放USDC
  taxUsdc: number;               // 税收USDC
  netReleaseUsdc: number;        // 净释放USDC
  // B18分配
  b18ToDeliveryContract: number;
  b18ToBurn: number;
  b18ToBonusPool: number;
  b18ToSpp: number;
  // 复利回流
  compoundAmount: number;        // 复利回流金额
  // 价格影响
  priceBeforeRelease: number;
  priceAfterRelease: number;
}

/**
 * 系统状态
 */
export interface SystemState {
  // LP池
  lpPoolTokens: number;
  lpPoolUsdt: number;
  tokenPrice: number;
  initialTokenPrice: number;

  // 资金池
  treasuryBalance: number;
  vestingBalance: number;
  bonusPoolBalance: number;
  sppBalance: number;
  sppHeldB18: number;

  // 统计
  totalBurned: number;
  circulatingSupply: number;

  // 累计
  totalInvestment: number;
  totalUnlocked: number;         // 累计解锁
  totalReleased: number;         // 累计释放
  totalScheduledRelease: number;

  // 滑点
  slippage: number;

  // 433队列
  pendingWithdrawals: number;
  previousTreasuryBalance: number;
}

/**
 * 配置状态
 */
export interface ConfigState {
  stakingPeriods: StakingPeriod[];
  staticReleaseTax: StaticReleaseTax[];
  dynamicReleaseTax: DynamicReleaseTax[];
  rewardTiers: RewardTier[];
}

/**
 * 时间状态
 */
export interface SimulationTimeState {
  currentDay: number;
  autoAdvance: boolean;
}

/**
 * 计算摘要
 */
export interface CalculationSummary {
  stakingPurchaseUsdt: number;
  stakingTokens: number;
  stakingInterest: number;
  stakingReleaseTax: number;
  stakingNetReturn: number;
  stakingTotalValue: number;
  stakingTotalTokens: number;
  stakingPeriodDays: number;
  stakingDailyRate: number;
  releaseDays: number;
  secondaryBuyUsdt: number;
  secondarySellTokens: number;
  secondaryProfit: number;
  releaseTokens: number;
  releaseUsdc: number;
  releaseTax: number;
  dynamicReward1: number;
  dynamicReward2: number;
}

/**
 * 完整Store状态
 */
export interface SimulationStore {
  system: SystemState;
  config: ConfigState;
  time: SimulationTimeState;
  investments: Investment[];
  unlockQueues: UnlockEntry[];      // 所有解锁释放队列
  releaseHistory: DailyReleaseRecord[];
  calculations: CalculationSummary;

  // Actions
  resetAll: () => void;
  setTokenPrice: (price: number) => void;
  setSlippage: (slippage: number) => void;

  addInvestment: (params: {
    investmentUsdc: number;
    stakingPeriodDays: number;
    releasePeriodDays: number;
    useCompound: boolean;
  }) => void;

  advanceDay: () => void;
  advanceDays: (days: number) => void;
  setCurrentDay: (day: number) => void;

  // 每日处理: 解锁 + 释放
  processDailyUnlocksAndReleases: () => void;

  executeTrade: (type: 'buy' | 'sell', amount: number) => void;
  executeSppTrade: (type: 'buy' | 'sell', amount: number) => void;

  updateStakingPeriods: (periods: StakingPeriod[]) => void;
  updateStaticReleaseTax: (taxes: StaticReleaseTax[]) => void;
  updateDynamicReleaseTax: (taxes: DynamicReleaseTax[]) => void;
  updateRewardTiers: (tiers: RewardTier[]) => void;
  updateCalculations: (updates: Partial<CalculationSummary>) => void;

  exportToCsv: () => string;
  exportData: () => object;
}

// ============================================================
// 初始状态
// ============================================================

const initialSystemState: SystemState = {
  lpPoolTokens: 100000,
  lpPoolUsdt: 10000000,
  tokenPrice: 100.0,
  initialTokenPrice: 100.0,
  treasuryBalance: 0,
  vestingBalance: 10000000,
  bonusPoolBalance: 0,
  sppBalance: 0,
  sppHeldB18: 0,
  totalBurned: 0,
  circulatingSupply: 100000,
  totalInvestment: 0,
  totalUnlocked: 0,
  totalReleased: 0,
  totalScheduledRelease: 0,
  slippage: 0.03,
  pendingWithdrawals: 0,
  previousTreasuryBalance: 0,
};

const initialConfigState: ConfigState = {
  stakingPeriods: defaultStakingPeriods,
  staticReleaseTax: defaultStaticReleaseTax,
  dynamicReleaseTax: defaultDynamicReleaseTax,
  rewardTiers: defaultRewardTiers,
};

const initialTimeState: SimulationTimeState = {
  currentDay: 0,
  autoAdvance: false,
};

const initialCalculations: CalculationSummary = {
  stakingPurchaseUsdt: 0,
  stakingTokens: 0,
  stakingInterest: 0,
  stakingReleaseTax: 0,
  stakingNetReturn: 0,
  stakingTotalValue: 0,
  stakingTotalTokens: 0,
  stakingPeriodDays: 0,
  stakingDailyRate: 0,
  releaseDays: 0,
  secondaryBuyUsdt: 0,
  secondarySellTokens: 0,
  secondaryProfit: 0,
  releaseTokens: 0,
  releaseUsdc: 0,
  releaseTax: 0,
  dynamicReward1: 0,
  dynamicReward2: 0,
};

// ============================================================
// Store 实现
// ============================================================

export const useSimulationStore = create<SimulationStore>()(
  persist(
    (set, get) => ({
      system: initialSystemState,
      config: initialConfigState,
      time: initialTimeState,
      investments: [],
      unlockQueues: [],
      releaseHistory: [],
      calculations: initialCalculations,

      resetAll: () => set({
        system: initialSystemState,
        config: initialConfigState,
        time: initialTimeState,
        investments: [],
        unlockQueues: [],
        releaseHistory: [],
        calculations: initialCalculations,
      }),

      setTokenPrice: (price) => set((state) => ({
        system: { ...state.system, tokenPrice: price }
      })),

      setSlippage: (slippage) => set((state) => ({
        system: { ...state.system, slippage }
      })),

      /**
       * 添加投资
       * 1. 购买代币
       * 2. 计算质押收益
       * 3. 计算每日解锁金额
       */
      addInvestment: (params) => {
        const state = get();
        const { system, config, time } = state;

        // 计算购买
        const purchaseResult = calculatePresalePurchase(
          params.investmentUsdc,
          system.tokenPrice,
          system.lpPoolTokens,
          system.lpPoolUsdt,
          system.vestingBalance,
          system.treasuryBalance,
          system.circulatingSupply
        );

        if (purchaseResult.tokensPurchased === 0) {
          console.warn('交付合约余额不足');
          return;
        }

        // 获取质押配置
        const stakingConfig = config.stakingPeriods.find(
          p => p.days === params.stakingPeriodDays
        ) || config.stakingPeriods[0];

        // 获取释放税率配置
        const taxConfig = config.staticReleaseTax.find(
          t => t.releaseDays === params.releasePeriodDays
        ) || config.staticReleaseTax[0];

        // 计算总利息 (基于质押周期)
        const totalInterestRate = params.useCompound
          ? Math.pow(1 + stakingConfig.dailyRate, params.stakingPeriodDays) - 1
          : params.stakingPeriodDays * stakingConfig.dailyRate;

        const totalValue = params.investmentUsdc * (1 + totalInterestRate);
        const totalInterest = totalValue - params.investmentUsdc;
        const totalTokens = purchaseResult.tokensPurchased * (1 + totalInterestRate);

        // 每日解锁 = 总价值 / 质押天数
        const dailyUnlockAmount = totalValue / params.stakingPeriodDays;
        const dailyUnlockTokens = totalTokens / params.stakingPeriodDays;

        // 计划释放总额 (扣税后)
        const scheduledRelease = totalValue * (1 - taxConfig.taxRate);

        const investment: Investment = {
          id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          investmentUsdc: params.investmentUsdc,
          initialTokens: purchaseResult.tokensPurchased,
          stakingPeriodDays: params.stakingPeriodDays,
          releasePeriodDays: params.releasePeriodDays,
          dailyRate: stakingConfig.dailyRate,
          useCompound: params.useCompound,
          startDay: time.currentDay,
          currentPrincipal: params.investmentUsdc,
          currentTokens: purchaseResult.tokensPurchased,
          accumulatedInterest: 0,
          dailyUnlockAmount,
          dailyUnlockTokens,
          unlockedDays: 0,
          totalUnlockedUsdc: 0,
          totalReleasedUsdc: 0,
          status: 'staking',
        };

        set((state) => ({
          investments: [...state.investments, investment],
          system: {
            ...state.system,
            lpPoolTokens: purchaseResult.newLpTokens,
            lpPoolUsdt: purchaseResult.newLpUsdt,
            tokenPrice: purchaseResult.priceAfterPurchase,
            previousTreasuryBalance: state.system.treasuryBalance,
            treasuryBalance: purchaseResult.newTreasuryBalance,
            vestingBalance: purchaseResult.newVestingBalance,
            circulatingSupply: purchaseResult.newCirculatingSupply,
            totalInvestment: state.system.totalInvestment + params.investmentUsdc,
            totalScheduledRelease: state.system.totalScheduledRelease + scheduledRelease,
          },
          calculations: {
            ...state.calculations,
            stakingPurchaseUsdt: params.investmentUsdc,
            stakingTokens: purchaseResult.tokensPurchased,
            stakingInterest: totalInterest,
            stakingTotalValue: totalValue,
            stakingTotalTokens: totalTokens,
            stakingPeriodDays: params.stakingPeriodDays,
            stakingDailyRate: stakingConfig.dailyRate,
            releaseDays: params.releasePeriodDays,
            stakingReleaseTax: taxConfig.taxRate,
          },
        }));
      },

      advanceDay: () => {
        const state = get();
        set({ time: { ...state.time, currentDay: state.time.currentDay + 1 } });
        get().processDailyUnlocksAndReleases();
      },

      advanceDays: (days) => {
        for (let i = 0; i < days; i++) {
          get().advanceDay();
        }
      },

      setCurrentDay: (day) => {
        set((state) => ({ time: { ...state.time, currentDay: day } }));
      },

      /**
       * 每日处理: 解锁 + 释放
       *
       * 1. 遍历所有活跃投资，创建当日解锁条目
       * 2. 遍历所有释放队列，计算当日释放
       * 3. 处理税收和B18分配
       * 4. 处理复利 (如果启用)
       */
      processDailyUnlocksAndReleases: () => {
        const state = get();
        const { system, investments, unlockQueues, config, time, releaseHistory } = state;

        let newSystem = { ...system };
        let newUnlockQueues = [...unlockQueues];
        const newReleaseHistory = [...releaseHistory];

        // 记录本日统计
        let todayNewUnlocks = 0;
        let todayUnlockAmount = 0;
        let todayGrossRelease = 0;
        let todayTaxUsdc = 0;
        let todayNetRelease = 0;
        let todayCompoundAmount = 0;
        let todayB18ToDelivery = 0;
        let todayB18ToBurn = 0;
        let todayB18ToBonus = 0;
        let todayB18ToSpp = 0;

        const priceBeforeRelease = newSystem.tokenPrice;

        // ========== 第1步: 处理每日解锁 ==========
        const updatedInvestments = investments.map(inv => {
          if (inv.status === 'completed') return inv;

          // 检查是否在质押期内
          const daysSinceStart = time.currentDay - inv.startDay;
          if (daysSinceStart < 0 || daysSinceStart >= inv.stakingPeriodDays) {
            if (inv.unlockedDays >= inv.stakingPeriodDays) {
              return { ...inv, status: 'completed' as const };
            }
            return inv;
          }

          // 计算当日利息
          let dailyInterest = 0;
          let updatedPrincipal = inv.currentPrincipal;
          let updatedTokens = inv.currentTokens;

          if (inv.useCompound) {
            // 复利模式: 利息基于当前本金
            dailyInterest = inv.currentPrincipal * inv.dailyRate;
          } else {
            // 单利模式: 利息基于初始本金
            dailyInterest = inv.investmentUsdc * inv.dailyRate;
          }

          // 当日解锁金额 = (当前本金 + 累计利息 + 当日利息) / 剩余质押天数
          // 简化: 使用预计算的每日解锁金额 (非复利) 或动态计算 (复利)
          let unlockAmount: number;
          let unlockTokens: number;

          if (inv.useCompound) {
            // 复利模式: 动态计算
            const totalValueSoFar = inv.currentPrincipal + inv.accumulatedInterest + dailyInterest;
            const remainingDays = inv.stakingPeriodDays - inv.unlockedDays;
            unlockAmount = totalValueSoFar / inv.stakingPeriodDays;
            unlockTokens = (inv.currentTokens * (1 + inv.dailyRate)) / inv.stakingPeriodDays;
          } else {
            // 单利模式: 使用预计算值
            unlockAmount = inv.dailyUnlockAmount;
            unlockTokens = inv.dailyUnlockTokens;
          }

          // 获取税率配置
          const taxConfig = config.staticReleaseTax.find(
            t => t.releaseDays === inv.releasePeriodDays
          ) || config.staticReleaseTax[0];

          // 创建解锁条目 (进入释放队列)
          const unlockEntry: UnlockEntry = {
            id: `unlock_${inv.id}_${daysSinceStart}`,
            investmentId: inv.id,
            unlockDay: time.currentDay,
            unlockAmount,
            unlockTokens,
            releasePeriodDays: inv.releasePeriodDays,
            taxRate: taxConfig.taxRate,
            dailyReleaseAmount: unlockAmount / inv.releasePeriodDays,
            dailyReleaseTokens: unlockTokens / inv.releasePeriodDays,
            releasedDays: 0,
            totalReleasedUsdc: 0,
            status: 'releasing',
          };

          newUnlockQueues.push(unlockEntry);
          todayNewUnlocks++;
          todayUnlockAmount += unlockAmount;

          return {
            ...inv,
            currentPrincipal: updatedPrincipal,
            currentTokens: updatedTokens,
            accumulatedInterest: inv.accumulatedInterest + dailyInterest,
            unlockedDays: inv.unlockedDays + 1,
            totalUnlockedUsdc: inv.totalUnlockedUsdc + unlockAmount,
          };
        });

        // ========== 第2步: 处理所有释放队列 ==========
        newUnlockQueues = newUnlockQueues.map(queue => {
          if (queue.status === 'completed') return queue;
          if (queue.releasedDays >= queue.releasePeriodDays) {
            return { ...queue, status: 'completed' as const };
          }

          // 当日释放金额
          const grossRelease = queue.dailyReleaseAmount;
          const taxAmount = grossRelease * queue.taxRate;
          const netRelease = grossRelease - taxAmount;

          // 当日释放B18
          const releaseTokens = queue.dailyReleaseTokens;

          // B18分配
          const toDelivery = releaseTokens * B18_DISTRIBUTION.deliveryContract;
          const toBurn = releaseTokens * B18_DISTRIBUTION.burn;
          const toBonus = releaseTokens * B18_DISTRIBUTION.bonusPool;
          const toSpp = releaseTokens * B18_DISTRIBUTION.spp;

          // 累计统计
          todayGrossRelease += grossRelease;
          todayTaxUsdc += taxAmount;
          todayNetRelease += netRelease;
          todayB18ToDelivery += toDelivery;
          todayB18ToBurn += toBurn;
          todayB18ToBonus += toBonus;
          todayB18ToSpp += toSpp;

          return {
            ...queue,
            releasedDays: queue.releasedDays + 1,
            totalReleasedUsdc: queue.totalReleasedUsdc + netRelease,
            status: (queue.releasedDays + 1 >= queue.releasePeriodDays ? 'completed' : 'releasing') as UnlockEntry['status'],
          };
        });

        // ========== 第3步: 税收USDC购买B18给SPP (价格上涨) ==========
        if (todayTaxUsdc > 0) {
          const k = newSystem.lpPoolTokens * newSystem.lpPoolUsdt;
          const newLpUsdt = newSystem.lpPoolUsdt + todayTaxUsdc;
          const newLpTokens = k / newLpUsdt;
          const b18BoughtForSpp = newSystem.lpPoolTokens - newLpTokens;
          const newPrice = newLpUsdt / newLpTokens;

          newSystem = {
            ...newSystem,
            lpPoolTokens: newLpTokens,
            lpPoolUsdt: newLpUsdt,
            tokenPrice: newPrice,
            sppHeldB18: newSystem.sppHeldB18 + todayB18ToSpp + b18BoughtForSpp,
          };
        }

        // ========== 第4步: 更新系统状态 ==========
        newSystem = {
          ...newSystem,
          previousTreasuryBalance: newSystem.treasuryBalance,
          treasuryBalance: Math.max(0, newSystem.treasuryBalance - todayNetRelease),
          vestingBalance: newSystem.vestingBalance + todayB18ToDelivery,
          bonusPoolBalance: newSystem.bonusPoolBalance + todayB18ToBonus,
          totalBurned: newSystem.totalBurned + todayB18ToBurn,
          totalUnlocked: newSystem.totalUnlocked + todayUnlockAmount,
          totalReleased: newSystem.totalReleased + todayNetRelease,
        };

        // ========== 第5步: 处理复利 (释放金额加回本金) ==========
        const finalInvestments = updatedInvestments.map(inv => {
          if (!inv.useCompound || inv.status === 'completed') return inv;

          // 计算该投资今日释放的金额
          const invReleases = newUnlockQueues
            .filter(q => q.investmentId === inv.id && q.status === 'releasing')
            .reduce((sum, q) => sum + q.dailyReleaseAmount * (1 - q.taxRate), 0);

          if (invReleases > 0) {
            todayCompoundAmount += invReleases;
            return {
              ...inv,
              currentPrincipal: inv.currentPrincipal + invReleases,
              currentTokens: inv.currentTokens + (invReleases / newSystem.tokenPrice),
              totalReleasedUsdc: inv.totalReleasedUsdc + invReleases,
            };
          }
          return inv;
        });

        // 记录当日
        const record: DailyReleaseRecord = {
          day: time.currentDay,
          newUnlocks: todayNewUnlocks,
          totalUnlockAmount: todayUnlockAmount,
          activeReleaseQueues: newUnlockQueues.filter(q => q.status === 'releasing').length,
          grossReleaseUsdc: todayGrossRelease,
          taxUsdc: todayTaxUsdc,
          netReleaseUsdc: todayNetRelease,
          b18ToDeliveryContract: todayB18ToDelivery,
          b18ToBurn: todayB18ToBurn,
          b18ToBonusPool: todayB18ToBonus,
          b18ToSpp: todayB18ToSpp,
          compoundAmount: todayCompoundAmount,
          priceBeforeRelease,
          priceAfterRelease: newSystem.tokenPrice,
        };
        newReleaseHistory.push(record);

        set({
          system: newSystem,
          investments: finalInvestments,
          unlockQueues: newUnlockQueues,
          releaseHistory: newReleaseHistory,
        });
      },

      executeTrade: (type, amount) => {
        const state = get();
        const { system } = state;

        if (type === 'buy') {
          const result = calculateSecondaryBuy(
            amount,
            system.lpPoolTokens,
            system.lpPoolUsdt,
            system.slippage
          );
          set({
            system: {
              ...system,
              lpPoolTokens: result.newLpTokens,
              lpPoolUsdt: result.newLpUsdt,
              tokenPrice: result.priceAfterTrade,
            },
          });
        } else {
          const result = calculateSecondarySell(
            amount,
            system.lpPoolTokens,
            system.lpPoolUsdt,
            system.slippage
          );
          set({
            system: {
              ...system,
              lpPoolTokens: result.newLpTokens,
              lpPoolUsdt: result.newLpUsdt,
              tokenPrice: result.priceAfterTrade,
            },
          });
        }
      },

      executeSppTrade: (type, amount) => {
        const state = get();
        const { system } = state;

        if (type === 'buy') {
          const actualAmount = Math.min(amount, system.sppBalance);
          if (actualAmount <= 0) return;

          const result = calculateSecondaryBuy(
            actualAmount,
            system.lpPoolTokens,
            system.lpPoolUsdt,
            0
          );
          set({
            system: {
              ...system,
              lpPoolTokens: result.newLpTokens,
              lpPoolUsdt: result.newLpUsdt,
              tokenPrice: result.priceAfterTrade,
              sppBalance: system.sppBalance - actualAmount,
              sppHeldB18: system.sppHeldB18 + result.tokensTraded,
            },
          });
        } else {
          const actualAmount = Math.min(amount, system.sppHeldB18);
          if (actualAmount <= 0) return;

          const result = calculateSecondarySell(
            actualAmount,
            system.lpPoolTokens,
            system.lpPoolUsdt,
            0
          );
          set({
            system: {
              ...system,
              lpPoolTokens: result.newLpTokens,
              lpPoolUsdt: result.newLpUsdt,
              tokenPrice: result.priceAfterTrade,
              sppHeldB18: system.sppHeldB18 - actualAmount,
              sppBalance: system.sppBalance + result.usdtTraded,
            },
          });
        }
      },

      updateStakingPeriods: (periods) => set((state) => ({
        config: { ...state.config, stakingPeriods: periods }
      })),

      updateStaticReleaseTax: (taxes) => set((state) => ({
        config: { ...state.config, staticReleaseTax: taxes }
      })),

      updateDynamicReleaseTax: (taxes) => set((state) => ({
        config: { ...state.config, dynamicReleaseTax: taxes }
      })),

      updateRewardTiers: (tiers) => set((state) => ({
        config: { ...state.config, rewardTiers: tiers }
      })),

      updateCalculations: (updates) => set((state) => ({
        calculations: { ...state.calculations, ...updates }
      })),

      exportToCsv: () => {
        const state = get();
        const { investments, unlockQueues, releaseHistory, system } = state;

        let csv = 'B18 Simulator Export\n\n';

        csv += 'System State\n';
        csv += 'Property,Value\n';
        csv += `Token Price,$${system.tokenPrice.toFixed(2)}\n`;
        csv += `LP Pool Tokens,${system.lpPoolTokens.toFixed(2)}\n`;
        csv += `LP Pool USDT,$${system.lpPoolUsdt.toFixed(2)}\n`;
        csv += `Treasury Balance,$${system.treasuryBalance.toFixed(2)}\n`;
        csv += `Total Unlocked,$${system.totalUnlocked.toFixed(2)}\n`;
        csv += `Total Released,$${system.totalReleased.toFixed(2)}\n`;
        csv += `Total Burned,${system.totalBurned.toFixed(2)}\n`;
        csv += '\n';

        csv += 'Investments\n';
        csv += 'ID,Investment,Staking Days,Release Days,Daily Unlock,Unlocked Days,Total Unlocked,Total Released,Status\n';
        investments.forEach(inv => {
          csv += `${inv.id},$${inv.investmentUsdc.toFixed(2)},${inv.stakingPeriodDays},${inv.releasePeriodDays},$${inv.dailyUnlockAmount.toFixed(2)},${inv.unlockedDays},$${inv.totalUnlockedUsdc.toFixed(2)},$${inv.totalReleasedUsdc.toFixed(2)},${inv.status}\n`;
        });
        csv += '\n';

        csv += 'Active Release Queues\n';
        csv += 'ID,Unlock Day,Unlock Amount,Release Days,Daily Release,Released Days,Status\n';
        unlockQueues.filter(q => q.status === 'releasing').forEach(q => {
          csv += `${q.id},${q.unlockDay},$${q.unlockAmount.toFixed(2)},${q.releasePeriodDays},$${q.dailyReleaseAmount.toFixed(2)},${q.releasedDays},${q.status}\n`;
        });
        csv += '\n';

        csv += 'Daily Release History\n';
        csv += 'Day,New Unlocks,Unlock Amount,Active Queues,Gross Release,Tax,Net Release,Compound,Price After\n';
        releaseHistory.forEach(rec => {
          csv += `${rec.day},${rec.newUnlocks},$${rec.totalUnlockAmount.toFixed(2)},${rec.activeReleaseQueues},$${rec.grossReleaseUsdc.toFixed(2)},$${rec.taxUsdc.toFixed(2)},$${rec.netReleaseUsdc.toFixed(2)},$${rec.compoundAmount.toFixed(2)},$${rec.priceAfterRelease.toFixed(4)}\n`;
        });

        return csv;
      },

      exportData: () => {
        const state = get();
        return {
          exportTime: new Date().toISOString(),
          system: state.system,
          config: state.config,
          time: state.time,
          investments: state.investments,
          unlockQueues: state.unlockQueues,
          releaseHistory: state.releaseHistory,
          calculations: state.calculations,
        };
      },
    }),
    {
      name: 'b18-simulation-storage-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        system: state.system,
        config: state.config,
        time: state.time,
        investments: state.investments,
        unlockQueues: state.unlockQueues,
        releaseHistory: state.releaseHistory,
        calculations: state.calculations,
      }),
    }
  )
);

// ============================================================
// 选择器 (Selectors)
// ============================================================

export const selectSystem = (state: SimulationStore) => state.system;
export const selectConfig = (state: SimulationStore) => state.config;
export const selectTime = (state: SimulationStore) => state.time;
export const selectInvestments = (state: SimulationStore) => state.investments;
export const selectUnlockQueues = (state: SimulationStore) => state.unlockQueues;
export const selectReleaseHistory = (state: SimulationStore) => state.releaseHistory;
export const selectCalculations = (state: SimulationStore) => state.calculations;

export const selectTokenPrice = (state: SimulationStore) => state.system.tokenPrice;

export const selectActiveInvestments = (state: SimulationStore) =>
  state.investments.filter(inv => inv.status !== 'completed');

export const selectActiveReleaseQueues = (state: SimulationStore) =>
  state.unlockQueues.filter(q => q.status === 'releasing');

export const selectTodayRelease = (state: SimulationStore) => {
  const history = state.releaseHistory;
  if (history.length === 0) return null;
  return history[history.length - 1];
};

export const selectTotalDailyRelease = (state: SimulationStore) =>
  state.unlockQueues
    .filter(q => q.status === 'releasing')
    .reduce((sum, q) => sum + q.dailyReleaseAmount * (1 - q.taxRate), 0);

export const selectReleaseProgress = (state: SimulationStore) => {
  const { totalReleased, totalScheduledRelease } = state.system;
  return totalScheduledRelease > 0 ? totalReleased / totalScheduledRelease : 0;
};
