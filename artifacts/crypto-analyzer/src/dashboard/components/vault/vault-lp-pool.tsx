import { useState } from "react";
import { Skeleton } from "@dashboard/components/ui/skeleton";
import { Card, CardContent } from "@dashboard/components/ui/card";
import { Layers, Shield, TrendingUp, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@dashboard/lib/utils";
import { usePoolStatsRune } from "@dashboard/lib/data-rune";

type PoolView = "rune" | "reserve";

function fmtUsdt(val: string | number) {
  const n = Number(val);
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

/**
 * Vault page LP card. Aggregates on-chain `rune_purchases` deposits and
 * shows the 35% RUNE LP / 20% Reserve breakdown using mainnet's amber/card
 * design tokens. The 45% managed pool deliberately lives on the strategy
 * page (TradingVaultBanner), not here.
 */
export function VaultLpPool() {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh" || i18n.language === "zh-TW";
  const [view, setView] = useState<PoolView>("rune");
  const { data, isLoading } = usePoolStatsRune();

  const isLive = false; // Pre-launch — RUNE token not yet listed.
  const founderTier = data?.tiers?.FOUNDER;
  const superTier = data?.tiers?.SUPER;

  const POOL_TABS = [
    { key: "rune" as const,    icon: TrendingUp, label: "RUNE LP",                                         pct: "35%" },
    { key: "reserve" as const, icon: Shield,     label: isZh ? "储备金库" : "Reserve",                     pct: "20%" },
  ];

  return (
    <Card className="relative mx-4 lg:mx-6 surface-3d overflow-hidden border-border/55 bg-card/60">
      {/* Soft amber glow */}
      <div className="pointer-events-none absolute -top-16 -right-12 h-40 w-40 rounded-full bg-amber-500/15 blur-3xl" />
      <CardContent className="relative px-4 py-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-primary/15 ring-1 ring-primary/30">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-bold leading-tight text-foreground">
                {isZh ? "底池沉淀" : "LP Pool Accumulation"}
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight">
                {isZh ? "节点入金 · 链上底池" : "Node Deposits · On-chain Liquidity"}
              </div>
            </div>
          </div>
          <span
            className={cn(
              "text-[9px] uppercase tracking-[0.2em] font-semibold px-2 py-0.5 rounded-full ring-1",
              isLive
                ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30"
                : "bg-primary/10 text-primary ring-primary/25",
            )}
          >
            {isLive ? (isZh ? "实时LP" : "Live LP") : (isZh ? "节点沉淀" : "Pre-launch")}
          </span>
        </div>

        {/* 3-pool ratio strip */}
        <div className="rounded-lg overflow-hidden border border-border/40">
          <div className="flex h-2">
            <div className="h-full" style={{ width: "35%", background: "hsl(38 95% 55% / 0.75)" }} />
            <div className="h-full" style={{ width: "45%", background: "hsl(217 76% 58% / 0.75)" }} />
            <div className="h-full" style={{ width: "20%", background: "hsl(173 58% 50% / 0.75)" }} />
          </div>
          <div className="flex text-[9px] font-semibold bg-card/60">
            <div className="flex-none w-[35%] text-center py-1 text-primary">RUNE LP 35%</div>
            <div className="flex-none w-[45%] text-center py-1 text-blue-400">{isZh ? "管理 45%" : "Managed 45%"}</div>
            <div className="flex-none w-[20%] text-center py-1 text-teal-400">{isZh ? "储备 20%" : "Reserve 20%"}</div>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex gap-1.5">
          {POOL_TABS.map((tab) => {
            const isActive = view === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setView(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                  isActive
                    ? tab.key === "rune"
                      ? "bg-primary/15 ring-1 ring-primary/35 text-primary"
                      : "bg-teal-500/15 ring-1 ring-teal-500/35 text-teal-400"
                    : "bg-muted/30 ring-1 ring-border/40 text-muted-foreground hover:text-foreground",
                )}
                data-testid={`button-vault-pool-${tab.key}`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
                <span className="ml-0.5 opacity-70">{tab.pct}</span>
              </button>
            );
          })}
        </div>

        {/* Pool stats */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        ) : view === "rune" ? (
          <div className="space-y-2">
            {/* RUNE LP balance */}
            <div className="rounded-xl px-4 py-3 bg-primary/[0.06] ring-1 ring-primary/20">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                    {isZh ? "RUNE LP 池 (35%)" : "RUNE LP Pool (35%)"}
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-primary">
                    {fmtUsdt(data?.runeLp ?? 0)}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {isZh ? "节点总入金 " : "of "}
                    {fmtUsdt(data?.totalDepositUsdt ?? 0)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground">{isZh ? "注册会员" : "Members"}</div>
                  <div className="text-base font-bold text-primary tabular-nums">{data?.totalMembers ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {data?.totalNodes ?? 0} {isZh ? "节点" : "nodes"}
                  </div>
                </div>
              </div>
            </div>
            {/* Top tier breakdown */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl px-3 py-2.5 bg-purple-500/[0.07] ring-1 ring-purple-500/25">
                <div className="text-[9px] uppercase tracking-wider mb-1 text-purple-300/80">
                  FOUNDER · $50,000
                </div>
                <div className="text-base font-bold text-purple-200 tabular-nums">
                  {founderTier?.count ?? 0}
                  <span className="text-[10px] font-normal ml-1 text-purple-300/60">{isZh ? "个" : "nodes"}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">{fmtUsdt(founderTier?.totalUsdt ?? 0)}</div>
              </div>
              <div className="rounded-xl px-3 py-2.5 bg-primary/[0.06] ring-1 ring-primary/25">
                <div className="text-[9px] uppercase tracking-wider mb-1 text-primary/80">
                  SUPER · $10,000
                </div>
                <div className="text-base font-bold text-primary tabular-nums">
                  {superTier?.count ?? 0}
                  <span className="text-[10px] font-normal ml-1 text-primary/60">{isZh ? "个" : "nodes"}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">{fmtUsdt(superTier?.totalUsdt ?? 0)}</div>
              </div>
            </div>
            {/* Pre-launch info strip */}
            {!isLive && (
              <div className="flex items-center justify-between rounded-lg px-3 py-1.5 bg-primary/[0.05] ring-1 ring-primary/15">
                <div className="text-[10px] text-primary/80">
                  {isZh ? "上线价 $0.028 / RUNE · 280万USDT : 1亿RUNE" : "Launch $0.028/RUNE · 2.8M USDT : 100M RUNE"}
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                  {isZh ? "未上线" : "Pre-launch"}
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Reserve view */
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl px-3 py-3 bg-teal-500/[0.07] ring-1 ring-teal-500/25">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                {isZh ? "储备余额" : "Reserve Balance"}
              </div>
              <div className="text-2xl font-bold tabular-nums text-teal-400">{fmtUsdt(data?.reserve ?? 0)}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {isZh ? "总入金 20%" : "20% of deposits"}
              </div>
            </div>
            <div className="rounded-xl px-3 py-3 bg-muted/30 ring-1 ring-border/40">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                {isZh ? "用途" : "Purpose"}
              </div>
              <div className="text-[12px] font-semibold mt-1 leading-snug text-teal-400">
                {isZh ? "战略储备" : "Strategic Reserve"}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 leading-snug">
                {isZh ? "风控 · 回购 · 生态扩张" : "Risk · Buyback · Ecosystem"}
              </div>
            </div>
          </div>
        )}

        {/* Footer note */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <RefreshCw className="h-3 w-3" />
          <span>
            {isLive
              ? (isZh ? "数据来自链上 LP 合约" : "Data sourced from on-chain LP contract")
              : (isZh ? "上线后自动切换为链上LP实时数据" : "Will auto-switch to live on-chain LP data after launch")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
