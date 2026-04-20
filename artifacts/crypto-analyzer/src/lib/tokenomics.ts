import {
  TokenConfig,
  StakingPeriod,
  StaticReleaseTax,
  DynamicReleaseTax,
  RewardTier,
  LeadershipDecay,
  SystemState,
  defaultStakingPeriods,
  defaultStaticReleaseTax,
  defaultDynamicReleaseTax,
  defaultRewardTiers,
  defaultLeadershipDecay,
  defaultSystemState,
  defaultTokenDistribution,
  AMM_SLIPPAGE,
} from "@shared/schema";

// 释放模式类型（与 mobile-step-wizard.tsx 保持一致）
// amortizing: 等额本金还本付息 - 每日释放本金+利息，质押期间线性释放
// interestOnly: 按期付息到期还本 - 质押期间只释放利息，本金到期后释放
// compound: 复利滚存 - 利息复投到本金，到期后一起释放
export type ReleaseMode = 'amortizing' | 'interestOnly' | 'compound';

// ============================================================
// 一级 market 购买/质押计算 (Primary Market Purchase/Staking - Presale)
// ============================================================
// B18经济模型 - 预售质押流程 (零滑点):
// 1. 用户支付USDC购买B18代币进行质押
// 2. USDC分配: 50%进入LP底池, 50%进入国库
// 3. 交付合约释放代币给用户（进入流通）
// 4. 交付合约同时添加等值B18到LP（配比50% USDC，维持价格稳定）
// 5. LP池USDC和B18同比例增加，价格保持稳定

export interface PresalePurchaseResult {
  // 用户获得
  tokensPurchased: number;
  effectivePrice: number;
  
  // 资金流向
  usdtToLP: number;       // 50% USDC进LP池
  usdtToTreasury: number; // 50% USDC进国库
  b18ToLP: number;        // 交付合约添加到LP的B18（配比50% USDC）
  totalFromVesting: number; // 交付合约总释放 = 给用户 + 给LP
  
  // 价格影响 (预售应该保持稳定)
  priceBeforePurchase: number;
  priceAfterPurchase: number;
  priceImpact: number;
  
  // LP池变化
  newLpUsdt: number;
  newLpTokens: number;
  
  // 新的系统状态
  newVestingBalance: number;
  newTreasuryBalance: number;
  newCirculatingSupply: number;
}

export function calculatePresalePurchase(
  usdtAmount: number,
  tokenPrice: number,
  lpPoolTokens: number,
  lpPoolUsdt: number,
  vestingBalance: number,
  treasuryBalance: number,
  circulatingSupply: number
): PresalePurchaseResult {
  // 预售无滑点
  const effectiveUsdt = usdtAmount;
  
  // USDC分配: 50%进LP池, 50%进国库
  const usdtToLP = effectiveUsdt * 0.5;
  const usdtToTreasury = effectiveUsdt * 0.5;
  
  // 当前价格
  const priceBeforePurchase = tokenPrice;
  
  // 用户获得的代币（按当前价格）
  const tokensPurchased = effectiveUsdt / tokenPrice;
  
  // 交付合约添加到LP的B18（配比50% USDC，维持价格稳定）
  const b18ToLP = usdtToLP / tokenPrice;
  
  // 交付合约总释放 = 给用户 + 给LP
  const totalFromVesting = tokensPurchased + b18ToLP;
  
  // 检查交付合约余额
  if (vestingBalance < totalFromVesting) {
    return {
      tokensPurchased: 0,
      effectivePrice: tokenPrice,
      usdtToLP: 0,
      usdtToTreasury: 0,
      b18ToLP: 0,
      totalFromVesting: 0,
      priceBeforePurchase: tokenPrice,
      priceAfterPurchase: tokenPrice,
      priceImpact: 0,
      newLpUsdt: lpPoolUsdt,
      newLpTokens: lpPoolTokens,
      newVestingBalance: vestingBalance,
      newTreasuryBalance: treasuryBalance,
      newCirculatingSupply: circulatingSupply,
    };
  }
  
  // LP池变化: USDC和B18同比例增加，价格保持稳定
  const newLpUsdt = lpPoolUsdt + usdtToLP;
  const newLpTokens = lpPoolTokens + b18ToLP;
  
  // 新价格 (应该保持不变)
  const priceAfterPurchase = newLpUsdt / newLpTokens;
  const priceImpact = tokenPrice > 0 ? (priceAfterPurchase - priceBeforePurchase) / priceBeforePurchase : 0;
  
  return {
    tokensPurchased,
    effectivePrice: tokenPrice,
    usdtToLP,
    usdtToTreasury,
    b18ToLP,
    totalFromVesting,
    priceBeforePurchase,
    priceAfterPurchase,
    priceImpact,
    newLpUsdt,
    newLpTokens,
    newVestingBalance: vestingBalance - totalFromVesting,
    newTreasuryBalance: treasuryBalance + usdtToTreasury,
    newCirculatingSupply: circulatingSupply + tokensPurchased,
  };
}

// ============================================================
// 二级 market 交易计算 (Secondary Market AMM Trading)
// ============================================================
// AMM交易有3%滑点，使用恒定乘积公式

export interface SecondaryTradeResult {
  // 交易结果
  tokensTraded: number;
  usdtTraded: number;
  slippageCost: number;
  
  // 价格影响
  priceBeforeTrade: number;
  priceAfterTrade: number;
  priceImpact: number;
  
  // LP池变化
  newLpUsdt: number;
  newLpTokens: number;
}

