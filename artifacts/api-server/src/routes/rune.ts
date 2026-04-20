import { Router, type IRouter } from "express";
import {
  CalculateRuneReturnsBody,
  CalculateRuneReturnsResponse,
  GetRuneOverviewResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const RUNE_MOCK_DATA = {
  price: 4.85,
  marketCap: "$1.54B",
  tvl: "$312M",
  totalSupply: 500_000_000,
  circulatingSupply: 317_000_000,
  bondedAmount: 185_000_000,
  pooledAmount: 132_000_000,
  currentApr: 12.5,
  nodesCount: 105,
  poolsCount: 87,
  keyMetrics: [
    {
      label: "Security Ratio",
      value: "58.4%",
      description: "Ratio of bonded RUNE to pooled RUNE. Healthy when bonded > 2x pooled.",
    },
    {
      label: "System Income (30d)",
      value: "$4.2M",
      description: "Total fees and block rewards distributed to node operators and LPs in last 30 days.",
    },
    {
      label: "Slip Fees (24h)",
      value: "$48K",
      description: "Swap fees from liquidity demand collected in the last 24 hours.",
    },
    {
      label: "Node Churn Interval",
      value: "3 days",
      description: "How frequently nodes rotate to ensure decentralization and security.",
    },
    {
      label: "Effective Security",
      value: "1.4x",
      description: "Bond / Pool ratio. Target is 1.0x–2.0x for optimal capital efficiency.",
    },
    {
      label: "Block Rewards APR",
      value: "8.2%",
      description: "APR derived from RUNE emission block rewards for current epoch.",
    },
  ],
};

router.get("/rune/overview", async (_req, res): Promise<void> => {
  res.json(GetRuneOverviewResponse.parse(RUNE_MOCK_DATA));
});

router.post("/rune/calculator", async (req, res): Promise<void> => {
  const parsed = CalculateRuneReturnsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { runeAmount, mode, runePrice, durationDays } = parsed.data;
  const price = runePrice ?? RUNE_MOCK_DATA.price;
  const inputUsdValue = runeAmount * price;

  let apyPercent = 0;
  let breakdown: { label: string; value: string }[] = [];
  const warnings: string[] = [];

  if (mode === "bond") {
    apyPercent = RUNE_MOCK_DATA.currentApr;
    const dailyRate = apyPercent / 100 / 365;
    const estimatedReturn = runeAmount * dailyRate * durationDays;

    breakdown = [
      { label: "Mode", value: "Node Bonding" },
      { label: "Bond Amount", value: `${runeAmount.toLocaleString()} RUNE` },
      { label: "Bond USD Value", value: `$${inputUsdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
      { label: "Duration", value: `${durationDays} days` },
      { label: "Current Node APR", value: `${apyPercent}%` },
      { label: "Estimated RUNE Earned", value: `${estimatedReturn.toFixed(4)} RUNE` },
      { label: "Estimated USD Return", value: `$${(estimatedReturn * price).toFixed(2)}` },
    ];

    if (runeAmount < 300_000) {
      warnings.push("Minimum bond to operate a node is ~300,000 RUNE. Consider savers vaults or LP for smaller amounts.");
    }

    const finalReturn = estimatedReturn;
    const finalReturnUsd = finalReturn * price;
    res.json(CalculateRuneReturnsResponse.parse({
      inputAmount: runeAmount,
      inputUsdValue: Math.round(inputUsdValue * 100) / 100,
      estimatedReturn: Math.round(finalReturn * 10000) / 10000,
      estimatedReturnUsd: Math.round(finalReturnUsd * 100) / 100,
      apyPercent,
      breakdown,
      warnings,
    }));
    return;
  }

  if (mode === "pool") {
    apyPercent = 18.3;
    const dailyRate = apyPercent / 100 / 365;
    const estimatedReturn = runeAmount * dailyRate * durationDays;

    breakdown = [
      { label: "Mode", value: "Liquidity Pool" },
      { label: "RUNE Amount", value: `${runeAmount.toLocaleString()} RUNE` },
      { label: "RUNE USD Value", value: `$${inputUsdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
      { label: "Paired Asset Value", value: `$${inputUsdValue.toFixed(2)} (50/50 split)` },
      { label: "Total LP Position", value: `$${(inputUsdValue * 2).toFixed(2)}` },
      { label: "Duration", value: `${durationDays} days` },
      { label: "Estimated LP APR", value: `${apyPercent}%` },
      { label: "Estimated RUNE Earned", value: `${estimatedReturn.toFixed(4)} RUNE` },
      { label: "Estimated USD Return", value: `$${(estimatedReturn * price).toFixed(2)}` },
    ];

    warnings.push("Impermanent loss risk applies when paired asset price changes relative to RUNE.");
    warnings.push("RUNE: Asset ratio must be 50:50 for standard LP. You need equal USD value of the paired asset.");

    res.json(CalculateRuneReturnsResponse.parse({
      inputAmount: runeAmount,
      inputUsdValue: Math.round(inputUsdValue * 100) / 100,
      estimatedReturn: Math.round(estimatedReturn * 10000) / 10000,
      estimatedReturnUsd: Math.round(estimatedReturn * price * 100) / 100,
      apyPercent,
      breakdown,
      warnings,
    }));
    return;
  }

  if (mode === "lp") {
    apyPercent = 8.7;
    const dailyRate = apyPercent / 100 / 365;
    const estimatedReturn = runeAmount * dailyRate * durationDays;

    breakdown = [
      { label: "Mode", value: "Savers Vault (Single-sided LP)" },
      { label: "RUNE Amount", value: `${runeAmount.toLocaleString()} RUNE` },
      { label: "RUNE USD Value", value: `$${inputUsdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
      { label: "Duration", value: `${durationDays} days` },
      { label: "Savers APR", value: `${apyPercent}%` },
      { label: "Estimated RUNE Earned", value: `${estimatedReturn.toFixed(4)} RUNE` },
      { label: "Estimated USD Return", value: `$${(estimatedReturn * price).toFixed(2)}` },
    ];

    warnings.push("Savers yield is variable and depends on swap demand in RUNE pools.");

    res.json(CalculateRuneReturnsResponse.parse({
      inputAmount: runeAmount,
      inputUsdValue: Math.round(inputUsdValue * 100) / 100,
      estimatedReturn: Math.round(estimatedReturn * 10000) / 10000,
      estimatedReturnUsd: Math.round(estimatedReturn * price * 100) / 100,
      apyPercent,
      breakdown,
      warnings,
    }));
    return;
  }

  res.status(400).json({ error: "Invalid mode" });
});

export default router;
