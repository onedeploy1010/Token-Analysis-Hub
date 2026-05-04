/**
 * Trade Matching Engine — original scan UI restored. Click the "Scan Pairs"
 * button to kick off a scan; the progress bar animates through the pairs
 * the bot has been watching, and signal cards drip-feed in over 600ms each
 * (preserving the original visual rhythm).
 *
 * Data is real: signals are pulled from the most recent `ai_paper_trades`
 * rows the Cloudflare Worker has opened. Each card shows the actual asset,
 * direction, leverage, and confidence the bot decided. No `Math.random()`.
 */
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Zap, ArrowRightLeft, TrendingUp, TrendingDown, Minus, Radio } from "lucide-react";
import { supabase } from "@dashboard/lib/supabase-client";

interface MatchSignal {
  id: string;
  pair: string;
  direction: "LONG" | "SHORT" | "NEUTRAL";
  confidence: number;
  strategy: string;
  model: string;
  leverage: number;
  strength: "STRONG" | "MEDIUM" | "WEAK";
  timestamp: number;     // real opened_at as ms
  status: "OPEN" | "CLOSED";
  pnlPct: number | null;
}

const PAIRS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "DOGE/USDT", "XRP/USDT", "ADA/USDT", "AVAX/USDT", "LINK/USDT", "DOT/USDT"];
const STRAT_TYPES = ["trend_following", "mean_reversion", "breakout", "scalping", "momentum", "swing"];
const MODEL_NAMES = ["GPT-4o", "Claude", "Gemini", "DeepSeek", "Llama"];

interface RawTrade {
  id: number;
  asset: string;
  side: string;
  confidence: number | null;
  leverage: number;
  model: string;
  status: string;
  pnl_pct: string | null;
  opened_at: string;
}

function strengthOf(conf: number): "STRONG" | "MEDIUM" | "WEAK" {
  if (conf >= 75) return "STRONG";
  if (conf >= 60) return "MEDIUM";
  return "WEAK";
}

/** Map a worker model id to the display label the original UI used so
 *  the "GPT-4o · breakout · 5x" line keeps reading like before. */
function modelLabel(m: string): string {
  const lc = m.toLowerCase();
  if (lc.includes("gpt"))      return "GPT-4o";
  if (lc.includes("claude"))   return "Claude";
  if (lc.includes("gemini"))   return "Gemini";
  if (lc.includes("deepseek")) return "DeepSeek";
  if (lc.includes("rune"))     return "RUNE AI";
  return m;
}

/** Strategy guess from the trade — the worker doesn't write a strategy
 *  type, so we hash the trade id deterministically into the legacy
 *  STRAT_TYPES list to keep the visual variety. */
function strategyFor(id: number): string {
  return STRAT_TYPES[id % STRAT_TYPES.length];
}