export function calculateSecondaryBuy(
  usdtAmount: number,
  lpPoolTokens: number,
  lpPoolUsdt: number,
  slippage: number = 0.03
): SecondaryTradeResult {
  const k = lpPoolTokens * lpPoolUsdt;
  const priceBeforeTrade = lpPoolUsdt / lpPoolTokens;
  
  // 扣除滑点
  const effectiveUsdt = usdtAmount * (1 - slippage);
  const slippageCost = usdtAmount * slippage;
  
  // AMM: USDC进入LP池，B18从LP池出来
  const newLpUsdt = lpPoolUsdt + effectiveUsdt;
  const newLpTokens = k / newLpUsdt;
  const tokensReceived = lpPoolTokens - newLpTokens;
  
  const priceAfterTrade = newLpUsdt / newLpTokens;
  const priceImpact = (priceAfterTrade - priceBeforeTrade) / priceBeforeTrade;
  
  return {
    tokensTraded: tokensReceived,
    usdtTraded: usdtAmount,
    slippageCost,
    priceBeforeTrade,
    priceAfterTrade,
    priceImpact,
    newLpUsdt,
    newLpTokens,
  };
}

export function calculateSecondarySell(
  tokenAmount: number,
  lpPoolTokens: number,
  lpPoolUsdt: number,
  slippage: number = 0.03
): SecondaryTradeResult {
  const k = lpPoolTokens * lpPoolUsdt;
  const priceBeforeTrade = lpPoolUsdt / lpPoolTokens;
  
  // AMM: B18进入LP池，USDC从LP池出来
  const newLpTokens = lpPoolTokens + tokenAmount;
  const newLpUsdt = k / newLpTokens;
  const usdtReceived = lpPoolUsdt - newLpUsdt;
  
  // 扣除滑点
  const slippageCost = usdtReceived * slippage;
  const netUsdtReceived = usdtReceived * (1 - slippage);
  
  const priceAfterTrade = newLpUsdt / newLpTokens;
  const priceImpact = (priceAfterTrade - priceBeforeTrade) / priceBeforeTrade;
  
  return {
    tokensTraded: tokenAmount,
    usdtTraded: netUsdtReceived,
    slippageCost,
    priceBeforeTrade,
    priceAfterTrade,
    priceImpact,
    newLpUsdt,
    newLpTokens,
  };
}

// 简化版本：仅用于基本计算，不更新状态
export function calculateSimplePurchase(
  usdtAmount: number,
  tokenPrice: number,
  slippage: number = 0 // 预售质押默认为0滑点
) {
  const effectiveUsdt = usdtAmount * (1 - slippage);
  const tokensPurchased = effectiveUsdt / tokenPrice;
  const usdtToLP = effectiveUsdt * 0.5;
  const usdtToTreasury = effectiveUsdt * 0.5;
  
  return {
    tokensPurchased,
    tokensToLP: tokensPurchased, // 等量代币从交付合约进入LP
    usdtToLP,
    usdtToTreasury,
    slippageCost: usdtAmount * slippage,
    effectiveUsdt,
  };
}

// Calculate staking returns
export function calculateStakingReturns(
  principal: number,
  tokenPrice: number,
  stakingDays: number,
  stakingPeriods: StakingPeriod[] = defaultStakingPeriods,
  useCompound: boolean = true // 是否使用复利计算
) {
  const period = stakingPeriods.find(p => p.days === stakingDays);
  if (!period) {
    return {
      principalValue: principal * tokenPrice,
      dailyInterestRate: 0,
      simpleInterestRate: 0,
      compoundInterestRate: 0,
      totalInterestRate: 0,
      interestEarned: 0,
      totalValue: principal * tokenPrice,
      totalTokens: principal,
    };
  }
  
  const principalValue = principal * tokenPrice;
  
  // 单利计算: 天数 × 日利率 (e.g., 30 × 0.5% = 15%)
  const simpleInterestRate = stakingDays * period.dailyRate;

  // 复利计算:
  // - 180天固定593.74%, 360天封顶3600%
  // - 其他周期按 (1 + 日利率)^天数 - 1 计算
  const rawCompoundRate = Math.pow(1 + period.dailyRate, stakingDays) - 1;
  // 对于有明确设置 totalReturn 的周期(180天/360天)，直接使用设置值作为复利结果
  const compoundInterestRate = period.totalReturn;
  
  // 根据开关选择使用哪种利率
  const totalInterestRate = useCompound ? compoundInterestRate : simpleInterestRate;
  const totalMultiplier = 1 + totalInterestRate;
  const interestEarned = principal * totalInterestRate * tokenPrice;
  const totalValue = principalValue * totalMultiplier;
  
  return {
    principalValue,
    dailyInterestRate: period.dailyRate,
    simpleInterestRate,
    compoundInterestRate,
    totalInterestRate,
    interestEarned,
    totalValue,
    totalTokens: principal * totalMultiplier,
  };
}

// Calculate linear release schedule
export function calculateLinearRelease(
  totalValue: number,
  releaseDays: number,
  isStatic: boolean = true,
  staticTaxRates: StaticReleaseTax[] = defaultStaticReleaseTax,
  dynamicTaxRates: DynamicReleaseTax[] = defaultDynamicReleaseTax
) {
  const taxRates = isStatic ? staticTaxRates : dynamicTaxRates;
  const taxConfig = taxRates.find(t => t.releaseDays === releaseDays) || taxRates[0];
  
  const dailyRelease = totalValue / releaseDays;
  const taxAmount = totalValue * taxConfig.taxRate;
  const netAfterTax = totalValue - taxAmount;
  
  // Generate daily release schedule
  const schedule = [];
  let remainingValue = totalValue;
  const dailyTax = taxAmount / releaseDays;
  
  for (let day = 1; day <= releaseDays; day++) {
    const released = dailyRelease;
    const tax = dailyTax;
    const net = released - tax;
    remainingValue -= released;
    
    schedule.push({
      day,
      released,
      tax,
      net,
      cumulative: dailyRelease * day,
      remaining: Math.max(0, remainingValue),
    });
  }
  
  return {
    dailyRelease,
    totalReleaseDays: releaseDays,
    taxRate: taxConfig.taxRate,
    taxAmount,
    netAfterTax,
    schedule,
  };
}

