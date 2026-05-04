import type { Env, BotDecision, Indicators, Asset, Timeframe } from "./types";

/**
 * OpenRouter chat-completion client. Uses the same OPENROUTER_API_KEY
 * already provisioned for the existing ai-forecast-multi Edge Function.
 * Models are addressed by their OpenRouter slug (e.g. "openai/gpt-4o").
 *
 * Embedding endpoint also routes through OpenRouter since we want to
 * keep one key for the whole bot stack. text-embedding-3-small returns
 * 1536-dim vectors — matches the schema's vector(1536) column exactly.
 */

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const EMBED_ENDPOINT = "https://openrouter.ai/api/v1/embeddings";

interface ChatResponse {
  choices: Array<{ message: { content: string } }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

function systemPrompt(): string {
  return [
    "You are a quantitative trading bot. Given a snapshot of indicators for a single",
    "crypto pair, you decide whether to open a LONG or SHORT paper trade, or stay",
    "NEUTRAL. You ALWAYS reply with a strict JSON object — no markdown, no commentary.",
    "",
    "Reply schema:",
    "{",
    '  "direction": "LONG" | "SHORT" | "NEUTRAL",',
    '  "confidence": 0-100,',
    '  "rationale": "1-2 short sentences",',
    '  "targetPrice": number | null,',
    '  "stopLossPct": number | null,',
    '  "takeProfitPct": number | null,',
    '  "steps": [ { "level": "info"|"signal"|"warn"|"result", "message": "..." } ]',
    "}",
    "",
    "Steps must be 4–8 short reasoning bullets that the dashboard streams as a",
    "live console — describe what you observed, not what you will say later.",
  ].join("\n");
}

function userPrompt(args: {
  asset: Asset; timeframe: Timeframe; ind: Indicators;
  memory: Array<{ asset: string; content: string; outcome_pnl_pct: number | null }>;
}): string {
  const { asset, timeframe, ind, memory } = args;
  const memSection = memory.length > 0
    ? [
      "Recent self-memory (top similar past trades):",
      ...memory.map((m, i) => `  ${i + 1}. [${m.asset}] pnl=${m.outcome_pnl_pct ?? "?"}% — ${m.content}`),
      "",
    ].join("\n")
    : "Recent self-memory: (none — fresh start)\n\n";
  return [
    `Asset: ${asset}    Timeframe: ${timeframe}`,
    `Price: ${ind.price.toFixed(4)}    24h ${ind.pctChange24h.toFixed(2)}%    high/low ${ind.high24h.toFixed(2)}/${ind.low24h.toFixed(2)}`,
    `SMA20=${ind.sma20.toFixed(2)}  EMA12=${ind.ema12.toFixed(2)}  EMA26=${ind.ema26.toFixed(2)}`,
    `RSI14=${ind.rsi14.toFixed(1)}  MACD=${ind.macd.toFixed(4)} (signal ${ind.macdSignal.toFixed(4)})`,
    `Volume=${ind.volume.toFixed(0)}  20-period avg ${ind.volumeAvg.toFixed(0)}`,
    "",
    memSection,
    "Decide. Reply with JSON only.",
  ].join("\n");
}

export async function callModel(
  env: Env,
  openrouterModel: string,
  args: { asset: Asset; timeframe: Timeframe; ind: Indicators; memory: Parameters<typeof userPrompt>[0]["memory"] },
): Promise<BotDecision> {
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://rune-ai.io",
      "X-Title": "RUNE AI bot",
    },
    body: JSON.stringify({
      model: openrouterModel,
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 600,
      messages: [
        { role: "system", content: systemPrompt() },
        { role: "user", content: userPrompt(args) },
      ],
    }),
  });
  if (!r.ok) throw new Error(`openrouter ${openrouterModel} → ${r.status} ${await r.text()}`);
  const j = (await r.json()) as ChatResponse;
  const raw = j.choices?.[0]?.message?.content?.trim() ?? "";
  let parsed: BotDecision;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Recover from a model that wrapped the JSON in code fences despite the system prompt.
    const m = raw.match(/\{[\s\S]+\}/);
    if (!m) throw new Error(`unparseable model output: ${raw.slice(0, 200)}`);
    parsed = JSON.parse(m[0]);
  }
  // Defensive normalization — models occasionally drop optional keys.
  return {
    direction: (parsed.direction === "LONG" || parsed.direction === "SHORT" || parsed.direction === "NEUTRAL")
      ? parsed.direction : "NEUTRAL",
    confidence: clampInt(parsed.confidence, 0, 100, 50),
    rationale: typeof parsed.rationale === "string" ? parsed.rationale.slice(0, 500) : "",
    targetPrice: typeof parsed.targetPrice === "number" ? parsed.targetPrice : undefined,
    stopLossPct: typeof parsed.stopLossPct === "number" ? Math.abs(parsed.stopLossPct) : undefined,
    takeProfitPct: typeof parsed.takeProfitPct === "number" ? Math.abs(parsed.takeProfitPct) : undefined,
    steps: Array.isArray(parsed.steps) ? parsed.steps.slice(0, 12).map((s: any) => ({
      level: s?.level === "signal" || s?.level === "warn" || s?.level === "result" ? s.level : "info",
      message: typeof s?.message === "string" ? s.message.slice(0, 400) : "",
    })) : [],
  };
}

function clampInt(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}

export async function embed(env: Env, text: string): Promise<number[]> {
  const r = await fetch(EMBED_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: text,
    }),
  });
  if (!r.ok) throw new Error(`embed → ${r.status} ${await r.text()}`);
  const j = (await r.json()) as { data: Array<{ embedding: number[] }> };
  return j.data[0]?.embedding ?? [];
}
