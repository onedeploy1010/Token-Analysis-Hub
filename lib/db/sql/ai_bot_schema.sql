-- AI bot persistence — replaces every "rotating mock" feed in the strategy
-- page with real, dated data. All four tables are append-only from the bot
-- worker; the dashboard reads them via Supabase JS SDK + realtime channels.
--
-- Tables:
--   ai_paper_trades   — every simulated open/close with full PnL audit trail
--   ai_predictions    — directional / target-price calls + outcome resolution
--   ai_console_logs   — bot reasoning steps streamed line-by-line
--   ai_bot_memory     — pgvector embeddings of closed trades for RAG recall
--
-- pgvector extension required. Apply on both mainnet (mefjuec…) + testnet
-- (tqexhk…) Supabase projects.

CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────── 1. paper trades ───────────────
DROP TABLE IF EXISTS ai_paper_trades CASCADE;
CREATE TABLE ai_paper_trades (
  id           bigserial PRIMARY KEY,
  model        text   NOT NULL,                       -- e.g. 'gpt-4o' / 'claude' / 'rune-ai'
  asset        text   NOT NULL,                       -- 'BTCUSDT'
  side         text   NOT NULL CHECK (side IN ('LONG','SHORT')),
  entry_price  numeric(38,8) NOT NULL,
  exit_price   numeric(38,8),
  qty          numeric(38,8) NOT NULL DEFAULT 1,
  leverage     integer NOT NULL DEFAULT 1,
  confidence   integer,                                -- 0–100
  rationale    text,                                   -- short summary used for memory embed
  status       text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED','LIQUIDATED')),
  pnl_pct      numeric(8,4),                           -- (exit-entry)/entry × side, after leverage
  close_reason text,                                   -- 'TP'/'SL'/'TIMEOUT'/'AI_REVERSE'
  opened_at    timestamptz NOT NULL DEFAULT now(),
  closed_at    timestamptz,
  tick_id      text                                    -- worker tick correlation
);
CREATE INDEX ai_paper_trades_model_idx    ON ai_paper_trades(model, opened_at DESC);
CREATE INDEX ai_paper_trades_asset_idx    ON ai_paper_trades(asset, opened_at DESC);
CREATE INDEX ai_paper_trades_status_idx   ON ai_paper_trades(status) WHERE status = 'OPEN';
CREATE INDEX ai_paper_trades_closedday_idx ON ai_paper_trades((closed_at::date)) WHERE status = 'CLOSED';

-- ─────────────── 2. predictions ───────────────
DROP TABLE IF EXISTS ai_predictions CASCADE;
CREATE TABLE ai_predictions (
  id              bigserial PRIMARY KEY,
  model           text NOT NULL,
  asset           text NOT NULL,
  timeframe       text NOT NULL,                       -- '5m','15m','1H','4H','1D'
  direction       text NOT NULL CHECK (direction IN ('LONG','SHORT','NEUTRAL')),
  target_price    numeric(38,8),
  current_price   numeric(38,8),
  predicted_at    timestamptz NOT NULL DEFAULT now(),
  resolve_at      timestamptz NOT NULL,                -- when the worker should grade it
  resolved_at     timestamptz,
  actual_price    numeric(38,8),
  hit             boolean,
  confidence      integer
);
CREATE INDEX ai_predictions_model_idx     ON ai_predictions(model, predicted_at DESC);
CREATE INDEX ai_predictions_resolve_idx   ON ai_predictions(resolve_at) WHERE resolved_at IS NULL;
CREATE INDEX ai_predictions_unresolved_idx ON ai_predictions(model, asset) WHERE resolved_at IS NULL;