// ============================================================
// 释放提现计算 (Release/Withdrawal Simulation)
// ============================================================
// 正确的释放流程（用户确认）:
// 1. 释放兑现从国库支付USDC → 不直接影响LP币价
// 2. 释放税收USDC → 从LP回购B18 → B18进入SPP合约
// 3. 回购动作会影响币价上涨（减少LP中的B18，增加LP中的USDC）
// 4. SPP合约持有回购的B18，用于后续币价稳定
// 5. 释放的B18分配：50%交付合约, 20%销毁, 20%奖励池, 10%SPP

export interface ReleaseSimulationResult {
  // 税收计算
  taxRate: number;
  taxTokens: number;
  netTokens: number;
  
  // 兑付后B18分配 (税收代币的分配)
  taxToDeliveryContract: number;  // 50% 进交付合约
  taxToBurn: number;              // 20% 销毁
  taxToBonusPool: number;         // 20% 进奖励池
  taxToSellLP: number;            // 10% 税收USDC购买LP的B18 (保持字段名兼容)
  
  // 10% B18进入SPP合约（不自动交易，LP和价格不变）
  sppB18Received: number;   // SPP收到的B18数量
  sppUsdcReceived: number;  // 兼容字段，始终为0
  
  // 旧字段保持兼容（净代币分配 - 已废弃，改为税收分配）
  toDeliveryContract: number;
  toBurn: number;
  toBonusPool: number;
  
  // 税收USDC计算
  taxUsdc: number;          // 税收USDC总额 = 兑付USDC × 税率
  grossUsdcPayout: number;  // 国库兑付USDC总额 = 释放B18 × 价格
  taxUsdcToLP: number;      // 税收USDC进入LP买B18
  b18BoughtFromLP: number;  // 从LP购买的B18数量（进入SPP）
  b18Bought: number;        // 兼容旧字段
  b18SoldToLP: number;      // 废弃，保持兼容
  
  // 用户收益
  usdtReceived: number;
  effectivePrice: number;
  dailyRelease: number;
  
  // 价格影响
  newPrice: number;
  priceImpact: number;
  
  // LP池变化
  newLpUsdt: number;
  newLpTokens: number;
}

// ============================================================
// 释放提现计算 (Release/Withdrawal Simulation)
// ============================================================
// 新的现金流逻辑 (每日释放):
// 1. 每天都在释放本金+利息（不是质押结束后才释放）
// 2. 释放天数决定税率：天数越短税率越高
// 3. 国库兑付USDC = 释放B18 × 价格
// 4. 税收USDC → 去LP买B18 → B18进入交付合约
// 5. 剩余B18 / 释放天数 = 每日从交付合约交付的数量
// 6. 释放的B18分配: 50%交付合约, 20%销毁, 20%奖励池, 10%SPP
// 7. 如果选择复利滚存，释放金额重新加回本金继续产生利润

// 每日释放计划结构
export interface DailyReleaseSchedule {
  day: number;                    // 释放第几天
  dailyPrincipal: number;         // 当日开始时的本金B18
  dailyPrincipalRelease: number;  // 当日应释放的本金部分
  dailyInterest: number;          // 当日产生的利息B18
  dailyGrossB18: number;          // 当日应放本利 (税前) = 本金释放 + 利息
  dailyTotalB18: number;          // 当日单笔释放B18 (净释放量/释放天数)
  dailyNetB18: number;            // 当日净释放B18 (税后)
  dailyWithdrawableB18: number;   // 当日可提现B18 (所有到期分笔之和)
  dailyWithdrawableUsdc: number;  // 当日可提现USDC
  nextDayPrincipal: number;       // 次日本金 (扣除提现后)
  dailyGrossUsdc: number;         // 国库当日兑付USDC
  dailyTaxUsdc: number;           // 当日税收USDC
  dailyNetUsdc: number;           // 用户当日净收USDC
  dailyB18BoughtFromLP: number;   // 当日税收USDC从LP买的B18
  dailyDeliveryB18: number;       // 当日进入交付合约的B18
  cumulativeNetUsdc: number;      // 累计用户净收USDC
  cumulativeB18Released: number;  // 累计释放B18
  cumulativeWithdrawnB18: number; // 累计已提现B18
  cumulativeInterest: number;     // 累计利息B18
  isCompoundingPhase?: boolean;   // 是否在复利滚存阶段（复利模式专用）
}

// 扩展的释放模拟结果（含每日计划）
export interface ExtendedReleaseResult extends ReleaseSimulationResult {
  // 每日释放计划
  dailySchedule: DailyReleaseSchedule[];

  // 释放模式
  releaseMode: ReleaseMode;       // 释放模式
  useCompound: boolean;           // 兼容旧字段（releaseMode='compound'时为true）
  compoundedPrincipal: number;    // 到期时的本金（复利模式下包含复利增益）
  compoundedProfit: number;       // 复利产生的额外利润（仅复利模式）

  // 交付合约相关
  totalB18ToDelivery: number;     // 总共进入交付合约的B18
  dailyDeliveryAmount: number;    // 每日从交付合约交付的B18数量

  // 质押参数（用于每日利息计算）
  principalTokens: number;        // 原始本金B18 (P0)
  dailyInterestRate: number;      // 日利率 (r)
  totalInterestB18: number;       // 总利息B18
}

