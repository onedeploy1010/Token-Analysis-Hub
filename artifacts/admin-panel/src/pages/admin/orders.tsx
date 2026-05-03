import { useEffect, useMemo, useState } from "react";
import { PageShell } from "./page-shell";
import { MobileDataCard } from "@/components/mobile-card";
import { supabase, adminChainId, fmtUsdt18 } from "@/lib/supabase";
import { AddressButton, TxHashLink } from "@/components/member-detail";
import { TagChipsForAddress } from "@/components/tags/tag-chip";
import { TagFilter, useTagAddressFilter } from "@/components/tags/tag-filter";
import {
  useRowSelection, SelectCell, SelectAllCell,
  SortHeader, type SortState, compareBy,
  DateRangeFilter, EMPTY_RANGE, isInRange, type DateRange,
  BulkToolbar, type CsvColumn,
} from "@/components/list-toolkit";
import { Loader2, Search, ShoppingCart, Coins } from "lucide-react";

/**
 * 订单管理 — 节点订单 (rune_purchases) tab is live with full toolkit
 * (multi-select, sort, tag/date filters, bulk copy/CSV/tag). 质押订单
 * tab waits on rune_stake_orders.
 */

type Tab = "node" | "staking";
const PAGE_SIZE = 30;

const TIERS: Array<{ id: number; name: string; price: number; color: string }> = [
  { id: 101, name: "联创·符主", price: 50_000, color: "#c084fc" },
  { id: 201, name: "超级·符魂", price: 10_000, color: "#fbbf24" },
  { id: 301, name: "高级·符印", price:  5_000, color: "#34d399" },
  { id: 401, name: "中级·符源", price:  2_500, color: "#60a5fa" },
  { id: 501, name: "初级·符胚", price:  1_000, color: "#cbd5e1" },
];

interface Purchase {
  user: string;
  nodeId: number;
  amount: string;
  paidAt: string;
  txHash: string;
  blockNumber: number;
}

type SortKey = "user" | "nodeId" | "amount" | "paidAt";

