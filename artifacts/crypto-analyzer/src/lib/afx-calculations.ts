// Extracted standalone calculation functions from AFx-Simulator
// All functions are pure (no global store dependency)

// ─── Staking / MS Release ────────────────────────────────────────────────────

export interface StakingProjection {
  dailyMs: number;
  totalMs: number;
  totalUsdcValue: number;
  stakingDays: number;
  releaseSchedule: { day: number; cumulativeMs: number; cumulativeUsdcValue: number }[];
}

/**
 * Project MS release schedule for a single staking order.
 * mode: 'gold_standard' — totalUSDC = amount × multiplier, dailyMs = totalUSDC / days / price
 * mode: 'coin_standard' — totalMs = (amount / price) × multiplier, dailyMs = totalMs / days
 */
export function projectStakingRelease(
  investmentUsdc: number,
  msPrice: number,
  releaseMultiplier: number,
  stakingDays: number,
  mode: 'gold_standard' | 'coin_standard' = 'gold_standard'
): StakingProjection {
  let dailyMs: number;
  let totalMs: number;

  if (mode === 'coin_standard') {
    const coinQty = investmentUsdc / msPrice;
    totalMs = coinQty * releaseMultiplier;
    dailyMs = totalMs / stakingDays;
  } else {
    const totalUsdc = investmentUsdc * releaseMultiplier;
    dailyMs = totalUsdc / stakingDays / msPrice;
    totalMs = dailyMs * stakingDays;
  }

  const releaseSchedule = Array.from({ length: Math.min(stakingDays, 365) }, (_, i) => {
    const day = i + 1;
    const cumulativeMs = dailyMs * day;
    return { day, cumulativeMs, cumulativeUsdcValue: cumulativeMs * msPrice };
  });

  return {
    dailyMs,
    totalMs,
    totalUsdcValue: totalMs * msPrice,
    stakingDays,
    releaseSchedule,
  };
}

// ─── Trading Profit Simulation ───────────────────────────────────────────────

export interface TradingProfitBreakdown {
  grossProfit: number;
  tradingFee: number;
  netProfit: number;
  userProfit: number;
  platformProfit: number;
  brokerProfit: number;
  lpContributionUsdc: number;
  buybackAmount: number;
  reserveAmount: number;
  roi: number;
}

/**
 * Simulate daily trading profit distribution.
 * tradingCapital: USDC value of trading capital
 * dailyVolumePercent: how much of capital is traded daily (%)
 * profitRate: expected daily profit rate (%)
 * feeRate: trading fee as % of gross profit
 * profitSharePercent: user's share of net profit (%)
 * lpRatio, buybackRatio, reserveRatio: fund flow from trading capital (%)
 */
export function calculateTradingProfitBreakdown(
  tradingCapital: number,
  dailyVolumePercent: number,
  profitRate: number,
  feeRate: number,
  profitSharePercent: number,
  lpRatio: number = 30,
  buybackRatio: number = 20,
  reserveRatio: number = 50
): TradingProfitBreakdown {
  const dailyVolume = tradingCapital * (dailyVolumePercent / 100);
  const grossProfit = dailyVolume * (profitRate / 100);
  const tradingFee = grossProfit * (feeRate / 100);
  const netProfit = Math.max(0, grossProfit - tradingFee);
  const userProfit = netProfit * (profitSharePercent / 100);
  const remaining = netProfit - userProfit;
  const platformProfit = remaining * 0.5;
  const brokerProfit = remaining * 0.5;
  const lpContributionUsdc = dailyVolume * (lpRatio / 100);
  const buybackAmount = dailyVolume * (buybackRatio / 100);
  const reserveAmount = dailyVolume * (reserveRatio / 100);

  return {
    grossProfit,
    tradingFee,
    netProfit,
    userProfit,
    platformProfit,
    brokerProfit,
    lpContributionUsdc,
    buybackAmount,
    reserveAmount,
    roi: tradingCapital > 0 ? (userProfit / tradingCapital) * 100 : 0,
  };
}

