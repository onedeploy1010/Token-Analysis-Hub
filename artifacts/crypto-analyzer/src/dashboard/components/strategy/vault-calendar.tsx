import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@dashboard/components/ui/button";
import { useTranslation } from "react-i18next";
import { getCalendarDays } from "./strategy-header";

function getCumulativeStats(timeSeed = 0) {
  const now = new Date();
  const dataStart = new Date(now.getFullYear(), now.getMonth() - 9, 1);
  let totalPnl = 0; let wins = 0; let losses = 0;
  for (let m = 0; m < 9; m++) {
    const mDate = new Date(dataStart.getFullYear(), dataStart.getMonth() + m, 1);
    const days = getCalendarDays(mDate, timeSeed);
    for (const cell of days) {
      if (cell.day === 0 || cell.pnl === 0) continue;
      totalPnl += cell.pnl;
      if (cell.pnl > 0) wins++; else losses++;
    }
  }
  return { totalPnl, wins, losses };
}

export function VaultCalendar() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [timeSeed, setTimeSeed] = useState(() => Math.floor(Date.now() / 30000));

  useEffect(() => {
    const timer = setInterval(() => setTimeSeed(Math.floor(Date.now() / 30000)), 30000);
    return () => clearInterval(timer);
  }, []);

  const calendarDays = getCalendarDays(calendarMonth, timeSeed);
  const stats = getCumulativeStats(timeSeed);

  // Localized month + weekday labels via Intl — falls back to en when the
  // active i18n.language isn't a BCP-47 the runtime knows.
  const monthLabel = new Intl.DateTimeFormat(i18n.language, { year: "numeric", month: "short" }).format(calendarMonth);
  const weekDayFmt = new Intl.DateTimeFormat(i18n.language, { weekday: "short" });
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    // 1970-01-04 = Sunday, so offset i picks the right weekday name.
    const d = new Date(Date.UTC(1970, 0, 4 + i));
    return weekDayFmt.format(d);
  });

  const activeDays = calendarDays.filter(c => c.day > 0 && c.pnl !== 0);
  const mWins   = activeDays.filter(c => c.pnl > 0).length;
  const mLosses = activeDays.filter(c => c.pnl < 0).length;
  const mPnl    = activeDays.reduce((s, c) => s + c.pnl, 0);
  const mWinRate = activeDays.length > 0 ? (mWins / activeDays.length * 100) : 0;
  const hasData  = mWins + mLosses > 0;

  return (
    <div
      className="relative rounded-2xl overflow-hidden ring-1 ring-amber-400/30"
      style={{
        background:
          "linear-gradient(160deg, rgba(251,191,36,0.10), rgba(80,50,10,0.04) 60%, rgba(0,0,0,0.30))",
        boxShadow:
          "inset 0 1px 0 rgba(251,191,36,0.22), inset 0 -1px 0 rgba(0,0,0,0.30), 0 4px 18px -8px rgba(251,191,36,0.30)",
      }}
    >
      <div className="pointer-events-none absolute -top-10 -right-6 h-24 w-24 rounded-full bg-amber-400/[0.18] blur-2xl" />
      <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />

      {/* Toggle header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-full flex items-center justify-between px-3.5 py-2.5 transition-colors hover:bg-amber-500/[0.06]"
        data-testid="button-vault-calendar-toggle"
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-amber-300" />
          <span className="text-[10px] font-black text-amber-200/85 uppercase tracking-[0.18em]">
            {t("strategy.calendar.title")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasData && (
            <span className={`text-[11px] font-black tabular-nums px-2 py-0.5 rounded-full ring-1 ${mPnl >= 0 ? "text-emerald-300 bg-emerald-500/15 ring-emerald-500/35" : "text-red-300 bg-red-500/15 ring-red-500/35"}`}>
              {mPnl >= 0 ? "+" : ""}{mPnl.toFixed(1)}%
            </span>
          )}
          <span className="text-amber-200/60 text-[10px]">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2.5" style={{ animation: "fadeIn 0.2s ease-out" }}>
          <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }`}</style>

          {/* Monthly mini-stats */}
          {hasData && (
            <div className="grid grid-cols-4 gap-1.5 text-center">
              {[
                { label: t("strategy.calendar.monthly"), val: `${mPnl >= 0 ? "+" : ""}${mPnl.toFixed(1)}%`, color: mPnl >= 0 ? "text-emerald-400" : "text-red-400" },
                { label: t("strategy.calendar.winRate"), val: `${mWinRate.toFixed(0)}%`, color: "text-foreground" },
                { label: t("strategy.calendar.wins"), val: String(mWins), color: "text-emerald-400" },
                { label: t("strategy.calendar.losses"), val: String(mLosses), color: "text-red-400" },
              ].map(({ label, val, color }) => (
                <div key={label} className="rounded-lg py-1.5 px-1"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className={`text-[12px] font-bold tabular-nums ${color}`}>{val}</div>
                  <div className="text-[8.5px] text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
              data-testid="button-vault-cal-prev">
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[11px] font-bold">{monthLabel}</span>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
              data-testid="button-vault-cal-next">
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {weekDays.map(d => (
              <div key={d} className="text-[9px] text-muted-foreground font-semibold py-0.5">{d}</div>
            ))}
            {calendarDays.map((cell, idx) => (
              <div key={idx}
                className={`rounded py-0.5 text-center ${cell.day === 0 ? "" : "border border-white/5"}`}
                style={cell.day > 0 ? {
                  background: cell.pnl > 0
                    ? `rgba(52,211,153,${Math.min(0.08 + Math.abs(cell.pnl) * 0.025, 0.28)})`
                    : cell.pnl < 0
                    ? `rgba(248,113,113,${Math.min(0.06 + Math.abs(cell.pnl) * 0.02, 0.22)})`
                    : "rgba(255,255,255,0.03)"
                } : {}}>
                {cell.day > 0 && (
                  <>
                    <div className="text-[9px] font-semibold leading-tight text-foreground/70">{cell.day}</div>
                    <div className={`text-[8px] font-medium leading-tight ${
                      cell.pnl > 0 ? "text-emerald-400" : cell.pnl < 0 ? "text-red-400" : "text-muted-foreground/40"
                    }`}>
                      {cell.pnl !== 0 ? `${cell.pnl > 0 ? "+" : ""}${cell.pnl.toFixed(1)}` : "--"}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Monthly total bar */}
          {hasData && (
            <div className="flex items-center justify-between rounded-lg px-3 py-2"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-[10px] text-muted-foreground">{t("strategy.calendar.monthTotal")}</span>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold tabular-nums ${mPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {mPnl >= 0 ? "+" : ""}{mPnl.toFixed(1)}%
                </span>
                <span className="text-[10px] text-muted-foreground">
                  <span className="text-emerald-400 font-medium">{mWins}W</span>{" / "}
                  <span className="text-red-400 font-medium">{mLosses}L</span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
