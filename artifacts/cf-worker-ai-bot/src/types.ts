/** Shared types for the RUNE AI bot worker. */

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENROUTER_API_KEY: string;
  RUNE_CHAIN: string;
}

/** Models the bot rotates through, one per tick. Keep names stable —
 *  they're the primary key for "which AI is talking" in every dashboard
 *  view. Adding a model here is a no-op for the schema; it just shows
 *  up alongside the others next time. */
export const MODELS = [
  { name: "rune-ai",  openrouter: "openai/gpt-4o-mini",       label: "RUNE AI"   },
  { name: "gpt-4o",   openrouter: "openai/gpt-4o",            label: "GPT-4o"    },
  { name: "claude",   openrouter: "anthropic/claude-3.5-haiku", label: "Claude"    },
  { name: "gemini",   openrouter: "google/gemini-2.0-flash-001", label: "Gemini"    },
  { name: "deepseek", openrouter: "deepseek/deepseek-chat",   label: "DeepSeek"  },
] as const;
export type ModelName = typeof MODELS[number]["name"];

/** Trading pairs the bot watches. Binance spot symbols (USDT-margined). */
export const ASSETS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "DOGEUSDT",
  "XRPUSDT", "ADAUSDT", "AVAXUSDT", "LINKUSDT", "DOTUSDT",
] as const;
export type Asset = typeof ASSETS[number];

export const TIMEFRAMES = ["5m", "15m", "1h", "4h", "1d"] as const;
export type Timeframe = typeof TIMEFRAMES[number];

/** OHLCV candle from Binance kline endpoint. */
export interface Candle {
  openTime: number;
  open: number; high: number; low: number; close: number; volume: number;
  closeTime: number;
}

/** Indicators we compute from the latest 100 candles and feed into the
 *  model — also persisted to ai_console_logs.indicators so the dashboard
 *  can show what the bot was looking at when it decided. */
export interface Indicators {
  price: number;
  sma20: number;
  ema12: number;
  ema26: number;
  rsi14: number;
  macd: number;
  macdSignal: number;
  volume: number;
  volumeAvg: number;
  high24h: number;
  low24h: number;
  pctChange24h: number;
}

export interface BotDecision {
  direction: "LONG" | "SHORT" | "NEUTRAL";
  confidence: number;            // 0–100
  rationale: string;             // short summary
  targetPrice?: number;          // for predictions
  stopLossPct?: number;          // for paper trades
  takeProfitPct?: number;
  steps: Array<{ level: "info" | "signal" | "warn" | "result"; message: string }>;
}