export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>("node");
  const [rows, setRows] = useState<Purchase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<number[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>(EMPTY_RANGE);
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "paidAt", dir: "desc" });
  const [page, setPage] = useState(0);
  const sel = useRowSelection();

  const tagPredicate = useTagAddressFilter(tagFilter);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error } = await supabase
        .from("rune_purchases")
        .select("user, node_id, amount::text, paid_at, tx_hash, block_number")
        .eq("chain_id", adminChainId)
        .order("block_number", { ascending: false })
        .limit(2000);
      if (!active) return;
      if (error) { setError(error.message); return; }
      setRows((data ?? []).map((r: any) => ({
        user: r.user, nodeId: r.node_id, amount: r.amount, paidAt: r.paid_at,
        txHash: r.tx_hash, blockNumber: r.block_number,
      })));
    })();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    let res = rows.filter((r) => {
      if (tierFilter !== "all" && r.nodeId !== tierFilter) return false;
      if (q && !r.user.toLowerCase().includes(q) && !r.txHash.toLowerCase().includes(q)) return false;
      if (!tagPredicate(r.user)) return false;
      if (!isInRange(r.paidAt, dateRange)) return false;
      return true;
    });
    if (sort.key && sort.dir) {
      const cmp = (() => {
        switch (sort.key) {
          case "user":   return compareBy<Purchase>((r) => r.user.toLowerCase(), sort.dir);
          case "nodeId": return compareBy<Purchase>((r) => r.nodeId, sort.dir);
          case "amount": return compareBy<Purchase>((r) => BigInt(r.amount), sort.dir);
          case "paidAt": return compareBy<Purchase>((r) => r.paidAt, sort.dir);
          default: return () => 0;
        }
      })();
      res = [...res].sort(cmp);
    }
    return res;
  }, [rows, tierFilter, search, tagPredicate, dateRange, sort]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const totalUsdtRaw = filtered.reduce((acc, r) => acc + BigInt(r.amount), 0n);
  const visibleKeys = paged.map((r) => `${r.txHash}-${r.user}`);

  const csvColumns: CsvColumn<Purchase>[] = [
    { header: "address", get: (r) => r.user },
    { header: "node_id", get: (r) => r.nodeId },
    { header: "amount_usdt_18", get: (r) => r.amount },
    { header: "paid_at", get: (r) => r.paidAt },
    { header: "tx_hash", get: (r) => r.txHash },
    { header: "block_number", get: (r) => r.blockNumber },
  ];

  return (
    <PageShell
      title="订单管理"
      subtitle={`Orders · chain ${adminChainId} · ${filtered.length}/${rows?.length ?? "…"} 笔 · ${fmtUsdt18(totalUsdtRaw.toString(), 0)} USDT`}
    >
      {/* Tab strip */}
      <div className="flex gap-1 rounded-lg border border-border/60 bg-card/40 p-1 mb-4 max-w-md">
        {([
          { v: "node",    label: "节点订单", icon: ShoppingCart },
          { v: "staking", label: "质押订单", icon: Coins },
        ] as const).map(({ v, label, icon: Icon }) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-xs font-semibold transition-colors ${
              tab === v ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          {error}
        </div>
      )}

      {tab === "staking" ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/20 px-6 py-10 text-center">
          <Coins className="h-6 w-6 text-amber-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground mb-1">质押订单 · 待对接</p>
          <p className="text-[11px] text-muted-foreground max-w-md mx-auto leading-relaxed">
            质押合约尚未上链。落地后此 Tab 直接读 <code className="text-[10px] bg-black/30 px-1 rounded">rune_stake_orders</code>，按套餐期限 (30/90/180/360/540 天)、状态 (active/expired/withdrawn) 与日化收益筛选。
          </p>
        </div>
      ) : (
        <>
          <BulkToolbar
            selection={sel}
            rows={filtered}
            rowKey={(r) => `${r.txHash}-${r.user}`}
            csvColumns={csvColumns}
            csvFilename="orders-node"
            enableTag={false}
          />

          {/* Filter bar */}
          <div className="rounded-2xl border border-border/60 bg-card/30 p-3 space-y-3 mb-4 surface-3d">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="搜地址 / tx hash"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-card/40 p-0.5 text-xs">
                <button
                  onClick={() => { setTierFilter("all"); setPage(0); }}
                  className={`px-3 py-1.5 rounded-md ${tierFilter === "all" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >全部</button>
                {TIERS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setTierFilter(t.id); setPage(0); }}
                    className={`px-3 py-1.5 rounded-md ${tierFilter === t.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    style={tierFilter === t.id ? { color: t.color } : undefined}
                  >{t.id}</button>
                ))}
              </div>
              <DateRangeFilter value={dateRange} onChange={(r) => { setDateRange(r); setPage(0); }} label="购买日期" />
            </div>
            <TagFilter selected={tagFilter} onChange={(s) => { setTagFilter(s); setPage(0); }} />
          </div>

          {!rows && !error ? (
            <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> 加载中…
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden lg:block overflow-x-auto rounded-2xl border border-border/60 bg-card/40 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.4)]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/40 backdrop-blur text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="text-center px-3 py-3 w-10"><SelectAllCell visibleKeys={visibleKeys} sel={sel} /></th>
                      <th className="text-left px-4 py-3"><SortHeader columnKey="user" current={sort} onChange={setSort}>买家地址 + 标签</SortHeader></th>
                      <th className="text-left px-4 py-3"><SortHeader columnKey="nodeId" current={sort} onChange={setSort}>档位</SortHeader></th>
                      <th className="text-right px-4 py-3"><SortHeader columnKey="amount" current={sort} onChange={setSort} align="right">入金 USDT</SortHeader></th>
                      <th className="text-left px-4 py-3"><SortHeader columnKey="paidAt" current={sort} onChange={setSort}>购买时间</SortHeader></th>
                      <th className="text-left px-4 py-3">tx hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((r) => {
                      const tier = TIERS.find((t) => t.id === r.nodeId);
                      const k = `${r.txHash}-${r.user}`;
                      return (
                        <tr key={k} className={`border-t border-border/40 align-top transition-colors ${
                          sel.isSelected(k) ? "bg-primary/[0.06]" : "hover:bg-muted/20"
                        }`}>
                          <td className="text-center px-3 py-2.5"><SelectCell k={k} sel={sel} /></td>
                          <td className="px-4 py-2.5 space-y-1">
                            <AddressButton addr={r.user} />
                            <TagChipsForAddress address={r.user} compact />
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span
                              className="text-xs px-2 py-0.5 rounded border"
                              style={{
                                background: `${tier?.color ?? "#fbbf24"}15`,
                                color: tier?.color ?? "#fbbf24",
                                borderColor: `${tier?.color ?? "#fbbf24"}30`,
                              }}
                            >{r.nodeId}</span>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{tier?.name ?? ""}</div>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap">{fmtUsdt18(r.amount, 0)}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.paidAt).toLocaleString("sv")}</td>
                          <td className="px-4 py-2.5"><TxHashLink hash={r.txHash} /></td>
                        </tr>
                      );
                    })}
                    {paged.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">无匹配订单</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="lg:hidden space-y-3">
                {paged.map((r) => {
                  const tier = TIERS.find((t) => t.id === r.nodeId);
                  const k = `${r.txHash}-${r.user}`;
                  return (
                    <MobileDataCard
                      key={k}
                      header={
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <SelectCell k={k} sel={sel} />
                              <AddressButton addr={r.user} />
                            </div>
                            <span
                              className="text-xs px-2 py-0.5 rounded border shrink-0"
                              style={{
                                background: `${tier?.color ?? "#fbbf24"}15`,
                                color: tier?.color ?? "#fbbf24",
                                borderColor: `${tier?.color ?? "#fbbf24"}30`,
                              }}
                            >{r.nodeId}</span>
                          </div>
                          <TagChipsForAddress address={r.user} compact />
                        </div>
                      }
                      fields={[
                        { label: "档位", value: tier?.name ?? `#${r.nodeId}` },
                        { label: "USDT", value: fmtUsdt18(r.amount, 0) },
                        { label: "时间", value: new Date(r.paidAt).toLocaleDateString("sv") },
                        { label: "tx", value: <TxHashLink hash={r.txHash} /> },
                      ]}
                    />
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                  <span>第 {page + 1} / {totalPages} 页 · 共 {filtered.length} 条</span>
                  <div className="flex gap-2">
                    <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                      className="px-3 py-1.5 rounded border border-border hover:bg-card disabled:opacity-40 min-h-[36px]">上一页</button>
                    <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                      className="px-3 py-1.5 rounded border border-border hover:bg-card disabled:opacity-40 min-h-[36px]">下一页</button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </PageShell>
  );
}
