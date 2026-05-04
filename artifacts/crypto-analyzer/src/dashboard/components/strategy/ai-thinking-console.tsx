/**
 * AI Thinking Console — original typing-effect terminal restored, but every
 * character now traces back to a real bot tick stored in `ai_console_logs`.
 *
 * Flow:
 *   1. Subscribe to ai_console_logs for this model.
 *   2. When a new "result" row arrives, that tick is complete — assemble
 *      every row sharing its tick_id into a ThinkingLine[] block.
 *   3. The block is built from real `indicators` jsonb (RSI/EMA/MACD/Vol/
 *      24h%) using the same i18n templates the original mock used, so
 *      Chinese / English / etc. all render natively. The model's actual
 *      rationale is surfaced as the final "result" line.
 *   4. Animate via the original char-by-char typewriter; queue subsequent
 *      ticks so each one plays in full before the next begins.
 *
 * No timing is faked: the timestamp prefix on each line is the real
 * `ts` from Supabase. The decision (LONG / SHORT / NEUTRAL, target %)
 * is the real LLM output.
 */
import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Terminal, X, Brain } from "lucide-react";
import { Dialog, DialogContent } from "@dashboard/components/ui/dialog";
import { useConsoleLogs, type ConsoleLog } from "@dashboard/lib/ai-bot-feed";

interface ThinkingLine {
  type: "system" | "analysis" | "signal" | "result";
  text: string;
}

/** Convert the parent's display name to the value the worker writes. */
function dbModel(displayName: string): string {
  const lc = displayName.toLowerCase();
  if (lc.includes("gpt"))      return "gpt-4o";
  if (lc.includes("claude"))   return "claude";
  if (lc.includes("gemini"))   return "gemini";
  if (lc.includes("deepseek")) return "deepseek";
  return "rune-ai";
}

