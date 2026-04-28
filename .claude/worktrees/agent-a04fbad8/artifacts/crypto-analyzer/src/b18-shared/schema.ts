import { z } from "zod";

// ============================================================
// 核心常量 (Core Constants)
// ============================================================

// AMM 滑点: 3% (用于二级市场买卖)
export const AMM_SLIPPAGE = 0.03;

// 等级奖励公式参数: (A_i / price) * 1.2% * 40% * Lv%
export const LEVEL_REWARD_BASE_RATE = 0.012;  // 1.2%
export const LEVEL_REWARD_MULTIPLIER = 0.40; // 40%

// 334内存协议分摊比例
export const SHORTAGE_TREASURY_SHARE = 0.40;  // 40% 国库承担
export const SHORTAGE_DYNAMIC_SHARE = 0.30;   // 30% 动态承担
export const SHORTAGE_STATIC_SHARE = 0.30;    // 30% 静态承担

// ============================================================
// B18 流向说明 (Two Separate B18 Flows)
// ============================================================
//
// 流向1: 税收USDC → LP回购B18 → 全部进SPP
//   - 税收USDC全部用于从LP购买B18（带3%滑点）
//   - 购买的B18全部进入SPP平衡合约
//   - 公式: B_buyback = Y - k/(X + taxUSDC*(1-slip))
//
// 流向2: 释放B18 → 50/20/20/10分配
//   - 释放的B18（税后口径）按比例分配到各池子
//   - 50% → 交付合约 (DeliverySupply)
//   - 20% → 奖励池 (RewardPool)
//   - 20% → 销毁 (Burn)
//   - 10% → SPP (额外补充)
//
// ============================================================

// Token Configuration
// 总币量1010万枚: 交付合约1000万 + LP流通10万
export const tokenConfigSchema = z.object({
  name: z.string().default("B18"),
  totalSupply: z.number().default(10100000), // 1010万 (交付合约1000万 + LP 10万)
  initialCirculating: z.number().default(100000), // LP中10万B18
  vestingContract: z.number().default(10000000), // 交付合约1000万 B18
  slippage: z.number().default(0.03), // 3% (二级市场滑点)
  initialPrice: z.number().default(50), // $50 USDC 预售价格
});

export type TokenConfig = z.infer<typeof tokenConfigSchema>;

// Staking Period Configuration
export const stakingPeriodSchema = z.object({
  days: z.number(),
  dailyRate: z.number(), // Daily interest rate
  totalReturn: z.number(), // Compound return
});

export type StakingPeriod = z.infer<typeof stakingPeriodSchema>;

// Default staking periods
// 180天 1%日利率复利封顶593.74%, 360天 1.2%日利率复利封顶3600%
export const defaultStakingPeriods: StakingPeriod[] = [
  { days: 30, dailyRate: 0.005, totalReturn: Math.pow(1.005, 30) - 1 }, // 0.5% daily, ~16.14% total
  { days: 90, dailyRate: 0.007, totalReturn: Math.pow(1.007, 90) - 1 }, // 0.7% daily, ~87.76% total
  { days: 180, dailyRate: 0.01, totalReturn: 5.9374 }, // 1% daily, 封顶593.74% (复利)
  { days: 360, dailyRate: 0.012, totalReturn: 36 }, // 1.2% daily, 封顶3600% total (复利)
];

// Static Release Tax Configuration
export const staticReleaseTaxSchema = z.object({
  releaseDays: z.number(),
  taxRate: z.number(),
});

export type StaticReleaseTax = z.infer<typeof staticReleaseTaxSchema>;

// 释放周期: 30天 3%, 15天 6%, 7天 10%, 24小时 20%
export const defaultStaticReleaseTax: StaticReleaseTax[] = [
  { releaseDays: 30, taxRate: 0.03 }, // 30 days = 3% tax
  { releaseDays: 15, taxRate: 0.06 }, // 15 days = 6% tax
  { releaseDays: 7, taxRate: 0.1 }, // 7 days = 10% tax
  { releaseDays: 1, taxRate: 0.2 }, // 24 hours = 20% tax (instant)
];