// ─── AAM Pool Simulation ──────────────────────────────────────────────────────

export interface AAMPoolState {
  usdcBalance: number;
  msBalance: number;
  msPrice: number;
  lpTokens: number;
  totalBuyback: number;
  totalBurn: number;
}

export interface AAMDailyPoint {
  day: number;
  price: number;
  usdcBalance: number;
  msBalance: number;
  tvl: number;
  cumulativeBuyback: number;
}

/**
 * Simulate AAM (x*y=k constant product) pool for N days.
 * Each day: optional LP add, secondary market MS sell, buyback.
 */
export function simulateAAMPoolStandalone(
  initialUsdc: number,
  initialMs: number,
  days: number,
  dailyDepositUsdc: number,
  lpRatioPct: number,    // % of daily deposit added to LP
  buybackRatioPct: number, // % of daily deposit used for buyback
  dailySellPressureMs: number // MS sold to pool each day (secondary market)
): AAMDailyPoint[] {
  let pool: AAMPoolState = {
    usdcBalance: initialUsdc,
    msBalance: initialMs,
    msPrice: initialMs > 0 ? initialUsdc / initialMs : 0,
    lpTokens: Math.sqrt(initialUsdc * initialMs),
    totalBuyback: 0,
    totalBurn: 0,
  };

  const points: AAMDailyPoint[] = [{
    day: 0,
    price: pool.msPrice,
    usdcBalance: pool.usdcBalance,
    msBalance: pool.msBalance,
    tvl: pool.usdcBalance + pool.msBalance * pool.msPrice,
    cumulativeBuyback: 0,
  }];

  for (let d = 1; d <= days; d++) {
    // LP add
    const lpUsdc = dailyDepositUsdc * (lpRatioPct / 100);
    if (lpUsdc > 0) {
      const msEquiv = lpUsdc / pool.msPrice;
      pool.usdcBalance += lpUsdc;
      pool.msBalance += msEquiv;
    }

    // Secondary market MS sell → price DOWN
    if (dailySellPressureMs > 0) {
      const usdcOut = dailySellPressureMs * pool.msPrice;
      const safeOut = Math.min(usdcOut, pool.usdcBalance * 0.99);
      const msIn = safeOut / pool.msPrice;
      pool.msBalance += msIn;
      pool.usdcBalance -= safeOut;
    }

    // Buyback → price UP
    const buybackUsdc = dailyDepositUsdc * (buybackRatioPct / 100);
    if (buybackUsdc > 0 && pool.msBalance > 1) {
      const msBought = Math.min(buybackUsdc / pool.msPrice, pool.msBalance * 0.99);
      const usdcIn = msBought * pool.msPrice;
      pool.usdcBalance += usdcIn;
      pool.msBalance -= msBought;
      pool.totalBuyback += usdcIn;
    }

    pool.msBalance = Math.max(1, pool.msBalance);
    pool.msPrice = pool.usdcBalance / pool.msBalance;
    pool.lpTokens = Math.sqrt(pool.usdcBalance * pool.msBalance);

    points.push({
      day: d,
      price: pool.msPrice,
      usdcBalance: pool.usdcBalance,
      msBalance: pool.msBalance,
      tvl: pool.usdcBalance + pool.msBalance * pool.msPrice,
      cumulativeBuyback: pool.totalBuyback,
    });
  }

  return points;
}

// ─── CLMM Standalone ─────────────────────────────────────────────────────────

export interface CLMMAnalysis {
  capitalEfficiency: number;
  initialTokenX: number;
  initialTokenY: number;
  feesEarned30d: number;
  feesEarned90d: number;
  breakEvenDays: number;
  ilAtLower: number;
  ilAtUpper: number;
  priceTrajectory: { day: number; price: number; inRange: boolean; cumulativeFees: number; positionValue: number }[];
}

