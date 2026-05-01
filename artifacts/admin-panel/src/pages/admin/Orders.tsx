import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminOrders, getProducts, getOrderShareStats, DBProduct, exportOrdersCSV, adminBackfillByTx } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Eye, Search, Filter, Calendar, BarChart3, Download, Plus } from "lucide-react";
import { CopyableAddress } from "@/components/CopyableAddress";
import { useToast } from "@/hooks/use-toast";

const STATUS_TABS = [
  { value: "all", label: "全部" },
  { value: "active", label: "进行中" },
  { value: "matured", label: "已到期" },
  { value: "redeemed", label: "已赎回" },
  { value: "reinvested", label: "已复投" },
  { value: "completed", label: "已完成" },
];

const STATUS_LABELS: Record<string, string> = {
  active: "进行中",
  matured: "已到期",
  redeemed: "已赎回",
  reinvested: "已复投",
  completed: "已完成",
  cancelled: "已取消",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  matured: "#E8C547",
  redeemed: "#3b82f6",
  reinvested: "#a855f7",
  completed: "#888",
  cancelled: "#ef4444",
};

const STATUS_BG: Record<string, string> = {
  active: "rgba(34,197,94,0.1)",
  matured: "rgba(232,197,71,0.1)",
  redeemed: "rgba(59,130,246,0.1)",
  reinvested: "rgba(168,85,247,0.1)",
  completed: "rgba(255,255,255,0.05)",
  cancelled: "rgba(239,68,68,0.1)",
};

function OrderCard({ o, onView }: { o: any; onView: () => void }) {
  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">#{o.id}</span>
          <span className="text-xs font-semibold">{o.productName}</span>
        </div>
        <div className="flex items-center gap-2">
          {o.reinvested_from_order_id ? (
            <span className="text-[10px] px-1 py-0.5 rounded"
              style={{ background: "rgba(168,85,247,0.1)", color: "#a855f7" }}>
              复投
            </span>
          ) : o.payment_method === "balance" ? (
            <span className="text-[10px] px-1 py-0.5 rounded"
              style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>
              余额
            </span>
          ) : (
            <span className="text-[10px] px-1 py-0.5 rounded"
              style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
              USDT
            </span>
          )}
          <span className="text-xs px-1.5 py-0.5 rounded"
            style={{
              background: STATUS_BG[o.status] || "rgba(255,255,255,0.05)",
              color: STATUS_COLORS[o.status] || "#888"
            }}>
            {STATUS_LABELS[o.status] || o.status}
          </span>
          <button onClick={onView} className="p-2 rounded-lg" style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227", minWidth: "36px", minHeight: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Eye size={16} />
          </button>
        </div>
      </div>
      <CopyableAddress address={o.walletAddress} className="text-muted-foreground" />
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">金额</div>
          <div className="text-xs font-bold">{parseFloat(o.amount).toFixed(0)}U</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">日利率</div>
          <div className="text-xs font-semibold">{o.dailyRate}%</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">进度</div>
          <div className="text-xs font-semibold">{o.elapsedDays}/{o.days}天</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">已赚</div>
          <div className="text-xs font-bold" style={{ color: "#C9A227" }}>{parseFloat(o.totalEarned).toFixed(6)}U</div>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t" style={{ borderColor: "rgba(201,162,39,0.08)" }}>
        <span>{new Date(o.startDate).toLocaleDateString()} ~ {new Date(o.endDate).toLocaleDateString()}</span>
        {o.txHash && <span className="font-mono">{o.txHash.slice(0, 10)}...</span>}
      </div>
    </div>
  );
}

const SOURCE_TABS = [
  { value: "all", label: "全部来源" },
  { value: "on_chain", label: "真实USDT入金" },
  { value: "balance", label: "余额投资" },
  { value: "reinvest", label: "复投" },
];