export function calculateReleaseSimulation(
  releaseAmount: number,           // 要释放的B18总量（本金+利息）
  releaseDays: number,             // 释放周期天数
  tokenPrice: number,
  lpPoolTokens: number,
  lpPoolUsdt: number,
  staticReleaseTax: StaticReleaseTax[] = defaultStaticReleaseTax
): ReleaseSimulationResult {
  const k = lpPoolTokens * lpPoolUsdt;
  const taxConfig = staticReleaseTax.find(t => t.releaseDays === releaseDays) || staticReleaseTax[0];
  const taxRate = taxConfig.taxRate;
  
  // ========== 第一步: B18释放和分配 (使用统一配置) ==========
  // 释放的B18分配 (全部释放量):
  // 50% → 交付合约, 20% → 销毁, 20% → 奖励池, 10% → SPP
  const b18ToDeliveryContract = releaseAmount * defaultTokenDistribution.deliveryContract;
  const b18ToBurn = releaseAmount * defaultTokenDistribution.burn;
  const b18ToBonusPool = releaseAmount * defaultTokenDistribution.bonusPool;
  const b18ToSPPDirect = releaseAmount * defaultTokenDistribution.spp;
  
  // ========== 第二步: USDC兑付计算 ==========
  // 国库按当前价格兑付全部释放量
  const grossUsdcPayout = releaseAmount * tokenPrice;
  
  // 税收USDC = 兑付USDC × 税率
  const taxUsdc = grossUsdcPayout * taxRate;
  
  // 用户净收到USDC = 兑付USDC - 税收USDC
  const netUsdcToUser = grossUsdcPayout - taxUsdc;
  
  // ========== 第三步: 税收USDC去LP买B18给SPP ==========
  // 税收USDC全部用于从LP购买B18（带滑点），B18进入SPP
  // AMM: USDC进入LP，B18从LP出来（价格上涨）
  const effectiveTaxUsdc = taxUsdc * (1 - AMM_SLIPPAGE);  // 扣除滑点后的有效USDC
  const newLpUsdt = lpPoolUsdt + effectiveTaxUsdc;
  const newLpTokens = k / newLpUsdt;
  const b18BoughtFromLP = lpPoolTokens - newLpTokens;
  const newPrice = newLpUsdt / newLpTokens;
  const priceImpact = tokenPrice > 0 ? (newPrice - tokenPrice) / tokenPrice : 0;

  // SPP收到两部分B18:
  // 1. 税收USDC从LP买到的B18 (b18BoughtFromLP)
  // 2. 释放B18分配的10% (b18ToSPPDirect)
  const sppB18Received = b18BoughtFromLP + b18ToSPPDirect;
  
  // 每日释放计算
  const dailyRelease = netUsdcToUser / releaseDays;
  const effectivePrice = releaseAmount > 0 ? netUsdcToUser / releaseAmount : 0;
  
  // 兼容旧字段 (基于B18分配)
  const taxTokens = releaseAmount; // 用于UI显示
  const netTokens = releaseAmount; // 释放的全是用户的代币

  return {
    taxRate,
    taxTokens,                    // 总释放B18量（用于UI）
    netTokens,                    // 用户释放的全部B18
    // 释放B18分配 (50/20/20/10)
    taxToDeliveryContract: b18ToDeliveryContract,  // 50% B18
    taxToBurn: b18ToBurn,                          // 20% B18
    taxToBonusPool: b18ToBonusPool,                // 20% B18
    taxToSellLP: b18ToSPPDirect,                   // 10% B18直接进SPP
    // SPP收到B18（10%直接分配 + 税收USDC买入）
    sppB18Received,
    sppUsdcReceived: 0,           // SPP不收USDC，税收USDC用于买B18
    // 兼容旧字段
    toDeliveryContract: b18ToDeliveryContract,
    toBurn: b18ToBurn,
    toBonusPool: b18ToBonusPool,
    // 税收和LP相关
    taxUsdcToLP: taxUsdc,         // 税收USDC进入LP买B18
    taxUsdc,                      // 税收USDC总额
    grossUsdcPayout,              // 国库兑付USDC总额
    b18BoughtFromLP,              // 税收USDC从LP买到的B18
    b18Bought: b18BoughtFromLP,
    b18SoldToLP: 0,
    // 用户收益
    usdtReceived: netUsdcToUser,  // 用户净收USDC
    effectivePrice,               // 有效价格（扣税后）
    dailyRelease,
    // 价格影响
    newPrice,
    priceImpact,
    // LP池变化
    newLpUsdt,
    newLpTokens,
  };
}

