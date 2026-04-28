import { Router, type IRouter } from "express";
import {
  CalculateRuneBurnStakeBody,
  CalculateRuneBurnStakeResponse,
  CalculateRuneReturnsBody,
  CalculateRuneReturnsResponse,
  GetRuneOverviewResponse,
} from "@rune/api-zod";

const router: IRouter = Router();

// Estimated yield model (per `核心机制.md` §壹 + `核心权益.md` §伍):
//   AI quant engine projected monthly yield 25-35% → 65% paid as static USDT,
//   35% paid as dynamic value auto-purchased into sub-token. Numbers below
//   are MIDPOINT estimates (monthly 25% → daily ≈ 0.834% on principal).
//   Linear scaling across node tiers (same yield rate, larger principal).
//   Frontend should label these as 预估 / Estimated; not contractually guaranteed.
const YIELD_MIDPOINT_DAILY_PCT  = 0.834;     // 25%/30
const STATIC_SHARE              = 0.65;      // 65% USDT direct
const DYNAMIC_SHARE             = 0.35;      // 35% sub-token
const YIELD_RANGE_LOW_PCT       = 15;        // monthly low
const YIELD_RANGE_HIGH_PCT      = 35;        // monthly high

function estimateDailyAt(investment: number, monthlyPct: number) {
  return investment * (monthlyPct / 100) / 30;
}

const PRICE_STAGES = [
  { index: 0, label: "Stage 1 · Launch", labelCn: "① 开盘", trigger: "DO上线当日", motherPrice: 0.028, subPrice: 0.038, multiplier: 1 },
  { index: 1, label: "Stage 2 · TLP 7M", labelCn: "② 第2批触发", trigger: "TLP≥700万U", motherPrice: 0.07, subPrice: 0.095, multiplier: 2.5 },
  { index: 2, label: "Stage 3 · TLP 17.5M", labelCn: "③ 第3批触发", trigger: "TLP≥1750万U", motherPrice: 0.175, subPrice: 0.238, multiplier: 6.25 },
  { index: 3, label: "Stage 4 · TLP 35M", labelCn: "④ 第4批触发", trigger: "TLP≥3500万U / 180天", motherPrice: 0.35, subPrice: 0.475, multiplier: 12.5 },
  { index: 4, label: "Stage 5 · Target Low", labelCn: "⑤ 目标价（低）", trigger: "24个月 80× 预测", motherPrice: 2.24, subPrice: 3.04, multiplier: 80 },
  { index: 5, label: "Stage 6 · Target High", labelCn: "⑥ 目标价（高）", trigger: "24个月 120× 预测", motherPrice: 3.36, subPrice: 4.56, multiplier: 120 },
];