// Dynamic Release Tax Configuration
export const dynamicReleaseTaxSchema = z.object({
  releaseDays: z.number(),
  taxRate: z.number(),
});

export type DynamicReleaseTax = z.infer<typeof dynamicReleaseTaxSchema>;

export const defaultDynamicReleaseTax: DynamicReleaseTax[] = [
  { releaseDays: 180, taxRate: 0.03 }, // 180 days = 3% tax
  { releaseDays: 100, taxRate: 0.1 }, // 100 days = 10% tax
  { releaseDays: 60, taxRate: 0.2 }, // 60 days = 20% tax
  { releaseDays: 30, taxRate: 0.3 }, // 30 days = 30% tax
];

// Dynamic Reward Tier Configuration (V1-V10)
// V1-V10 每级10%加成，自己投资要求从10%-100%
export const rewardTierSchema = z.object({
  tier: z.string(), // V1, V2, etc.
  stakingRequired: z.number(), // Required staking amount (USDT)
  teamPerformance: z.number(), // Required team performance (万U)
  bonusRate: z.number(), // Bonus rate (10% each tier = 0.1)
  bonusPool: z.number(), // Bonus pool allocation %
});

export type RewardTier = z.infer<typeof rewardTierSchema>;

// V1-V10: 累计加成 (V1=10%, V2=20%, V3=30%...V10=100%)
// 自己投资要求递增，团队业绩要求递增（单位：万U）
// V4: 30-100, V5: 100-250, V6: 250-500, V7: 500-1000, V8: 1000-2000, V9: 2000-5000, V10: 5000+
export const defaultRewardTiers: RewardTier[] = [
  { tier: "V1", stakingRequired: 200, teamPerformance: 2, bonusRate: 0.1, bonusPool: 10 },
  { tier: "V2", stakingRequired: 500, teamPerformance: 5, bonusRate: 0.2, bonusPool: 10 },
  { tier: "V3", stakingRequired: 1000, teamPerformance: 10, bonusRate: 0.3, bonusPool: 20 },
  { tier: "V4", stakingRequired: 2000, teamPerformance: 30, bonusRate: 0.4, bonusPool: 40 },
  { tier: "V5", stakingRequired: 3000, teamPerformance: 100, bonusRate: 0.5, bonusPool: 40 },
  { tier: "V6", stakingRequired: 5000, teamPerformance: 250, bonusRate: 0.6, bonusPool: 50 },
  { tier: "V7", stakingRequired: 7000, teamPerformance: 500, bonusRate: 0.7, bonusPool: 60 },
  { tier: "V8", stakingRequired: 10000, teamPerformance: 1000, bonusRate: 0.8, bonusPool: 70 },
  { tier: "V9", stakingRequired: 15000, teamPerformance: 2000, bonusRate: 0.9, bonusPool: 80 },
  { tier: "V10", stakingRequired: 20000, teamPerformance: 5000, bonusRate: 1.0, bonusPool: 100 },
];

// Leadership Reward Level Decay
export const leadershipDecaySchema = z.object({
  level: z.number(),
  percentage: z.number(),
});

export type LeadershipDecay = z.infer<typeof leadershipDecaySchema>;

// Leadership decay: Level 1 = 100%, then -2% per level until 10% floor
export const defaultLeadershipDecay: LeadershipDecay[] = Array.from({ length: 50 }, (_, i) => ({
  level: i + 1,
  percentage: Math.max(0.1, 1 - i * 0.02), // 100% at L1, -2% per level, min 10%
}));

// Token Distribution Configuration (释放时B18代币分配)
// 释放的B18（税后口径）: 50%进交付合约, 20%销毁, 20%进奖励池, 10%进SPP
export const tokenDistributionSchema = z.object({
  deliveryContract: z.number().default(0.5), // 50% 进交付合约
  burn: z.number().default(0.2), // 20% 销毁
  bonusPool: z.number().default(0.2), // 20% 奖励池
  spp: z.number().default(0.1), // 10% 进SPP
});

