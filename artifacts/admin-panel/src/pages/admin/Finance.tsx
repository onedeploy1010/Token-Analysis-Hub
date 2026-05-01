import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminFinance, getAdminFinanceMonthly, getAdminWithdrawalForecast, getAdminDateRangeStats } from "@/lib/api";
import { DollarSign, TrendingUp, TrendingDown, ArrowDownToLine, Wallet, Percent, AlertTriangle, Calendar, BarChart3, Loader2, Clock, ChevronLeft, ChevronRight, List, LayoutGrid, CreditCard, Recycle } from "lucide-react";

const cardBg = { background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" };

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl p-4" style={cardBg}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `rgba(${color === "#ef4444" ? "239,68,68" : color === "#22c55e" ? "34,197,94" : color === "#f59e0b" ? "245,158,11" : "201,162,39"},0.1)` }}>
          <Icon size={16} style={{ color: color || "#C9A227" }} />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="font-black text-xl" style={{ color: color || "#C9A227" }}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function fmt(v: string | number) {
  return parseFloat(String(v) || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtN(v: string | number) {
  return parseFloat(String(v) || "0");
}

function MonthLabel({ month }: { month: string }) {
  const [y, m] = month.split("-");
  return <span>{y}年{parseInt(m)}月</span>;
}

function shortAddr(addr: string) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";
}

function DateRangeTab() {
  const today = new Date();
  const shDateStr = (dt: Date) => {
    const sh = new Date(dt.getTime() + 8 * 3600 * 1000);
    return sh.toISOString().slice(0, 10);
  };
  const defaultFrom = shDateStr(new Date(today.getTime() - 6 * 86400000));
  const defaultTo = shDateStr(today);

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [appliedFrom, setAppliedFrom] = useState(defaultFrom);
  const [appliedTo, setAppliedTo] = useState(defaultTo);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["/api/admin/finance/range", appliedFrom, appliedTo],
    queryFn: () => getAdminDateRangeStats(appliedFrom, appliedTo),
    enabled: !!appliedFrom && !!appliedTo,
  });

  const applyPreset = (days: number) => {
    const end = shDateStr(new Date());
    const start = shDateStr(new Date(Date.now() - (days - 1) * 86400000));
    setFrom(start); setTo(end);
    setAppliedFrom(start); setAppliedTo(end);
  };
  const applyMonth = (offset: number) => {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth() + offset;
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const start = shDateStr(first), end = shDateStr(last);
    setFrom(start); setTo(end);
    setAppliedFrom(start); setAppliedTo(end);
  };

  const r = data as any;
  const onChain = r?.orders?.onChain || { count: 0, amount: "0" };
  const balance = r?.orders?.balance || { count: 0, amount: "0" };
  const reinvest = r?.orders?.reinvest || { count: 0, amount: "0" };
  const withdrawals = r?.withdrawals?.completed || { count: 0, amount: "0", actualAmount: "0", fees: "0" };
  const pendingW = r?.withdrawals?.pending || { count: 0, amount: "0" };
  const byDayOrders: any[] = r?.orders?.byDay || [];
  const byDayWithdrawals: any[] = r?.withdrawals?.byDay || [];
  const byProductOnChain: any[] = r?.orders?.byProductOnChain || [];

  const days = r?.range?.days || 0;
  const depositNet = fmtN(onChain.amount);

  return (
    <div className="space-y-4">
      {/* Date range picker */}
      <div className="rounded-xl p-4 space-y-3" style={cardBg}>
        <div className="flex items-center gap-2">
          <Calendar size={14} style={{ color: "#C9A227" }} />
          <span className="text-sm font-bold text-foreground">选择日期区间</span>
          {isFetching && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="text-xs rounded-lg px-2.5 py-2"
            style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.2)", color: "#C9A227", colorScheme: "dark" }} />
          <span className="text-xs text-muted-foreground">至</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="text-xs rounded-lg px-2.5 py-2"
            style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.2)", color: "#C9A227", colorScheme: "dark" }} />
          <button onClick={() => { setAppliedFrom(from); setAppliedTo(to); }}
            className="text-xs px-3 py-2 rounded-lg font-semibold"
            style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}>
            应用
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: "近 7 天", fn: () => applyPreset(7) },
            { label: "近 14 天", fn: () => applyPreset(14) },
            { label: "近 30 天", fn: () => applyPreset(30) },
            { label: "本月", fn: () => applyMonth(0) },
            { label: "上月", fn: () => applyMonth(-1) },
          ].map(p => (
            <button key={p.label} onClick={p.fn}
              className="text-[10px] px-2 py-1 rounded-full"
              style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.2)", color: "#C9A227" }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: "#C9A227" }} />
        </div>
      ) : !r ? null : (
        <>
          {/* Summary strip */}
          <div className="rounded-xl p-4" style={cardBg}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-muted-foreground">{appliedFrom} ~ {appliedTo}</div>
                <div className="text-[10px] text-muted-foreground">共 {days} 天</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground">区间净入金</div>
                <div className="font-black text-lg" style={{ color: "#22c55e" }}>+{fmt(depositNet)} U</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg p-3" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp size={11} style={{ color: "#22c55e" }} />
                  <span className="text-[10px] text-muted-foreground">真实USDT入金</span>
                </div>
                <div className="font-black text-sm" style={{ color: "#22c55e" }}>{fmt(onChain.amount)} U</div>
                <div className="text-[9px] text-muted-foreground">{onChain.count} 笔</div>
              </div>
              <div className="rounded-lg p-3" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <CreditCard size={11} style={{ color: "#3b82f6" }} />
                  <span className="text-[10px] text-muted-foreground">余额投资</span>
                </div>
                <div className="font-black text-sm" style={{ color: "#3b82f6" }}>{fmt(balance.amount)} U</div>
                <div className="text-[9px] text-muted-foreground">{balance.count} 笔</div>
              </div>
              <div className="rounded-lg p-3" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Recycle size={11} style={{ color: "#a855f7" }} />
                  <span className="text-[10px] text-muted-foreground">复投</span>
                </div>
                <div className="font-black text-sm" style={{ color: "#a855f7" }}>{fmt(reinvest.amount)} U</div>
                <div className="text-[9px] text-muted-foreground">{reinvest.count} 笔</div>
              </div>
            </div>
          </div>

          {/* Withdrawals summary */}
          <div className="rounded-xl p-4" style={cardBg}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={14} style={{ color: "#ef4444" }} />
              <span className="text-sm font-bold text-foreground">提现（区间内）</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg p-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                <div className="text-[10px] text-muted-foreground mb-1">已完成</div>
                <div className="font-black text-sm" style={{ color: "#ef4444" }}>{fmt(withdrawals.amount)} U</div>
                <div className="text-[9px] text-muted-foreground">{withdrawals.count} 笔 · 实付 {fmt(withdrawals.actualAmount)} · 费 {fmt(withdrawals.fees)}</div>
              </div>
              <div className="rounded-lg p-3" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                <div className="text-[10px] text-muted-foreground mb-1">待审核</div>
                <div className="font-black text-sm" style={{ color: "#f59e0b" }}>{fmt(pendingW.amount)} U</div>
                <div className="text-[9px] text-muted-foreground">{pendingW.count} 笔</div>
              </div>
              <div className="rounded-lg p-3" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                <div className="text-[10px] text-muted-foreground mb-1">区间净流（入−出）</div>
                <div className="font-black text-sm" style={{ color: depositNet - fmtN(withdrawals.amount) >= 0 ? "#22c55e" : "#ef4444" }}>
                  {(depositNet - fmtN(withdrawals.amount)) >= 0 ? "+" : ""}{fmt(depositNet - fmtN(withdrawals.amount))} U
                </div>
                <div className="text-[9px] text-muted-foreground">真实入金 − 链上提现</div>
              </div>
            </div>
          </div>

          {/* By day table */}
          <div className="rounded-xl p-4" style={cardBg}>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} style={{ color: "#C9A227" }} />
              <span className="text-sm font-bold text-foreground">按日明细</span>
            </div>
            {byDayOrders.length === 0 && byDayWithdrawals.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-6">区间内无数据</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(201,162,39,0.15)" }}>
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">日期</th>
                      <th className="text-right py-2 px-2 font-medium" style={{ color: "#22c55e" }}>真实USDT入金</th>
                      <th className="text-right py-2 px-2 font-medium" style={{ color: "#3b82f6" }}>余额投资</th>
                      <th className="text-right py-2 px-2 font-medium" style={{ color: "#a855f7" }}>复投</th>
                      <th className="text-right py-2 px-2 font-medium" style={{ color: "#ef4444" }}>提现</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const dates = Array.from(new Set([
                        ...byDayOrders.map(d => d.date),
                        ...byDayWithdrawals.map(d => d.date),
                      ])).sort();
                      const oMap = new Map(byDayOrders.map(d => [d.date, d]));
                      const wMap = new Map(byDayWithdrawals.map(d => [d.date, d]));
                      return dates.map(date => {
                        const oo = oMap.get(date) || {};
                        const ww = wMap.get(date) || {};
                        return (
                          <tr key={date} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <td className="py-2.5 px-2 text-muted-foreground font-mono text-[11px]">{date}</td>
                            <td className="py-2.5 px-2 text-right" style={{ color: "#22c55e" }}>
                              {fmtN(oo.on_chain || 0) > 0 ? `${fmt(oo.on_chain)} (${oo.on_chain_count || 0})` : "-"}
                            </td>
                            <td className="py-2.5 px-2 text-right" style={{ color: "#3b82f6" }}>
                              {fmtN(oo.balance || 0) > 0 ? `${fmt(oo.balance)} (${oo.balance_count || 0})` : "-"}
                            </td>
                            <td className="py-2.5 px-2 text-right" style={{ color: "#a855f7" }}>
                              {fmtN(oo.reinvest || 0) > 0 ? `${fmt(oo.reinvest)} (${oo.reinvest_count || 0})` : "-"}
                            </td>
                            <td className="py-2.5 px-2 text-right" style={{ color: "#ef4444" }}>
                              {fmtN(ww.amount || 0) > 0 ? `${fmt(ww.amount)} (${ww.count || 0})` : "-"}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* By product (on_chain only) */}
          {byProductOnChain.length > 0 && (
            <div className="rounded-xl p-4" style={cardBg}>
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={14} style={{ color: "#C9A227" }} />
                <span className="text-sm font-bold text-foreground">真实入金按配套</span>
              </div>
              <div className="space-y-2">
                {byProductOnChain.map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.1)" }}>
                    <span className="text-xs font-semibold text-foreground">{p.name}</span>
                    <div className="text-right">
                      <span className="text-xs font-bold" style={{ color: "#22c55e" }}>{fmt(p.amount)} U</span>
                      <span className="text-[9px] text-muted-foreground ml-2">{p.count} 笔</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ForecastTab({ fc }: { fc: any }) {
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");

  const dailyTotal = fmtN(fc.dailyTotal);
  const expirationByDay: any[] = fc.expirationByDay || [];
  const expirationByMonth: any[] = fc.expirationByMonth || [];

  // Build lookup maps
  const dayMap = new Map<string, any>();
  expirationByDay.forEach((d: any) => dayMap.set(d.exp_date, d));

  // Build cumulative day-by-day timeline: each day = rewards + principal, accumulates if not withdrawn
  const cumulativeMap = new Map<string, { daily: number; principal: number; cumulative: number }>();
  const allDayList: { date: string; daily: number; principal: number; cumulative: number; orders?: any[] }[] = [];
  {
    // Determine timeline range: today to last expiration or +90 days, whichever is further
    const today = new Date();
    const lastExpDate = expirationByDay.length > 0
      ? expirationByDay.reduce((max: string, d: any) => d.exp_date > max ? d.exp_date : max, "")
      : "";
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 90);
    if (lastExpDate) {
      const lastExp = new Date(lastExpDate);
      if (lastExp > endDate) endDate.setTime(lastExp.getTime());
    }

    let cumulative = 0;
    // Add existing unrealized balance as starting cumulative
    cumulative = fmtN(fc.unrealizedBalance || 0);
    const cursor = new Date(today);
    while (cursor <= endDate) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const dayData = dayMap.get(dateStr);
      const principal = dayData ? fmtN(dayData.principal) : 0;
      const dayNew = dailyTotal + principal;
      cumulative += dayNew;
      const entry = { date: dateStr, daily: dailyTotal, principal, cumulative, orders: dayData?.orders };
      cumulativeMap.set(dateStr, entry);
      allDayList.push(entry);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  // Calendar helpers
  const [calY, calM] = calMonth.split("-").map(Number);
  const daysInMonth = new Date(calY, calM, 0).getDate();
  const firstDayOfWeek = (new Date(calY, calM - 1, 1).getDay() + 6) % 7; // Mon=0
  const calDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calDays.push(d);
  while (calDays.length % 7 !== 0) calDays.push(null);

  const prevMonth = () => {
    const d = new Date(calY, calM - 2, 1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    const d = new Date(calY, calM, 1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setSelectedDate(null);
  };

  // Get month aggregate
  const curMonthData = expirationByMonth.find((m: any) => m.month === calMonth);
  const monthPrincipal = curMonthData ? fmtN(curMonthData.principal) : 0;
  const monthRewards = dailyTotal * daysInMonth;
  const monthTotal = monthPrincipal + monthRewards;

  // Max cumulative in current month for heat intensity
  const monthCumulatives = allDayList
    .filter(d => d.date.startsWith(calMonth))
    .map(d => d.cumulative);
  const maxMonthCumulative = Math.max(...monthCumulatives, 1);
  // Month-end cumulative
  const monthEndEntry = [...allDayList].reverse().find(d => d.date.startsWith(calMonth));
  const monthEndCumulative = monthEndEntry?.cumulative || 0;

  // Selected date details
  const selectedEntry = selectedDate ? cumulativeMap.get(selectedDate) : null;
  const selectedDayData = selectedDate ? dayMap.get(selectedDate) : null;

  // Today string
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Risk overview strip */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-xl p-3 text-center" style={cardBg}>
          <div className="text-xs text-muted-foreground">日支出</div>
          <div className="font-black text-base" style={{ color: "#ef4444" }}>{fmt(dailyTotal)}</div>
        </div>
        <div className="rounded-xl p-3 text-center" style={cardBg}>
          <div className="text-xs text-muted-foreground">待提现</div>
          <div className="font-black text-base" style={{ color: "#f59e0b" }}>{fmt(fc.pendingWithdrawals?.totalAmount || 0)}</div>
          <div className="text-[10px] text-muted-foreground">{fc.pendingWithdrawals?.count || 0}笔</div>
        </div>
        <div className="rounded-xl p-3 text-center" style={cardBg}>
          <div className="text-xs text-muted-foreground">可提余额</div>
          <div className="font-black text-base" style={{ color: "#f59e0b" }}>{fmt(fc.unrealizedBalance)}</div>
        </div>
        <div className="rounded-xl p-3 text-center" style={cardBg}>
          <div className="text-xs text-muted-foreground">活跃订单</div>
          <div className="font-black text-base" style={{ color: "#C9A227" }}>{fc.activeOrderCount || 0}</div>
          <div className="text-[10px] text-muted-foreground">{fmt(fc.activeStaking)}U</div>
        </div>
      </div>

      {/* View mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={14} style={{ color: "#C9A227" }} />
          <span className="text-sm font-semibold text-foreground">支出预测</span>
        </div>
        <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(201,162,39,0.2)" }}>
          <button
            className="px-3 py-1.5 text-[11px] font-medium flex items-center gap-1 transition-all"
            style={viewMode === "calendar" ? { background: "rgba(201,162,39,0.15)", color: "#C9A227" } : { color: "rgba(255,255,255,0.4)" }}
            onClick={() => setViewMode("calendar")}
          >
            <LayoutGrid size={11} />日历
          </button>
          <button
            className="px-3 py-1.5 text-[11px] font-medium flex items-center gap-1 transition-all"
            style={viewMode === "list" ? { background: "rgba(201,162,39,0.15)", color: "#C9A227" } : { color: "rgba(255,255,255,0.4)" }}
            onClick={() => setViewMode("list")}
          >
            <List size={11} />列表
          </button>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <>
          {/* Calendar view */}
          <div className="rounded-xl p-4" style={cardBg}>
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-1.5 rounded-lg" style={{ color: "#C9A227" }}>
                <ChevronLeft size={16} />
              </button>
              <div className="text-center">
                <div className="text-base font-bold text-foreground">{calY}年{calM}月</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  当月新增 <span style={{ color: "#ef4444" }}>{fmt(monthTotal)} U</span>
                  {monthPrincipal > 0 && <span> · 本金 <span style={{ color: "#f59e0b" }}>{fmt(monthPrincipal)}</span></span>}
                </div>
                <div className="text-xs mt-0.5">
                  月末累积 <span className="font-bold" style={{ color: "#ef4444" }}>{fmt(monthEndCumulative)} U</span>
                </div>
              </div>
              <button onClick={nextMonth} className="p-1.5 rounded-lg" style={{ color: "#C9A227" }}>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {["一", "二", "三", "四", "五", "六", "日"].map(w => (
                <div key={w} className="text-center text-xs text-muted-foreground py-1">{w}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {calDays.map((day, i) => {
                if (day === null) return <div key={`e${i}`} className="aspect-square" />;
                const dateStr = `${calMonth}-${String(day).padStart(2, "0")}`;
                const entry = cumulativeMap.get(dateStr);
                const hasData = !!entry;
                const principal = entry?.principal || 0;
                const cumulative = entry?.cumulative || 0;
                const hasExpiration = principal > 0;
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                // Heat by cumulative intensity within month
                const intensity = hasData ? Math.max(0.04, (cumulative / maxMonthCumulative) * 0.4) : 0;

                return (
                  <button
                    key={dateStr}
                    className="aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all"
                    style={{
                      background: isSelected
                        ? "rgba(201,162,39,0.2)"
                        : hasData
                        ? `rgba(239,68,68,${intensity})`
                        : "rgba(255,255,255,0.015)",
                      border: isSelected
                        ? "1.5px solid rgba(201,162,39,0.6)"
                        : isToday
                        ? "1.5px solid rgba(201,162,39,0.3)"
                        : "1px solid rgba(255,255,255,0.04)",
                    }}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  >
                    <span className={`text-sm ${isToday ? "font-bold" : "font-medium"}`} style={{ color: isToday ? "#C9A227" : hasExpiration ? "#f59e0b" : "rgba(255,255,255,0.5)" }}>
                      {day}
                    </span>
                    {hasData && (
                      <span className="text-[11px] font-bold mt-0.5" style={{ color: "#ef4444" }}>
                        {cumulative >= 10000 ? `${(cumulative / 1000).toFixed(0)}k` : cumulative >= 1000 ? `${(cumulative / 1000).toFixed(1)}k` : fmt(cumulative)}
                      </span>
                    )}
                    {hasExpiration && (
                      <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full" style={{ background: "#f59e0b" }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded" style={{ background: "rgba(239,68,68,0.1)" }} />累积少
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded" style={{ background: "rgba(239,68,68,0.4)" }} />累积多
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: "#f59e0b" }} />有到期本金
              </div>
            </div>
          </div>

          {/* Selected date detail panel */}
          {selectedDate && (
            <div className="rounded-xl p-4" style={{ ...cardBg, borderColor: "rgba(245,158,11,0.3)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-foreground">{selectedDate}</span>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground">累积待提现</div>
                  <div className="font-black text-lg" style={{ color: "#ef4444" }}>
                    {fmt(selectedEntry?.cumulative || 0)} U
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-lg p-2.5" style={{ background: "rgba(232,197,71,0.06)" }}>
                  <div className="text-[9px] text-muted-foreground">当日新增</div>
                  <div className="text-xs font-bold" style={{ color: "#E8C547" }}>
                    +{fmt((selectedEntry?.daily || 0) + (selectedEntry?.principal || 0))} U
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-1">
                    奖励 {fmt(selectedEntry?.daily || 0)} + 本金 {fmt(selectedEntry?.principal || 0)}
                  </div>
                </div>
                <div className="rounded-lg p-2.5" style={{ background: "rgba(239,68,68,0.06)" }}>
                  <div className="text-[9px] text-muted-foreground">到期订单</div>
                  <div className="text-xs font-bold text-foreground">
                    {selectedDayData ? selectedDayData.order_count : 0} 笔
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-1">
                    {(selectedEntry?.principal || 0) > 0 ? "有本金返还" : "仅奖励累积"}
                  </div>
                </div>
              </div>

              {/* Order details */}
              {selectedDayData && (selectedDayData.orders || []).length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-muted-foreground mb-1">到期订单明细</div>
                  {(selectedDayData.orders || []).map((order: any) => (
                    <div key={order.id} className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">{order.product}</span>
                        <span className="text-xs font-bold" style={{ color: "#f59e0b" }}>{fmt(order.amount)} U</span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                        <span className="font-mono">{shortAddr(order.wallet)}</span>
                        <span>{order.rate}%/日 · {order.startDate} ~ {order.endDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(!selectedDayData || (selectedDayData.orders || []).length === 0) && (
                <div className="text-xs text-muted-foreground text-center py-3">当日无到期订单，奖励 +{fmt(dailyTotal)} U 累积至总额</div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Date range filter */}
          <div className="rounded-xl p-4" style={cardBg}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={13} style={{ color: "#C9A227" }} />
              <span className="text-xs font-bold text-foreground">区间统计</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="date"
                value={rangeFrom}
                onChange={e => setRangeFrom(e.target.value)}
                className="flex-1 text-[11px] rounded-lg px-2.5 py-2"
                style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.2)", color: "#C9A227", colorScheme: "dark" }}
              />
              <span className="text-xs text-muted-foreground">至</span>
              <input
                type="date"
                value={rangeTo}
                onChange={e => setRangeTo(e.target.value)}
                className="flex-1 text-[11px] rounded-lg px-2.5 py-2"
                style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.2)", color: "#C9A227", colorScheme: "dark" }}
              />
              {(rangeFrom || rangeTo) && (
                <button
                  onClick={() => { setRangeFrom(""); setRangeTo(""); }}
                  className="text-[10px] px-2 py-2 rounded-lg"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  清除
                </button>
              )}
            </div>

            {/* Range summary */}
            {(rangeFrom || rangeTo) && (() => {
              const filtered = allDayList.filter(d =>
                (!rangeFrom || d.date >= rangeFrom) && (!rangeTo || d.date <= rangeTo)
              );
              const rangeDays = filtered.length;
              const rangeRewards = filtered.reduce((s, d) => s + d.daily, 0);
              const rangePrincipal = filtered.reduce((s, d) => s + d.principal, 0);
              const rangeTotal = rangeRewards + rangePrincipal;
              const rangeOrders = filtered.reduce((s, d) => {
                const dd = dayMap.get(d.date);
                return s + (dd?.order_count || 0);
              }, 0);
              const startCum = filtered.length > 0 ? (filtered[0].cumulative - filtered[0].daily - filtered[0].principal) : 0;
              const endCum = filtered.length > 0 ? filtered[filtered.length - 1].cumulative : 0;

              return (
                <div className="space-y-2">
                  <div className="rounded-lg p-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-foreground">
                        {rangeFrom || "起始"} ~ {rangeTo || "结束"} ({rangeDays}天)
                      </span>
                      <span className="font-black text-base" style={{ color: "#ef4444" }}>{fmt(rangeTotal)} U</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">期间奖励支出</span>
                        <span className="font-semibold" style={{ color: "#E8C547" }}>{fmt(rangeRewards)} U</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">期间本金返还</span>
                        <span className="font-semibold" style={{ color: "#f59e0b" }}>{fmt(rangePrincipal)} U</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">到期订单数</span>
                        <span className="font-semibold text-foreground">{rangeOrders} 笔</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">日均支出</span>
                        <span className="font-semibold text-foreground">{fmt(rangeDays > 0 ? rangeTotal / rangeDays : 0)} U/日</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">期初累积</span>
                        <span className="font-semibold" style={{ color: "#f59e0b" }}>{fmt(startCum)} U</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">期末累积</span>
                        <span className="font-bold" style={{ color: "#ef4444" }}>{fmt(endCum)} U</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {!rangeFrom && !rangeTo && (
              <div className="text-[10px] text-muted-foreground text-center py-1">选择日期区间查看期间预测汇总</div>
            )}
          </div>

          {/* List view */}
          <div className="rounded-xl p-4" style={cardBg}>
            {/* Table header */}
            <div className="flex items-center justify-between px-3 py-2 mb-1 text-[10px] text-muted-foreground" style={{ borderBottom: "1px solid rgba(201,162,39,0.1)" }}>
              <span className="w-24">日期</span>
              <span className="w-16 text-right">当日新增</span>
              <span className="w-16 text-right">到期本金</span>
              <span className="w-20 text-right font-semibold" style={{ color: "#ef4444" }}>累积总额</span>
            </div>
            <div className="space-y-0.5 max-h-[500px] overflow-y-auto">
              {allDayList.filter(d => (!rangeFrom || d.date >= rangeFrom) && (!rangeTo || d.date <= rangeTo)).map(entry => {
                const isExpanded = selectedDate === entry.date;
                const dayData = dayMap.get(entry.date);
                const hasExpiration = entry.principal > 0;
                return (
                  <div key={entry.date}>
                    <button
                      className="w-full rounded-lg px-3 py-2 text-left transition-all"
                      style={{
                        background: isExpanded
                          ? "rgba(201,162,39,0.08)"
                          : hasExpiration
                          ? "rgba(245,158,11,0.04)"
                          : "transparent",
                        border: isExpanded ? "1px solid rgba(201,162,39,0.2)" : "1px solid transparent",
                      }}
                      onClick={() => setSelectedDate(isExpanded ? null : entry.date)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 w-24">
                          {hasExpiration && (
                            <ChevronRight
                              size={9}
                              style={{ color: "#f59e0b", transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}
                            />
                          )}
                          <span className="text-[11px] font-mono" style={{ color: entry.date === todayStr ? "#C9A227" : "rgba(255,255,255,0.6)" }}>
                            {entry.date.slice(5)}
                          </span>
                          {entry.date === todayStr && (
                            <span className="text-[8px] px-1 rounded" style={{ background: "rgba(201,162,39,0.15)", color: "#C9A227" }}>今</span>
                          )}
                        </div>
                        <span className="w-16 text-right text-[11px]" style={{ color: "#E8C547" }}>
                          +{fmt(entry.daily + entry.principal)}
                        </span>
                        <span className="w-16 text-right text-[11px]" style={{ color: hasExpiration ? "#f59e0b" : "rgba(255,255,255,0.2)" }}>
                          {hasExpiration ? fmt(entry.principal) : "-"}
                        </span>
                        <span className="w-20 text-right text-[11px] font-bold" style={{ color: "#ef4444" }}>
                          {fmt(entry.cumulative)}
                        </span>
                      </div>
                    </button>

                    {isExpanded && dayData && (dayData.orders || []).length > 0 && (
                      <div className="ml-5 mt-1 space-y-1 mb-2">
                        {(dayData.orders || []).map((order: any) => (
                          <div key={order.id} className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-foreground">{order.product}</span>
                              <span className="text-[11px] font-bold" style={{ color: "#f59e0b" }}>{fmt(order.amount)} U</span>
                            </div>
                            <div className="flex items-center justify-between mt-0.5 text-[9px] text-muted-foreground">
                              <span className="font-mono">{shortAddr(order.wallet)}</span>
                              <span>{order.rate}%/日 · {order.startDate}~{order.endDate}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {allDayList.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-6">暂无数据</div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-[9px] text-muted-foreground">
            <span><span style={{ color: "#E8C547" }}>黄色</span> = 当日新增(奖励+本金)</span>
            <span><span style={{ color: "#ef4444" }}>红色</span> = 累积未提现总额</span>
          </div>
        </>
      )}

      {/* 30/60/90 day summary */}
      <div className="rounded-xl p-4" style={cardBg}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown size={14} style={{ color: "#C9A227" }} />
          <span className="text-sm font-semibold text-foreground">累积预测（假设全不提现）</span>
        </div>
        <div className="space-y-2">
          {[30, 60, 90].map(days => {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() + days);
            const cutoffStr = cutoff.toISOString().slice(0, 10);
            // Get cumulative at that date
            const targetEntry = [...allDayList].reverse().find(d => d.date <= cutoffStr);
            const cumulative = targetEntry?.cumulative || 0;
            const rewardPayout = dailyTotal * days;
            const principal = expirationByDay
              .filter((d: any) => d.exp_date <= cutoffStr)
              .reduce((sum: number, d: any) => sum + fmtN(d.principal), 0);
            const expiringOrders = expirationByDay
              .filter((d: any) => d.exp_date <= cutoffStr)
              .reduce((sum: number, d: any) => sum + d.order_count, 0);
            return (
              <div key={days} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-foreground">{days}天后累积</span>
                  <span className="font-black text-base" style={{ color: "#ef4444" }}>{fmt(cumulative)} U</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[10px]">
                  <div>
                    <span className="text-muted-foreground">期间奖励</span>
                    <div className="font-semibold" style={{ color: "#E8C547" }}>{fmt(rewardPayout)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">期间本金</span>
                    <div className="font-semibold" style={{ color: "#f59e0b" }}>{fmt(principal)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">到期订单</span>
                    <div className="font-semibold text-foreground">{expiringOrders}笔</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">日均增长</span>
                    <div className="font-semibold text-foreground">{fmt((cumulative - fmtN(fc.unrealizedBalance || 0)) / days)}/日</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily payout breakdown */}
      <div className="rounded-xl p-4" style={cardBg}>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} style={{ color: "#C9A227" }} />
          <span className="text-sm font-semibold text-foreground">每日奖励构成</span>
        </div>
        <div className="text-[10px] text-muted-foreground mb-3">
          {fc.activeOrderCount || 0} 笔活跃订单 / 质押 {fmt(fc.activeStaking)} U
        </div>
        <div className="space-y-1.5">
          {[
            { label: "日利息", value: fc.dailyInterest, color: "#E8C547" },
            { label: "直推奖励(10%)", value: fc.dailyDirect, color: "#F0D060" },
            { label: "间推奖励(5%)", value: fc.dailyIndirect, color: "#D4AF37" },
            { label: "团队分红", value: fc.dailyTeam, color: "#FFD700" },
            { label: "同级奖励(10%)", value: fc.dailyEqualLevel, color: "#FF8C00" },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-1.5 px-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
              <span className="text-[11px]" style={{ color: item.color }}>{item.label}</span>
              <span className="text-xs font-bold" style={{ color: item.color }}>{fmt(item.value)} U</span>
            </div>
          ))}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg mt-1" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <span className="text-xs font-bold" style={{ color: "#ef4444" }}>每日总支出</span>
            <span className="font-black text-base" style={{ color: "#ef4444" }}>{fmt(fc.dailyTotal)} U</span>
          </div>
        </div>
      </div>

      {/* Active order by product */}
      <div className="rounded-xl p-4" style={cardBg}>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={14} style={{ color: "#C9A227" }} />
          <span className="text-sm font-semibold text-foreground">活跃配套分布</span>
        </div>
        {(fc.byProduct || []).length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-6">暂无活跃订单</div>
        ) : (
          <div className="space-y-2">
            {(fc.byProduct || []).map((p: any, i: number) => {
              const totalAmt = fmtN(fc.activeStaking || 1);
              const pAmt = fmtN(p.staking);
              const pct = totalAmt > 0 ? (pAmt / totalAmt * 100) : 0;
              return (
                <div key={i} className="rounded-lg p-3" style={{ background: "rgba(201,162,39,0.04)", border: "1px solid rgba(201,162,39,0.1)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-foreground">{p.name}</span>
                    <span className="text-[10px]" style={{ color: "#C9A227" }}>{p.rate}%/日</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] mb-2">
                    <span className="text-muted-foreground">{p.count}笔 · {fmt(p.staking)} U</span>
                    <span style={{ color: "#E8C547" }}>日产 {fmt(p.daily_payout)} U</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #C9A227, #E8C547)" }} />
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-1">{pct.toFixed(1)}%</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminFinance() {
  const [activeSection, setActiveSection] = useState<"overview" | "monthly" | "range" | "forecast">("overview");
  const { data, isLoading } = useQuery({ queryKey: ["/api/admin/finance"], queryFn: getAdminFinance });
  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({ queryKey: ["/api/admin/finance/monthly"], queryFn: getAdminFinanceMonthly });
  const { data: forecastData, isLoading: forecastLoading } = useQuery({ queryKey: ["/api/admin/finance/forecast"], queryFn: getAdminWithdrawalForecast });

  if (isLoading) return <div className="text-muted-foreground text-center py-20">加载中...</div>;
  if (!data) return null;
  const d = data as any;
  const m = monthlyData as any;
  const fc = forecastData as any;

  const sections = [
    { key: "overview" as const, label: "总览" },
    { key: "monthly" as const, label: "月度分析" },
    { key: "range" as const, label: "区间统计" },
    { key: "forecast" as const, label: "提现预测" },
  ];

  // Build merged monthly table data
  const monthMap = new Map<string, any>();
  if (m) {
    (m.monthlyDeposits || []).forEach((x: any) => {
      const e = monthMap.get(x.month) || { month: x.month };
      e.deposits = fmtN(x.total);
      e.depositCount = x.count;
      monthMap.set(x.month, e);
    });
    (m.monthlyRewards || []).forEach((x: any) => {
      const e = monthMap.get(x.month) || { month: x.month };
      e.daily = fmtN(x.daily_total);
      e.direct = fmtN(x.direct_total);
      e.indirect = fmtN(x.indirect_total);
      e.team = fmtN(x.team_total);
      e.equalLevel = fmtN(x.equal_level_total);
      e.rewardTotal = fmtN(x.all_total);
      monthMap.set(x.month, e);
    });
    (m.monthlyWithdrawals || []).forEach((x: any) => {
      const e = monthMap.get(x.month) || { month: x.month };
      e.withdrawn = fmtN(x.total);
      e.withdrawnFees = fmtN(x.fees);
      e.withdrawnCount = x.count;
      monthMap.set(x.month, e);
    });
  }
  const monthlyRows = Array.from(monthMap.values()).sort((a, b) => b.month.localeCompare(a.month));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
        <h2 className="font-bold text-lg text-foreground">财务管理</h2>
      </div>

      {/* Section tabs */}
      <div className="flex rounded-lg p-1 gap-1" style={{ background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.15)" }}>
        {sections.map(s => (
          <button key={s.key}
            className="flex-1 py-2 text-sm font-semibold rounded-md transition-all"
            style={activeSection === s.key
              ? { background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }
              : { color: "rgba(255,255,255,0.5)" }}
            onClick={() => setActiveSection(s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW ===== */}
      {activeSection === "overview" && (
        <>
          {/* Deposit breakdown — 3 categories */}
          <div className="rounded-xl p-4" style={cardBg}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} style={{ color: "#22c55e" }} />
              <span className="text-sm font-bold text-foreground">入金分类统计</span>
              <span className="text-[10px] text-muted-foreground ml-auto">总入金仅计算真实 USDT 入金</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <StatCard icon={TrendingUp} label="真实USDT入金(U)" value={fmt(d.onChainDeposits || 0)} sub={`${d.onChainDepositCount || 0} 笔 · 计入总入金`} color="#22c55e" />
              <StatCard icon={CreditCard} label="余额投资(U)" value={fmt(d.balanceDeposits || 0)} sub={`${d.balanceDepositCount || 0} 笔 · 不重复计入`} color="#3b82f6" />
              <StatCard icon={Recycle} label="复投金额(U)" value={fmt(d.reinvestDeposits || 0)} sub={`${d.reinvestDepositCount || 0} 笔 · 不重复计入`} color="#a855f7" />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <StatCard icon={TrendingUp} label="总入金(U)" value={fmt(d.totalDeposits)} sub={`${d.totalDepositCount || 0} 笔 · 真实入金`} color="#22c55e" />
            <StatCard icon={TrendingDown} label="总出金(U)" value={fmt(d.totalWithdrawn)} sub={`实付 ${fmt(d.totalActualPaid || 0)} + 手续费 ${fmt(d.totalFees || 0)}`} color="#ef4444" />
            <StatCard icon={Wallet} label="净余额(U)" value={fmt(d.netBalance)} sub="真实入金 − 链上提现" />
            <StatCard icon={DollarSign} label="活跃质押(U)" value={fmt(d.activeStaking)} />
            <StatCard icon={ArrowDownToLine} label="累计发放收益(U)" value={fmt(d.totalEarned)} />
            <StatCard icon={Percent} label="手续费收入(U)" value={fmt(d.totalFees)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl p-4" style={cardBg}>
              <div className="text-sm font-semibold text-foreground mb-3">入金记录 (按日)</div>
              {(d.depositsByDate || []).length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-8">暂无数据</div>
              ) : (
                <>
                  <div className="flex items-end gap-1 h-32 mb-3">
                    {(d.depositsByDate || []).slice(-15).map((item: any, i: number) => {
                      const maxVal = Math.max(...(d.depositsByDate || []).map((x: any) => parseFloat(x.total) || 0), 1);
                      const val = parseFloat(item.total) || 0;
                      const h = Math.max((val / maxVal) * 100, 3);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full rounded-t" style={{ height: `${h}%`, background: "linear-gradient(180deg, #22c55e, #16a34a)", minHeight: "2px" }} />
                          <span className="text-[7px] text-muted-foreground truncate w-full text-center">{item.date.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {[...(d.depositsByDate || [])].reverse().map((item: any) => (
                      <div key={item.date} className="flex items-center justify-between py-1.5 px-2 rounded text-xs" style={{ background: "rgba(34,197,94,0.04)" }}>
                        <span className="text-muted-foreground">{item.date}</span>
                        <span>{item.count} 笔</span>
                        <span className="font-semibold" style={{ color: "#22c55e" }}>+{fmt(item.total)} U</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="rounded-xl p-4" style={cardBg}>
              <div className="text-sm font-semibold text-foreground mb-3">出金记录 (按日)</div>
              {(d.withdrawalsByDate || []).length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-8">暂无数据</div>
              ) : (
                <>
                  <div className="flex items-end gap-1 h-32 mb-3">
                    {(d.withdrawalsByDate || []).slice(-15).map((item: any, i: number) => {
                      const maxVal = Math.max(...(d.withdrawalsByDate || []).map((x: any) => parseFloat(x.total) || 0), 1);
                      const val = parseFloat(item.total) || 0;
                      const h = Math.max((val / maxVal) * 100, 3);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full rounded-t" style={{ height: `${h}%`, background: "linear-gradient(180deg, #ef4444, #dc2626)", minHeight: "2px" }} />
                          <span className="text-[7px] text-muted-foreground truncate w-full text-center">{item.date.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {[...(d.withdrawalsByDate || [])].reverse().map((item: any) => (
                      <div key={item.date} className="flex items-center justify-between py-1.5 px-2 rounded text-xs" style={{ background: "rgba(239,68,68,0.04)" }}>
                        <span className="text-muted-foreground">{item.date}</span>
                        <span>{item.count} 笔</span>
                        <span className="font-semibold" style={{ color: "#ef4444" }}>-{fmt(item.total)} U</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== MONTHLY ANALYSIS ===== */}
      {activeSection === "monthly" && (
        monthlyLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin" style={{ color: "#C9A227" }} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl p-4" style={cardBg}>
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={14} style={{ color: "#C9A227" }} />
                <span className="text-sm font-semibold text-foreground">月度收支统计</span>
              </div>
              {monthlyRows.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-8">暂无数据</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(201,162,39,0.15)" }}>
                        <th className="text-left py-2 px-2 text-muted-foreground font-medium">月份</th>
                        <th className="text-right py-2 px-2 font-medium" style={{ color: "#22c55e" }}>入金</th>
                        <th className="text-right py-2 px-2 font-medium" style={{ color: "#ef4444" }}>支出合计</th>
                        <th className="text-right py-2 px-2 font-medium" style={{ color: "#f59e0b" }}>提现</th>
                        <th className="text-right py-2 px-2 font-medium" style={{ color: "#C9A227" }}>利润</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyRows.map(row => {
                        const deposits = row.deposits || 0;
                        const totalOut = (row.rewardTotal || 0);
                        const profit = deposits - totalOut;
                        return (
                          <tr key={row.month} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <td className="py-2.5 px-2 text-muted-foreground"><MonthLabel month={row.month} /></td>
                            <td className="py-2.5 px-2 text-right font-semibold" style={{ color: "#22c55e" }}>{fmt(deposits)}</td>
                            <td className="py-2.5 px-2 text-right font-semibold" style={{ color: "#ef4444" }}>{fmt(totalOut)}</td>
                            <td className="py-2.5 px-2 text-right font-semibold" style={{ color: "#f59e0b" }}>{fmt(row.withdrawn || 0)}</td>
                            <td className="py-2.5 px-2 text-right font-bold" style={{ color: profit >= 0 ? "#22c55e" : "#ef4444" }}>
                              {profit >= 0 ? "+" : ""}{fmt(profit)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-xl p-4" style={cardBg}>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={14} style={{ color: "#C9A227" }} />
                <span className="text-sm font-semibold text-foreground">月度奖励明细</span>
              </div>
              {monthlyRows.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-8">暂无数据</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(201,162,39,0.15)" }}>
                        <th className="text-left py-2 px-1.5 text-muted-foreground font-medium">月份</th>
                        <th className="text-right py-2 px-1.5 font-medium" style={{ color: "#E8C547" }}>日收益</th>
                        <th className="text-right py-2 px-1.5 font-medium" style={{ color: "#F0D060" }}>直推</th>
                        <th className="text-right py-2 px-1.5 font-medium" style={{ color: "#D4AF37" }}>间推</th>
                        <th className="text-right py-2 px-1.5 font-medium" style={{ color: "#FFD700" }}>团队</th>
                        <th className="text-right py-2 px-1.5 font-medium" style={{ color: "#FF8C00" }}>同级</th>
                        <th className="text-right py-2 px-1.5 font-medium text-foreground">合计</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyRows.map(row => (
                        <tr key={row.month} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td className="py-2.5 px-1.5 text-muted-foreground"><MonthLabel month={row.month} /></td>
                          <td className="py-2.5 px-1.5 text-right" style={{ color: "#E8C547" }}>{fmt(row.daily || 0)}</td>
                          <td className="py-2.5 px-1.5 text-right" style={{ color: "#F0D060" }}>{fmt(row.direct || 0)}</td>
                          <td className="py-2.5 px-1.5 text-right" style={{ color: "#D4AF37" }}>{fmt(row.indirect || 0)}</td>
                          <td className="py-2.5 px-1.5 text-right" style={{ color: "#FFD700" }}>{fmt(row.team || 0)}</td>
                          <td className="py-2.5 px-1.5 text-right" style={{ color: "#FF8C00" }}>{fmt(row.equalLevel || 0)}</td>
                          <td className="py-2.5 px-1.5 text-right font-bold text-foreground">{fmt(row.rewardTotal || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {monthlyRows.length > 0 && (
              <div className="rounded-xl p-4" style={cardBg}>
                <div className="text-sm font-semibold text-foreground mb-3">月度入金 vs 支出</div>
                <div className="space-y-2">
                  {monthlyRows.slice(0, 6).map(row => {
                    const maxVal = Math.max(...monthlyRows.slice(0, 6).map(r => Math.max(r.deposits || 0, r.rewardTotal || 0)), 1);
                    const dW = Math.max(((row.deposits || 0) / maxVal) * 100, 1);
                    const rW = Math.max(((row.rewardTotal || 0) / maxVal) * 100, 1);
                    return (
                      <div key={row.month} className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground w-16"><MonthLabel month={row.month} /></span>
                          <span style={{ color: "#22c55e" }}>+{fmt(row.deposits || 0)}</span>
                          <span style={{ color: "#ef4444" }}>-{fmt(row.rewardTotal || 0)}</span>
                        </div>
                        <div className="flex gap-1 h-3">
                          <div className="rounded-sm" style={{ width: `${dW}%`, background: "linear-gradient(90deg, #22c55e, #16a34a)" }} />
                          <div className="rounded-sm" style={{ width: `${rW}%`, background: "linear-gradient(90deg, #ef4444, #dc2626)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#22c55e" }} /> 入金</div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#ef4444" }} /> 奖励支出</div>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ===== DATE RANGE STATS ===== */}
      {activeSection === "range" && <DateRangeTab />}

      {/* ===== WITHDRAWAL FORECAST ===== */}
      {activeSection === "forecast" && (
        forecastLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin" style={{ color: "#C9A227" }} />
          </div>
        ) : !fc ? null : (
          <ForecastTab fc={fc} />
        )
      )}
    </div>
  );
}
