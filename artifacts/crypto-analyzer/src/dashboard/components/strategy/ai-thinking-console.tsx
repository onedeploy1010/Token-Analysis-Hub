/**
 * AI Thinking Console — live stream of the bot's reasoning, fed by the
 * Cloudflare Worker (cf-worker-ai-bot). Every row is a real log written by
 * the bot during a real decision cycle, with a real timestamp. Old mock
 * `generateBlock()` removed.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Terminal, X, Brain } from "lucide-react";
import { Dialog, DialogContent } from "@dashboard/components/ui/dialog";
import { useConsoleLogs, type ConsoleLog } from "@dashboard/lib/ai-bot-feed";

/** Map a model display name (passed by parent) to the value we store in
 *  ai_console_logs.model. The worker uses lowercase short names — this
 *  keeps the props stable while we route to the right stream. */
function dbModel(displayName: string): string {
  const lc = displayName.toLowerCase();
  if (lc.includes("gpt"))      return "gpt-4o";
  if (lc.includes("claude"))   return "claude";
  if (lc.includes("gemini"))   return "gemini";
  if (lc.includes("deepseek")) return "deepseek";
  return "rune-ai";
}

function timeOnly(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function dateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function pad(n: number): string { return n.toString().padStart(2, "0"); }

function levelClass(level: ConsoleLog["level"]): string {
  switch (level) {
    case "signal":  return "text-yellow-400/85";
    case "result":  return "text-emerald-400 font-semibold";
    case "warn":    return "text-amber-400/80";
    case "error":   return "text-red-400";
    case "info":
    default:        return "text-foreground/65";
  }
}

export function AiThinkingConsole({ model, color, isVisible }: {
  model: string; color: string; isVisible: boolean;
}) {
  const { t } = useTranslation();
  const filterModel = useMemo(() => dbModel(model), [model]);
  const { logs, loading } = useConsoleLogs(filterModel);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Display oldest-on-top so newest line lands at the bottom — matches a
  // typical terminal scroll. We get newest-first from the hook, so reverse.
  const ordered = useMemo(() => [...logs].reverse(), [logs]);

  // Auto-scroll on new entries.
  useEffect(() => {
    if (!isVisible) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [ordered, isVisible]);

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: "rgba(0,0,0,0.55)", border: `1px solid ${color}25` }}>
      <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: "rgba(0,0,0,0.4)", borderBottom: `1px solid ${color}15` }}>
        <Terminal className="h-3 w-3" style={{ color }} />
        <span className="text-[10px] font-mono font-bold" style={{ color }}>
          {model} {t("aiConsole.console", "console")}
        </span>
        <div className="flex-1" />
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[9px] font-mono text-muted-foreground/60">
          {loading ? "loading…" : `${logs.length} entries`}
        </span>
      </div>
      <div
        ref={scrollRef}
        className="px-3 py-2 h-[300px] overflow-y-auto font-mono text-[10px] leading-relaxed space-y-0.5 scrollbar-hide"
      >
        {!loading && ordered.length === 0 && (
          <div className="text-muted-foreground/40 italic">
            等待 {model} 下一次推理周期…（Cron 每 60s 触发）
          </div>
        )}
        {ordered.map((log) => (
          <div key={log.id} className={`flex gap-2 ${levelClass(log.level)}`} title={dateTime(log.ts)}>
            <span className="text-muted-foreground/45 shrink-0">[{timeOnly(log.ts)}]</span>
            {log.asset && (
              <span className="text-amber-300/70 shrink-0">{log.asset}{log.timeframe ? `·${log.timeframe}` : ""}</span>
            )}
            <span className="break-words">{log.message}</span>
          </div>
        ))}
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
        {t("aiConsole.console", "Console")}
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
              <span className="text-sm font-bold">{model} {t("aiConsole.console", "Console")}</span>
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