function calcLiquidityStandalone(x: number, y: number, p: number, pa: number, pb: number): number {
  const sqrtP = Math.sqrt(Math.max(p, 1e-12));
  const sqrtPa = Math.sqrt(pa);
  const sqrtPb = Math.sqrt(pb);
  if (p <= pa) return x > 0 ? x * sqrtPa * sqrtPb / (sqrtPb - sqrtPa) : 0;
  if (p >= pb) return y > 0 ? y / (sqrtPb - sqrtPa) : 0;
  const Lx = x > 0 ? x * sqrtP * sqrtPb / (sqrtPb - sqrtP) : 0;
  const Ly = y > 0 ? y / (sqrtP - sqrtPa) : 0;
  if (Lx <= 0) return Ly;
  if (Ly <= 0) return Lx;
  return Math.min(Lx, Ly);
}

function calcTokenAmountsStandalone(L: number, p: number, pa: number, pb: number) {
  const sqrtP = Math.sqrt(Math.max(p, 0));
  const sqrtPa = Math.sqrt(pa);
  const sqrtPb = Math.sqrt(pb);
  if (p <= pa) return { x: L * (1 / sqrtPa - 1 / sqrtPb), y: 0 };
  if (p >= pb) return { x: 0, y: L * (sqrtPb - sqrtPa) };
  return { x: L * (1 / sqrtP - 1 / sqrtPb), y: L * (sqrtP - sqrtPa) };
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Analyze a CLMM position: capital efficiency, fees, IL at boundaries, 90d trajectory.
 */
export function analyzeCLMMPosition(
  depositX: number,
  depositY: number,
  initialPrice: number,
  rangeWidthPct: number,
  feeTier: number,
  dailyVolume: number,
  totalPoolLiquidity: number,
  days: number = 90,
  dailyVolatilityPct: number = 2,
  driftPct: number = 0
): CLMMAnalysis {
  const priceLower = initialPrice * (1 - rangeWidthPct / 100);
  const priceUpper = initialPrice * (1 + rangeWidthPct / 100);

  const L = calcLiquidityStandalone(depositX, depositY, initialPrice, priceLower, priceUpper);

  // Capital efficiency vs full-range v2
  const L_v2 = calcLiquidityStandalone(depositX, depositY, initialPrice, initialPrice * 0.0001, initialPrice * 10000);
  const capitalEfficiency = L_v2 > 0 ? L / L_v2 : 0;

  // Initial HODL value
  const hodlValue = depositX * initialPrice + depositY;

  // IL at price boundaries
  const ilAtLower = (() => {
    const { x, y } = calcTokenAmountsStandalone(L, priceLower, priceLower, priceUpper);
    const posVal = x * priceLower + y;
    const hodlAtLower = depositX * priceLower + depositY;
    return hodlAtLower > 0 ? Math.max(0, (hodlAtLower - posVal) / hodlAtLower) * 100 : 0;
  })();

  const ilAtUpper = (() => {
    const { x, y } = calcTokenAmountsStandalone(L, priceUpper, priceLower, priceUpper);
    const posVal = x * priceUpper + y;
    const hodlAtUpper = depositX * priceUpper + depositY;
    return hodlAtUpper > 0 ? Math.max(0, (hodlAtUpper - posVal) / hodlAtUpper) * 100 : 0;
  })();

  // Price trajectory with GBM
  const seed = Math.round(initialPrice * 31 + rangeWidthPct * 17 + days * 7 + dailyVolatilityPct * 13);
  const rng = mulberry32(seed);
  const vol = dailyVolatilityPct / 100;
  const drift = driftPct / 100;

  let price = initialPrice;
  let cumulativeFees = 0;
  const trajectory: CLMMAnalysis['priceTrajectory'] = [];

  for (let d = 1; d <= days; d++) {
    const u1 = Math.max(1e-10, rng());
    const u2 = rng();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    price = price * (1 + drift + vol * z);
    const inRange = price >= priceLower && price <= priceUpper;
    const dailyFee = inRange && totalPoolLiquidity > 0
      ? (dailyVolume * feeTier) * (L / totalPoolLiquidity)
      : 0;
    cumulativeFees += dailyFee;
    const { x, y } = calcTokenAmountsStandalone(L, price, priceLower, priceUpper);
    trajectory.push({ day: d, price, inRange, cumulativeFees, positionValue: x * price + y });
  }

  const feesEarned30d = trajectory[29]?.cumulativeFees ?? 0;
  const feesEarned90d = trajectory[89]?.cumulativeFees ?? trajectory[trajectory.length - 1]?.cumulativeFees ?? 0;
  const maxIl = Math.max(ilAtLower, ilAtUpper) / 100 * hodlValue;
  const breakEvenDays = feesEarned90d > 0 ? Math.round((maxIl / feesEarned90d) * 90) : 9999;

  return {
    capitalEfficiency,
    initialTokenX: depositX,
    initialTokenY: depositY,
    feesEarned30d,
    feesEarned90d,
    breakEvenDays,
    ilAtLower,
    ilAtUpper,
    priceTrajectory: trajectory,
  };
}

// ─── Broker Layer Calculator ──────────────────────────────────────────────────

export const BROKER_LEVEL_MAX_LAYERS: Record<string, number> = {
  V1: 5,
  V2: 8,
  V3: 12,
  V4: 15,
  V5: 18,
  V6: 20,
};

// Default layer rates (layer 1-5: 3%, 6-10: 2%, 11-15: 1.5%, 16-20: 1%)
export function getDefaultLayerRate(layer: number): number {
  if (layer <= 5) return 3;
  if (layer <= 10) return 2;
  if (layer <= 15) return 1.5;
  return 1;
}

export interface BrokerLayerResult {
  layer: number;
  msPerDay: number;
  rate: number;
  earningsPerDay: number;
  accessible: boolean;
}

export function calculateBrokerLayerBreakdown(
  msPerLayerPerDay: number,
  brokerLevel: string
): { layers: BrokerLayerResult[]; totalAccessible: number; totalLocked: number } {
  const maxLayer = BROKER_LEVEL_MAX_LAYERS[brokerLevel] ?? 5;
  const layers: BrokerLayerResult[] = [];
  let totalAccessible = 0;
  let totalLocked = 0;

  for (let i = 1; i <= 20; i++) {
    const rate = getDefaultLayerRate(i);
    const earningsPerDay = msPerLayerPerDay * (rate / 100);
    const accessible = i <= maxLayer;
    if (accessible) totalAccessible += earningsPerDay;
    else totalLocked += earningsPerDay;
    layers.push({ layer: i, msPerDay: msPerLayerPerDay, rate, earningsPerDay, accessible });
  }

  return { layers, totalAccessible, totalLocked };
}

export function calculateBrokerDividendEarnings(
  grossProfit: number,
  feeRate: number,
  profitSharePercent: number,
  brokerLevel: string,
  subordinateLevel: string | null,
): {
  userShare: number;
  brokerDividendPool: number;
  platformShare: number;
  brokerRate: number;
  subRate: number;
  differentialRate: number;
  earnings: number;
} {
  const BROKER_DIVIDEND_RATES: Record<string, number> = {
    V1: 5, V2: 10, V3: 20, V4: 35, V5: 55, V6: 80,
  };
  const tradingFee = grossProfit * (feeRate / 100);
  const netProfit = Math.max(0, grossProfit - tradingFee);
  const userShare = netProfit * (profitSharePercent / 100);
  const remaining = netProfit - userShare;
  const brokerDividendPool = remaining * 0.5;
  const platformShare = remaining * 0.5;
  const brokerRate = BROKER_DIVIDEND_RATES[brokerLevel] ?? 0;
  const subRate = subordinateLevel ? (BROKER_DIVIDEND_RATES[subordinateLevel] ?? 0) : 0;
  const differentialRate = Math.max(0, brokerRate - subRate);
  const earnings = brokerDividendPool * (differentialRate / 100);

  return { userShare, brokerDividendPool, platformShare, brokerRate, subRate, differentialRate, earnings };
}
