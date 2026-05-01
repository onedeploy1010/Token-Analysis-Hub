import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminRewards, getAdminRewardStats, exportRewardsCSV } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Gift, Users, ChevronLeft, ChevronRight, Calendar, TrendingUp, Star, Award, Download } from "lucide-react";
import { CopyableAddress } from "@/components/CopyableAddress";

const TYPE_TABS = [
  { value: "all", label: "全部", color: "#C9A227" },
  { value: "daily", label: "日收益", color: "#22c55e" },
  { value: "direct_referral", label: "直推奖励", color: "#F0D060" },
  { value: "indirect_referral", label: "间推奖励", color: "#D4AF37" },
  { value: "team_bonus", label: "团队分红", color: "#FFD700" },
  { value: "equal_level_bonus", label: "同级奖励", color: "#FF8C00" },
];

function getTypeLabel(type: string, description?: string) {
  if (type === "team_bonus" && description?.startsWith("equal-level")) return "同级奖励";
  const found = TYPE_TABS.find(t => t.value === type);
  return found?.label || type;
}

function getTypeColor(type: string, description?: string) {
  if (type === "team_bonus" && description?.startsWith("equal-level")) return "#FF8C00";
  const found = TYPE_TABS.find(t => t.value === type);
  return found?.color || "#C9A227";
}

export default function AdminRewards() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);
  const limit = 20;

  const { data: statsData } = useQuery({
    queryKey: ["/api/admin/reward-stats"],
    queryFn: getAdminRewardStats,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/rewards", page, type, search, dateFrom, dateTo],
    queryFn: () => getAdminRewards(page, limit, type, { search, dateFrom, dateTo }),
  });

  const rewards = data?.rewards || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const handleSearch = () => { setSearch(searchInput); setPage(1); };
  const handleClear = () => { setSearch(""); setSearchInput(""); setDateFrom(""); setDateTo(""); setPage(1); };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
          <h2 className="font-bold text-lg text-foreground">奖励明细管理</h2>
          <Gift size={16} style={{ color: "#C9A227" }} className="ml-1" />
        </div>
        <Button size="sm" variant="outline" disabled={exporting}
          style={{ border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227", minHeight: "36px" }}
          onClick={async () => { setExporting(true); try { await exportRewardsCSV(type, { search, dateFrom, dateTo }); } finally { setExporting(false); } }}>
          <Download size={14} className="mr-1" /> {exporting ? "导出中..." : "导出CSV"}
        </Button>
      </div>

      {/* Stats cards */}
      {statsData && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { key: "daily", label: "日收益", icon: TrendingUp, color: "#22c55e" },
            { key: "direct_referral", label: "直推奖励", icon: Users, color: "#F0D060" },
            { key: "indirect_referral", label: "间推奖励", icon: Users, color: "#D4AF37" },
            { key: "team_bonus", label: "团队分红", icon: Award, color: "#FFD700" },
            { key: "equal_level_bonus", label: "同级奖励", icon: Star, color: "#FF8C00" },
          ].map(s => {
            const stat = statsData[s.key];
            return (
              <div key={s.key} className="rounded-xl p-3" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <s.icon size={14} style={{ color: s.color }} />
                  <span className="text-[11px] text-muted-foreground">{s.label}</span>
                </div>
                <div className="font-black text-sm" style={{ color: s.color }}>{stat?.total?.toFixed(2) || "0"} U</div>
                <div className="text-[10px] text-muted-foreground">{stat?.count || 0} 条记录</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Type tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {TYPE_TABS.map(tab => (
          <button key={tab.value}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
            style={type === tab.value
              ? { background: `${tab.color}20`, color: tab.color, border: `1px solid ${tab.color}50` }
              : { background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}
            onClick={() => { setType(tab.value); setPage(1); }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Filters */}
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
        <Button onClick={handleSearch} className="text-sm" style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08", minHeight: "40px" }}>搜索</Button>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="text-sm"
          style={{ border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227", minHeight: "40px" }}>
          <Calendar size={14} />
        </Button>
        {(search || dateFrom || dateTo) && (
          <Button variant="outline" onClick={handleClear} className="text-sm"
            style={{ border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227", minHeight: "40px" }}>清除</Button>
        )}
      </div>

      {showFilters && (
        <div className="flex gap-2 items-center flex-wrap rounded-xl p-3"
          style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
          <span className="text-xs text-muted-foreground">日期范围:</span>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="w-40 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)" }} />
          <span className="text-xs text-muted-foreground">至</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="w-40 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)" }} />
        </div>
      )}

      {/* Results info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>共 {total} 条奖励记录</span>
        <span>第 {page}/{totalPages || 1} 页</span>
      </div>

      {/* Rewards list */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-10">加载中...</div>
        ) : rewards.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            <Gift size={32} className="mx-auto mb-2 opacity-30" />
            <div className="text-sm">暂无奖励记录</div>
          </div>
        ) : (
          rewards.map((r: any) => {
            const typeLabel = getTypeLabel(r.type, r.description);
            const typeColor = getTypeColor(r.type, r.description);
            return (
              <div key={r.id} className="rounded-xl p-3 space-y-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">#{r.id}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                      style={{ background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}30` }}>
                      {typeLabel}
                    </span>
                  </div>
                  <span className="font-bold text-sm" style={{ color: "#C9A227" }}>+{parseFloat(r.amount).toFixed(6)} U</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground shrink-0 w-14">获奖人</span>
                    <CopyableAddress address={r.wallet_address} className="text-foreground/80" />
                  </div>
                  {r.from_address && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground shrink-0 w-14">来源</span>
                      <CopyableAddress address={r.from_address} className="text-muted-foreground" />
                    </div>
                  )}
                  {r.description && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground shrink-0 w-14">说明</span>
                      <span className="text-[10px] text-muted-foreground truncate">{r.description}</span>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-muted-foreground pt-1 border-t" style={{ borderColor: "rgba(201,162,39,0.08)" }}>
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            style={{ border: "1px solid rgba(201,162,39,0.2)", color: "#C9A227" }}>
            <ChevronLeft size={14} />
          </Button>
          <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            style={{ border: "1px solid rgba(201,162,39,0.2)", color: "#C9A227" }}>
            <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
