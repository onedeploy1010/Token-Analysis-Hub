import { pgTable, bigserial, text, integer, numeric, timestamp, boolean, jsonb, bigint, index } from "drizzle-orm/pg-core";

/**
 * AI bot persistence — every "rotating mock" feed in the strategy page is
 * fed by these four tables. The Cloudflare Worker (cf-worker-ai-bot) is the
 * sole writer; the dashboard reads via Supabase SDK + realtime channels.
 */

export const aiPaperTrades = pgTable(
  "ai_paper_trades",
  {
    id:          bigserial("id", { mode: "number" }).primaryKey(),
    model:       text("model").notNull(),
    asset:       text("asset").notNull(),
    side:        text("side").notNull(),                  // 'LONG' | 'SHORT'
    entryPrice:  numeric("entry_price", { precision: 38, scale: 8 }).notNull(),
    exitPrice:   numeric("exit_price",  { precision: 38, scale: 8 }),
    qty:         numeric("qty", { precision: 38, scale: 8 }).notNull().default("1"),
    leverage:    integer("leverage").notNull().default(1),
    confidence:  integer("confidence"),
    rationale:   text("rationale"),
    status:      text("status").notNull().default("OPEN"),  // OPEN | CLOSED | LIQUIDATED
    pnlPct:      numeric("pnl_pct", { precision: 8, scale: 4 }),
    closeReason: text("close_reason"),
    openedAt:    timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt:    timestamp("closed_at", { withTimezone: true }),
    tickId:      text("tick_id"),
  },
  (t) => [
    index("ai_paper_trades_model_idx").on(t.model, t.openedAt),
    index("ai_paper_trades_asset_idx").on(t.asset, t.openedAt),
  ],
);

export const aiPredictions = pgTable(
  "ai_predictions",
  {
    id:           bigserial("id", { mode: "number" }).primaryKey(),
    model:        text("model").notNull(),
    asset:        text("asset").notNull(),
    timeframe:    text("timeframe").notNull(),
    direction:    text("direction").notNull(),
    targetPrice:  numeric("target_price",  { precision: 38, scale: 8 }),
    currentPrice: numeric("current_price", { precision: 38, scale: 8 }),
    predictedAt:  timestamp("predicted_at", { withTimezone: true }).notNull().defaultNow(),
    resolveAt:    timestamp("resolve_at",   { withTimezone: true }).notNull(),
    resolvedAt:   timestamp("resolved_at",  { withTimezone: true }),
    actualPrice:  numeric("actual_price",   { precision: 38, scale: 8 }),
    hit:          boolean("hit"),
    confidence:   integer("confidence"),
  },
);

export const aiConsoleLogs = pgTable(
  "ai_console_logs",
  {
    id:         bigserial("id", { mode: "number" }).primaryKey(),
    model:      text("model").notNull(),
    level:      text("level").notNull().default("info"),  // info|signal|warn|error|result
    asset:      text("asset"),
    timeframe:  text("timeframe"),
    message:    text("message").notNull(),
    indicators: jsonb("indicators"),
    tradeId:    bigint("trade_id", { mode: "number" }),
    ts:         timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
    tickId:     text("tick_id"),
  },
);

export const aiBotMemory = pgTable(
  "ai_bot_memory",
  {
    id:               bigserial("id", { mode: "number" }).primaryKey(),
    model:            text("model").notNull(),
    kind:             text("kind").notNull().default("closed_trade"),
    refTradeId:       bigint("ref_trade_id",      { mode: "number" }),
    refPredictionId:  bigint("ref_prediction_id", { mode: "number" }),
    asset:            text("asset"),
    content:          text("content").notNull(),
    // pgvector column — Drizzle has no first-class type yet; stored as
    // unknown / handled by raw SQL in the worker.
    // embedding:    custom type
    outcomePnlPct:    numeric("outcome_pnl_pct", { precision: 8, scale: 4 }),
    createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export type AiPaperTrade   = typeof aiPaperTrades.$inferSelect;
export type AiPrediction   = typeof aiPredictions.$inferSelect;
export type AiConsoleLog   = typeof aiConsoleLogs.$inferSelect;
export type AiBotMemory    = typeof aiBotMemory.$inferSelect;
