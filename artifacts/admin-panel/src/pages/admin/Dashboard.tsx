import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminDashboard } from "@/lib/api";
import { Users, ShoppingCart, ArrowDownToLine, DollarSign, TrendingUp, Clock, Crown, Activity, CheckCircle2, XCircle, Loader2, RefreshCw, UserPlus, PlusCircle, Wallet, Gift, CreditCard, Recycle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Link } from "wouter";
import {
  COREX_INVESTMENT_ADDRESS,
  getProductCount,
  isAuthorizedCaller,
  getFundingWallet,
  getUSDTBalance,
  formatUSDT,
} from "@/lib/contracts";

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(201,162,39,0.1)" }}>
          <Icon size={16} style={{ color: color || "#C9A227" }} />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="font-black text-xl" style={{ color: color || "#C9A227" }}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function SimpleBarChart({ data, labelKey, valueKey, title }: { data: any[]; labelKey: string; valueKey: string; title: string }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => parseFloat(d[valueKey]) || 0), 1);
  return (
    <div className="rounded-xl p-4" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
      <div className="text-sm font-semibold text-foreground mb-3">{title}</div>
      <div className="flex items-end gap-1 h-32">
        {data.slice(-15).map((d, i) => {
          const val = parseFloat(d[valueKey]) || 0;
          const h = Math.max((val / maxVal) * 100, 3);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t" style={{ height: `${h}%`, background: "linear-gradient(180deg, #C9A227, #9A7A1A)", minHeight: "2px" }} />
              <span className="text-[8px] text-muted-foreground truncate w-full text-center">{d[labelKey]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface QuickCheck {
  label: string;
  status: "ok" | "error" | "warn" | "loading";
  detail?: string;
}

function SystemCheckCard() {
  const [checking, setChecking] = useState(false);
  const [checks, setChecks] = useState<QuickCheck[] | null>(null);

  const runCheck = async () => {
    setChecking(true);
    const results: QuickCheck[] = [];

    // Database
    try {
      const start = Date.now();
      const { error } = await supabase.from("members").select("*", { count: "exact", head: true });
      const ms = Date.now() - start;
      results.push({ label: "数据库连接", status: error ? "error" : "ok", detail: error ? error.message : `${ms}ms` });
    } catch (e: any) {
      results.push({ label: "数据库连接", status: "error", detail: e.message });
    }

    // Investment contract
    try {
      const pCount = await getProductCount().catch(() => -1);
      results.push({ label: "Investment合约", status: pCount >= 0 ? "ok" : "error", detail: pCount >= 0 ? `${pCount} 个产品` : "无法连接" });
    } catch {
      results.push({ label: "Investment合约", status: "error", detail: "无法连接" });
    }

    // Distributor auth
    try {
      const auth = await isAuthorizedCaller(COREX_INVESTMENT_ADDRESS).catch(() => null);
      results.push({ label: "Distributor授权", status: auth === true ? "ok" : "error", detail: auth === true ? "已授权" : "未授权" });
    } catch {
      results.push({ label: "Distributor授权", status: "error", detail: "检查失败" });
    }

    // Withdrawal wallet balance
    try {
      const fw = await getFundingWallet().catch(() => "");
      if (fw && fw !== "0x0000000000000000000000000000000000000000") {
        const bal = await getUSDTBalance(fw).catch(() => BigInt(0));
        results.push({ label: "提现钱包余额", status: bal > BigInt(0) ? "ok" : "warn", detail: `${formatUSDT(bal)} USDT` });
      } else {
        results.push({ label: "提现钱包", status: "error", detail: "未配置" });
      }
    } catch {
      results.push({ label: "提现钱包", status: "error", detail: "检查失败" });
    }

    // Data integrity
    try {
      const { data: issues, error } = await supabase.rpc("admin_data_integrity_check");
      if (!error && issues) {
        const wrongCount = (issues as any[]).reduce((s: number, i: any) => s + (i.wrong || 0), 0);
        results.push({ label: "数据完整性", status: wrongCount === 0 ? "ok" : "warn", detail: wrongCount === 0 ? "全部通过" : `${wrongCount} 条异常` });
      }
    } catch {
      results.push({ label: "数据完整性", status: "error", detail: "检查失败" });
    }

    // Daily settlement check
    try {
      const { data: sData, error: sError } = await supabase.rpc("admin_settlement_check");
      if (!sError && sData) {
        const settled = sData.today_settled;
        const activeOrders = sData.active_orders || 0;
        const dailyCount = sData.today_daily_count || 0;
        const matchOrders = activeOrders > 0 && dailyCount === activeOrders;
        results.push({
          label: "每日结算",
          status: settled ? (matchOrders ? "ok" : "warn") : "error",
          detail: settled
            ? `${dailyCount}/${activeOrders} 笔 | ${sData.today_daily_sum} U`
            : `未结算 (${activeOrders} 活跃订单)`,
        });
      }
    } catch {
      results.push({ label: "每日结算", status: "error", detail: "检查失败" });
    }

    // Env config
    const supabaseOk = !!import.meta.env.VITE_SUPABASE_URL;
    const thirdwebOk = !!import.meta.env.VITE_THIRDWEB_CLIENT_ID;
    results.push({ label: "环境配置", status: supabaseOk && thirdwebOk ? "ok" : "error", detail: !supabaseOk ? "Supabase未配置" : !thirdwebOk ? "Thirdweb未配置" : "正常" });

    setChecks(results);
    setChecking(false);
  };

  const okCount = checks?.filter(c => c.status === "ok").length || 0;
  const totalCount = checks?.length || 0;
  const allOk = checks && checks.every(c => c.status === "ok");

  return (
    <div className="rounded-xl p-4" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={16} style={{ color: "#C9A227" }} />
          <span className="text-sm font-semibold text-foreground">系统环境检查</span>
          {checks && (
            <span className="text-[10px] px-2 py-0.5 rounded" style={{
              background: allOk ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
              color: allOk ? "#22c55e" : "#f59e0b",
            }}>
              {okCount}/{totalCount} 通过
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/system">
            <span className="text-[10px] text-muted-foreground hover:underline cursor-pointer">详情</span>
          </Link>
          <button
            onClick={runCheck}
            disabled={checking}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, #C9A227, #9A7A1A)",
              color: "#0c0a08",
              opacity: checking ? 0.7 : 1,
            }}
          >
            {checking ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {checking ? "检测中..." : "检查"}
          </button>
        </div>
      </div>

      {!checks && !checking && (
        <div className="text-center py-4 text-xs text-muted-foreground">
          点击「检查」按钮运行系统环境检测
        </div>
      )}

      {checking && !checks && (
        <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground text-xs">
          <Loader2 size={14} className="animate-spin" /> 正在检测系统环境...
        </div>
      )}

      {checks && (
        <div className="space-y-1">
          {checks.map((c, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 text-xs" style={{ borderBottom: "1px solid rgba(201,162,39,0.06)" }}>
              <div className="flex items-center gap-2">
                {c.status === "ok" ? <CheckCircle2 size={12} style={{ color: "#22c55e" }} /> :
                 c.status === "error" ? <XCircle size={12} style={{ color: "#ef4444" }} /> :
                 <CheckCircle2 size={12} style={{ color: "#f59e0b" }} />}
                <span className="text-foreground">{c.label}</span>
              </div>
              <span className="text-muted-foreground">{c.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["/api/admin/dashboard"], queryFn: getAdminDashboard });

  if (isLoading) return <div className="text-muted-foreground text-center py-20">加载中...</div>;
  if (!data) return null;
  const d = data as any;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
        <h2 className="font-bold text-lg text-foreground">统计台</h2>
      </div>

      {/* Row 1: Members & Orders */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={UserPlus} label="今日新增会员" value={d.todayNewMembers?.toString() || "0"} />
        <StatCard icon={Users} label="总会员" value={d.memberCount?.toString() || "0"} />
        <StatCard icon={PlusCircle} label="今日新增订单" value={d.todayNewOrders?.toString() || "0"} />
        <StatCard icon={ShoppingCart} label="总订单" value={d.orderCount?.toString() || "0"} sub={`活跃 ${d.activeOrderCount || 0}`} />
      </div>

      {/* Row 2: Staking & Interest */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Wallet} label="今日新增质押(U)" value={parseFloat(d.todayNewStaking || 0).toFixed(2)} />
        <StatCard icon={DollarSign} label="总质押(U)" value={parseFloat(d.totalStaking || 0).toFixed(2)} sub="活跃质押" />
        <StatCard icon={Gift} label="今日利息发放(U)" value={parseFloat(d.todayDailyEarnings || 0).toFixed(2)} color="#22c55e" />
        <StatCard icon={TrendingUp} label="累计利息发放(U)" value={parseFloat(d.totalDailyEarnings || 0).toFixed(2)} color="#22c55e" />
      </div>

      {/* Row 2.5: Deposit breakdown by source — on_chain / balance / reinvest */}
      <div className="rounded-xl p-4" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} style={{ color: "#C9A227" }} />
          <span className="text-sm font-bold text-foreground">入金来源分类</span>
          <span className="text-[10px] text-muted-foreground ml-auto">真实 USDT 入金 / 余额投资 / 复投分开统计</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={TrendingUp}
            label="真实USDT入金(U)"
            value={parseFloat(d.onChainDeposits || 0).toFixed(2)}
            sub={`${d.onChainDepositCount || 0} 笔 | 今日 ${parseFloat(d.todayOnChainDeposits || 0).toFixed(2)}U (${d.todayOnChainDepositCount || 0}笔)`}
            color="#22c55e"
          />
          <StatCard
            icon={CreditCard}
            label="余额投资(U)"
            value={parseFloat(d.balanceDeposits || 0).toFixed(2)}
            sub={`${d.balanceDepositCount || 0} 笔 | 今日 ${parseFloat(d.todayBalanceDeposits || 0).toFixed(2)}U (${d.todayBalanceDepositCount || 0}笔)`}
            color="#3b82f6"
          />
          <StatCard
            icon={Recycle}
            label="复投金额(U)"
            value={parseFloat(d.reinvestDeposits || 0).toFixed(2)}
            sub={`${d.reinvestDepositCount || 0} 笔 | 今日 ${parseFloat(d.todayReinvestDeposits || 0).toFixed(2)}U (${d.todayReinvestDepositCount || 0}笔)`}
            color="#a855f7"
          />
        </div>
        <div className="text-[10px] text-muted-foreground mt-3 pl-1">
          总入金（计入财务）= <span style={{ color: "#22c55e" }}>真实USDT入金 {parseFloat(d.onChainDeposits || 0).toFixed(2)} U</span>
          <span className="mx-1">·</span>
          余额投资与复投不重复计入
        </div>
      </div>

      {/* Row 3: Bonus Rewards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Gift} label="今日推荐奖励(U)" value={parseFloat(d.todayBonusRewards || 0).toFixed(2)} sub="直推+间推+团队+同级" color="#a855f7" />
        <StatCard icon={TrendingUp} label="累计推荐奖励(U)" value={parseFloat(d.totalBonusRewards || 0).toFixed(2)} sub="直推+间推+团队+同级" color="#a855f7" />
        <StatCard icon={DollarSign} label="今日发放总额(U)" value={parseFloat(d.todayTotalRewards || 0).toFixed(2)} sub="利息+推荐奖励" color="#C9A227" />
        <StatCard icon={DollarSign} label="累计发放总额(U)" value={parseFloat(d.totalRewards || 0).toFixed(2)} sub="利息+推荐奖励" color="#C9A227" />
      </div>

      {/* Row 4: Withdrawals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={ArrowDownToLine} label="今日提现(U)" value={parseFloat(d.todayWithdrawn || 0).toFixed(2)} sub={`${d.todayWithdrawalCount || 0} 笔 | 手续费 ${parseFloat(d.todayWithdrawalFees || 0).toFixed(2)}`} color="#ef4444" />
        <StatCard icon={ArrowDownToLine} label="累计提现(U)" value={parseFloat(d.totalWithdrawn || 0).toFixed(2)} sub={`${d.withdrawalCount || 0} 笔 | 手续费 ${parseFloat(d.totalFees || 0).toFixed(2)}`} color="#ef4444" />
        <StatCard icon={Clock} label="待审提现" value={d.pendingWithdrawals?.count?.toString() || "0"} sub={`${parseFloat(d.pendingWithdrawals?.total || 0).toFixed(2)} U`} color="#f59e0b" />
      </div>

      {/* System Environment Check */}
      <SystemCheckCard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SimpleBarChart data={d.dailyMemberCounts || []} labelKey="date" valueKey="count" title="每日注册会员" />
        <SimpleBarChart data={d.dailyOrderAmounts || []} labelKey="date" valueKey="total" title="每日质押金额(U)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl p-4" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
          <div className="text-sm font-semibold text-foreground mb-3">等级分布</div>
          <div className="space-y-2">
            {(d.levelDistribution || []).map((l: any) => {
              const total = d.memberCount || 1;
              const pct = ((l.count / total) * 100).toFixed(1);
              return (
                <div key={l.level} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-12">
                    <Crown size={12} style={{ color: "#C9A227" }} />
                    <span className="text-xs font-semibold" style={{ color: "#C9A227" }}>{l.level === 0 ? "普通" : `V${l.level}`}</span>
                  </div>
                  <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: "rgba(201,162,39,0.08)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #C9A227, #9A7A1A)", minWidth: "8px" }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-16 text-right">{l.count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
          <div className="text-sm font-semibold text-foreground mb-3">最新注册</div>
          <div className="space-y-2">
            {(d.recentMembers || []).map((m: any) => {
              const addr = m.wallet_address || m.walletAddress || "";
              const created = m.created_at || m.createdAt || "";
              return (
                <div key={m.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid rgba(201,162,39,0.06)" }}>
                  <span className="text-xs font-mono text-muted-foreground">{addr.slice(0, 8)}...{addr.slice(-6)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227" }}>
                      {m.level === 0 ? "普通" : `V${m.level}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{new Date(created).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
