import { useState, useEffect } from "react";
import { RefreshCw, Loader2, CheckCircle2, XCircle, Database, Clock, Server, Link2, Cpu, ShieldCheck, Wrench, CalendarCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  COREX_INVESTMENT_ADDRESS,
  FUND_DISTRIBUTOR_ADDRESS,
  COREX_WITHDRAWAL_ADDRESS,
  getProductCount,
  isAuthorizedCaller,
  getDistributorRecipients,
  getFundingWallet,
  getUSDTBalance,
  formatUSDT,
} from "@/lib/contracts";

interface HealthItem {
  label: string;
  status: "ok" | "error" | "warn" | "loading";
  detail?: string;
}

export default function SystemHealth() {
  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState<HealthItem[]>([]);
  const [envInfo, setEnvInfo] = useState<{ label: string; value: string }[]>([]);
  const [dbStats, setDbStats] = useState<{ label: string; value: string }[]>([]);
  const [contractStats, setContractStats] = useState<{ label: string; value: string; status?: "ok" | "warn" | "error" }[]>([]);
  const [cronJobs, setCronJobs] = useState<{ name: string; schedule: string }[]>([]);
  const [cronHistory, setCronHistory] = useState<any[]>([]);
  const [integrityIssues, setIntegrityIssues] = useState<{ key: string; label: string; total: number; correct: number; wrong: number; fixable: boolean; rule: string }[]>([]);
  const [fixing, setFixing] = useState<string | null>(null);
  const [settlement, setSettlement] = useState<any>(null);

  useEffect(() => { runHealthCheck(); }, []);

  const runHealthCheck = async () => {
    setLoading(true);
    const healthChecks: HealthItem[] = [];

    // Environment info
    const env = [
      { label: "Supabase URL", value: import.meta.env.VITE_SUPABASE_URL || "未配置" },
      { label: "Thirdweb Client", value: import.meta.env.VITE_THIRDWEB_CLIENT_ID ? "已配置" : "未配置" },
      { label: "Chain", value: "BSC Mainnet (56)" },
      { label: "USDT", value: "0x55d398326f99059fF775485246999027B3197955" },
      { label: "Investment 合约", value: COREX_INVESTMENT_ADDRESS },
      { label: "Distributor 合约", value: FUND_DISTRIBUTOR_ADDRESS },
      { label: "Withdrawal 合约", value: COREX_WITHDRAWAL_ADDRESS },
    ];
    setEnvInfo(env);

    // 1. Database connectivity
    try {
      const start = Date.now();
      const { error } = await supabase.rpc("admin_withdrawal_forecast");
      const ms = Date.now() - start;
      if (error) {
        healthChecks.push({ label: "数据库连接", status: "error", detail: error.message });
      } else {
        healthChecks.push({ label: "数据库连接", status: "ok", detail: `响应 ${ms}ms` });
      }
    } catch (e: any) {
      healthChecks.push({ label: "数据库连接", status: "error", detail: e.message });
    }

    // 2. DB stats (detail card only, no duplicate in health summary)
    try {
      const [members, orders, rewards, withdrawals, products, activeOrders] = await Promise.all([
        supabase.from("members").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("rewards").select("*", { count: "exact", head: true }),
        supabase.from("withdrawals").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "active"),
      ]);
      setDbStats([
        { label: "会员总数", value: String(members.count ?? 0) },
        { label: "订单总数", value: String(orders.count ?? 0) },
        { label: "活跃订单", value: String(activeOrders.count ?? 0) },
        { label: "奖励记录", value: String(rewards.count ?? 0) },
        { label: "提现记录", value: String(withdrawals.count ?? 0) },
        { label: "产品数量", value: String(products.count ?? 0) },
      ]);
    } catch {}

    // 4. Contract checks
    const cStats: typeof contractStats = [];
    try {
      const pCount = await getProductCount().catch(() => -1);
      cStats.push({
        label: "链上产品数",
        value: pCount >= 0 ? String(pCount) : "读取失败",
        status: pCount > 0 ? "ok" : "error",
      });
      healthChecks.push({ label: "Investment合约", status: pCount >= 0 ? "ok" : "error", detail: `${pCount} 个产品` });
    } catch {
      healthChecks.push({ label: "Investment合约", status: "error", detail: "无法连接" });
    }

    try {
      const auth = await isAuthorizedCaller(COREX_INVESTMENT_ADDRESS).catch(() => null);
      cStats.push({
        label: "Distributor授权",
        value: auth === true ? "已授权" : auth === false ? "未授权" : "读取失败",
        status: auth === true ? "ok" : "error",
      });
      healthChecks.push({ label: "Distributor授权", status: auth === true ? "ok" : "error", detail: auth === true ? "Investment已授权" : "未授权" });
    } catch {
      healthChecks.push({ label: "Distributor授权", status: "error" });
    }

    try {
      const recs = await getDistributorRecipients().catch(() => []);
      const total = (recs as any[]).reduce((s: number, r: any) => s + Number(r.percentage || r[1]) / 100, 0);
      cStats.push({
        label: "资金分配",
        value: `${(recs as any[]).length} 个接收方 (${total}%)`,
        status: total === 100 ? "ok" : "warn",
      });
    } catch {}

    try {
      const fw = await getFundingWallet().catch(() => "");
      if (fw && fw !== "0x0000000000000000000000000000000000000000") {
        const bal = await getUSDTBalance(fw).catch(() => BigInt(0));
        cStats.push({
          label: "提现钱包余额",
          value: `${formatUSDT(bal)} USDT`,
          status: bal > BigInt(0) ? "ok" : "warn",
        });
        healthChecks.push({ label: "提现钱包", status: bal > BigInt(0) ? "ok" : "warn", detail: `${formatUSDT(bal)} USDT` });
      } else {
        cStats.push({ label: "提现钱包", value: "未配置", status: "error" });
        healthChecks.push({ label: "提现钱包", status: "error", detail: "未配置" });
      }
    } catch {}

    setContractStats(cStats);

    // 5. Data integrity check (detailed reward + order verification)
    try {
      const { data: issues, error } = await supabase.rpc("admin_data_integrity_check");
      if (!error && issues) {
        setIntegrityIssues(issues);
        const wrongCount = issues.reduce((s: number, i: any) => s + (i.wrong || 0), 0);
        healthChecks.push({
          label: "数据完整性",
          status: wrongCount === 0 ? "ok" : "warn",
          detail: wrongCount === 0 ? "全部通过" : `${wrongCount} 条异常`,
        });
      }
    } catch {
      healthChecks.push({ label: "数据完整性", status: "error", detail: "检查失败" });
    }

    // 6. Daily settlement check
    try {
      const { data: sData, error: sError } = await supabase.rpc("admin_settlement_check");
      if (!sError && sData) {
        setSettlement(sData);
        const settled = sData.today_settled;
        const activeOrders = sData.active_orders || 0;
        const settlementOrders = sData.active_orders_at_settlement || activeOrders;
        const dailyCount = sData.today_daily_count || 0;
        const matchOrders = settlementOrders > 0 && dailyCount === settlementOrders;
        const newAfterSettlement = activeOrders - settlementOrders;
        healthChecks.push({
          label: "每日结算",
          status: settled ? (matchOrders ? "ok" : "warn") : "error",
          detail: settled
            ? `已结算 ${dailyCount}/${settlementOrders} 笔 · ${sData.today_daily_sum} U` + (newAfterSettlement > 0 ? ` · ${newAfterSettlement} 笔今日新增 待明日` : "")
            : `未结算 (活跃订单 ${activeOrders})`,
        });
      }
    } catch {
      healthChecks.push({ label: "每日结算", status: "error", detail: "检查失败" });
    }

    // 7. Cron jobs check + execution history
    try {
      setCronJobs([
        { name: "process_daily()", schedule: "0 16 * * * (每天 UTC 16:00 / 北京 00:00)" },
        { name: "process_daily_share_growth()", schedule: "5 0 * * * (每天 UTC 00:05 / 北京 08:05)" },
      ]);
      const { data: cronData } = await supabase.rpc("admin_cron_history");
      if (cronData) {
        setCronHistory(cronData);
        const failedCount = (cronData as any[]).filter((c: any) => c.status !== "succeeded").length;
        healthChecks.push({
          label: "定时任务",
          status: failedCount > 0 ? "warn" : "ok",
          detail: failedCount > 0 ? `${failedCount} 次失败` : `最近 ${(cronData as any[]).length} 次全部成功`,
        });
      } else {
        healthChecks.push({ label: "定时任务", status: "ok", detail: "2 个定时任务" });
      }
    } catch {
      healthChecks.push({ label: "定时任务配置", status: "warn", detail: "无法验证" });
    }

    setChecks(healthChecks);
    setLoading(false);
  };

  const fixIssue = async (key: string) => {
    setFixing(key);
    try {
      const { data, error } = await supabase.rpc("admin_data_integrity_fix", { p_key: key });
      if (error) {
        alert("修复失败: " + error.message);
      } else {
        alert(data);
        runHealthCheck();
      }
    } catch (e: any) {
      alert("修复失败: " + e.message);
    }
    setFixing(null);
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "ok") return <CheckCircle2 size={14} style={{ color: "#22c55e" }} />;
    if (status === "error") return <XCircle size={14} style={{ color: "#ef4444" }} />;
    if (status === "warn") return <CheckCircle2 size={14} style={{ color: "#f59e0b" }} />;
    return <Loader2 size={14} className="animate-spin text-muted-foreground" />;
  };

  const cardStyle = {
    background: "linear-gradient(145deg, #1a1510, #110e0a)",
    border: "1px solid rgba(201,162,39,0.12)",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
          <h2 className="font-bold text-lg text-foreground">系统环境</h2>
        </div>
        <button
          onClick={runHealthCheck}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: "linear-gradient(135deg, #C9A227, #9A7A1A)",
            color: "#0c0a08",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {loading ? "检测中..." : "重新检查"}
        </button>
      </div>

      {/* Health Check Summary */}
      <div className="rounded-xl p-4 space-y-2" style={cardStyle}>
        <div className="flex items-center gap-2 mb-3">
          <Cpu size={16} style={{ color: "#C9A227" }} />
          <span className="text-sm font-semibold">健康检查</span>
          {!loading && (
            <span className="text-[10px] px-2 py-0.5 rounded ml-auto" style={{
              background: checks.every(c => c.status === "ok") ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
              color: checks.every(c => c.status === "ok") ? "#22c55e" : "#f59e0b",
            }}>
              {checks.filter(c => c.status === "ok").length}/{checks.length} 通过
            </span>
          )}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-sm">
            <Loader2 size={16} className="animate-spin" /> 检测中...
          </div>
        ) : (
          <div className="space-y-1.5">
            {checks.map((c, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 text-xs" style={{ borderBottom: "1px solid rgba(201,162,39,0.06)" }}>
                <div className="flex items-center gap-2">
                  <StatusIcon status={c.status} />
                  <span className="text-foreground">{c.label}</span>
                </div>
                <span className="text-muted-foreground">{c.detail || ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Database Stats */}
      <div className="rounded-xl p-4 space-y-2" style={cardStyle}>
        <div className="flex items-center gap-2 mb-3">
          <Database size={16} style={{ color: "#C9A227" }} />
          <span className="text-sm font-semibold">数据库统计</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {dbStats.map((s, i) => (
            <div key={i} className="rounded-lg p-3 text-center" style={{ background: "rgba(201,162,39,0.04)" }}>
              <div className="text-lg font-bold" style={{ color: "#C9A227" }}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Contract Status */}
      <div className="rounded-xl p-4 space-y-2" style={cardStyle}>
        <div className="flex items-center gap-2 mb-3">
          <Link2 size={16} style={{ color: "#C9A227" }} />
          <span className="text-sm font-semibold">链上合约状态</span>
        </div>
        <div className="space-y-1.5">
          {contractStats.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 text-xs" style={{ borderBottom: "1px solid rgba(201,162,39,0.06)" }}>
              <span className="text-muted-foreground">{s.label}</span>
              <span style={{ color: s.status === "ok" ? "#22c55e" : s.status === "warn" ? "#f59e0b" : "#ef4444" }}>
                {s.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Environment */}
      <div className="rounded-xl p-4 space-y-2" style={cardStyle}>
        <div className="flex items-center gap-2 mb-3">
          <Server size={16} style={{ color: "#C9A227" }} />
          <span className="text-sm font-semibold">环境配置</span>
        </div>
        <div className="space-y-1.5">
          {envInfo.map((e, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 text-xs" style={{ borderBottom: "1px solid rgba(201,162,39,0.06)" }}>
              <span className="text-muted-foreground">{e.label}</span>
              <span className="font-mono text-foreground truncate ml-4 max-w-[200px] sm:max-w-none" title={e.value}>
                {e.value.length > 30 ? `${e.value.slice(0, 6)}...${e.value.slice(-4)}` : e.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Data Integrity - Detailed Reward & Order Verification */}
      <div className="rounded-xl p-4 space-y-2" style={cardStyle}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} style={{ color: "#C9A227" }} />
            <span className="text-sm font-semibold">数据完整性检查</span>
          </div>
          <div className="flex items-center gap-2">
            {integrityIssues.some(i => i.wrong > 0 && i.fixable) && (
              <button
                onClick={() => fixIssue("all")}
                disabled={fixing !== null}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold"
                style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e" }}
              >
                {fixing === "all" ? <Loader2 size={10} className="animate-spin" /> : <Wrench size={10} />}
                一键修复
              </button>
            )}
          </div>
        </div>
        {integrityIssues.length === 0 ? (
          <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-sm">
            <Loader2 size={16} className="animate-spin" /> 检查中...
          </div>
        ) : (
          <div className="space-y-2">
            {integrityIssues.map((item, i) => {
              const allOk = item.wrong === 0;
              return (
                <div key={i} className="rounded-lg p-2.5" style={{ background: "rgba(201,162,39,0.03)", border: `1px solid ${allOk ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.2)"}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {allOk ? <CheckCircle2 size={12} style={{ color: "#22c55e" }} /> : <XCircle size={12} style={{ color: "#f59e0b" }} />}
                      <span className="text-xs font-semibold text-foreground">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.total > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                          background: allOk ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                          color: allOk ? "#22c55e" : "#f59e0b",
                        }}>
                          {allOk ? `${item.correct}/${item.total} 通过` : `${item.wrong}/${item.total} 异常`}
                        </span>
                      )}
                      {item.total === 0 && (
                        <span className="text-[10px] text-muted-foreground">暂无数据</span>
                      )}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground pl-5">
                    规则: {item.rule}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Daily Settlement Status */}
      {settlement && (
        <div className="rounded-xl p-4 space-y-2" style={cardStyle}>
          <div className="flex items-center gap-2 mb-3">
            <CalendarCheck size={16} style={{ color: "#C9A227" }} />
            <span className="text-sm font-semibold">每日结算状态</span>
            <span className="text-[10px] px-2 py-0.5 rounded ml-auto" style={{
              background: settlement.today_settled ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              color: settlement.today_settled ? "#22c55e" : "#ef4444",
            }}>
              {settlement.today_settled ? "今日已结算" : "今日未结算"}
            </span>
          </div>

          {/* Today summary */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="rounded-lg p-2.5 text-center" style={{ background: "rgba(201,162,39,0.04)" }}>
              <div className="text-base font-bold" style={{ color: "#C9A227" }}>{settlement.active_orders}</div>
              <div className="text-[10px] text-muted-foreground">活跃订单{(settlement.active_orders - (settlement.active_orders_at_settlement || settlement.active_orders)) > 0 ? ` · ${settlement.active_orders - settlement.active_orders_at_settlement} 待明日` : ""}</div>
            </div>
            <div className="rounded-lg p-2.5 text-center" style={{ background: "rgba(201,162,39,0.04)" }}>
              <div className="text-base font-bold" style={{ color: settlement.today_daily_count === (settlement.active_orders_at_settlement || settlement.active_orders) ? "#22c55e" : "#f59e0b" }}>
                {settlement.today_daily_count}/{settlement.active_orders_at_settlement || settlement.active_orders}
              </div>
              <div className="text-[10px] text-muted-foreground">今日每日收益</div>
            </div>
            <div className="rounded-lg p-2.5 text-center" style={{ background: "rgba(201,162,39,0.04)" }}>
              <div className="text-base font-bold" style={{ color: "#C9A227" }}>{settlement.today_daily_sum}</div>
              <div className="text-[10px] text-muted-foreground">收益(U)</div>
            </div>
          </div>

          {/* Today reward breakdown */}
          <div className="space-y-1 mb-3">
            {[
              { label: "直推奖励", count: settlement.today_direct_count },
              { label: "间推奖励", count: settlement.today_indirect_count },
              { label: "团队奖", count: settlement.today_team_count, extra: settlement.today_team_sum ? ` | ${settlement.today_team_sum} U` : "" },
              { label: "同级奖", count: settlement.today_equal_count },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between py-1 text-xs" style={{ borderBottom: "1px solid rgba(201,162,39,0.06)" }}>
                <span className="text-muted-foreground">{r.label}</span>
                <span className="text-foreground">{r.count} 笔{r.extra || ""}</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-1 text-xs">
              <span className="text-muted-foreground">上次结算时间</span>
              <span className="text-foreground font-mono">
                {settlement.last_settlement
                  ? new Date(settlement.last_settlement).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })
                  : "无"}
              </span>
            </div>
          </div>

          {/* 7-day history */}
          {settlement.daily_history && settlement.daily_history.length > 0 && (
            <>
              <div className="text-xs font-semibold text-muted-foreground mb-2">近 7 天结算记录</div>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(201,162,39,0.1)" }}>
                      <th className="text-left py-1.5 text-muted-foreground font-normal">日期</th>
                      <th className="text-right py-1.5 text-muted-foreground font-normal">每日</th>
                      <th className="text-right py-1.5 text-muted-foreground font-normal">直推</th>
                      <th className="text-right py-1.5 text-muted-foreground font-normal">间推</th>
                      <th className="text-right py-1.5 text-muted-foreground font-normal">团队</th>
                      <th className="text-right py-1.5 text-muted-foreground font-normal">同级</th>
                      <th className="text-right py-1.5 text-muted-foreground font-normal">总额(U)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlement.daily_history.map((d: any, i: number) => (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(201,162,39,0.06)" }}>
                        <td className="py-1.5 text-foreground">{d.cn_date}</td>
                        <td className="py-1.5 text-right text-foreground">{d.daily_count}</td>
                        <td className="py-1.5 text-right text-foreground">{d.direct_count}</td>
                        <td className="py-1.5 text-right text-foreground">{d.indirect_count}</td>
                        <td className="py-1.5 text-right text-foreground">{d.team_count}</td>
                        <td className="py-1.5 text-right text-foreground">{d.equal_count}</td>
                        <td className="py-1.5 text-right font-semibold" style={{ color: "#C9A227" }}>{d.total_sum}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Cron Jobs */}
      <div className="rounded-xl p-4 space-y-2" style={cardStyle}>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} style={{ color: "#C9A227" }} />
          <span className="text-sm font-semibold">定时任务</span>
        </div>
        <div className="space-y-1.5 mb-3">
          {cronJobs.map((j, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 text-xs" style={{ borderBottom: "1px solid rgba(201,162,39,0.06)" }}>
              <span className="font-mono text-foreground">{j.name}</span>
              <span className="text-muted-foreground">{j.schedule}</span>
            </div>
          ))}
        </div>

        {/* Cron execution log */}
        {cronHistory.length > 0 && (
          <>
            <div className="text-xs font-semibold text-muted-foreground mb-2">执行记录</div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(201,162,39,0.1)" }}>
                    <th className="text-left py-1.5 text-muted-foreground font-normal">时间 (北京)</th>
                    <th className="text-left py-1.5 text-muted-foreground font-normal">任务</th>
                    <th className="text-center py-1.5 text-muted-foreground font-normal">状态</th>
                    <th className="text-right py-1.5 text-muted-foreground font-normal">耗时</th>
                  </tr>
                </thead>
                <tbody>
                  {cronHistory.map((h: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(201,162,39,0.06)" }}>
                      <td className="py-1.5 text-foreground font-mono">{h.start_time_cn}</td>
                      <td className="py-1.5 text-foreground">{h.jobname}</td>
                      <td className="py-1.5 text-center">
                        <span className="px-1.5 py-0.5 rounded" style={{
                          background: h.status === "succeeded" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                          color: h.status === "succeeded" ? "#22c55e" : "#ef4444",
                        }}>
                          {h.status === "succeeded" ? "成功" : "失败"}
                        </span>
                      </td>
                      <td className="py-1.5 text-right text-muted-foreground">{h.duration_ms}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