// Airdrop numbers come from the 2026 spec's pool model:
//   10,000,000 mother-token pool × (tierWeight × seats / 1,680)
// i.e. tier's share of the pool is its aggregate weight fraction.
// Per-seat = tier total / seats. The 501 (initial) tier was added
// alongside the mainnet deployment per runeapi 3/对接文档.md §4.1.
// `motherTokensPerSeat` is 0 — the 2026 spec has no private-purchase
// path, so the airdrop is the sole mother-token source. Keeping the
// field (rather than dropping it) preserves the zod schema; setting it
// to 0 makes `motherTokenValue` drop out of the calculator's total so
// airdrop isn't double-counted alongside it.
const NODES = [
  {
    // Placeholder seatsRemaining = seats. Real-time consumption comes
    // from the NodePresell contract's curNum on the frontend; the REST
    // overview is just static marketing metadata and would lie if it
    // pretended to track sales.
    level: "initial",
    nameEn: "INITIAL",
    nameCn: "符胚",
    investment: 1000,
    seats: 1000,
    seatsRemaining: 1000,
    privatePrice: 0.028,
    dailyUsdt: 4.7,
    weight: 1,
    airdropTotal: 1_000_000,
    airdropPerSeat: 1000,
    motherTokensPerSeat: 0,
    monthlyYieldRangePctLow: YIELD_RANGE_LOW_PCT,
    monthlyYieldRangePctHigh: YIELD_RANGE_HIGH_PCT,
    estimatedDailyStaticU: 0,   // patched below
    estimatedDailyDynamicU: 0,  // patched below
    estimatedDailyTotalU: 0,    // patched below
  },
  {
    level: "mid",
    nameEn: "MID",
    nameCn: "符源",
    investment: 2500,
    seats: 800,
    seatsRemaining: 800,
    privatePrice: 0.026,
    dailyUsdt: 11.7,
    weight: 1.2,
    airdropTotal: 2_400_000,
    airdropPerSeat: 3000,
    motherTokensPerSeat: 0,
    monthlyYieldRangePctLow: YIELD_RANGE_LOW_PCT,
    monthlyYieldRangePctHigh: YIELD_RANGE_HIGH_PCT,
    estimatedDailyStaticU: 0,   // patched below
    estimatedDailyDynamicU: 0,  // patched below
    estimatedDailyTotalU: 0,    // patched below
  },
  {
    level: "advanced",
    nameEn: "ADVANCED",
    nameCn: "符印",
    investment: 5000,
    seats: 400,
    seatsRemaining: 400,
    privatePrice: 0.024,
    dailyUsdt: 23.4,
    weight: 1.4,
    airdropTotal: 2_500_000,
    airdropPerSeat: 6250,
    motherTokensPerSeat: 0,
    monthlyYieldRangePctLow: YIELD_RANGE_LOW_PCT,
    monthlyYieldRangePctHigh: YIELD_RANGE_HIGH_PCT,
    estimatedDailyStaticU: 0,   // patched below
    estimatedDailyDynamicU: 0,  // patched below
    estimatedDailyTotalU: 0,    // patched below
  },
  {
    level: "super",
    nameEn: "SUPER",
    nameCn: "符魂",
    investment: 10000,
    seats: 200,
    seatsRemaining: 200,
    privatePrice: 0.02,
    dailyUsdt: 46.8,
    weight: 1.6,
    airdropTotal: 2_600_000,
    airdropPerSeat: 13000,
    motherTokensPerSeat: 0,
    monthlyYieldRangePctLow: YIELD_RANGE_LOW_PCT,
    monthlyYieldRangePctHigh: YIELD_RANGE_HIGH_PCT,
    estimatedDailyStaticU: 0,   // patched below
    estimatedDailyDynamicU: 0,  // patched below
    estimatedDailyTotalU: 0,    // patched below
  },
  {
    level: "founder",
    nameEn: "FOUNDER",
    nameCn: "符主",
    investment: 50000,
    seats: 20,
    seatsRemaining: 20,
    privatePrice: 0.016,
    dailyUsdt: 234,
    weight: 2,
    airdropTotal: 1_500_000,
    airdropPerSeat: 75000,
    motherTokensPerSeat: 0,
    monthlyYieldRangePctLow: YIELD_RANGE_LOW_PCT,
    monthlyYieldRangePctHigh: YIELD_RANGE_HIGH_PCT,
    estimatedDailyStaticU: 0,   // patched below
    estimatedDailyDynamicU: 0,  // patched below
    estimatedDailyTotalU: 0,    // patched below
  },
];

// Populate the daily-yield estimates from each node's investment using the
// midpoint yield. `dailyUsdt` is also overwritten to the static portion so
// the existing frontend (which still reads `dailyUsdt`) shows the correct
// "estimated USDT per day" without a frontend change.
for (const node of NODES) {
  const dailyTotal = estimateDailyAt(node.investment, YIELD_MIDPOINT_DAILY_PCT * 30);
  node.estimatedDailyTotalU   = Math.round(dailyTotal * 100) / 100;
  node.estimatedDailyStaticU  = Math.round(dailyTotal * STATIC_SHARE * 100) / 100;
  node.estimatedDailyDynamicU = Math.round(dailyTotal * DYNAMIC_SHARE * 100) / 100;
  node.dailyUsdt              = node.estimatedDailyStaticU;
}

