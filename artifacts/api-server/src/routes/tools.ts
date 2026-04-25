import { Router, type IRouter } from "express";
import {
  CalculateApyBody,
  CalculateApyResponse,
  SimulateInvestmentBody,
  SimulateInvestmentResponse,
  CalculateImpermanentLossBody,
  CalculateImpermanentLossResponse,
} from "@rune/api-zod";

const router: IRouter = Router();

router.post("/tools/apy-calculator", async (req, res): Promise<void> => {
  const parsed = CalculateApyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { principal, apy, compoundFrequency, durationDays } = parsed.data;

  const freqMap: Record<string, number> = {
    daily: 365,
    weekly: 52,
    monthly: 12,
    yearly: 1,
  };

  const n = freqMap[compoundFrequency] ?? 365;
  const r = apy / 100;
  const t = durationDays / 365;

  const finalAmount = principal * Math.pow(1 + r / n, n * t);
  const totalReturn = finalAmount - principal;
  const returnPercent = (totalReturn / principal) * 100;

  const dailyBreakdown: { day: number; amount: number }[] = [];
  const step = Math.max(1, Math.floor(durationDays / 30));
  for (let day = 0; day <= durationDays; day += step) {
    const amount = principal * Math.pow(1 + r / n, n * (day / 365));
    dailyBreakdown.push({ day, amount: Math.round(amount * 100) / 100 });
  }
  if (dailyBreakdown[dailyBreakdown.length - 1]?.day !== durationDays) {
    dailyBreakdown.push({ day: durationDays, amount: Math.round(finalAmount * 100) / 100 });
  }

  res.json(CalculateApyResponse.parse({
    principal,
    finalAmount: Math.round(finalAmount * 100) / 100,
    totalReturn: Math.round(totalReturn * 100) / 100,
    returnPercent: Math.round(returnPercent * 100) / 100,
    dailyBreakdown,
  }));
});

router.post("/tools/investment-simulator", async (req, res): Promise<void> => {
  const parsed = SimulateInvestmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { initialInvestment, monthlyContribution, expectedApy, years, tokenPriceChange } = parsed.data;

  const monthlyRate = expectedApy / 100 / 12;
  const priceMultiplier = tokenPriceChange ? 1 + (tokenPriceChange / 100) : 1;

  let balance = initialInvestment;
  let totalContributed = initialInvestment;
  const yearlyBreakdown: { year: number; value: number; contributed: number; yield: number }[] = [];

  for (let year = 1; year <= years; year++) {
    const yearStart = balance;
    for (let month = 0; month < 12; month++) {
      balance = balance * (1 + monthlyRate) + monthlyContribution;
      totalContributed += monthlyContribution;
    }
    const annualPriceGain = (balance - yearStart) * (priceMultiplier - 1);
    balance += annualPriceGain;
    yearlyBreakdown.push({
      year,
      value: Math.round(balance * 100) / 100,
      contributed: Math.round(totalContributed * 100) / 100,
      yield: Math.round((balance - totalContributed) * 100) / 100,
    });
  }

  const totalReturn = balance - totalContributed;
  const returnPercent = totalContributed > 0 ? (totalReturn / totalContributed) * 100 : 0;

  res.json(SimulateInvestmentResponse.parse({
    finalValue: Math.round(balance * 100) / 100,
    totalContributed: Math.round(totalContributed * 100) / 100,
    totalReturn: Math.round(totalReturn * 100) / 100,
    returnPercent: Math.round(returnPercent * 100) / 100,
    yearlyBreakdown,
  }));
});

router.post("/tools/impermanent-loss", async (req, res): Promise<void> => {
  const parsed = CalculateImpermanentLossBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { initialPrice, currentPrice, liquidityValue } = parsed.data;

  const priceRatio = currentPrice / initialPrice;
  const ilFactor = (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1;

  const hodlValue = liquidityValue * (1 + (priceRatio - 1) / 2);
  const lpValue = liquidityValue * (1 + ilFactor);
  const ilUsd = hodlValue - lpValue;
  const ilPercent = (ilFactor) * 100;
  const priceChangePercent = (priceRatio - 1) * 100;

  res.json(CalculateImpermanentLossResponse.parse({
    ilPercent: Math.round(ilPercent * 10000) / 10000,
    ilUsd: Math.round(ilUsd * 100) / 100,
    hodlValue: Math.round(hodlValue * 100) / 100,
    lpValue: Math.round(lpValue * 100) / 100,
    priceChangePercent: Math.round(priceChangePercent * 100) / 100,
  }));
});

export default router;