// ============================================================
// 每日释放模拟 (Daily Release Simulation)
// ============================================================
// 统一符号:
// • P0: 初始本金（税前）
// • P: 当前本金（gross，税前）
// • T: 质押天数
// • r: 日利率
// • D: 线性释放天数（用户选）
// • tax = tax(D): 提现税率（由 D 决定）
// • net = gross × (1 − tax(D))
//
// 三种模式:
// 1) Amortizing (等额本金): 每日可提现 = [(P0/T) + (P × r)] × (1 − tax(D)) / D
// 2) InterestOnly (按期付息): 质押期只释放利息，本金到期后释放
// 3) Compound (复利): 利息复投，到期后一起释放
// ============================================================
export function calculateDailyReleaseSimulation(
  principalTokens: number,        // 初始质押B18 (P0)
  dailyInterestRate: number,      // 日利率 (r)
  releaseDays: number,            // 释放周期 (D)
  tokenPrice: number,
  lpPoolTokens: number,
  lpPoolUsdt: number,
  releaseMode: ReleaseMode = 'amortizing', // 释放模式
  staticReleaseTax: StaticReleaseTax[] = defaultStaticReleaseTax,
  stakingDays: number = 360       // 质押总天数 (T)
): ExtendedReleaseResult {
  const taxConfig = staticReleaseTax.find(t => t.releaseDays === releaseDays) || staticReleaseTax[0];
  const taxRate = taxConfig.taxRate;

  const dailySchedule: DailyReleaseSchedule[] = [];

  let currentLpUsdt = lpPoolUsdt;
  let currentLpTokens = lpPoolTokens;
  let currentPrice = tokenPrice;

  let cumulativeNetUsdc = 0;
  let cumulativeB18Released = 0;
  let totalB18BoughtFromLP = 0;
  let totalTaxUsdc = 0;
  let totalGrossUsdc = 0;
  let totalNetUsdc = 0;
  let totalInterestB18 = 0;

  let currentStakingPrincipal = principalTokens;
  let compoundedProfit = 0;
  let cumulativeWithdrawnB18 = 0;
  let compoundP_final = principalTokens;  // 复利模式到期本息合计

  // 辅助函数：计算LP买入B18（带滑点）
  const calculateLpBuy = (taxUsdc: number): number => {
    if (taxUsdc <= 0) return 0;
    const k = currentLpTokens * currentLpUsdt;
    const oldTokens = currentLpTokens;
    const effectiveUsdc = taxUsdc * (1 - AMM_SLIPPAGE);  // 扣除滑点
    currentLpUsdt += effectiveUsdc;
    currentLpTokens = k / currentLpUsdt;
    currentPrice = currentLpUsdt / currentLpTokens;
    return oldTokens - currentLpTokens;
  };

  // ========== 模式3: 复利滚存 (Compound) ==========
  // 复利公式: P_final = P0 × (1 + r)^(T - 1) + P0 × r
  // 封顶: 180天 593.74%, 360天 3600%
  // 到期后: 每日可提现 = P_maturity × (1 - tax(D)) / D
  if (releaseMode === 'compound') {
    // 计算最终本息: P_final = P0 × (1 + r)^(T - 1) + P0 × r
    let P_final = principalTokens * Math.pow(1 + dailyInterestRate, stakingDays - 1) + principalTokens * dailyInterestRate;

    // 封顶逻辑: 180天封顶593.74%, 360天封顶3600%
    const interestRate = (P_final - principalTokens) / principalTokens;
    let cappedRate = interestRate;
    if (stakingDays >= 360 && interestRate > 36) {
      cappedRate = 36;  // 3600%
      P_final = principalTokens * (1 + cappedRate);
    } else if (stakingDays >= 180 && stakingDays < 360 && interestRate > 5.9374) {
      cappedRate = 5.9374;  // 593.74%
      P_final = principalTokens * (1 + cappedRate);
    }

    totalInterestB18 = P_final - principalTokens;
    compoundedProfit = totalInterestB18;
    currentStakingPrincipal = P_final;
    compoundP_final = P_final;  // 保存到期本息合计

    // 阶段1: 质押滚存期 - 只产生利息并复投，不释放
    for (let day = 1; day <= stakingDays; day++) {
      // 按公式计算当日本金: P_day = P0 × (1 + r)^(day - 1) + P0 × r × (day > 1 ? 0 : 0)
      // 简化: 逐日显示复利增长
      const dayStartPrincipal = day === 1
        ? principalTokens
        : principalTokens * Math.pow(1 + dailyInterestRate, day - 2) + principalTokens * dailyInterestRate;
      const nextDayPrincipal = day < stakingDays
        ? principalTokens * Math.pow(1 + dailyInterestRate, day - 1) + principalTokens * dailyInterestRate
        : P_final;
      const dayInterest = nextDayPrincipal - dayStartPrincipal;

      dailySchedule.push({
        day,
        dailyPrincipal: dayStartPrincipal,
        dailyPrincipalRelease: 0,
        dailyInterest: dayInterest,
        dailyGrossB18: 0,
        dailyTotalB18: 0,
        dailyNetB18: 0,
        dailyWithdrawableB18: 0,
        dailyWithdrawableUsdc: 0,
        nextDayPrincipal: nextDayPrincipal,
        dailyGrossUsdc: 0,
        dailyTaxUsdc: 0,
        dailyNetUsdc: 0,
        dailyB18BoughtFromLP: 0,
        dailyDeliveryB18: 0,
        cumulativeNetUsdc: 0,
        cumulativeB18Released: 0,
        cumulativeWithdrawnB18: 0,
        cumulativeInterest: day === stakingDays ? totalInterestB18 : (nextDayPrincipal - principalTokens),
        isCompoundingPhase: true,
      });
    }

    // 阶段2: 释放期 - P_maturity × (1 - tax) / D
    const P_maturity = P_final;
    const dailyReleaseGross = P_maturity / releaseDays;
    const dailyReleaseNet = dailyReleaseGross * (1 - taxRate);

    for (let i = 0; i < releaseDays; i++) {
      const day = stakingDays + 1 + i;
      const dayStartPrincipal = P_maturity - (dailyReleaseGross * i);
      const dayTaxUsdc = dailyReleaseGross * taxRate * currentPrice;
      const dayNetUsdc = dailyReleaseNet * currentPrice;

      totalTaxUsdc += dayTaxUsdc;
      totalNetUsdc += dayNetUsdc;
      cumulativeNetUsdc += dayNetUsdc;
      cumulativeWithdrawnB18 += dailyReleaseNet;
      cumulativeB18Released += dailyReleaseNet;

      const dayB18Bought = calculateLpBuy(dayTaxUsdc);
      totalB18BoughtFromLP += dayB18Bought;

      dailySchedule.push({
        day,
        dailyPrincipal: dayStartPrincipal,
        dailyPrincipalRelease: dailyReleaseGross,
        dailyInterest: 0,
        dailyGrossB18: dailyReleaseGross,
        dailyTotalB18: dailyReleaseGross,
        dailyNetB18: dailyReleaseNet,
        dailyWithdrawableB18: dailyReleaseNet,
        dailyWithdrawableUsdc: dayNetUsdc,
        nextDayPrincipal: dayStartPrincipal - dailyReleaseGross,
        dailyGrossUsdc: dailyReleaseGross * tokenPrice,
        dailyTaxUsdc: dayTaxUsdc,
        dailyNetUsdc: dayNetUsdc,
        dailyB18BoughtFromLP: dayB18Bought,
        dailyDeliveryB18: dayB18Bought,
        cumulativeNetUsdc,
        cumulativeB18Released,
        cumulativeWithdrawnB18,
        cumulativeInterest: totalInterestB18,
        isCompoundingPhase: false,
      });
    }

    totalGrossUsdc = P_maturity * tokenPrice;
  }
  // ========== 模式2: 按期付息到期还本 (InterestOnly) ==========
  // 质押期: 每日利息 = P0 × r，扣税后线性释放
  // 到期后: 本金 P0 线性释放
  else if (releaseMode === 'interestOnly') {
    // 利息释放队列（分D天释放）
    const interestPayoutQueue: number[] = new Array(stakingDays + releaseDays + 1).fill(0);

    // 阶段1: 质押期 - 只释放利息
    for (let day = 1; day <= stakingDays; day++) {
      const dayStartPrincipal = currentStakingPrincipal; // 本金不变
      const dayInterest = principalTokens * dailyInterestRate; // 固定按P0计息
      totalInterestB18 += dayInterest;

      // 利息税后净额，分D天释放
      const netInterest = dayInterest * (1 - taxRate);
      const dailyInterestPayout = netInterest / releaseDays;

      // 加入释放队列
      for (let i = 0; i < releaseDays; i++) {
        const futureDay = day + i;
        if (futureDay < interestPayoutQueue.length) {
          interestPayoutQueue[futureDay] += dailyInterestPayout;
        }
      }

      const dailyWithdrawableB18 = interestPayoutQueue[day] || 0;
      cumulativeWithdrawnB18 += dailyWithdrawableB18;

      // 税收计算（基于当日产生的利息）
      const dayGrossUsdc = dayInterest * currentPrice;
      totalGrossUsdc += dayGrossUsdc;
      const dayTaxUsdc = dayGrossUsdc * taxRate;
      totalTaxUsdc += dayTaxUsdc;
      const dayNetUsdc = dayGrossUsdc - dayTaxUsdc;
      totalNetUsdc += dayNetUsdc;
      cumulativeNetUsdc += dayNetUsdc;

      const dailyWithdrawableUsdc = dailyWithdrawableB18 * currentPrice;

      const dayB18Bought = calculateLpBuy(dayTaxUsdc);
      totalB18BoughtFromLP += dayB18Bought;
      cumulativeB18Released += netInterest;

      dailySchedule.push({
        day,
        dailyPrincipal: dayStartPrincipal,
        dailyPrincipalRelease: 0, // 本金不释放
        dailyInterest: dayInterest,
        dailyGrossB18: dayInterest,
        dailyTotalB18: dailyInterestPayout,
        dailyNetB18: netInterest,
        dailyWithdrawableB18,
        dailyWithdrawableUsdc,
        nextDayPrincipal: dayStartPrincipal, // 本金保持不变
        dailyGrossUsdc: dayGrossUsdc,
        dailyTaxUsdc: dayTaxUsdc,
        dailyNetUsdc: dayNetUsdc,
        dailyB18BoughtFromLP: dayB18Bought,
        dailyDeliveryB18: dayB18Bought,
        cumulativeNetUsdc,
        cumulativeB18Released,
        cumulativeWithdrawnB18,
        cumulativeInterest: totalInterestB18,
        isCompoundingPhase: false,
      });
    }

    // 阶段2: 到期后释放本金
    const dailyPrincipalRelease = principalTokens / releaseDays;
    const dailyPrincipalNet = dailyPrincipalRelease * (1 - taxRate);

    for (let i = 0; i < releaseDays; i++) {
      const day = stakingDays + 1 + i;
      const dayStartPrincipal = principalTokens - (dailyPrincipalRelease * i);

      // 本金税收
      const dayGrossUsdc = dailyPrincipalRelease * currentPrice;
      totalGrossUsdc += dayGrossUsdc;
      const dayTaxUsdc = dayGrossUsdc * taxRate;
      totalTaxUsdc += dayTaxUsdc;
      const dayNetUsdc = dayGrossUsdc - dayTaxUsdc;
      totalNetUsdc += dayNetUsdc;
      cumulativeNetUsdc += dayNetUsdc;

      // 还有之前利息队列中的到期部分
      const queuedInterest = interestPayoutQueue[day] || 0;
      const totalWithdrawable = dailyPrincipalNet + queuedInterest;
      cumulativeWithdrawnB18 += totalWithdrawable;
      cumulativeB18Released += dailyPrincipalNet;

      const dayB18Bought = calculateLpBuy(dayTaxUsdc);
      totalB18BoughtFromLP += dayB18Bought;

      dailySchedule.push({
        day,
        dailyPrincipal: dayStartPrincipal,
        dailyPrincipalRelease: dailyPrincipalRelease,
        dailyInterest: 0,
        dailyGrossB18: dailyPrincipalRelease,
        dailyTotalB18: dailyPrincipalRelease,
        dailyNetB18: dailyPrincipalNet,
        dailyWithdrawableB18: totalWithdrawable,
        dailyWithdrawableUsdc: totalWithdrawable * currentPrice,
        nextDayPrincipal: dayStartPrincipal - dailyPrincipalRelease,
        dailyGrossUsdc: dayGrossUsdc,
        dailyTaxUsdc: dayTaxUsdc,
        dailyNetUsdc: dayNetUsdc,
        dailyB18BoughtFromLP: dayB18Bought,
        dailyDeliveryB18: dayB18Bought,
        cumulativeNetUsdc,
        cumulativeB18Released,
        cumulativeWithdrawnB18,
        cumulativeInterest: totalInterestB18,
        isCompoundingPhase: false,
      });
    }
  }
  // ========== 模式1: 等额本金还本付息 (Amortizing) ==========
  // 每日可提现 = [(P0/T) + (P × r)] × (1 - tax(D)) / D
  // P是剩余本金，从P0开始每天减少P0/T
  else {
    // 分期释放队列
    const payoutQueue: number[] = new Array(stakingDays + releaseDays + 1).fill(0);
    const dailyPrincipalBase = principalTokens / stakingDays; // P0/T

    for (let day = 1; day <= stakingDays; day++) {
      const dayStartPrincipal = currentStakingPrincipal;

      // 每日利息 = P × r（P是剩余本金）
      const dayInterest = currentStakingPrincipal * dailyInterestRate;
      totalInterestB18 += dayInterest;

      // 每日释放 = (P0/T) + (P × r)
      const dayTotalGrossB18 = dailyPrincipalBase + dayInterest;

      // 税后净额
      const dailyNetB18ToUser = dayTotalGrossB18 * (1 - taxRate);
      // 分D天释放
      const daySinglePayout = dailyNetB18ToUser / releaseDays;

      // 加入释放队列
      for (let i = 0; i < releaseDays; i++) {
        const futureDay = day + i;
        if (futureDay < payoutQueue.length) {
          payoutQueue[futureDay] += daySinglePayout;
        }
      }

      const dailyWithdrawableB18 = payoutQueue[day] || 0;
      cumulativeWithdrawnB18 += dailyWithdrawableB18;

      // 财务结算
      const dayGrossUsdc = dayTotalGrossB18 * currentPrice;
      totalGrossUsdc += dayGrossUsdc;
      const dayTaxUsdc = dayGrossUsdc * taxRate;
      totalTaxUsdc += dayTaxUsdc;
      const dayNetUsdc = dayGrossUsdc - dayTaxUsdc;
      totalNetUsdc += dayNetUsdc;
      cumulativeNetUsdc += dayNetUsdc;

      const dailyWithdrawableUsdc = dailyWithdrawableB18 * currentPrice;

      const dayB18Bought = calculateLpBuy(dayTaxUsdc);
      totalB18BoughtFromLP += dayB18Bought;

      // 更新本金：每天减少 P0/T
      currentStakingPrincipal -= dailyPrincipalBase;
      cumulativeB18Released += dailyNetB18ToUser;
      const nextDayPrincipal = Math.max(0, currentStakingPrincipal);

      dailySchedule.push({
        day,
        dailyPrincipal: dayStartPrincipal,
        dailyPrincipalRelease: dailyPrincipalBase,
        dailyInterest: dayInterest,
        dailyGrossB18: dayTotalGrossB18,
        dailyTotalB18: daySinglePayout,
        dailyNetB18: dailyNetB18ToUser,
        dailyWithdrawableB18,
        dailyWithdrawableUsdc,
        nextDayPrincipal,
        dailyGrossUsdc: dayGrossUsdc,
        dailyTaxUsdc: dayTaxUsdc,
        dailyNetUsdc: dayNetUsdc,
        dailyB18BoughtFromLP: dayB18Bought,
        dailyDeliveryB18: dayB18Bought,
        cumulativeNetUsdc,
        cumulativeB18Released,
        cumulativeWithdrawnB18,
        cumulativeInterest: totalInterestB18,
        isCompoundingPhase: false,
      });
    }
  }

  const totalTokensToDeliver = principalTokens + totalInterestB18;
  const b18ToDeliveryContract = totalTokensToDeliver * 0.5;
  const b18ToSPPDirect = totalTokensToDeliver * 0.1;

  return {
    taxRate,
    taxTokens: totalTokensToDeliver,
    netTokens: totalTokensToDeliver,
    taxToDeliveryContract: b18ToDeliveryContract,
    taxToBurn: totalTokensToDeliver * 0.2,
    taxToBonusPool: totalTokensToDeliver * 0.2,
    taxToSellLP: b18ToSPPDirect,
    sppB18Received: b18ToSPPDirect,
    sppUsdcReceived: 0,
    toDeliveryContract: b18ToDeliveryContract,
    toBurn: totalTokensToDeliver * 0.2,
    toBonusPool: totalTokensToDeliver * 0.2,
    taxUsdcToLP: totalTaxUsdc,
    taxUsdc: totalTaxUsdc,
    grossUsdcPayout: totalGrossUsdc,
    b18BoughtFromLP: totalB18BoughtFromLP,
    b18Bought: totalB18BoughtFromLP,
    b18SoldToLP: 0,
    usdtReceived: totalNetUsdc,
    effectivePrice: totalTokensToDeliver > 0 ? totalNetUsdc / totalTokensToDeliver : 0,
    dailyRelease: totalNetUsdc / stakingDays,
    newPrice: currentPrice,
    priceImpact: tokenPrice > 0 ? (currentPrice - tokenPrice) / tokenPrice : 0,
    newLpUsdt: currentLpUsdt,
    newLpTokens: currentLpTokens,
    dailySchedule,
    releaseMode,
    useCompound: releaseMode === 'compound',
    compoundedPrincipal: compoundP_final,  // 复利模式到期本息合计
    compoundedProfit,
    totalB18ToDelivery: totalB18BoughtFromLP,
    dailyDeliveryAmount: totalB18BoughtFromLP / stakingDays,
    principalTokens,
    dailyInterestRate,
    totalInterestB18,
  };
}

