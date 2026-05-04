import { useEffect, useState } from "react";
import { supabase } from "./supabase-client";

/**
 * Live feeds for the strategy page — every "rotating mock" generator was
 * replaced by a Supabase query + realtime channel. The Cloudflare Worker
 * (cf-worker-ai-bot) writes; the dashboard subscribes.
 *
 * Each hook returns the current snapshot + a loading flag. Realtime
 * inserts prepend to the list (newest first) and trim to a sensible cap
 * so memory stays bounded.
 */

export interface ConsoleLog {
  id: number;
  model: string;
  level: "info" | "signal" | "warn" | "error" | "result";
  asset: string | null;
  timeframe: string | null;
  message: string;
  indicators: Record<string, number> | null;
  trade_id: number | null;
  ts: string;
  tick_id: string | null;
}

export interface PaperTrade {
  id: number;
  model: string;
  asset: string;
  side: "LONG" | "SHORT";
  entry_price: string;
  exit_price: string | null;
  qty: string;
  leverage: number;
  confidence: number | null;
  rationale: string | null;
  status: "OPEN" | "CLOSED" | "LIQUIDATED";
  pnl_pct: string | null;
  close_reason: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface Prediction {
  id: number;
  model: string;
  asset: string;
  timeframe: string;
  direction: "LONG" | "SHORT" | "NEUTRAL";
  target_price: string | null;
  current_price: string | null;
  predicted_at: string;
  resolve_at: string;
  resolved_at: string | null;
  actual_price: string | null;
  hit: boolean | null;
  confidence: number | null;
}

const LOG_CAP = 200;
const TRADE_CAP = 200;
const PREDICTION_CAP = 200;

/** Subscribe to ai_console_logs. Optional model filter for per-model
 *  console panels; pass undefined to get the unified stream. */
export function useConsoleLogs(model?: string): { logs: ConsoleLog[]; loading: boolean } {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      let q = supabase
        .from("ai_console_logs")
        .select("id,model,level,asset,timeframe,message,indicators,trade_id,ts,tick_id")
        .order("ts", { ascending: false })
        .limit(LOG_CAP);
      if (model) q = q.eq("model", model);
      const { data, error } = await q;
      if (!active) return;
      if (!error) setLogs((data ?? []) as ConsoleLog[]);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`ai-console-logs${model ? `-${model}` : ""}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ai_console_logs",
          ...(model ? { filter: `model=eq.${model}` } : {}),
        },
        (payload) => {
          const row = payload.new as ConsoleLog;
          setLogs((prev) => [row, ...prev].slice(0, LOG_CAP));
        },
      )
      .subscribe();

    return () => { active = false; void supabase.removeChannel(channel); };
  }, [model]);

  return { logs, loading };
}

/** Subscribe to ai_paper_trades. Filter by status for "live trades only". */
export function usePaperTrades(opts: { model?: string; status?: "OPEN" | "CLOSED" } = {}): {
  trades: PaperTrade[]; loading: boolean;
} {
  const { model, status } = opts;
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      let q = supabase
        .from("ai_paper_trades")
        .select("*")
        .order("opened_at", { ascending: false })
        .limit(TRADE_CAP);
      if (model)  q = q.eq("model", model);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (!active) return;
      if (!error) setTrades((data ?? []) as PaperTrade[]);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`ai-paper-trades${model ?? ""}${status ?? ""}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ai_paper_trades" },
        (payload) => {
          const row = (payload.new ?? payload.old) as PaperTrade;
          if (model && row.model !== model) return;
          if (payload.eventType === "INSERT") {
            if (status && row.status !== status) return;
            setTrades((prev) => [row, ...prev].slice(0, TRADE_CAP));
          } else if (payload.eventType === "UPDATE") {
            setTrades((prev) => {
              const next = prev.map((t) => (t.id === row.id ? row : t));
              if (status) return next.filter((t) => t.status === status);
              return next;
            });
          }
        },
      )
      .subscribe();

    return () => { active = false; void supabase.removeChannel(channel); };
  }, [model, status]);

  return { trades, loading };
}

/** Subscribe to ai_predictions. */
export function usePredictions(model?: string): { predictions: Prediction[]; loading: boolean } {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      let q = supabase
        .from("ai_predictions")
        .select("*")
        .order("predicted_at", { ascending: false })
        .limit(PREDICTION_CAP);
      if (model) q = q.eq("model", model);
      const { data, error } = await q;
      if (!active) return;
      if (!error) setPredictions((data ?? []) as Prediction[]);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`ai-predictions${model ? `-${model}` : ""}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ai_predictions",
          ...(model ? { filter: `model=eq.${model}` } : {}),
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Prediction;
            setPredictions((prev) => [row, ...prev].slice(0, PREDICTION_CAP));
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as Prediction;
            setPredictions((prev) => prev.map((p) => (p.id === row.id ? row : p)));
          }
        },
      )
      .subscribe();

    return () => { active = false; void supabase.removeChannel(channel); };
  }, [model]);

  return { predictions, loading };
}

/** Aggregate paper trades by closed-day for the strategy calendar. Returns
 *  a Map of "YYYY-MM-DD" → { netPct, count }. Net pct is the sum of pnl_pct
 *  across all CLOSED trades for that day (across all models). */
export function useDailyPnl(): { byDay: Map<string, { netPct: number; count: number }>; loading: boolean } {
  const [byDay, setByDay] = useState<Map<string, { netPct: number; count: number }>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      // Closed trades from the last 60 days.
      const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("ai_paper_trades")
        .select("closed_at, pnl_pct")
        .eq("status", "CLOSED")
        .gte("closed_at", since)
        .limit(2000);
      if (!active) return;
      if (!error && data) {
        const next = new Map<string, { netPct: number; count: number }>();
        for (const row of data as Array<{ closed_at: string; pnl_pct: string | null }>) {
          if (!row.closed_at || !row.pnl_pct) continue;
          const day = row.closed_at.slice(0, 10);
          const cur = next.get(day) ?? { netPct: 0, count: 0 };
          cur.netPct += Number(row.pnl_pct);
          cur.count += 1;
          next.set(day, cur);
        }
        setByDay(next);
      }
      setLoading(false);
    })();

    const channel = supabase
      .channel("ai-paper-trades-daily")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ai_paper_trades" },
        (payload) => {
          const row = payload.new as { status: string; closed_at: string | null; pnl_pct: string | null };
          if (row.status !== "CLOSED" || !row.closed_at || !row.pnl_pct) return;
          const day = row.closed_at.slice(0, 10);
          setByDay((prev) => {
            const next = new Map(prev);
            const cur = next.get(day) ?? { netPct: 0, count: 0 };
            cur.netPct += Number(row.pnl_pct);
            cur.count += 1;
            next.set(day, cur);
            return next;
          });
        },
      )
      .subscribe();

    return () => { active = false; void supabase.removeChannel(channel); };
  }, []);

  return { byDay, loading };
}
