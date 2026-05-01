import { useState } from "react";
import { Skeleton } from "@dashboard/components/ui/skeleton";
import { Card, CardContent } from "@dashboard/components/ui/card";
import { Layers, Shield, TrendingUp, RefreshCw, Wallet } from "lucide-react";
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
 * Vault page LP card. Shows aggregate node-deposit totals split into the
 * 35% RUNE LP and 20% Reserve allocations. Per-tier breakdown lives on the
 * nodes page — vault is just the protocol-pool view.
 */
export function VaultLpPool() {
  const { t } = useTranslation();
  const [view, setView] = useState<PoolView>("rune");
  const { data, isLoading } = usePoolStatsRune();

  const isLive = false; // Pre-launch — RUNE token not yet listed.
  const totalUsdt = data?.totalDepositUsdt ?? 0;
  const totalMembers = data?.totalMembers ?? 0;
  const totalNodes = data?.totalNodes ?? 0;

  const POOL_TABS = [
    { key: "rune" as const,    icon: TrendingUp, label: "RUNE LP",                    pct: "35%" },
    { key: "reserve" as const, icon: Shield,     label: t("vault.lpPool.tabReserve"), pct: "20%" },
  ];

  return (
    <Card className="relative mx-4 lg:mx-6 overflow-hidden border-border/60 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]">
      {/* Layered ambient glows for depth */}
      <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-amber-500/[0.18] blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-amber-600/[0.08] blur-[70px]" />

      {/* Top accent line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <CardContent className="relative px-5 py-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/25 to-primary/10 ring-1 ring-primary/40 shadow-[0_4px_12px_-4px_hsl(38_95%_55%/0.4)]">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-bold leading-tight text-foreground tracking-tight">
                {t("vault.lpPool.title")}
              </div>
              <div className="text-[11px] text-muted-foreground/80 leading-tight mt-0.5">
                {t("vault.lpPool.subtitle")}
              </div>
            </div>
          </div>
          <span
            className={cn(
              "text-[10px] uppercase tracking-[0.18em] font-bold px-2.5 py-1 rounded-full ring-1",
              isLive
                ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40"
                : "bg-primary/10 text-primary ring-primary/30",
            )}
          >
            {isLive ? t("vault.lpPool.live") : t("vault.lpPool.preLaunch")}
          </span>
        </div>

        {/* 3-pool ratio strip */}
        <div className="rounded-xl overflow-hidden ring-1 ring-border/60 shadow-inner">
          <div className="flex h-2.5">
            <div className="h-full" style={{ width: "35%", background: "linear-gradient(90deg, hsl(38 95% 55%), hsl(38 95% 65%))" }} />
            <div className="h-full" style={{ width: "45%", background: "linear-gradient(90deg, hsl(217 76% 58%), hsl(217 76% 68%))" }} />
            <div className="h-full" style={{ width: "20%", background: "linear-gradient(90deg, hsl(173 58% 50%), hsl(173 58% 60%))" }} />
          </div>
          <div className="flex text-[10px] font-bold bg-card/80 backdrop-blur-sm">
            <div className="flex-none w-[35%] text-center py-1.5 text-primary">{t("vault.lpPool.ratioRune")}</div>
            <div className="flex-none w-[45%] text-center py-1.5 text-blue-400">{t("vault.lpPool.ratioManaged")}</div>
            <div className="flex-none w-[20%] text-center py-1.5 text-teal-400">{t("vault.lpPool.ratioReserve")}</div>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex gap-2">
          {POOL_TABS.map((tab) => {
            const isActive = view === tab.key;
            const activeColor = tab.key === "rune" ? "primary" : "teal";
            return (
              <button
                key={tab.key}
                onClick={() => setView(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold transition-all",
                  isActive
                    ? activeColor === "primary"
                      ? "bg-gradient-to-br from-primary/20 to-primary/10 ring-1 ring-primary/45 text-primary shadow-[0_2px_10px_-2px_hsl(38_95%_55%/0.35)]"
                      : "bg-gradient-to-br from-teal-500/20 to-teal-500/10 ring-1 ring-teal-500/45 text-teal-300 shadow-[0_2px_10px_-2px_hsl(173_58%_50%/0.3)]"
                    : "bg-muted/20 ring-1 ring-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )}
                data-testid={`button-vault-pool-${tab.key}`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
                <span className="ml-0.5 opacity-75">{tab.pct}</span>
              </button>
            );
          })}
        </div>

        {/* Pool stats */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
        ) : view === "rune" ? (
          <div className="space-y-3">
            {/* RUNE LP balance — hero card */}
            <div className="relative rounded-2xl px-5 py-4 bg-gradient-to-br from-primary/[0.12] via-primary/[0.06] to-transparent ring-1 ring-primary/30 shadow-[0_4px_20px_-6px_hsl(38_95%_55%/0.25),inset_0_1px_0_hsl(38_95%_55%/0.15)] overflow-hidden">
              <div className="pointer-events-none absolute -top-12 -right-8 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />
              <div className="relative flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] text-muted-foreground/90 uppercase tracking-[0.15em] font-semibold mb-1">
                    {t("vault.lpPool.runePoolTitle")}
                  </div>
                  <div className="text-[28px] leading-none font-bold tabular-nums text-primary drop-shadow-[0_0_18px_hsl(38_95%_55%/0.4)]">
                    {fmtUsdt(totalUsdt * 0.35)}
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 mt-1.5 flex items-center gap-1">
                    <Wallet className="h-3 w-3" />
                    {t("vault.lpPool.fromTotalDeposits")}{" "}
                    <span className="text-foreground/80 font-semibold tabular-nums">{fmtUsdt(totalUsdt)}</span>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2 border-l border-primary/15">
                  <div className="text-[10px] text-muted-foreground/80 uppercase tracking-wider font-semibold">{t("vault.lpPool.nodes")}</div>
                  <div className="text-xl font-bold text-primary tabular-nums leading-tight">{totalNodes}</div>
                  <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                    {totalMembers} {t("vault.lpPool.members")}
                  </div>
                </div>
              </div>
            </div>

            {/* Pre-launch hint */}
            {!isLive && (
              <div className="flex items-center justify-between rounded-xl px-3.5 py-2 bg-primary/[0.05] ring-1 ring-primary/20">
                <div className="text-[11px] text-primary/85 font-medium">
                  {t("vault.lpPool.preLaunchPrice")}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
                  {t("vault.lpPool.preLaunch")}
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Reserve view */
          <div className="grid grid-cols-2 gap-2.5">
            <div className="relative rounded-2xl px-4 py-3.5 bg-gradient-to-br from-teal-500/[0.12] via-teal-500/[0.06] to-transparent ring-1 ring-teal-500/30 shadow-[0_4px_18px_-6px_hsl(173_58%_50%/0.25),inset_0_1px_0_hsl(173_58%_50%/0.12)] overflow-hidden">
              <div className="pointer-events-none absolute -top-10 -right-6 h-24 w-24 rounded-full bg-teal-500/20 blur-2xl" />
              <div className="relative">
                <div className="text-[10px] text-muted-foreground/90 uppercase tracking-[0.15em] font-semibold mb-1">
                  {t("vault.lpPool.reserveBalance")}
                </div>
                <div className="text-[24px] leading-none font-bold tabular-nums text-teal-300 drop-shadow-[0_0_14px_hsl(173_58%_50%/0.35)]">
                  {fmtUsdt(totalUsdt * 0.20)}
                </div>
                <div className="text-[10px] text-muted-foreground/70 mt-1.5">
                  {t("vault.lpPool.reservePctOfDeposits")}
                </div>
              </div>
            </div>
            <div className="rounded-2xl px-4 py-3.5 bg-muted/15 ring-1 ring-border/50">
              <div className="text-[10px] text-muted-foreground/90 uppercase tracking-[0.15em] font-semibold mb-1">
                {t("vault.lpPool.reservePurpose")}
              </div>
              <div className="text-[13px] font-semibold mt-1 leading-tight text-teal-300">
                {t("vault.lpPool.reservePurposeLabel")}
              </div>
              <div className="text-[10px] text-muted-foreground/70 mt-1.5 leading-snug">
                {t("vault.lpPool.reservePurposeDesc")}
              </div>
            </div>
          </div>
        )}

        {/* Footer note */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 pt-1">
          <RefreshCw className="h-3 w-3" />
          <span>
            {isLive ? t("vault.lpPool.footerLive") : t("vault.lpPool.footerPreLaunch")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
