/**
 * Trade Matching Engine — live stream of paper trades opened by the bot,
 * sourced from `ai_paper_trades` via Supabase realtime. Each row carries
 * a real `opened_at` timestamp; "scanning" UI shrinks to a heartbeat
 * because the engine never stops — it just shows what just happened.
 *
 * Old random `generateSignal()` removed.
 */
import { useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRightLeft, TrendingUp, TrendingDown, Minus, Radio } from "lucide-react";
import { usePaperTrades, type PaperTrade } from "@dashboard/lib/ai-bot-feed";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return `${Math.floor(ms / 86_400_000)}d`;
}

function fullStamp(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function pad(n: number): string { return n.toString().padStart(2, "0"); }

function strength(t: PaperTrade): "STRONG" | "MEDIUM" | "WEAK" {
  const c = t.confidence ?? 0;
  if (c >= 75) return "STRONG";
  if (c >= 60) return "MEDIUM";
  return "WEAK";
}

export function TradeMatchingEngine() {
  const { t } = useTranslation();
  const { trades, loading } = usePaperTrades();
  const scrollRef = useRef<HTMLDivElement>(null);

  const signals = useMemo(() => trades.slice(0, 30), [trades]);
  const strongCount = signals.filter((s) => strength(s) === "STRONG").length;
  const longCount   = signals.filter((s) => s.side === "LONG").length;
  const shortCount  = signals.filter((s) => s.side === "SHORT").length;
  const openCount   = signals.filter((s) => s.status === "OPEN").length;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [trades]);

  const strengthColor = (s: string) =>
    s === "STRONG" ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/25"
    : s === "MEDIUM" ? "text-yellow-400 bg-yellow-500/15 border-yellow-500/25"
    : "text-muted-foreground bg-muted/30 border-border";

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(212,168,50,0.1)" }}>
      <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(212,168,50,0.15)", border: "1px solid rgba(212,168,50,0.25)" }}>
            <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <div className="text-[12px] font-bold text-foreground/90">{t("matchEngine.title", "撮合引擎")}</div>
            <div className="text-[9px] text-muted-foreground">
              {t("matchEngine.liveSubtitle", "实时开仓 · Cron 每 60s")} · {openCount} open
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold"
          style={{
            background: "rgba(74,222,128,0.08)",
            border: "1px solid rgba(74,222,128,0.25)",
            color: "#4ade80",
          }}
        >
          <Radio className="h-3 w-3 animate-pulse" />
          {loading ? "loading…" : "LIVE"}
        </div>
      </div>

      <div ref={scrollRef} className="max-h-[260px] overflow-y-auto scrollbar-hide">
        {!loading && signals.length === 0 ? (
          <div className="py-8 text-center">
            <ArrowRightLeft className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-[11px] text-muted-foreground/40">
              等待第一笔实时撮合…机器人 Cron 每 60s 触发一次。
            </p>
          </div>
        ) : (
          signals.map((sig, i) => {
            const str = strength(sig);
            return (
              <div key={sig.id}
                className="flex items-center gap-2 px-3 py-2 transition-all"
                style={{
                  borderBottom: i < signals.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                  background: i === 0 ? "rgba(212,168,50,0.04)" : "transparent",
                  animation: i === 0 ? "fadeSlideIn 0.3s ease-out" : undefined,
                }}
                title={`opened ${fullStamp(sig.opened_at)}${sig.closed_at ? ` · closed ${fullStamp(sig.closed_at)}` : ""}`}
              >
                <span className={`inline-flex items-center gap-0.5 font-bold rounded text-[10px] px-1.5 py-0.5 shrink-0 ${
                  sig.side === "LONG" ? "text-emerald-400 bg-emerald-500/10" :
                  sig.side === "SHORT" ? "text-red-400 bg-red-500/10" :
                  "text-foreground/40 bg-white/[0.05]"
                }`}>
                  {sig.side === "LONG" ? <TrendingUp className="h-2.5 w-2.5" /> :
                   sig.side === "SHORT" ? <TrendingDown className="h-2.5 w-2.5" /> :
                   <Minus className="h-2.5 w-2.5" />}
                  {sig.side}
                </span>
                <span className="text-[11px] font-bold text-foreground/80 w-[70px] shrink-0">{sig.asset}</span>
                <span className="text-[9px] text-muted-foreground/70 shrink-0 font-mono tabular-nums">
                  {fullStamp(sig.opened_at)}
                </span>
                <span className="text-[9px] text-muted-foreground/55 flex-1 truncate">
                  {sig.model} · {sig.leverage}x
                </span>
                {sig.status === "CLOSED" && sig.pnl_pct != null ? (
                  <span className={`text-[10px] font-bold tabular-nums shrink-0 ${
                    Number(sig.pnl_pct) >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {Number(sig.pnl_pct) >= 0 ? "+" : ""}{Number(sig.pnl_pct).toFixed(2)}%
                  </span>
                ) : (
                  <span className="text-[10px] font-bold tabular-nums shrink-0" style={{
                    color: (sig.confidence ?? 0) >= 70 ? "#4ade80" : (sig.confidence ?? 0) >= 55 ? "hsl(43,74%,52%)" : "#f87171",
                  }}>{sig.confidence ?? 0}%</span>
                )}
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${strengthColor(str)}`}>
                  {sig.status === "OPEN" ? str : "CLOSED"}
                </span>
              </div>
            );
          })
        )}
      </div>

      {signals.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 text-[10px] text-muted-foreground/50" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <span>{t("matchEngine.signalsMatched", { count: signals.length, defaultValue: `${signals.length} signals` })}</span>
          <span>STRONG {strongCount} · LONG {longCount} · SHORT {shortCount}</span>
        </div>
      )}
    </div>
  );
}