export function formatCurrency(value: number, currency: string = 'USDC') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'B18' ? 'USD' : 'USD', // Simplified for display
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value).replace('$', currency === 'B18' ? '' : '$');
}

export function formatTokens(value: number, decimals: number = 2) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function calculate334Status(
  treasuryBalance: number,
  previousBalance: number,
  pendingWithdrawals: number,
  fundRatio: { treasury: number; staticRewards: number; dynamicRewards: number }
) {
  const balanceChange = treasuryBalance - previousBalance;
  const balanceChangePercent = previousBalance > 0 ? (balanceChange / previousBalance) * 100 : 0;
  
  // 334 内存合约核心逻辑：如果国库余额不足，仅能处理 30%
  const isImbalanced = treasuryBalance < pendingWithdrawals;
  const processableAmount = isImbalanced ? treasuryBalance * 0.3 : pendingWithdrawals;

  return {
    isImbalanced,
    processableAmount,
    balanceChange,
    balanceChangePercent,
  };
}

export function calculateWithdrawalDistribution(amount: number) {
  return {
    treasury: amount * 0.3,
    staticRewards: amount * 0.3,
    dynamicRewards: amount * 0.4,
  };
}

export function calculateFullDynamicReward(
  tier: string,
  tokenPrice: number,
  releaseDays: number,
  isStatic: boolean = true,
  performanceValue: number = 1,
  rewardTiers: RewardTier[] = defaultRewardTiers,
  dynamicTaxRates: DynamicReleaseTax[] = defaultDynamicReleaseTax,
  customPerformance?: number
) {
  const tierConfig = rewardTiers.find(t => t.tier === tier) || rewardTiers[0];
  const taxRates = isStatic ? defaultStaticReleaseTax : dynamicTaxRates;
  const taxConfig = taxRates.find(t => t.releaseDays === releaseDays) || taxRates[0];
  
  const communityPerformance = customPerformance || tierConfig.teamPerformance;
  const communityB18 = communityPerformance * 10000 / tokenPrice;
  
  const grossRewardB18 = communityB18 * (tierConfig.bonusRate || 0);
  const taxB18 = grossRewardB18 * taxConfig.taxRate;
  const netRewardB18 = grossRewardB18 - taxB18;
  
  const netPayout = netRewardB18 * tokenPrice;
  
  return {
    tier: tierConfig.tier,
    communityB18,
    grossRewardB18,
    taxB18,
    netRewardB18,
    taxRate: taxConfig.taxRate,
    netPayout,
    lpAllocation: taxB18 * 0.6,
    bonusAllocation: taxB18 * 0.2,
    burnAllocation: taxB18 * 0.2,
  };
}