-- ─────────────── 3. console logs ───────────────
DROP TABLE IF EXISTS ai_console_logs CASCADE;
CREATE TABLE ai_console_logs (
  id          bigserial PRIMARY KEY,
  model       text NOT NULL,
  level       text NOT NULL DEFAULT 'info' CHECK (level IN ('info','signal','warn','error','result')),
  asset       text,
  timeframe   text,
  message     text NOT NULL,
  indicators  jsonb,                                   -- RSI/EMA/Vol/etc snapshot
  trade_id    bigint REFERENCES ai_paper_trades(id) ON DELETE SET NULL,
  ts          timestamptz NOT NULL DEFAULT now(),
  tick_id     text
);
CREATE INDEX ai_console_logs_ts_idx      ON ai_console_logs(ts DESC);
CREATE INDEX ai_console_logs_model_idx   ON ai_console_logs(model, ts DESC);
CREATE INDEX ai_console_logs_asset_idx   ON ai_console_logs(asset, ts DESC) WHERE asset IS NOT NULL;

-- ─────────────── 4. bot memory (pgvector) ───────────────
DROP TABLE IF EXISTS ai_bot_memory CASCADE;
CREATE TABLE ai_bot_memory (
  id              bigserial PRIMARY KEY,
  model           text NOT NULL,
  kind            text NOT NULL DEFAULT 'closed_trade' CHECK (kind IN ('closed_trade','prediction_resolved','manual')),
  ref_trade_id    bigint REFERENCES ai_paper_trades(id) ON DELETE CASCADE,
  ref_prediction_id bigint REFERENCES ai_predictions(id) ON DELETE CASCADE,
  asset           text,
  content         text NOT NULL,                       -- human-readable summary that becomes the embed source
  embedding       vector(1536) NOT NULL,               -- text-embedding-3-small dim
  outcome_pnl_pct numeric(8,4),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_bot_memory_model_idx ON ai_bot_memory(model, created_at DESC);
-- ivfflat index for fast cosine retrieval. lists=100 is fine for ≤100k rows;
-- bump after the table grows. Index build needs ANALYZE first to pick a
-- good plan, so we run it after the table is non-empty (worker handles).
CREATE INDEX ai_bot_memory_embedding_idx
  ON ai_bot_memory USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ─────────────── 5. RAG retrieval function ───────────────
-- The worker calls this with a query embedding before each new decision.
-- top_k=5 by default; filtered by model so each AI only learns from its own
-- past trades (you can drop the model filter for cross-pollination).
CREATE OR REPLACE FUNCTION match_bot_memory(
  query_embedding vector(1536),
  match_model     text,
  match_asset     text DEFAULT NULL,
  top_k           integer DEFAULT 5
)
RETURNS TABLE (
  id              bigint,
  asset           text,
  content         text,
  outcome_pnl_pct numeric(8,4),
  similarity      double precision,
  created_at      timestamptz
)
LANGUAGE sql STABLE
AS $$
  SELECT
    m.id,
    m.asset,
    m.content,
    m.outcome_pnl_pct,
    1 - (m.embedding <=> query_embedding) AS similarity,
    m.created_at
  FROM ai_bot_memory m
  WHERE m.model = match_model
    AND (match_asset IS NULL OR m.asset = match_asset)
  ORDER BY m.embedding <=> query_embedding
  LIMIT top_k;
$$;

-- ─────────────── 6. RLS — read-only for anon ───────────────
-- The dashboard (anon key) reads via SDK; writes go through the service role
-- in the Cloudflare Worker. Public read so the strategy page can use SELECT
-- without auth; INSERT/UPDATE require service_role.
ALTER TABLE ai_paper_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_predictions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_console_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_bot_memory   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read paper_trades"   ON ai_paper_trades;
DROP POLICY IF EXISTS "anon read predictions"     ON ai_predictions;
DROP POLICY IF EXISTS "anon read console_logs"    ON ai_console_logs;
DROP POLICY IF EXISTS "anon read bot_memory"      ON ai_bot_memory;

CREATE POLICY "anon read paper_trades"  ON ai_paper_trades FOR SELECT USING (true);
CREATE POLICY "anon read predictions"   ON ai_predictions  FOR SELECT USING (true);
CREATE POLICY "anon read console_logs"  ON ai_console_logs FOR SELECT USING (true);
CREATE POLICY "anon read bot_memory"    ON ai_bot_memory   FOR SELECT USING (true);
