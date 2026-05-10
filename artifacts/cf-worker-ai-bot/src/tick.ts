import { ASSETS, MODELS, TIMEFRAMES, type Env, type Asset, type Timeframe, type ModelName } from "./types";
import { fetchKlines, fetchTicker24h, fetchSpotPrice, buildIndicators } from "./binance";
import { callModel, embed } from "./openrouter";
import { insertRows, updateRow, selectRows, rpc } from "./supabase";

/**
 * One bot tick — runs every 60s via Cron Trigger or on-demand via /tick.
 *
 * Steps:
 *   1. Resolve any open paper trades whose stop-loss / take-profit /
 *      timeout has been hit, using current spot price.
 *   2. Resolve any predictions whose resolve_at is in the past.
 *   3. Pick one model + one asset (round-robin by minute) and run a fresh
 *      decision. Stream reasoning steps into ai_console_logs, optionally
 *      open a paper trade + emit a prediction.
 *   4. For every newly-closed trade, embed a short summary into
 *      ai_bot_memory so future decisions can RAG over past outcomes.
 */
export async function runTick(env: Env, source: "cron" | "http"): Promise<{
  tickId: string;
  resolved: { trades: number; predictions: number };
  decision: { model: ModelName; asset: Asset; direction: string; confidence: number } | null;
  newMemories: number;
  ms: number;
}> {
  const t0 = Date.now();
  const now = new Date();
  const tickId = `${now.toISOString()}-${source}-${Math.floor(Math.random() * 1e6).toString(36)}`;

  // Round-robin model + asset by minute index — gives 5 models × 10 assets
  // = 50 distinct decisions before the cycle repeats (50 minutes).
  const minute = Math.floor(now.getTime() / 60_000);
  const model = MODELS[minute % MODELS.length];
  const asset = ASSETS[Math.floor(minute / MODELS.length) % ASSETS.length];
  const timeframe: Timeframe = "1h";

  // ─── 1. resolve open trades ───
  const newlyClosed = await resolveOpenTrades(env);
  // ─── 2. resolve old predictions ───
  const resolvedPreds = await resolveDuePredictions(env);
  // ─── 3. fresh decision ───
  let decision: { model: ModelName; asset: Asset; direction: string; confidence: number } | null = null;
  let newMemoriesFromDecision = 0;
  try {
    const result = await runDecision(env, model.name, model.openrouter, asset, timeframe, tickId);
    decision = { model: model.name, asset, direction: result.direction, confidence: result.confidence };
    newMemoriesFromDecision = result.newMemoryCount;
  } catch (err) {
    await insertRows(env, "ai_console_logs", [{
      model: model.name,
      level: "error",
      asset,
      message: `decision failed: ${(err as Error).message?.slice(0, 300) ?? "unknown"}`,
      tick_id: tickId,
    }]);
  }

  // ─── 4. embed memory for closed trades ───
  let memories = newMemoriesFromDecision;
  for (const t of newlyClosed) {
    try {
      await embedClosedTrade(env, t);
      memories += 1;
    } catch (err) {
      console.error(`embed closed trade ${t.id} failed:`, err);
    }
  }

  return {
    tickId,
    resolved: { trades: newlyClosed.length, predictions: resolvedPreds },
    decision,
    newMemories: memories,
    ms: Date.now() - t0,
  };
}

/* ─────────── 1. resolve open trades ─────────── */

interface OpenTrade {
  id: number; model: string; asset: string; side: "LONG" | "SHORT";
  entry_price: string; leverage: number; opened_at: string;
}