export function getTierQualifyingRange(tier: string, rewardTiers: RewardTier[] = defaultRewardTiers) {
  const index = rewardTiers.findIndex(t => t.tier === tier);
  if (index === -1) return { min: 0, max: 10 };
  
  const min = rewardTiers[index].teamPerformance;
  const nextTier = rewardTiers[index + 1];
  const max = nextTier ? nextTier.teamPerformance : min * 2;
  
  return { min, max };
}

export function simulateSystemStep(
  state: SystemState,
  action: {
    type: 'presale' | 'buy' | 'sell' | 'release';
    amount: number;
    days?: number;
    useCompound?: boolean;
  }
): SystemState {
  switch (action.type) {
    case 'presale': {
      const result = calculatePresalePurchase(
        action.amount,
        state.tokenPrice,
        state.lpPoolTokens,
        state.lpPoolUsdt,
        state.deliveryContractTokens,
        state.treasuryBalance,
        state.circulatingSupply
      );
      return {
        ...state,
        tokenPrice: result.priceAfterPurchase,
        lpPoolUsdt: result.newLpUsdt,
        lpPoolTokens: result.newLpTokens,
        deliveryContractTokens: result.newVestingBalance,
        treasuryBalance: result.newTreasuryBalance,
        circulatingSupply: result.newCirculatingSupply,
      };
    }
    case 'buy': {
      const result = calculateSecondaryBuy(
        action.amount,
        state.lpPoolTokens,
        state.lpPoolUsdt
      );
      return {
        ...state,
        tokenPrice: result.priceAfterTrade,
        lpPoolUsdt: result.newLpUsdt,
        lpPoolTokens: result.newLpTokens,
        circulatingSupply: state.circulatingSupply + result.tokensTraded,
      };
    }
    case 'sell': {
      const result = calculateSecondarySell(
        action.amount,
        state.lpPoolTokens,
        state.lpPoolUsdt
      );
      return {
        ...state,
        tokenPrice: result.priceAfterTrade,
        lpPoolUsdt: result.newLpUsdt,
        lpPoolTokens: result.newLpTokens,
        circulatingSupply: state.circulatingSupply - action.amount,
        treasuryBalance: state.treasuryBalance - result.usdtTraded,
      };
    }
    case 'release': {
      const result = calculateReleaseSimulation(
        action.amount,
        action.days || 30,
        state.tokenPrice,
        state.lpPoolTokens,
        state.lpPoolUsdt
      );
      return {
        ...state,
        tokenPrice: result.newPrice,
        lpPoolUsdt: result.newLpUsdt,
        lpPoolTokens: result.newLpTokens,
        deliveryContractTokens: state.deliveryContractTokens + result.taxToDeliveryContract,
        totalBurned: state.totalBurned + result.taxToBurn,
        bonusPoolTokens: state.bonusPoolTokens + result.taxToBonusPool,
        sppBalance: state.sppBalance + result.sppB18Received,
        treasuryBalance: state.treasuryBalance - result.grossUsdcPayout,
      };
    }
    default:
      return state;
  }
}

// 批量模拟
export function runSimulation(
  initialState: SystemState,
  actions: any[]
): SystemState[] {
  const history = [initialState];
  let currentState = { ...initialState };
  
  for (const action of actions) {
    currentState = simulateSystemStep(currentState, action);
    history.push(currentState);
  }
  
  return history;
}

// 计算复利状态
export function calculateCompoundedState(
  state: SystemState,
  dailyInterestRate: number,
  days: number
): SystemState {
  let compoundState = { ...state };
  const multiplier = Math.pow(1 + dailyInterestRate, days);
  
  // 简化的全系统复利
  compoundState.circulatingSupply *= multiplier;
  
  return compoundState;
}