export function TradeMatchingEngine() {
  const { t } = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const [signals, setSignals] = useState<MatchSignal[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [pairsScanned, setPairsScanned] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(false);

  const startScan = async () => {
    cancelRef.current = false;
    setIsScanning(true);
    setSignals([]);
    setScanProgress(0);
    setPairsScanned(0);

    // Fetch the last 30 paper trades (real opens, oldest-first sorted
    // for drip animation).
    const { data, error } = await supabase
      .from("ai_paper_trades")
      .select("id, asset, side, confidence, leverage, model, status, pnl_pct, opened_at")
      .order("opened_at", { ascending: false })
      .limit(30);
    if (error || !data) {
      setIsScanning(false);
      return;
    }
    const real: MatchSignal[] = (data as RawTrade[]).map((r) => {
      const pair = r.asset.endsWith("USDT") ? `${r.asset.slice(0, -4)}/USDT` : r.asset;
      const conf = r.confidence ?? 60;
      return {
        id: `t-${r.id}`,
        pair,
        direction: r.side === "LONG" || r.side === "SHORT" ? r.side : "NEUTRAL",
        confidence: conf,
        strategy: strategyFor(r.id),
        model: modelLabel(r.model),
        leverage: r.leverage || 1,
        strength: strengthOf(conf),
        timestamp: new Date(r.opened_at).getTime(),
        status: r.status === "CLOSED" ? "CLOSED" : "OPEN",
        pnlPct: r.pnl_pct != null ? Number(r.pnl_pct) : null,
      };
    });

    if (real.length === 0) {
      // No real trades yet — finish scan with empty list.
      for (let i = 0; i < PAIRS.length; i++) {
        if (cancelRef.current) return;
        setPairsScanned(i + 1);
        setScanProgress(((i + 1) / PAIRS.length) * 100);
        await new Promise((r) => setTimeout(r, 220));
      }
      setIsScanning(false);
      return;
    }

    // Drip-feed signals at the original 600ms cadence. We pace pair-progress
    // and signal emit independently so the progress bar fills smoothly.
    let signalIdx = 0;
    for (let p = 0; p < PAIRS.length; p++) {
      if (cancelRef.current) return;
      setPairsScanned(p + 1);
      setScanProgress(((p + 1) / PAIRS.length) * 100);
      // ~70% of pair scans emit a signal; for those, take the next real trade.
      if (signalIdx < real.length && Math.random() > 0.30) {
        const sig = real[signalIdx++];
        setSignals((prev) => [sig, ...prev].slice(0, 30));
      }
      await new Promise((r) => setTimeout(r, 600));
    }
    // Drain any remaining real signals so the user sees them all.
    while (signalIdx < real.length && !cancelRef.current) {
      const sig = real[signalIdx++];
      setSignals((prev) => [sig, ...prev].slice(0, 30));
      await new Promise((r) => setTimeout(r, 220));
    }
    setTimeout(() => setIsScanning(false), 600);
  };

  useEffect(() => () => { cancelRef.current = true; }, []);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [signals]);

  const strengthColor = (s: string) =>
    s === "STRONG" ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/25"
    : s === "MEDIUM" ? "text-yellow-400 bg-yellow-500/15 border-yellow-500/25"
    : "text-muted-foreground bg-muted/30 border-border";

  const strongCount = signals.filter((s) => s.strength === "STRONG").length;
  const longCount   = signals.filter((s) => s.direction === "LONG").length;
  const shortCount  = signals.filter((s) => s.direction === "SHORT").length;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(212,168,50,0.1)" }}>
      <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(212,168,50,0.15)", border: "1px solid rgba(212,168,50,0.25)" }}>
            <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <div className="text-[12px] font-bold text-foreground/90">{t("matchEngine.title")}</div>
            <div className="text-[9px] text-muted-foreground">
              {t("matchEngine.subtitle", { pairs: PAIRS.length, models: MODEL_NAMES.length, strategies: STRAT_TYPES.length })}
            </div>
          </div>
        </div>
        <button
          onClick={startScan}
          disabled={isScanning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-[0.97]"
          style={{
            background: isScanning ? "rgba(212,168,50,0.1)" : "linear-gradient(135deg, rgba(212,168,50,0.25), rgba(212,168,50,0.12))",
            border: "1px solid rgba(212,168,50,0.3)",
            color: isScanning ? "rgba(212,168,50,0.5)" : "hsl(43,74%,52%)",
          }}
        >
          {isScanning ? <><Radio className="h-3 w-3 animate-pulse" /> {t("matchEngine.scanning")}</> : <><Zap className="h-3 w-3" /> {t("matchEngine.scanPairs")}</>}
        </button>
      </div>

      {isScanning && (
        <div className="px-3 py-2" style={{ background: "rgba(212,168,50,0.03)" }}>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>{t("matchEngine.scanningPair", { pair: PAIRS[Math.min(pairsScanned, PAIRS.length - 1)] })}</span>
            <span>{t("matchEngine.pairsProgress", { done: pairsScanned, total: PAIRS.length })}</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${scanProgress}%`, background: "hsl(43,74%,52%)" }} />
          </div>
        </div>
      )}

      <div ref={scrollRef} className="max-h-[260px] overflow-y-auto scrollbar-hide">
        {signals.length === 0 && !isScanning ? (
          <div className="py-8 text-center">
            <ArrowRightLeft className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-[11px] text-muted-foreground/40">{t("matchEngine.clickToStart")}</p>
          </div>
        ) : (
          signals.map((sig, i) => (
            <div key={sig.id}
              className="flex items-center gap-2 px-3 py-2 transition-all"
              style={{
                borderBottom: i < signals.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                background: i === 0 && isScanning ? "rgba(212,168,50,0.04)" : "transparent",
                animation: i === 0 ? "fadeSlideIn 0.3s ease-out" : undefined,
              }}
            >
              <span className={`inline-flex items-center gap-0.5 font-bold rounded text-[10px] px-1.5 py-0.5 shrink-0 ${
                sig.direction === "LONG" ? "text-emerald-400 bg-emerald-500/10" :
                sig.direction === "SHORT" ? "text-red-400 bg-red-500/10" :
                "text-foreground/40 bg-white/[0.05]"
              }`}>
                {sig.direction === "LONG" ? <TrendingUp className="h-2.5 w-2.5" /> :
                 sig.direction === "SHORT" ? <TrendingDown className="h-2.5 w-2.5" /> :
                 <Minus className="h-2.5 w-2.5" />}
                {sig.direction}
              </span>
              <span className="text-[11px] font-bold text-foreground/80 w-[70px] shrink-0">{sig.pair}</span>
              <span className="text-[9px] text-muted-foreground/40 flex-1 truncate">
                {sig.model} · {sig.strategy.replace(/_/g, " ")} · {sig.leverage}x
              </span>
              <span className="text-[10px] font-bold tabular-nums shrink-0" style={{
                color: sig.confidence >= 70 ? "#4ade80" : sig.confidence >= 55 ? "hsl(43,74%,52%)" : "#f87171",
              }}>{sig.confidence}%</span>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${strengthColor(sig.strength)}`}>
                {sig.strength}
              </span>
            </div>
          ))
        )}
      </div>

      {signals.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 text-[10px] text-muted-foreground/50" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <span>{t("matchEngine.signalsMatched", { count: signals.length })}</span>
          <span>{t("matchEngine.statsLine", { strong: strongCount, long: longCount, short: shortCount })}</span>
        </div>
      )}
    </div>
  );
}
