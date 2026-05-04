import type { Candle, Asset, Timeframe, Indicators } from "./types";

/**
 * Binance public spot REST client. No API key needed for klines / 24hr
 * ticker — these are free, rate-limited at 1200 req/min/IP which is
 * orders of magnitude more than we need (we hit ≤2 endpoints per asset
 * per tick).
 */
const BASE = "https://api.binance.com/api/v3";

export async function fetchKlines(
  symbol: Asset,
  interval: Timeframe,
  limit = 100,
): Promise<Candle[]> {
  const r = await fetch(`${BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
  if (!r.ok) throw new Error(`klines ${symbol} ${interval}: ${r.status}`);
  const arr = (await r.json()) as unknown[][];
  return arr.map((k) => ({
    openTime:  Number(k[0]),
    open:      Number(k[1]),
    high:      Number(k[2]),
    low:       Number(k[3]),
    close:     Number(k[4]),
    volume:    Number(k[5]),
    closeTime: Number(k[6]),
  }));
}

export async function fetchTicker24h(symbol: Asset): Promise<{
  lastPrice: number; priceChangePercent: number; highPrice: number; lowPrice: number;
}> {
  const r = await fetch(`${BASE}/ticker/24hr?symbol=${symbol}`);
  if (!r.ok) throw new Error(`24h ${symbol}: ${r.status}`);
  const j = await r.json() as { lastPrice: string; priceChangePercent: string; highPrice: string; lowPrice: string };
  return {
    lastPrice: Number(j.lastPrice),
    priceChangePercent: Number(j.priceChangePercent),
    highPrice: Number(j.highPrice),
    lowPrice: Number(j.lowPrice),
  };
}

/** Fast price lookup for resolving open trades / predictions — a single
 *  REST call returns the spot mid for one symbol. */
export async function fetchSpotPrice(symbol: Asset): Promise<number> {
  const r = await fetch(`${BASE}/ticker/price?symbol=${symbol}`);
  if (!r.ok) throw new Error(`price ${symbol}: ${r.status}`);
  const j = (await r.json()) as { price: string };
  return Number(j.price);
}

/* ─────────── indicator math (no deps) ─────────── */

function sma(arr: number[], period: number): number {
  if (arr.length < period) return arr[arr.length - 1] ?? 0;
  const slice = arr.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function ema(arr: number[], period: number): number {
  if (arr.length === 0) return 0;
  const k = 2 / (period + 1);
  let prev = arr[0];
  for (let i = 1; i < arr.length; i += 1) prev = arr[i] * k + prev * (1 - k);
  return prev;
}

function rsi(arr: number[], period = 14): number {
  if (arr.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = arr.length - period; i < arr.length; i += 1) {
    const diff = arr[i] - arr[i - 1];
    if (diff >= 0) gains += diff; else losses += -diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function buildIndicators(candles: Candle[], ticker: Awaited<ReturnType<typeof fetchTicker24h>>): Indicators {
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macd = ema12 - ema26;
  // Rough MACD signal — 9-period EMA of historical MACD values.
  const macdSeries: number[] = [];
  for (let i = 0; i < closes.length; i += 1) {
    const sub = closes.slice(0, i + 1);
    macdSeries.push(ema(sub, 12) - ema(sub, 26));
  }
  const macdSignal = ema(macdSeries.slice(-30), 9);
  return {
    price: closes[closes.length - 1],
    sma20: sma(closes, 20),
    ema12, ema26, rsi14: rsi(closes, 14),
    macd, macdSignal,
    volume: volumes[volumes.length - 1] ?? 0,
    volumeAvg: sma(volumes, 20),
    high24h: ticker.highPrice,
    low24h: ticker.lowPrice,
    pctChange24h: ticker.priceChangePercent,
  };
}
