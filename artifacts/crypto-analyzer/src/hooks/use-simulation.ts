/**
 * Simulation Hooks
 * 模拟器状态钩子 - 支持多释放队列模型
 */

import { useMemo, useCallback } from 'react';
import {
  useSimulationStore,
  selectSystem,
  selectConfig,
  selectTime,
  selectInvestments,
  selectUnlockQueues,
  selectReleaseHistory,
  selectCalculations,
  selectActiveInvestments,
  selectActiveReleaseQueues,
  selectTotalDailyRelease,
  selectReleaseProgress,
  selectTodayRelease,
  UnlockEntry,
  Investment,
} from '@/stores/simulation-store';
import { shallow } from 'zustand/shallow';

/**
 * 使用系统状态 (浅比较优化)
 */
export function useSystemState() {
  return useSimulationStore(selectSystem, shallow);
}

/**
 * 使用配置状态
 */
export function useConfigState() {
  return useSimulationStore(selectConfig, shallow);
}

/**
 * 使用时间状态
 */
export function useTimeState() {
  return useSimulationStore(selectTime, shallow);
}

/**
 * 使用投资记录
 */
export function useInvestments() {
  return useSimulationStore(selectInvestments, shallow);
}

/**
 * 使用解锁释放队列
 */
export function useUnlockQueues() {
  return useSimulationStore(selectUnlockQueues, shallow);
}

/**
 * 使用释放历史
 */
export function useReleaseHistory() {
  return useSimulationStore(selectReleaseHistory, shallow);
}

/**
 * 使用计算摘要
 */
export function useCalculations() {
  return useSimulationStore(selectCalculations, shallow);
}

/**
 * 使用代币价格 (单一值优化)
 */
export function useTokenPrice() {
  return useSimulationStore(state => state.system.tokenPrice);
}

/**
 * 使用价格变化
 */
export function usePriceChange() {
  return useSimulationStore(state => {
    const { tokenPrice, initialTokenPrice } = state.system;
    return initialTokenPrice > 0 ? (tokenPrice - initialTokenPrice) / initialTokenPrice : 0;
  });
}

/**
 * 使用活跃投资 (质押中)
 */
export function useActiveInvestments() {
  return useSimulationStore(selectActiveInvestments, shallow);
}

/**
 * 使用活跃释放队列
 */
export function useActiveReleaseQueues() {
  return useSimulationStore(selectActiveReleaseQueues, shallow);
}

/**
 * 使用每日释放总额 (所有活跃队列的净释放)
 */
export function useTotalDailyRelease() {
  return useSimulationStore(selectTotalDailyRelease);
}

/**
 * 使用释放进度
 */
export function useReleaseProgress() {
  return useSimulationStore(selectReleaseProgress);
}

/**
 * 使用今日释放记录
 */
export function useTodayRelease() {
  return useSimulationStore(selectTodayRelease);
}

/**
 * 使用按投资分组的释放队列
 */
export function useReleaseQueuesByInvestment() {
  const unlockQueues = useSimulationStore(selectUnlockQueues, shallow);
  const investments = useSimulationStore(selectInvestments, shallow);

  return useMemo(() => {
    const grouped: Record<string, {
      investment: Investment;
      queues: UnlockEntry[];
      totalDailyRelease: number;
      activeQueues: number;
    }> = {};

    investments.forEach(inv => {
      const invQueues = unlockQueues.filter(q => q.investmentId === inv.id);
      const activeQueues = invQueues.filter(q => q.status === 'releasing');

      grouped[inv.id] = {
        investment: inv,
        queues: invQueues,
        totalDailyRelease: activeQueues.reduce(
          (sum, q) => sum + q.dailyReleaseAmount * (1 - q.taxRate),
          0
        ),
        activeQueues: activeQueues.length,
      };
    });

    return grouped;
  }, [unlockQueues, investments]);
}

/**
 * 使用模拟器操作 (Actions)
 */
export function useSimulationActions() {
  const store = useSimulationStore();

  return useMemo(() => ({
    resetAll: store.resetAll,
    setTokenPrice: store.setTokenPrice,
    setSlippage: store.setSlippage,
    addInvestment: store.addInvestment,
    advanceDay: store.advanceDay,
    advanceDays: store.advanceDays,
    setCurrentDay: store.setCurrentDay,
    processDailyUnlocksAndReleases: store.processDailyUnlocksAndReleases,
    executeTrade: store.executeTrade,
    executeSppTrade: store.executeSppTrade,
    updateStakingPeriods: store.updateStakingPeriods,
    updateStaticReleaseTax: store.updateStaticReleaseTax,
    updateDynamicReleaseTax: store.updateDynamicReleaseTax,
    updateRewardTiers: store.updateRewardTiers,
    updateCalculations: store.updateCalculations,
    exportToCsv: store.exportToCsv,
    exportData: store.exportData,
  }), [store]);
}

/**
 * 使用投资添加器 (带验证)
 */
export function useAddInvestment() {
  const addInvestment = useSimulationStore(state => state.addInvestment);
  const { vestingBalance } = useSystemState();

  return useCallback((params: {
    investmentUsdc: number;
    stakingPeriodDays: number;
    releasePeriodDays: number;
    useCompound: boolean;
  }) => {
    if (params.investmentUsdc <= 0) {
      console.warn('Investment amount must be positive');
      return false;
    }
    if (vestingBalance <= 0) {
      console.warn('Vesting contract is empty');
      return false;
    }
    addInvestment(params);
    return true;
  }, [addInvestment, vestingBalance]);
}