async function resolveOpenTrades(env: Env): Promise<Array<{
  id: number; model: string; asset: string; pnlPct: number; reason: string;
}>> {
  const open = await selectRows<OpenTrade>(
    env,
    "ai_paper_trades?select=id,model,asset,side,entry_price,leverage,opened_at&status=eq.OPEN&limit=200",
  );
  if (open.length === 0) return [];
  // Group by asset so we only fetch each spot price once.
  const byAsset = new Map<string, OpenTrade[]>();
  for (const t of open) {
    const arr = byAsset.get(t.asset) ?? [];
    arr.push(t);
    byAsset.set(t.asset, arr);
  }
  const closed: Array<{ id: number; model: string; asset: string; pnlPct: number; reason: string }> = [];
  const TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours
  const TP_PCT = 0.6;
  const SL_PCT = 0.4;
  const nowMs = Date.now();

  for (const [asset, trades] of byAsset) {
    let price: number;
    try { price = await fetchSpotPrice(asset as Asset); } catch { continue; }
    for (const t of trades) {
      const entry = Number(t.entry_price);
      const sign = t.side === "LONG" ? 1 : -1;
      const grossPct = ((price - entry) / entry) * 100 * sign;
      const lev = t.leverage || 1;
      const netPct = grossPct * lev;
      const ageMs = nowMs - new Date(t.opened_at).getTime();
      let reason: string | null = null;
      if (netPct >= TP_PCT) reason = "TP";
      else if (netPct <= -SL_PCT * lev) reason = "SL";
      else if (ageMs >= TIMEOUT_MS) reason = "TIMEOUT";
      if (reason) {
        await updateRow(env, "ai_paper_trades", t.id, {
          status: "CLOSED",
          exit_price: price,
          pnl_pct: Number(netPct.toFixed(4)),
          close_reason: reason,
          closed_at: new Date().toISOString(),
        });
        await insertRows(env, "ai_console_logs", [{
          model: t.model,
          level: "result",
          asset: t.asset,
          message: `closed ${t.side} @ ${price.toFixed(4)} — ${reason}, pnl ${netPct.toFixed(2)}%`,
          trade_id: t.id,
        }]);
        closed.push({ id: t.id, model: t.model, asset: t.asset, pnlPct: netPct, reason });
      }
    }
  }
  return closed;
}

/* ─────────── 2. resolve predictions ─────────── */

interface DuePrediction {
  id: number; model: string; asset: string; direction: string;
  target_price: string | null; current_price: string | null;
}

async function resolveDuePredictions(env: Env): Promise<number> {
  const due = await selectRows<DuePrediction>(
    env,
    `ai_predictions?select=id,model,asset,direction,target_price,current_price&resolve_at=lt.${encodeURIComponent(new Date().toISOString())}&resolved_at=is.null&limit=100`,
  );
  if (due.length === 0) return 0;
  let resolved = 0;
  for (const p of due) {
    let actual: number;
    try { actual = await fetchSpotPrice(p.asset as Asset); } catch { continue; }
    const target = p.target_price ? Number(p.target_price) : null;
    const start  = p.current_price ? Number(p.current_price) : null;
    let hit = false;
    if (start != null && p.direction !== "NEUTRAL") {
      const moved = actual - start;
      hit = (p.direction === "LONG" && moved > 0) || (p.direction === "SHORT" && moved < 0);
      if (target != null) {
        hit = (p.direction === "LONG" && actual >= target) || (p.direction === "SHORT" && actual <= target);
      }
    } else if (p.direction === "NEUTRAL" && start != null) {
      // NEUTRAL "hit" = stayed within ±1%
      hit = Math.abs(((actual - start) / start) * 100) < 1;
    }
    await updateRow(env, "ai_predictions", p.id, {
      actual_price: actual,
      hit,
      resolved_at: new Date().toISOString(),
    });
    resolved += 1;
  }
  return resolved;
}

/* ─────────── 3. run a fresh decision ─────────── */