export type TokenDistribution = z.infer<typeof tokenDistributionSchema>;

// 默认释放B18分配比例
export const defaultTokenDistribution: TokenDistribution = {
  deliveryContract: 0.5,  // 50%
  burn: 0.2,              // 20%
  bonusPool: 0.2,         // 20%
  spp: 0.1,               // 10%
};

// 兼容别名
export const B18_DISTRIBUTION = defaultTokenDistribution;

// 质押购买时资金分配
export const purchaseFundDistributionSchema = z.object({
  lpPool: z.number().default(0.5), // 50% 进LP底池
  treasury: z.number().default(0.5), // 50% 进国库
});

export type PurchaseFundDistribution = z.infer<typeof purchaseFundDistributionSchema>;

// 默认质押购买资金分配
export const defaultPurchaseFundDistribution: PurchaseFundDistribution = {
  lpPool: 0.5,    // 50% 进LP底池
  treasury: 0.5,  // 50% 进国库
};

// 兼容别名
export const FUND_DISTRIBUTION = defaultPurchaseFundDistribution;

// Treasury Configuration (334 Contract)
export const treasuryConfigSchema = z.object({
  fundRatio: z.object({
    treasury: z.number().default(0.3), // 30%
    staticRewards: z.number().default(0.3), // 30%
    dynamicRewards: z.number().default(0.4), // 40%
  }),
  previousBalance: z.number().default(10000000), // Yesterday: 1000万U
  currentBalance: z.number().default(9000000), // Today: 900万U
  pendingWithdrawalRatio: z.number().default(0.3), // 30% pending during imbalance
});

export type TreasuryConfig = z.infer<typeof treasuryConfigSchema>;

// Investment Entry
export const investmentSchema = z.object({
  id: z.string(),
  amount: z.number(), // USDT amount
  tokenAmount: z.number(), // B18 received
  stakingDays: z.number(), // Staking period
  startDate: z.date(),
  totalReturn: z.number(), // Expected return
  dailyRelease: z.number(), // Daily release amount
  releaseDays: z.number(), // Release period chosen
  taxRate: z.number(), // Tax rate applied
});

export type Investment = z.infer<typeof investmentSchema>;

// Withdrawal Queue Entry
export const withdrawalEntrySchema = z.object({
  id: z.string(),
  userId: z.string(),
  amount: z.number(), // USDT amount
  timestamp: z.date(),
  status: z.enum(["pending", "processing", "completed"]),
  position: z.number(),
});

export type WithdrawalEntry = z.infer<typeof withdrawalEntrySchema>;

// System State (完整系统状态)
export const systemStateSchema = z.object({
  // LP池状态 (底池)
  lpPoolTokens: z.number(),
  lpPoolUsdt: z.number(),
  tokenPrice: z.number(), // = lpPoolUsdt / lpPoolTokens
  
  // 国库 (用于兑付用户提现的USDT)
  treasuryBalance: z.number(),
  
  // 交付合约 (Delivery/Vesting Contract)
  // - 质押时: 代币从这里流出进入LP池
  // - 释放时: 收到60%的释放代币 + 释放税
  deliveryContractTokens: z.number(),
  
  // 奖励池 (Bonus Pool)
  // - 释放时收到20%的释放代币
  bonusPoolTokens: z.number(),
  
  // 销毁统计
  totalBurned: z.number(),
  
  // 流通供应量
  circulatingSupply: z.number(),
  
  // 提现队列状态 (433合约)
  withdrawalQueueStatus: z.enum(["balanced", "imbalanced"]),
  totalPendingWithdrawals: z.number(),
  
  // SPP平衡合约 (收取释放税)
  sppBalance: z.number(),
});

export type SystemState = z.infer<typeof systemStateSchema>;