/**
 * 使用模拟运行器
 */
export function useSimulationRunner() {
  const advanceDay = useSimulationStore(state => state.advanceDay);
  const advanceDays = useSimulationStore(state => state.advanceDays);
  const currentDay = useSimulationStore(state => state.time.currentDay);

  return useMemo(() => ({
    currentDay,
    runOneDay: advanceDay,
    runDays: advanceDays,
    runToDay: (targetDay: number) => {
      if (targetDay > currentDay) {
        advanceDays(targetDay - currentDay);
      }
    },
  }), [advanceDay, advanceDays, currentDay]);
}

/**
 * 使用池统计 (LP, Treasury, SPP)
 */
export function usePoolStats() {
  return useSimulationStore(
    state => ({
      lpPoolTokens: state.system.lpPoolTokens,
      lpPoolUsdt: state.system.lpPoolUsdt,
      treasuryBalance: state.system.treasuryBalance,
      sppBalance: state.system.sppBalance,
      sppHeldB18: state.system.sppHeldB18,
      bonusPoolBalance: state.system.bonusPoolBalance,
      vestingBalance: state.system.vestingBalance,
    }),
    shallow
  );
}

/**
 * 使用代币统计
 */
export function useTokenStats() {
  return useSimulationStore(
    state => ({
      totalBurned: state.system.totalBurned,
      circulatingSupply: state.system.circulatingSupply,
      tokenPrice: state.system.tokenPrice,
      priceChange: state.system.initialTokenPrice > 0
        ? (state.system.tokenPrice - state.system.initialTokenPrice) / state.system.initialTokenPrice
        : 0,
    }),
    shallow
  );
}

/**
 * 使用投资统计
 */
export function useInvestmentStats() {
  return useSimulationStore(
    state => ({
      totalInvestment: state.system.totalInvestment,
      totalUnlocked: state.system.totalUnlocked,
      totalReleased: state.system.totalReleased,
      totalScheduledRelease: state.system.totalScheduledRelease,
      activeCount: state.investments.filter(i => i.status === 'staking').length,
      completedCount: state.investments.filter(i => i.status === 'completed').length,
      totalCount: state.investments.length,
      activeReleaseQueues: state.unlockQueues.filter(q => q.status === 'releasing').length,
    }),
    shallow
  );
}

/**
 * 预计算释放预览 (用于显示未来释放情况)
 */
export function useReleasePreview(investmentParams: {
  investmentUsdc: number;
  stakingPeriodDays: number;
  releasePeriodDays: number;
  useCompound: boolean;
}) {
  const config = useConfigState();
  const tokenPrice = useTokenPrice();

  return useMemo(() => {
    const { investmentUsdc, stakingPeriodDays, releasePeriodDays, useCompound } = investmentParams;

    if (investmentUsdc <= 0) return null;

    // 获取质押配置
    const stakingConfig = config.stakingPeriods.find(
      p => p.days === stakingPeriodDays
    ) || config.stakingPeriods[0];

    // 获取释放税率配置
    const taxConfig = config.staticReleaseTax.find(
      t => t.releaseDays === releasePeriodDays
    ) || config.staticReleaseTax[0];

    // 计算总收益
    const totalInterestRate = useCompound
      ? Math.pow(1 + stakingConfig.dailyRate, stakingPeriodDays) - 1
      : stakingPeriodDays * stakingConfig.dailyRate;

    const totalValue = investmentUsdc * (1 + totalInterestRate);
    const totalInterest = totalValue - investmentUsdc;

    // 每日解锁 = 总价值 / 质押天数
    const dailyUnlock = totalValue / stakingPeriodDays;

    // 每日释放 = 每日解锁 / 释放天数
    const dailyReleasePerQueue = dailyUnlock / releasePeriodDays;

    // 最大并发释放队列数 = 释放天数
    const maxConcurrentQueues = Math.min(stakingPeriodDays, releasePeriodDays);

    // 峰值每日释放 = 所有队列同时释放
    const peakDailyRelease = maxConcurrentQueues * dailyReleasePerQueue;
    const peakDailyReleaseNet = peakDailyRelease * (1 - taxConfig.taxRate);

    // 总释放周期 = 质押天数 + 释放天数 - 1
    const totalReleasePeriod = stakingPeriodDays + releasePeriodDays - 1;

    // 总税收
    const totalTax = totalValue * taxConfig.taxRate;
    const totalNetRelease = totalValue - totalTax;

    return {
      // 输入
      investment: investmentUsdc,
      stakingDays: stakingPeriodDays,
      releaseDays: releasePeriodDays,
      useCompound,

      // 收益
      totalInterestRate: totalInterestRate * 100,
      totalInterest,
      totalValue,

      // 解锁
      dailyUnlock,

      // 释放
      dailyReleasePerQueue,
      maxConcurrentQueues,
      peakDailyRelease,
      peakDailyReleaseNet,
      totalReleasePeriod,

      // 税收
      taxRate: taxConfig.taxRate * 100,
      totalTax,
      totalNetRelease,

      // 代币
      estimatedTokens: investmentUsdc / tokenPrice,
      stakingRate: stakingConfig.dailyRate * 100,
    };
  }, [investmentParams, config, tokenPrice]);
}