async function runDecision(
  env: Env,
  modelName: ModelName,
  openrouterModel: string,
  asset: Asset,
  timeframe: Timeframe,
  tickId: string,
): Promise<{ direction: string; confidence: number; newMemoryCount: number }> {
  // Console: announce that this model is starting analysis on this asset.
  await insertRows(env, "ai_console_logs", [{
    model: modelName, level: "info", asset, timeframe,
    message: `analysis start: ${asset} @ ${timeframe}`, tick_id: tickId,
  }]);

  const [candles, ticker] = await Promise.all([
    fetchKlines(asset, timeframe, 100),
    fetchTicker24h(asset),
  ]);
  const ind = buildIndicators(candles, ticker);

  // RAG: pull this model's 5 most-similar past memories for this asset.
  // We embed a short query string and call the SQL match function.
  let memory: Array<{ asset: string; content: string; outcome_pnl_pct: number | null }> = [];
  try {
    const queryText = `Asset ${asset} price ${ind.price.toFixed(2)} RSI ${ind.rsi14.toFixed(0)} MACD ${ind.macd.toFixed(2)} 24h ${ind.pctChange24h.toFixed(1)}%`;
    const queryVec = await embed(env, queryText);
    if (queryVec.length === 1536) {
      memory = await rpc<typeof memory>(env, "match_bot_memory", {
        query_embedding: queryVec,
        match_model: modelName,
        match_asset: asset,
        top_k: 5,
      });
    }
  } catch (err) {
    // Memory miss is non-fatal — just proceed without it.
    await insertRows(env, "ai_console_logs", [{
      model: modelName, level: "warn", asset,
      message: `memory recall skipped: ${(err as Error).message?.slice(0, 200) ?? "unknown"}`,
      tick_id: tickId,
    }]);
  }

  if (memory.length > 0) {
    await insertRows(env, "ai_console_logs", [{
      model: modelName, level: "info", asset,
      message: `recalled ${memory.length} similar past trade(s) — top similarity ${(memory[0] as any).similarity?.toFixed?.(3) ?? "?"}`,
      tick_id: tickId,
    }]);
  }

  const decision = await callModel(env, openrouterModel, { asset, timeframe, ind, memory });

  // Stream the model's own reasoning steps as console log rows.
  const stepRows = decision.steps.map((s) => ({
    model: modelName,
    level: s.level,
    asset,
    timeframe,
    message: s.message,
    indicators: ind,
    tick_id: tickId,
  }));
  if (stepRows.length > 0) await insertRows(env, "ai_console_logs", stepRows);

  // Always emit a prediction (even NEUTRAL) so the strategy page calendar
  // gets a continuous time series.
  const resolveAt = new Date(Date.now() + 60 * 60 * 1000); // 1h ahead
  await insertRows(env, "ai_predictions", [{
    model: modelName,
    asset,
    timeframe,
    direction: decision.direction,
    target_price: decision.targetPrice ?? null,
    current_price: ind.price,
    resolve_at: resolveAt.toISOString(),
    confidence: decision.confidence,
  }]);

  // If the decision is directional, open a paper trade.
  let memoryCount = 0;
  if (decision.direction !== "NEUTRAL" && decision.confidence >= 55) {
    const opened = await insertRows<Record<string, unknown>>(env, "ai_paper_trades", [{
      model: modelName,
      asset,
      side: decision.direction,
      entry_price: ind.price,
      qty: 1,
      leverage: 1,
      confidence: decision.confidence,
      rationale: decision.rationale,
      status: "OPEN",
      tick_id: tickId,
    }]);
    const tradeId = (opened[0] as { id: number } | undefined)?.id;
    if (tradeId) {
      await insertRows(env, "ai_console_logs", [{
        model: modelName, level: "signal", asset,
        message: `OPEN ${decision.direction} @ ${ind.price.toFixed(4)} (conf ${decision.confidence}%) — ${decision.rationale.slice(0, 160)}`,
        trade_id: tradeId,
        tick_id: tickId,
      }]);
    }
  } else {
    await insertRows(env, "ai_console_logs", [{
      model: modelName, level: "result", asset,
      message: `NEUTRAL — ${decision.rationale.slice(0, 200)}`,
      tick_id: tickId,
    }]);
  }

  return { direction: decision.direction, confidence: decision.confidence, newMemoryCount: memoryCount };
}

/* ─────────── 4. embed closed trade into memory ─────────── */

async function embedClosedTrade(
  env: Env,
  closed: { id: number; model: string; asset: string; pnlPct: number; reason: string },
): Promise<void> {
  // Re-fetch the closed row to pull rationale + entry/exit prices.
  const rows = await selectRows<{
    id: number; model: string; asset: string; side: string;
    entry_price: string; exit_price: string; rationale: string | null; pnl_pct: string | null;
  }>(env, `ai_paper_trades?id=eq.${closed.id}&select=id,model,asset,side,entry_price,exit_price,rationale,pnl_pct&limit=1`);
  const t = rows[0];
  if (!t) return;
  const summary = [
    `${t.side} ${t.asset} @ ${Number(t.entry_price).toFixed(4)} → ${Number(t.exit_price).toFixed(4)}`,
    `PnL ${t.pnl_pct ?? "?"}% (${closed.reason})`,
    t.rationale ? `Why: ${t.rationale}` : null,
  ].filter(Boolean).join(" | ");
  const vec = await embed(env, summary);
  if (vec.length !== 1536) return;
  await insertRows(env, "ai_bot_memory", [{
    model: t.model,
    kind: "closed_trade",
    ref_trade_id: t.id,
    asset: t.asset,
    content: summary,
    embedding: vec,
    outcome_pnl_pct: t.pnl_pct ? Number(t.pnl_pct) : null,
  }]);
}