// 默认初始系统状态
// 初始参数: 交付合约1000万B18, LP 500万USDC + 10万B18, 预售价$50
// 预售质押流程:
// 1. 用户购买B18预售质押，USDC 50%支付给国库，50%配比交付合约拨出的等值B18添加LP流动性
// 2. 交付合约拨出质押B18本金去质押合约
// 3. 释放方式: 本+息按B18市场价格由国库兑付USDC
// 4. 每日释放根据分批释放天数收取不同税收
// 5. 税收USDC自动购买二级市场B18，放入SPP平衡合约
export const defaultSystemState: SystemState = {
  lpPoolTokens: 100000,      // 10万 B18 (LP中)
  lpPoolUsdt: 5000000,       // 500万 USDC (LP中) = 10万 × $50
  tokenPrice: 50,            // $50 USDC (5000000/100000 = 50)
  treasuryBalance: 0,        // 初始国库为0，买入质押时50% USDC进国库
  deliveryContractTokens: 10000000, // 交付合约1000万 B18
  bonusPoolTokens: 0,
  totalBurned: 0,
  circulatingSupply: 100000, // LP中10万B18为初始流通
  withdrawalQueueStatus: "balanced",
  totalPendingWithdrawals: 0,
  sppBalance: 0,
};

// Simulation Parameters Input
export const simulationParamsSchema = z.object({
  investmentAmount: z.number().min(0),
  stakingPeriodDays: z.number(),
  releasePeriodDays: z.number(),
  tier: z.string().optional(),
  teamPerformance: z.number().optional(),
  leadershipLevel: z.number().optional(),
});

export type SimulationParams = z.infer<typeof simulationParamsSchema>;

// Calculation Results
export const calculationResultSchema = z.object({
  // Purchase breakdown
  tokensPurchased: z.number(),
  usdtToTreasury: z.number(),
  usdtToLP: z.number(),
  tokensToLP: z.number(),
  
  // Staking returns
  principalValue: z.number(),
  interestEarned: z.number(),
  totalValue: z.number(),
  
  // Release schedule
  dailyReleaseAmount: z.number(),
  totalReleaseDays: z.number(),
  taxAmount: z.number(),
  netAfterTax: z.number(),
  
  // Dynamic rewards
  staticRewardBase: z.number(),
  dynamicReward1: z.number(),
  dynamicReward2: z.number(),
  
  // Token price impact
  projectedTokenPrice: z.number(),
  priceChange: z.number(),
});

export type CalculationResult = z.infer<typeof calculationResultSchema>;

// Dynamic Reward Breakdown (包含复利、SPP税收、代币分配)
export const dynamicRewardBreakdownSchema = z.object({
  // 输入参数
  communityStakingIncome: z.number(), // 小区质押收入 = 小区业绩
  tierLevel: z.string(),
  teamPerformance: z.number(),
  
  // 级别奖励计算
  tierBonus: z.number(), // 等级加成比例
  grossReward: z.number(), // 毛收益
  
  // 释放与税收
  releaseDays: z.number(),
  taxRate: z.number(),
  taxToSPP: z.number(), // 税收流向SPP平衡合约
  netPayout: z.number(), // 净收益
  
  // 复利滚存
  isCompounding: z.boolean(),
  compoundableAmount: z.number(), // 可复利金额
  compoundedTotal: z.number(), // 复利后总额
  
  // B18代币分配 (60/20/20)
  b18Purchased: z.number(), // 国库按市价买入的B18数量
  lpAllocation: z.number(), // 60% 回LP池交付合约
  bonusAllocation: z.number(), // 20% 奖励池
  burnAllocation: z.number(), // 20% 销毁
});

export type DynamicRewardBreakdown = z.infer<typeof dynamicRewardBreakdownSchema>;

// SPP平衡合约状态
export const sppStateSchema = z.object({
  balance: z.number(), // SPP合约余额
  taxCollected: z.number(), // 累计收取的税收
  priceStabilizationUsed: z.number(), // 用于稳定币价的金额
});

export type SPPState = z.infer<typeof sppStateSchema>;
