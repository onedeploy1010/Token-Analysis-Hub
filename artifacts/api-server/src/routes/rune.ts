import { Router, type IRouter } from "express";
import {
  CalculateRuneReturnsBody,
  CalculateRuneReturnsResponse,
  GetRuneOverviewResponse,
} from "@rune/api-zod";

const router: IRouter = Router();

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
    level: "initial",
    nameEn: "INITIAL",
    nameCn: "初级",
    investment: 1000,
    seats: 1000,
    seatsRemaining: 1000,
    privatePrice: 0.028,
    dailyUsdt: 4.7,
    weight: 0.6,
    airdropTotal: 3571429,
    airdropPerSeat: 3571,
    motherTokensPerSeat: 0,
  },
  {
    level: "pioneer",
    nameEn: "PIONEER",
    nameCn: "符胚",
    investment: 2500,
    seats: 800,
    seatsRemaining: 532,
    privatePrice: 0.026,
    dailyUsdt: 11.7,
    weight: 1,
    airdropTotal: 4761905,
    airdropPerSeat: 5952,
    motherTokensPerSeat: 0,
  },
  {
    level: "builder",
    nameEn: "BUILDER",
    nameCn: "符印",
    investment: 5000,
    seats: 400,
    seatsRemaining: 218,
    privatePrice: 0.024,
    dailyUsdt: 23.4,
    weight: 1.2,
    airdropTotal: 2857143,
    airdropPerSeat: 7143,
    motherTokensPerSeat: 0,
  },
  {
    level: "guardian",
    nameEn: "GUARDIAN",
    nameCn: "符魂",
    investment: 10000,
    seats: 200,
    seatsRemaining: 87,
    privatePrice: 0.02,
    dailyUsdt: 46.8,
    weight: 1.6,
    airdropTotal: 1904762,
    airdropPerSeat: 9524,
    motherTokensPerSeat: 0,
  },
  {
    level: "strategic",
    nameEn: "STRATEGIC",
    nameCn: "符主",
    investment: 50000,
    seats: 20,
    seatsRemaining: 11,
    privatePrice: 0.016,
    dailyUsdt: 234,
    weight: 2,
    airdropTotal: 476190,
    airdropPerSeat: 11905,
    motherTokensPerSeat: 0,
  },
];

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
    dailyBurnRate: 0.002,
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
  const dailyUsdt = node.dailyUsdt * seats;
  const totalUsdtIncome = dailyUsdt * durationDays;

  const motherTokenValue = motherTokens * selectedStage.motherPrice;
  // Per the 2026 spec the airdrop is mother-token (§六 "节点母TOKEN空投 ·
  // 10,000,000 枚母TOKEN"), so it prices off motherPrice. subPrice used
  // here earlier overstated airdrop value by ~35% at every stage.
  const airdropTokenValue = airdropTokens * selectedStage.motherPrice;
  const totalAssets = motherTokenValue + airdropTokenValue + totalUsdtIncome;
  const roi = ((totalAssets - investment) / investment) * 100;
  const roiMultiplier = totalAssets / investment;

  const fmt = (n: number, decimals = 2) =>
    n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  const breakdown = [
    { label: "Node Tier", labelCn: "节点等级", value: `${node.nameEn} (${node.nameCn})` },
    { label: "Seats", labelCn: "席位数量", value: `${seats} 席` },
    { label: "Total Investment", labelCn: "总投资额", value: `$${fmt(investment)} USDT` },
    { label: "Private Price", labelCn: "母TOKEN私募价", value: `$${node.privatePrice}/枚` },
    { label: "Mother Tokens", labelCn: "获得母TOKEN", value: `${motherTokens.toLocaleString()} 枚` },
    { label: "Mother-Token Airdrop", labelCn: "母TOKEN空投", value: `${airdropTokens.toLocaleString()} 枚` },
    { label: "Daily USDT Income", labelCn: "每日USDT收益", value: `$${fmt(dailyUsdt)}/天` },
    { label: "Duration", labelCn: "持仓周期", value: `${durationDays} 天` },
    { label: "Total USDT Income", labelCn: "USDT总收益", value: `$${fmt(totalUsdtIncome)}` },
    { label: "Price Stage", labelCn: "价格阶段", value: `${selectedStage.labelCn} (母TOKEN $${selectedStage.motherPrice})` },
    { label: "Mother Token Value", labelCn: "母TOKEN持仓市值", value: `$${fmt(motherTokenValue)}` },
    { label: "Airdrop Value", labelCn: "母TOKEN空投价值", value: `$${fmt(airdropTokenValue)}` },
    { label: "Total Assets", labelCn: "总资产", value: `$${fmt(totalAssets)}` },
    { label: "ROI", labelCn: "投资回报率", value: `${fmt(roi)}%` },
    { label: "ROI Multiplier", labelCn: "资产倍数", value: `${fmt(roiMultiplier)}×` },
  ];

  res.json(
    CalculateRuneReturnsResponse.parse({
      investment,
      privatePrice: node.privatePrice,
      motherTokens,
      airdropTokens,
      dailyUsdt,
      durationDays,
      totalUsdtIncome: Math.round(totalUsdtIncome * 100) / 100,
      selectedStage,
      motherTokenValue: Math.round(motherTokenValue * 100) / 100,
      airdropTokenValue: Math.round(airdropTokenValue * 100) / 100,
      totalAssets: Math.round(totalAssets * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      roiMultiplier: Math.round(roiMultiplier * 10000) / 10000,
      breakdown,
    })
  );
});

export default router;