const PROTOCOL_OVERVIEW = {
  protocolName: "RUNE Protocol",
  motherToken: {
    symbol: "符",
    launchPrice: 0.028,
    totalSupply: 210000000,
    dailyBurnRate: 0.002,
    targetPriceLow: 2.24,
    targetPriceHigh: 3.36,
  },
  subToken: {
    symbol: "符火",
    launchPrice: 0.038,
    totalSupply: 13100000,
    // Per `核心权益.md` §壹 sub-token's daily auto-burn is 0.1%, NOT 0.2%
    // (which is the mother-token rate). Earlier value of 0.002 was a bug —
    // it overstated sub-token deflation in the chart by ~2× per period.
    dailyBurnRate: 0.001,
    targetPriceLow: 3.04,
    targetPriceHigh: 4.56,
  },
  fundraising: {
    total: 8000000,
    tlpPool: 2800000,
    subTokenLP: 500000,
    operations: 2100000,
    treasury: 2600000,
  },
  priceStages: PRICE_STAGES,
  nodes: NODES,
};

router.get("/rune/overview", async (_req, res): Promise<void> => {
  res.json(GetRuneOverviewResponse.parse(PROTOCOL_OVERVIEW));
});

router.post("/rune/calculator", async (req, res): Promise<void> => {
  const parsed = CalculateRuneReturnsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { nodeLevel, seats, durationDays, priceStageIndex } = parsed.data;

  const node = NODES.find((n) => n.level === nodeLevel);
  if (!node) {
    res.status(400).json({ error: "Invalid node level" });
    return;
  }

  const stageIdx = Math.max(0, Math.min(5, priceStageIndex));
  const selectedStage = PRICE_STAGES[stageIdx];

  const investment = node.investment * seats;
  const motherTokens = node.motherTokensPerSeat * seats;
  const airdropTokens = node.airdropPerSeat * seats;

  // Estimated income, midpoint of the 15-35% monthly range. Static (65%)
  // is paid as USDT directly. Dynamic (35%) is auto-purchased into sub-
  // token at the day's price; for projection we value it at selectedStage.
  const dailyStaticU  = node.estimatedDailyStaticU  * seats;
  const dailyDynamicU = node.estimatedDailyDynamicU * seats;
  const totalUsdtIncome = dailyStaticU * durationDays;
  const dynamicUSpentTotal = dailyDynamicU * durationDays;
  const subTokenAccumulated = selectedStage.subPrice > 0
    ? dynamicUSpentTotal / selectedStage.subPrice
    : 0;
  const subTokenValue = subTokenAccumulated * selectedStage.subPrice;

  const motherTokenValue = motherTokens * selectedStage.motherPrice;
  // Per the 2026 spec the airdrop is mother-token (§六 "节点母TOKEN空投 ·
  // 10,000,000 枚母TOKEN"), so it prices off motherPrice. subPrice used
  // here earlier overstated airdrop value by ~35% at every stage.
  const airdropTokenValue = airdropTokens * selectedStage.motherPrice;
  const totalAssets = motherTokenValue + airdropTokenValue + totalUsdtIncome + subTokenValue;
  const roi = ((totalAssets - investment) / investment) * 100;
  const roiMultiplier = totalAssets / investment;

  // Range bands: scale the daily totals to low/high yield and recompute.
  const scaleFor = (monthlyPct: number) => monthlyPct / (YIELD_MIDPOINT_DAILY_PCT * 30);
  const bandTotal = (monthlyPct: number) => {
    const scale = scaleFor(monthlyPct);
    const staticU = totalUsdtIncome * scale;
    const dynamicU = dynamicUSpentTotal * scale;
    const subVal = selectedStage.subPrice > 0 ? dynamicU : 0; // dynamicU == subVal at the same stage subPrice
    return motherTokenValue + airdropTokenValue + staticU + subVal;
  };
  const totalAssetsLow  = bandTotal(YIELD_RANGE_LOW_PCT);
  const totalAssetsHigh = bandTotal(YIELD_RANGE_HIGH_PCT);
  const roiLow  = ((totalAssetsLow - investment) / investment) * 100;
  const roiHigh = ((totalAssetsHigh - investment) / investment) * 100;

  const fmt = (n: number, decimals = 2) =>
    n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  const breakdown = [
    { label: "Node Tier", labelCn: "节点等级", value: `${node.nameEn} (${node.nameCn})` },
    { label: "Seats", labelCn: "席位数量", value: `${seats} 席` },
    { label: "Total Investment", labelCn: "总投资额", value: `$${fmt(investment)} USDT` },
    { label: "Private Price", labelCn: "母TOKEN私募价", value: `$${node.privatePrice}/枚` },
    { label: "Mother Tokens", labelCn: "获得母TOKEN", value: `${motherTokens.toLocaleString()} 枚` },
    { label: "Mother-Token Airdrop", labelCn: "母TOKEN空投", value: `${airdropTokens.toLocaleString()} 枚` },
    { label: "Daily Static USDT (est.)", labelCn: "每日静态USDT (预估)", value: `$${fmt(dailyStaticU)}/天` },
    { label: "Daily Dynamic Sub-Token (est.)", labelCn: "每日动态子币 (预估)", value: `$${fmt(dailyDynamicU)}/天` },
    { label: "Duration", labelCn: "持仓周期", value: `${durationDays} 天` },
    { label: "Total Static USDT", labelCn: "静态USDT总收益", value: `$${fmt(totalUsdtIncome)}` },
    { label: "Sub-Tokens Accumulated", labelCn: "累计获得子币", value: `${fmt(subTokenAccumulated)} 枚` },
    { label: "Sub-Token Value", labelCn: "子币持仓市值", value: `$${fmt(subTokenValue)}` },
    { label: "Price Stage", labelCn: "价格阶段", value: `${selectedStage.labelCn} (母TOKEN $${selectedStage.motherPrice})` },
    { label: "Mother Token Value", labelCn: "母TOKEN持仓市值", value: `$${fmt(motherTokenValue)}` },
    { label: "Airdrop Value", labelCn: "母TOKEN空投价值", value: `$${fmt(airdropTokenValue)}` },
    { label: "Total Assets (est. midpoint)", labelCn: "总资产 (预估中位)", value: `$${fmt(totalAssets)}` },
    { label: "Range (Low @ 15%/mo)", labelCn: "保守区间 (月化15%)", value: `$${fmt(totalAssetsLow)}` },
    { label: "Range (High @ 35%/mo)", labelCn: "乐观区间 (月化35%)", value: `$${fmt(totalAssetsHigh)}` },
    { label: "ROI (midpoint)", labelCn: "投资回报率 (中位)", value: `${fmt(roi)}%` },
    { label: "ROI Multiplier", labelCn: "资产倍数", value: `${fmt(roiMultiplier)}×` },
  ];

  res.json(
    CalculateRuneReturnsResponse.parse({
      investment,
      privatePrice: node.privatePrice,
      motherTokens,
      airdropTokens,
      dailyUsdt: dailyStaticU,
      durationDays,
      totalUsdtIncome: Math.round(totalUsdtIncome * 100) / 100,
      selectedStage,
      motherTokenValue: Math.round(motherTokenValue * 100) / 100,
      airdropTokenValue: Math.round(airdropTokenValue * 100) / 100,
      totalAssets: Math.round(totalAssets * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      roiMultiplier: Math.round(roiMultiplier * 10000) / 10000,
      estimateMode: "midpoint",
      subTokenAccumulated: Math.round(subTokenAccumulated * 100) / 100,
      subTokenValue: Math.round(subTokenValue * 100) / 100,
      totalAssetsLow: Math.round(totalAssetsLow * 100) / 100,
      totalAssetsHigh: Math.round(totalAssetsHigh * 100) / 100,
      roiLow: Math.round(roiLow * 100) / 100,
      roiHigh: Math.round(roiHigh * 100) / 100,
      breakdown,
    })
  );
});

// Burn-stake mother-token investment calculator. Per `核心机制.md` §壹:
// burn N mother tokens → permanent daily yield 1.0%-1.5% × N in mother tokens.
// Tier table by burn amount; 1000+ tokens hits the top 1.5% rate.
function burnStakeRate(motherTokensBurned: number): number {
  if (motherTokensBurned >= 100_000) return 1.5;
  if (motherTokensBurned >=  10_000) return 1.4;
  if (motherTokensBurned >=   1_000) return 1.3;
  if (motherTokensBurned >=     100) return 1.2;
  return 1.0;
}

router.post("/rune/burn-stake-calculator", async (req, res): Promise<void> => {
  const parsed = CalculateRuneBurnStakeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { motherTokensBurned, durationDays, priceStageIndex } = parsed.data;
  const stageIdx = Math.max(0, Math.min(5, priceStageIndex));
  const selectedStage = PRICE_STAGES[stageIdx];

  const dailyRatePct = burnStakeRate(motherTokensBurned);
  const dailyYieldTokens = motherTokensBurned * (dailyRatePct / 100);
  const totalYieldTokens = dailyYieldTokens * durationDays;
  const totalYieldValue = totalYieldTokens * selectedStage.motherPrice;
  const burnedValueAtLaunch = motherTokensBurned * PROTOCOL_OVERVIEW.motherToken.launchPrice;
  const roi = burnedValueAtLaunch > 0
    ? ((totalYieldValue - burnedValueAtLaunch) / burnedValueAtLaunch) * 100
    : 0;
  const roiMultiplier = burnedValueAtLaunch > 0 ? totalYieldValue / burnedValueAtLaunch : 0;

  const fmt = (n: number, decimals = 2) =>
    n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  const breakdown = [
    { label: "Burned (mother tokens)", labelCn: "销毁母TOKEN数量", value: `${motherTokensBurned.toLocaleString()} 枚` },
    { label: "Burned at launch ($0.028)", labelCn: "本金 (按开盘价)", value: `$${fmt(burnedValueAtLaunch)}` },
    { label: "Daily Rate (est.)", labelCn: "日化收益率 (预估)", value: `${dailyRatePct}%` },
    { label: "Daily Yield", labelCn: "日产出母TOKEN", value: `${fmt(dailyYieldTokens, 4)} 枚` },
    { label: "Duration", labelCn: "持仓周期", value: `${durationDays} 天 (永久)` },
    { label: "Total Yield Tokens", labelCn: "周期产出母TOKEN", value: `${fmt(totalYieldTokens)} 枚` },
    { label: "Price Stage", labelCn: "价格阶段", value: `${selectedStage.labelCn} (母TOKEN $${selectedStage.motherPrice})` },
    { label: "Total Yield Value", labelCn: "产出市值", value: `$${fmt(totalYieldValue)}` },
    { label: "ROI vs launch cost", labelCn: "投资回报率", value: `${fmt(roi)}%` },
    { label: "ROI Multiplier", labelCn: "资产倍数", value: `${fmt(roiMultiplier)}×` },
  ];

  res.json(
    CalculateRuneBurnStakeResponse.parse({
      motherTokensBurned,
      dailyRatePct,
      dailyYieldTokens: Math.round(dailyYieldTokens * 10000) / 10000,
      durationDays,
      totalYieldTokens: Math.round(totalYieldTokens * 100) / 100,
      selectedStage,
      totalYieldValue: Math.round(totalYieldValue * 100) / 100,
      burnedValueAtLaunch: Math.round(burnedValueAtLaunch * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      roiMultiplier: Math.round(roiMultiplier * 10000) / 10000,
      estimateMode: "midpoint",
      breakdown,
    })
  );
});

export default router;
