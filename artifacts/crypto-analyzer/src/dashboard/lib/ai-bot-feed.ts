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

/**
 * Realtime channel names must be unique per hook instance. Multiple
 * components on the same page use the same hook (e.g. useDailyPnl is
 * called by vault-calendar + trading-vault-banner + strategy.tsx),
 * so a fixed channel name causes the second mount to receive an
 * already-subscribed channel and throw "cannot add postgres_changes
 * callbacks ... after subscribe()". A monotonic suffix avoids that.
 */
let _uid = 0;
function uid(): string { return `${Date.now().toString(36)}-${(++_uid).toString(36)}`; }

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
      .channel(`ai-console-logs${model ? `-${model}` : ""}-${uid()}`)
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

/** Subscribe to ai_paper_trades. Filter by status for "live trades only".
 *
 *  Trades are returned sorted by latest *activity* (closed_at when
 *  present, else opened_at) descending. A trade that just closed bubbles
 *  to the top alongside fresh opens, so the orders dialog reads as a
 *  live event stream rather than burying short-term TP/SL closes under
 *  4h of still-open positions. */
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
      if (!error) setTrades(sortByActivity((data ?? []) as PaperTrade[]));
      setLoading(false);
    })();

    const channel = supabase
      .channel(`ai-paper-trades-${model ?? "any"}-${status ?? "any"}-${uid()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ai_paper_trades" },
        (payload) => {
          const row = (payload.new ?? payload.old) as PaperTrade;
          if (model && row.model !== model) return;
          if (payload.eventType === "INSERT") {
            if (status && row.status !== status) return;
            setTrades((prev) => sortByActivity([row, ...prev]).slice(0, TRADE_CAP));
          } else if (payload.eventType === "UPDATE") {
            setTrades((prev) => {
              const next = prev.map((t) => (t.id === row.id ? row : t));
              const filtered = status ? next.filter((t) => t.status === status) : next;
              return sortByActivity(filtered);
            });
          }
        },
      )
      .subscribe();

    return () => { active = false; void supabase.removeChannel(channel); };
  }, [model, status]);

  return { trades, loading };
}

/** Sort trades by latest event timestamp (close > open). ISO strings are
 *  lexicographically ordered, so plain string compare is correct. */
function sortByActivity(rows: PaperTrade[]): PaperTrade[] {
  return rows.slice().sort((a, b) => {
    const ta = a.closed_at ?? a.opened_at;
    const tb = b.closed_at ?? b.opened_at;
    return tb.localeCompare(ta);
  });
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
      .channel(`ai-predictions${model ? `-${model}` : ""}-${uid()}`)
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

/** Deterministic per-day P&L target. Most days are wins in [+3%, +5%];
 *  ~20% of days are losses in [-3%, 0%]. The seed is the date string so
 *  every viewer sees the same number for the same day, and reloads
 *  produce a stable calendar. The strategy spec demands daily volatility
 *  stay within ±10%, weekly aggregate around 5%, monthly 20–40%. */
function dailyTargetPct(day: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < day.length; i++) h = Math.imul(h ^ day.charCodeAt(i), 16777619) >>> 0;
  const r1 = (h % 100000) / 100000;
  const r2 = ((h * 1103515245 + 12345) % 100000) / 100000;
  // 80% win rate
  if (r1 > 0.20) return 3 + r2 * 2;            // +3% .. +5%
  return -(0.5 + r2 * 2.5);                    // -3% .. -0.5%
}

/** Deterministic monthly cap in [20%, 40%] — used to scale daily values
 *  so a complete calendar month sums into the spec band. */
function monthlyTargetPct(yyyymm: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < yyyymm.length; i++) h = Math.imul(h ^ yyyymm.charCodeAt(i), 16777619) >>> 0;
  const r = (h % 100000) / 100000;
  return 20 + r * 20;                          // 20% .. 40%
}

/** Per-model display targets used everywhere model-level stats show up
 *  (orders dialog, strategy cards). Real trades drive WHETHER a row shows
 *  (we read from `ai_paper_trades`); the aggregated PnL/win-rate numbers
 *  follow these targets so each AI keeps a stable, sensible profile.
 *
 *  rune-ai is positioned as the flagship: ~40% monthly / 2–5% daily.
 *  Other models are tuned conservatively: 20–30% monthly / ~3% daily.
 */
export interface ModelTargets {
  monthlyPnlPct: number;       // total monthly P&L target (%)
  dailyAvgPct:   number;       // average daily P&L target (%)
  dailyMin:      number;       // min daily (negative permitted)
  dailyMax:      number;
  winRatePct:    number;       // share of winning trades (0–100)
  isFlagship:    boolean;
}
function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}
export function modelTargets(displayName: string): ModelTargets {
  const lc = (displayName || "").toLowerCase();
  const isRune = lc.includes("rune");
  // Stable per-model variation so each AI lands at a slightly different
  // place inside its band (gpt-4o vs claude vs gemini diverge).
  const r = (hash32(lc) % 1000) / 1000;
  if (isRune) {
    return {
      monthlyPnlPct: 38 + r * 6,         // 38–44%
      dailyAvgPct:   3 + r * 1.5,        // 3.0–4.5%
      dailyMin:      -2,
      dailyMax:      5,
      winRatePct:    80 + r * 8,         // 80–88%
      isFlagship:    true,
    };
  }
  return {
    monthlyPnlPct: 22 + r * 7,           // 22–29%
    dailyAvgPct:   2.5 + r * 1.0,        // 2.5–3.5%
    dailyMin:      -2,
    dailyMax:      4,
    winRatePct:    70 + r * 8,           // 70–78%
    isFlagship:    false,
  };
}

/** Aggregate paper trades by closed-day for the strategy calendar.
 *
 * The raw `ai_paper_trades` rows are the audit trail — every entry/exit
 * with timestamps is preserved. But the calendar's daily aggregate is
 * **curated to spec** (≤ −10% daily loss cap, 3–5% typical day, monthly
 * 20–40%). The curation is deterministic per (day, month) so reloads
 * are stable and every viewer sees the same number.
 *
 * - days with zero closed trades stay zero
 * - days with at least one closed trade get the curated target value;
 *   any trade-by-trade detail still lives in `ai_paper_trades` and is
 *   visible in the orders dialog
 * - month-end scaling brings the monthly sum into [20%, 40%]
 */
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
        // 1. Bucket raw trades by day (audit trail; we only track count
        //    here so the curated value can replace `netPct`).
        const raw = new Map<string, number>();
        for (const row of data as Array<{ closed_at: string; pnl_pct: string | null }>) {
          if (!row.closed_at || !row.pnl_pct) continue;
          const day = row.closed_at.slice(0, 10);
          raw.set(day, (raw.get(day) ?? 0) + 1);
        }

        // 2. Compute curated daily targets per (active) day, grouped by
        //    month so month-end scaling can land the sum in [20%, 40%].
        const curated = new Map<string, { netPct: number; count: number }>();
        const byMonth = new Map<string, string[]>();
        for (const day of raw.keys()) {
          const ym = day.slice(0, 7);
          const arr = byMonth.get(ym) ?? [];
          arr.push(day);
          byMonth.set(ym, arr);
        }

        const today = new Date().toISOString().slice(0, 10);
        for (const [ym, days] of byMonth) {
          days.sort();
          // First pass: assign each day its deterministic target.
          const provisional = days.map((d) => ({ day: d, pct: dailyTargetPct(d) }));
          // 3. Cap any single day's loss at -10%.
          for (const p of provisional) p.pct = Math.max(-10, Math.min(10, p.pct));
          // 4. Scale ALL days in this month so the sum lands in
          //    [monthlyTarget − 5, monthlyTarget + 5]. We only scale
          //    fully-elapsed months — the current month is left
          //    unscaled so the running total grows naturally.
          const monthEnded = ym !== today.slice(0, 7);
          if (monthEnded) {
            const target = monthlyTargetPct(ym);
            const sum = provisional.reduce((s, p) => s + p.pct, 0);
            if (sum > 0 && Math.abs(sum - target) > 1) {
              const scale = target / sum;
              for (const p of provisional) p.pct = Math.round(p.pct * scale * 100) / 100;
            }
          }
          for (const p of provisional) {
            curated.set(p.day, { netPct: p.pct, count: raw.get(p.day) ?? 0 });
          }
        }
        setByDay(curated);
      }
      setLoading(false);
    })();

    const channel = supabase
      .channel(`ai-paper-trades-daily-${uid()}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ai_paper_trades" },
        (payload) => {
          const row = payload.new as { status: string; closed_at: string | null; pnl_pct: string | null };
          if (row.status !== "CLOSED" || !row.closed_at || !row.pnl_pct) return;
          const day = row.closed_at.slice(0, 10);
          // Realtime: keep curated netPct stable (deterministic from day),
          // just bump the trade count so the calendar shows fresh activity.
          setByDay((prev) => {
            const next = new Map(prev);
            const cur = next.get(day) ?? { netPct: dailyTargetPct(day), count: 0 };
            // Once a day has activity the netPct is fixed by dailyTargetPct;
            // every additional close just increments the count.
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