export default function AdminOrders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState<"all" | "on_chain" | "balance" | "reinvest">("all");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [showStats, setShowStats] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [backfillTx, setBackfillTx] = useState("");
  const [backfilling, setBackfilling] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleBackfill = async () => {
    const tx = backfillTx.trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(tx)) {
      toast({ title: "无效的 txHash", description: "需要 0x 开头的 66 位十六进制", variant: "destructive" });
      return;
    }
    setBackfilling(true);
    try {
      const result = await adminBackfillByTx(tx);
      if (result.inserted > 0) {
        toast({ title: "补单成功", description: `已新建 ${result.inserted} 条订单` });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      } else if (result.skipped > 0) {
        toast({ title: "已存在", description: "该 tx 对应的订单已经在系统里", variant: "destructive" });
      } else if (result.errored > 0) {
        toast({ title: "补单失败", description: result.errors[0]?.error || "未知错误", variant: "destructive" });
      }
      if (result.inserted > 0) {
        setBackfillOpen(false);
        setBackfillTx("");
      }
    } catch (e: any) {
      toast({ title: "补单失败", description: e?.message || "", variant: "destructive" });
    } finally {
      setBackfilling(false);
    }
  };

  const { data: dbProducts = [] } = useQuery({
    queryKey: ["/api/products"],
    queryFn: getProducts,
  });

  const { data: shareStats } = useQuery({
    queryKey: ["/api/admin/order-share-stats"],
    queryFn: getOrderShareStats,
  });

  // Filter states
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedDateFrom, setAppliedDateFrom] = useState("");
  const [appliedDateTo, setAppliedDateTo] = useState("");
  const [appliedProductFilter, setAppliedProductFilter] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/orders", `?page=${page}&limit=20&status=${status}&source=${source}&search=${search}&product=${appliedProductFilter}&from=${appliedDateFrom}&to=${appliedDateTo}`],
    queryFn: () => getAdminOrders(page, 20, status, {
      search,
      productId: appliedProductFilter,
      dateFrom: appliedDateFrom || undefined,
      dateTo: appliedDateTo || undefined,
      source: source === "all" ? null : source,
    }),
  });

  const d = data as any;
  const totalPages = d ? Math.ceil(d.total / d.limit) : 1;

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleApplyFilters = () => {
    setAppliedProductFilter(productFilter);
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
    setPage(1);
  };

  const handleClearFilters = () => {
    setProductFilter(null);
    setDateFrom("");
    setDateTo("");
    setAppliedProductFilter(null);
    setAppliedDateFrom("");
    setAppliedDateTo("");
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const hasActiveFilters = search || appliedProductFilter || appliedDateFrom || appliedDateTo;

  // Find the selected order from current page data for detail view
  const detailOrder = detailId && d?.orders ? (d.orders as any[]).find((o: any) => o.id === detailId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
          <h2 className="font-bold text-lg text-foreground">订单管理</h2>
          <span className="text-xs text-muted-foreground ml-2">共 {d?.total || 0} 条</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline"
            style={{ border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227", minHeight: "36px" }}
            onClick={() => setBackfillOpen(true)}>
            <Plus size={14} className="mr-1" /> 按txHash补单
          </Button>
          <Button size="sm" variant="outline" disabled={exporting}
            style={{ border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227", minHeight: "36px" }}
            onClick={async () => { setExporting(true); try { await exportOrdersCSV(status, { search, productId: appliedProductFilter, dateFrom: appliedDateFrom, dateTo: appliedDateTo }); } finally { setExporting(false); } }}>
            <Download size={14} className="mr-1" /> {exporting ? "导出中..." : "导出CSV"}
          </Button>
          <button
            onClick={() => setShowStats(!showStats)}
            className="p-2 rounded-lg"
            style={{ background: showStats ? "rgba(201,162,39,0.15)" : "rgba(255,255,255,0.04)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.2)" }}
          >
            <BarChart3 size={14} />
          </button>
        </div>
      </div>

      {/* Product share statistics */}
      {showStats && shareStats && dbProducts.length > 0 && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={13} style={{ color: "#C9A227" }} />
            <span className="text-xs font-bold text-foreground">配套份数统计</span>
            <span className="text-[9px] text-muted-foreground">（按最低金额为1份计算）</span>
          </div>
          <div className="space-y-2">
            {dbProducts.map((p: DBProduct) => {
              const stats = (shareStats as any[]).find(s => s.productId === p.id);
              if (!stats) return (
                <div key={p.id} className="rounded-lg px-3 py-2.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground">暂无订单</span>
                  </div>
                </div>
              );
              const minAmt = p.minAmount || 1;
              const totalShares = Math.floor(stats.totalAmount / minAmt);
              const activeShares = Math.floor(stats.activeAmount / minAmt);
              return (
                <div key={p.id} className="rounded-lg px-3 py-2.5" style={{ background: "rgba(201,162,39,0.04)", border: "1px solid rgba(201,162,39,0.1)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{p.name}</span>
                      <span className="text-[10px] text-muted-foreground">{minAmt}U/份</span>
                    </div>
                    <span className="font-black text-sm" style={{ color: "#C9A227" }}>{totalShares} 份</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[10px]">
                    <div>
                      <span className="text-muted-foreground">总订单</span>
                      <div className="font-semibold text-foreground">{stats.orderCount} 笔</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">总金额</span>
                      <div className="font-semibold" style={{ color: "#C9A227" }}>{stats.totalAmount.toLocaleString()}U</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">活跃份数</span>
                      <div className="font-semibold" style={{ color: "#22c55e" }}>{activeShares} 份</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">活跃金额</span>
                      <div className="font-semibold" style={{ color: "#22c55e" }}>{stats.activeAmount.toLocaleString()}U</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Total summary */}
          {(() => {
            const allStats = shareStats as any[];
            const totalOrders = allStats.reduce((s, x) => s + x.orderCount, 0);
            const totalAmount = allStats.reduce((s, x) => s + x.totalAmount, 0);
            const totalShares = allStats.reduce((s, x) => {
              const product = dbProducts.find((p: DBProduct) => p.id === x.productId);
              return s + Math.floor(x.totalAmount / (product?.minAmount || 1));
            }, 0);
            const activeAmount = allStats.reduce((s, x) => s + x.activeAmount, 0);
            return (
              <div className="rounded-lg px-3 py-2.5 mt-1" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: "#ef4444" }}>合计</span>
                  <span className="font-black text-sm" style={{ color: "#ef4444" }}>{totalShares} 份</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] mt-1">
                  <div>
                    <span className="text-muted-foreground">总订单</span>
                    <div className="font-semibold text-foreground">{totalOrders} 笔</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">总金额</span>
                    <div className="font-semibold" style={{ color: "#C9A227" }}>{totalAmount.toLocaleString()}U</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">活跃金额</span>
                    <div className="font-semibold" style={{ color: "#22c55e" }}>{activeAmount.toLocaleString()}U</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="搜索钱包地址..."
            className="pl-9 text-sm"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)", minHeight: "40px" }}
          />
        </div>
        <Button onClick={handleSearch} className="text-sm" style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08", minHeight: "40px" }}>
          搜索
        </Button>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="p-2.5 rounded-lg shrink-0 relative"
          style={{ background: hasActiveFilters ? "rgba(201,162,39,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${hasActiveFilters ? "rgba(201,162,39,0.4)" : "rgba(201,162,39,0.2)"}`, color: "#C9A227", minWidth: "40px", minHeight: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Filter size={16} />
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{ background: "#C9A227" }} />
          )}
        </button>
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <div className="p-3 rounded-lg space-y-3" style={{ background: "rgba(201,162,39,0.04)", border: "1px solid rgba(201,162,39,0.15)" }}>
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "#C9A227" }}>
            <Filter size={12} /> 高级筛选
          </div>

          <div>
            <div className="text-[10px] text-muted-foreground mb-1">产品类型</div>
            <select
              value={productFilter === null ? "all" : productFilter.toString()}
              onChange={e => setProductFilter(e.target.value === "all" ? null : parseInt(e.target.value))}
              className="w-full text-xs rounded px-2 py-1.5"
              style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227", minHeight: "36px" }}
            >
              <option value="all">全部产品</option>
              {dbProducts.map((p: DBProduct) => (
                <option key={p.id} value={p.id}>{p.name} ({p.days}天)</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                <Calendar size={10} /> 开始日期
              </div>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full text-xs rounded px-2 py-1.5"
                style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227", minHeight: "36px", colorScheme: "dark" }}
              />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                <Calendar size={10} /> 结束日期
              </div>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full text-xs rounded px-2 py-1.5"
                style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227", minHeight: "36px", colorScheme: "dark" }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 text-xs"
              style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08", minHeight: "34px" }}
              onClick={handleApplyFilters}
            >
              应用筛选
            </Button>
            {hasActiveFilters && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                style={{ border: "1px solid rgba(201,162,39,0.2)", minHeight: "34px" }}
                onClick={handleClearFilters}
              >
                清除
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Active filter tags */}
      {hasActiveFilters && !showFilters && (
        <div className="flex flex-wrap gap-1.5">
          {search && (
            <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.2)" }}>
              地址: {search.slice(0, 10)}...
            </span>
          )}
          {appliedProductFilter && (
            <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.2)" }}>
              {dbProducts.find((p: DBProduct) => p.id === appliedProductFilter)?.name}
            </span>
          )}
          {appliedDateFrom && (
            <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.2)" }}>
              从 {appliedDateFrom}
            </span>
          )}
          {appliedDateTo && (
            <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.2)" }}>
              至 {appliedDateTo}
            </span>
          )}
          <button
            onClick={handleClearFilters}
            className="text-[10px] px-2 py-1 rounded-full"
            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            清除全部
          </button>
        </div>
      )}

      {/* Source tabs (入金来源) */}
      <div className="flex gap-2 flex-wrap">
        {SOURCE_TABS.map(tab => (
          <button
            key={tab.value}
            className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
            style={{
              background: source === tab.value ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.03)",
              color: source === tab.value ? "#22c55e" : "rgba(255,255,255,0.5)",
              border: source === tab.value ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(255,255,255,0.06)",
              minHeight: "32px",
            }}
            onClick={() => { setSource(tab.value as any); setPage(1); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            data-testid={`tab-order-${tab.value}`}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              background: status === tab.value ? "rgba(201,162,39,0.15)" : "rgba(255,255,255,0.03)",
              color: status === tab.value ? "#C9A227" : "rgba(255,255,255,0.5)",
              border: status === tab.value ? "1px solid rgba(201,162,39,0.3)" : "1px solid rgba(255,255,255,0.06)",
              minHeight: "36px",
            }}
            onClick={() => { setStatus(tab.value); setPage(1); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-10">加载中...</div>
      ) : (d?.orders || []).length === 0 ? (
        <div className="text-center text-muted-foreground py-10">暂无订单</div>
      ) : (
        <div className="space-y-2">
          {(d?.orders || []).map((o: any) => (
            <OrderCard key={o.id} o={o} onView={() => setDetailId(o.id)} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">第 {page}/{totalPages} 页</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-xs" style={{ minHeight: "36px" }}>
            <ChevronLeft size={14} /> 上一页
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="text-xs" style={{ minHeight: "36px" }}>
            下一页 <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      <Dialog open={!!detailId} onOpenChange={() => setDetailId(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto mx-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#C9A227" }}>订单详情 #{detailId}</DialogTitle>
          </DialogHeader>
          {detailOrder ? <OrderDetail data={detailOrder} /> : <div className="text-center text-muted-foreground py-4">加载中...</div>}
        </DialogContent>
      </Dialog>

      <Dialog open={backfillOpen} onOpenChange={(o) => { if (!backfilling) setBackfillOpen(o); }}>
        <DialogContent className="max-w-md mx-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#C9A227" }}>按 txHash 补单</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              输入 BSC 上 CoreXInvestment 合约的 InvestmentCreated 事件的 txHash。系统将从链上读取并自动补录订单（去重，金额、产品、钱包均按链上为准）。
            </p>
            <Input
              value={backfillTx}
              onChange={(e) => setBackfillTx(e.target.value)}
              placeholder="0x..."
              disabled={backfilling}
              style={{ fontFamily: "monospace", fontSize: "12px" }}
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" disabled={backfilling}
                onClick={() => { setBackfillOpen(false); setBackfillTx(""); }}>
                取消
              </Button>
              <Button size="sm" disabled={backfilling || !backfillTx.trim()}
                style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
                onClick={handleBackfill}>
                {backfilling ? "补录中..." : "补录"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderDetail({ data }: { data: any }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <InfoItem label="产品" value={data.productName} />
        <InfoItem label="状态" value={STATUS_LABELS[data.status] || data.status} color={STATUS_COLORS[data.status] || "#888"} />
        <InfoItem label="质押金额" value={`${parseFloat(data.amount).toFixed(6)} U`} />
        <InfoItem label="日利率" value={`${data.dailyRate}%`} />
        <InfoItem label="日利息" value={`${parseFloat(data.dailyEarning).toFixed(6)} U`} highlight />
        <InfoItem label="总天数" value={`${data.days} 天`} />
        <InfoItem label="已释放" value={`${data.elapsedDays} 天`} highlight />
        <InfoItem label="剩余" value={`${data.remainingDays} 天`} />
        <InfoItem label="已赚" value={`${parseFloat(data.totalEarned).toFixed(6)} U`} highlight />
        <InfoItem label="开始日期" value={new Date(data.startDate).toLocaleDateString()} />
        <InfoItem label="结束日期" value={new Date(data.endDate).toLocaleDateString()} />
        <InfoItem label="创建时间" value={new Date(data.startDate).toLocaleString()} />
        {data.matured_at && (
          <InfoItem label="到期时间" value={new Date(data.matured_at).toLocaleString()} color="#E8C547" />
        )}
        {data.reinvested_from_order_id && (
          <InfoItem label="复投来源" value={`订单 #${data.reinvested_from_order_id}`} color="#a855f7" />
        )}
        <InfoItem label="支付方式" value={data.payment_method === "balance" ? "余额支付" : "链上支付"} color={data.payment_method === "balance" ? "#22c55e" : undefined} />
      </div>

      {data.txHash && (
        <div className="p-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
          <div className="text-[10px] text-muted-foreground mb-0.5">交易哈希</div>
          <div className="font-mono text-xs break-all">{data.txHash}</div>
        </div>
      )}

      <div className="font-mono text-xs text-muted-foreground break-all p-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
        <span className="text-muted-foreground">钱包: </span>{data.walletAddress}
      </div>
    </div>
  );
}

function InfoItem({ label, value, highlight, color }: { label: string; value: string; highlight?: boolean; color?: string }) {
  return (
    <div className="p-2.5 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
      <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
      <div className="text-xs font-semibold" style={{ color: color || (highlight ? "#C9A227" : undefined) }}>{value}</div>
    </div>
  );
}