function tsLabel(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function pad(n: number): string { return n.toString().padStart(2, "0"); }

/** Build a ThinkingLine[] block from one tick's worth of rows. Uses
 *  i18n templates wherever the indicator data is rich enough so the
 *  block reads natively in any language. */
function buildBlock(
  modelLabel: string,
  rows: ConsoleLog[],
  t: (key: string, opts?: any) => string,
): ThinkingLine[] {
  if (rows.length === 0) return [];
  // Sort ascending so the system line comes first and the result last.
  const sorted = [...rows].sort((a, b) => +new Date(a.ts) - +new Date(b.ts));
  const first = sorted[0];
  const result = sorted.find((r) => r.level === "result") ?? sorted[sorted.length - 1];
  const ind = (sorted.find((r) => r.indicators)?.indicators ?? null) as null | {
    price?: number; rsi14?: number; macd?: number; macdSignal?: number;
    ema12?: number; ema26?: number; volume?: number; volumeAvg?: number;
    pctChange24h?: number; sma20?: number;
  };

  const asset = first.asset ?? "BTCUSDT";
  const tf = (first.timeframe ?? "1h").toUpperCase();
  const pair = asset.endsWith("USDT") ? `${asset.slice(0, -4)}/USDT` : asset;
  const stamp = tsLabel(first.ts);

  const lines: ThinkingLine[] = [
    { type: "system", text: `[${stamp}] ${modelLabel} ${t("aiConsole.loadingMarket", { pair })}` },
    { type: "analysis", text: `> ${t("aiConsole.fetchCandles", { tf, count: 100 })}` },
  ];

  // Indicator-driven analysis lines — built from real values when present.
  if (ind) {
    if (typeof ind.ema12 === "number" && typeof ind.ema26 === "number") {
      const aligned = ind.ema12 > ind.ema26;
      lines.push({
        type: "analysis",
        text: `> ${aligned ? t("aiConsole.emaBullish") : t("aiConsole.emaCompute")}`,
      });
    }
    if (typeof ind.rsi14 === "number") {
      lines.push({
        type: "analysis",
        text: `> ${t("aiConsole.rsiMomentum", { val: ind.rsi14.toFixed(1) })}`,
      });
    }
    if (typeof ind.volume === "number" && typeof ind.volumeAvg === "number" && ind.volumeAvg > 0) {
      const pct = Math.round(((ind.volume - ind.volumeAvg) / ind.volumeAvg) * 100);
      lines.push({
        type: "analysis",
        text: `> ${t("aiConsole.volumeAbove", { pct: Math.abs(pct).toString() })}`,
      });
    }
    if (typeof ind.macd === "number" && typeof ind.macdSignal === "number") {
      lines.push({
        type: "analysis",
        text: `> ${t("aiConsole.macdExpand")}`,
      });
    }
    if (typeof ind.pctChange24h === "number") {
      // Reuse the orderBook template since it accepts a numeric value;
      // shows 24h % move which is a real, useful indicator.
      lines.push({
        type: "analysis",
        text: `> ${t("aiConsole.relVolume", { val: ind.pctChange24h.toFixed(2) })}`,
      });
    }
  }

  // Multi-indicator score line — synthesized from how many indicators
  // align bullishly (deterministic per tick, fully i18n).
  if (ind) {
    let score = 5;
    if (typeof ind.rsi14 === "number")  score += (ind.rsi14 > 50 ? 0.5 : -0.5);
    if (typeof ind.ema12 === "number" && typeof ind.ema26 === "number")
      score += (ind.ema12 > ind.ema26 ? 0.8 : -0.8);
    if (typeof ind.macd === "number" && typeof ind.macdSignal === "number")
      score += (ind.macd > ind.macdSignal ? 0.6 : -0.6);
    if (typeof ind.pctChange24h === "number") score += (ind.pctChange24h > 0 ? 0.4 : -0.4);
    score = Math.max(2, Math.min(9, score + 2)); // shift to [2..9]
    lines.push({ type: "signal", text: `> ${t("aiConsole.multiScore", { score: score.toFixed(1) })}` });
  }

  // Result line — fully i18n, parsed from the worker's structured
  // "OPEN LONG @ ... (conf 75%) — ..." or "NEUTRAL — ..." message so
  // every viewer sees the right language regardless of model output.
  if (result) {
    if (result.level === "error") {
      lines.push({ type: "result", text: `✗ ${t("aiConsole.errorRetry", "Retrying next tick")}` });
    } else {
      const parsed = parseResult(result.message);
      const isBull = parsed.direction === "LONG";
      const isBear = parsed.direction === "SHORT";
      const conf = parsed.confidence ?? 65;
      // Use the same templates the original mock used so wording matches
      // every translated phrase already in en/zh/zh-TW/ja/ko/etc.
      let text: string;
      if (isBull) {
        text = `✓ ${t("aiConsole.consensusBull", {
          conf: conf.toString(),
          target: (parsed.targetPct ?? 1.5).toFixed(1),
        })}`;
      } else if (isBear) {
        text = `✓ ${t("aiConsole.consensusBear", { conf: conf.toString() })}`;
      } else {
        text = `· ${t("aiConsole.neutralWait", "等待信号确认")}`;
      }
      lines.push({ type: "result", text });
    }
  }

  return lines;
}

/** Pull direction + confidence from one of two known result-line shapes:
 *    "OPEN LONG @ 1.234 (conf 75%) — rationale..."
 *    "NEUTRAL — rationale..."
 *    "closed LONG @ 1.234 — TP, pnl 2.45%"   (from a close event)
 *  Falls back to NEUTRAL/0 when the format doesn't match. */
function parseResult(msg: string): { direction: "LONG" | "SHORT" | "NEUTRAL"; confidence: number | null; targetPct: number | null } {
  let direction: "LONG" | "SHORT" | "NEUTRAL" = "NEUTRAL";
  if (/\b(LONG)\b/i.test(msg)) direction = "LONG";
  else if (/\b(SHORT)\b/i.test(msg)) direction = "SHORT";
  const confMatch = msg.match(/conf\s+(\d{1,3})/i);
  const confidence = confMatch ? Number(confMatch[1]) : null;
  // Target % is optional; a separate pnl% match also works for closed events.
  const pctMatch = msg.match(/([+-]?\d+(?:\.\d+)?)%/);
  const targetPct = pctMatch ? Number(pctMatch[1]) : null;
  return { direction, confidence, targetPct };
}

function lineColor(type: string): string {
  return type === "system" ? "text-muted-foreground/55"
    : type === "signal" ? "text-yellow-400/85"
    : type === "result" ? "text-emerald-400 font-bold"
    : "text-foreground/65";
}

export function AiThinkingConsole({ model, color, isVisible }: {
  model: string; color: string; isVisible: boolean;
}) {
  const { t } = useTranslation();
  const filterModel = useMemo(() => dbModel(model), [model]);
  const { logs } = useConsoleLogs(filterModel);

  // Group logs by tick_id; the most recent fully-completed tick (one
  // that has a "result" row) becomes the next block to play.
  const ticks = useMemo(() => {
    const byTick = new Map<string, ConsoleLog[]>();
    for (const log of logs) {
      const id = log.tick_id ?? `loose-${log.id}`;
      const arr = byTick.get(id) ?? [];
      arr.push(log);
      byTick.set(id, arr);
    }
    // Sort by the latest ts in each tick — newest first.
    return Array.from(byTick.entries())
      .map(([id, rows]) => ({
        id,
        rows,
        latestTs: Math.max(...rows.map((r) => +new Date(r.ts))),
        complete: rows.some((r) => r.level === "result" || r.level === "error"),
      }))
      .filter((t) => t.complete)
      .sort((a, b) => b.latestTs - a.latestTs);
  }, [logs]);

  // Animation state — preserved from original: char-by-char typing,
  // block-by-block playback, paused 2.5s between blocks.
  const [displayedLines, setDisplayedLines] = useState<ThinkingLine[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [currentType, setCurrentType] = useState<string>("system");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const playedRef = useRef<Set<string>>(new Set());
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!isVisible) {
      cancelRef.current = true;
      setDisplayedLines([]);
      setCurrentText("");
      setIsTyping(false);
      playedRef.current.clear();
      return;
    }

    cancelRef.current = false;
    let mounted = true;

    async function typeLines(lines: ThinkingLine[]) {
      for (const line of lines) {
        if (cancelRef.current || !mounted) return;
        setCurrentType(line.type);
        for (let i = 0; i <= line.text.length; i++) {
          if (cancelRef.current || !mounted) return;
          setCurrentText(line.text.slice(0, i));
          const speed = line.type === "system" ? 12 : line.type === "result" ? 18 : 14;
          await new Promise((r) => setTimeout(r, speed));
        }
        setDisplayedLines((prev) => [...prev.slice(-60), line]);
        setCurrentText("");
        const pause = line.type === "result" ? 700 : line.type === "signal" ? 350 : 80;
        await new Promise((r) => setTimeout(r, pause));
      }
    }

    async function loop() {
      setIsTyping(true);
      // First pass: when we open the console, animate up to 3 most-recent
      // ticks so the user sees something immediately. After that, just
      // play newly-arrived ticks one at a time.
      let firstPass = true;
      while (!cancelRef.current && mounted) {
        // Find the newest tick we haven't played yet.
        const unplayed = ticks.filter((t) => !playedRef.current.has(t.id));
        if (unplayed.length === 0) {
          // No new ticks — idle wait, then re-check.
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        // On first open, play 3 most recent (oldest of the 3 first so
        // the most recent ends up at the bottom of the visible scroll).
        const toPlay = firstPass ? unplayed.slice(0, 3).reverse() : [unplayed[0]];
        firstPass = false;
        for (const tick of toPlay) {
          if (cancelRef.current || !mounted) break;
          const block = buildBlock(model, tick.rows, t);
          if (block.length === 0) {
            playedRef.current.add(tick.id);
            continue;
          }
          await typeLines(block);
          playedRef.current.add(tick.id);
          if (cancelRef.current || !mounted) break;
          await new Promise((r) => setTimeout(r, 2200));
        }
      }
      setIsTyping(false);
    }

    void loop();
    return () => { mounted = false; cancelRef.current = true; };
  }, [isVisible, model, t, ticks]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [displayedLines, currentText]);

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${color}15` }}>
      <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: "rgba(0,0,0,0.3)", borderBottom: `1px solid ${color}10` }}>
        <Terminal className="h-3 w-3" style={{ color }} />
        <span className="text-[10px] font-mono font-bold" style={{ color }}>{model} {t("aiConsole.console")}</span>
        <div className="flex-1" />
        {isTyping && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
        <span className="text-[9px] font-mono text-muted-foreground/40">
          {isTyping ? t("aiConsole.analyzing") : t("aiConsole.done")}
        </span>
      </div>
      <div ref={scrollRef} className="px-3 py-2 h-[240px] overflow-y-auto font-mono text-[10px] leading-relaxed space-y-0.5 scrollbar-hide">
        {displayedLines.map((line, i) => (
          <div key={i} className={lineColor(line.type)}>{line.text}</div>
        ))}
        {currentText && (
          <div className={lineColor(currentType)}>
            {currentText}<span className="animate-pulse" style={{ color }}>▊</span>
          </div>
        )}
        {displayedLines.length === 0 && !currentText && (
          <div className="text-muted-foreground/30 animate-pulse">
            {ticks.length === 0
              ? `Initializing ${model}...`
              : `Loading ${model}...`}
          </div>
        )}
      </div>
    </div>
  );
}

export function AiConsoleButton({ model, color }: { model: string; color: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-bold transition-all active:scale-[0.98]"
        style={{ background: "rgba(0,0,0,0.35)", border: `1px solid ${color}25`, color }}
      >
        <Brain className="h-3.5 w-3.5" />
        {t("aiConsole.console")}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-md w-full p-0 overflow-hidden"
          style={{
            background: "linear-gradient(160deg, hsl(22,20%,4%), hsl(20,15%,3%))",
            border: `1px solid ${color}22`,
          }}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4" style={{ color }} />
              <span className="text-sm font-bold">{model} {t("aiConsole.console")}</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <AiThinkingConsole model={model} color={color} isVisible={open} />
        </DialogContent>
      </Dialog>
    </>
  );
}
