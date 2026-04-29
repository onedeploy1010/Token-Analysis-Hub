import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@dashboard/components/ui/card";
import { Skeleton } from "@dashboard/components/ui/skeleton";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Server, TrendingUp, Coins, Wallet } from "lucide-react";
import { useNodeMembershipsRune } from "@dashboard/lib/data-rune";

const TIER_DAILY_RATE: Record<string, number> = {
  // Pre-launch projection rates (USDT/day per node).
  BASIC:    1000  * 0.01,   // $10/day
  STANDARD: 2500  * 0.012,  // $30/day
  ADVANCED: 5000  * 0.013,  // $65/day
  SUPER:    10000 * 0.014,  // $140/day
  FOUNDER:  50000 * 0.015,  // $750/day
};

const TIER_PRICE: Record<string, number> = {
  BASIC: 1000, STANDARD: 2500, ADVANCED: 5000, SUPER: 10000, FOUNDER: 50000,
};

const TIER_ORDER = ["BASIC", "STANDARD", "ADVANCED", "SUPER", "FOUNDER"];
const TIER_COLOR: Record<string, string> = {
  BASIC:    "hsl(215 28% 65%)",
  STANDARD: "hsl(217 76% 58%)",
  ADVANCED: "hsl(173 58% 50%)",
  SUPER:    "hsl(38 95% 55%)",
  FOUNDER:  "hsl(266 60% 65%)",
};

function fmtUsdt(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(2)}K`;
  return `$${v.toFixed(2)}`;
}

/**
 * Per-wallet node-rewards panel — sits inside profile-nodes' "Rewards"
 * tab. RUNE doesn't index settlement events yet, so the daily yield is a
 * **projection** (tier price × tier daily rate × count). Cumulative
 * deposits chart is real (one bar per `rune_purchases.paid_at`).
 */
export function NodeRewardsPanel() {
  const { t } = useTranslation();
  const { data: memberships = [], isLoading } = useNodeMembershipsRune();

  const tierBreakdown = useMemo(() => {
    const map: Record<string, { count: number; invested: number; dailyYield: number }> = {};
    for (const tier of TIER_ORDER) {
      map[tier] = { count: 0, invested: 0, dailyYield: 0 };
    }
    for (const m of memberships) {
      const tier = m.nodeType;
      if (!map[tier]) continue;
      map[tier].count += 1;
      map[tier].invested += TIER_PRICE[tier] ?? 0;
      map[tier].dailyYield += TIER_DAILY_RATE[tier] ?? 0;
    }
    return map;
  }, [memberships]);

  const totalInvested = Object.values(tierBreakdown).reduce((s, t) => s + t.invested, 0);
  const totalDailyYield = Object.values(tierBreakdown).reduce((s, t) => s + t.dailyYield, 0);
  const totalNodes = memberships.length;

  // Cumulative deposit timeline (real on-chain data).
  const cumulativeData = useMemo(() => {
    if (!memberships.length) return [];
    const sorted = [...memberships].sort((a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime());
    let running = 0;
    return sorted.map((m) => {
      running += Number(m.price);
      return {
        date: new Date(m.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        deposit: Number(m.price),
        cumulative: running,
      };
    });
  }, [memberships]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (totalNodes === 0) {
    return (
      <Card className="border-border/55 bg-card/60 surface-3d">
        <CardContent className="py-12 text-center">
          <Server className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {t("profile.nodeRewards.empty", "No nodes purchased yet")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl px-3 py-3 bg-primary/[0.06] ring-1 ring-primary/25 text-center">
          <Server className="h-4 w-4 mx-auto mb-1 text-primary" />
          <div className="text-base font-bold tabular-nums text-primary">{totalNodes}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {t("profile.nodeRewards.totalNodes", "Total Nodes")}
          </div>
        </div>
        <div className="rounded-xl px-3 py-3 bg-blue-500/[0.06] ring-1 ring-blue-500/25 text-center">
          <Wallet className="h-4 w-4 mx-auto mb-1 text-blue-400" />
          <div className="text-base font-bold tabular-nums text-blue-400">{fmtUsdt(totalInvested)}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {t("profile.nodeRewards.invested", "Invested")}
          </div>
        </div>
        <div className="rounded-xl px-3 py-3 bg-emerald-500/[0.06] ring-1 ring-emerald-500/25 text-center">
          <TrendingUp className="h-4 w-4 mx-auto mb-1 text-emerald-400" />
          <div className="text-base font-bold tabular-nums text-emerald-400">{fmtUsdt(totalDailyYield)}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {t("profile.nodeRewards.dailyEst", "Daily Est.")}
          </div>
        </div>
      </div>

      {/* Per-tier breakdown */}
      <Card className="border-border/55 bg-card/60 surface-3d overflow-hidden">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="h-4 w-4 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("profile.nodeRewards.tierBreakdown", "Tier Breakdown")}
            </span>
          </div>
          <div className="space-y-1.5">
            {TIER_ORDER.filter((tier) => tierBreakdown[tier].count > 0).map((tier) => {
              const row = tierBreakdown[tier];
              const color = TIER_COLOR[tier];
              return (
                <div
                  key={tier}
                  className="flex items-center justify-between rounded-lg px-3 py-2 ring-1 ring-border/40 bg-muted/15"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-[12px] font-bold tabular-nums" style={{ color }}>
                      {tier}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70">
                      ${TIER_PRICE[tier].toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <div className="text-right">
                      <div className="text-foreground font-semibold tabular-nums">{row.count}×</div>
                      <div className="text-[9px] text-muted-foreground">
                        {fmtUsdt(row.invested)}
                      </div>
                    </div>
                    <div className="text-right pl-3 border-l border-border/40">
                      <div className="text-emerald-400 font-semibold tabular-nums">
                        +{fmtUsdt(row.dailyYield)}
                      </div>
                      <div className="text-[9px] text-muted-foreground">
                        {t("profile.nodeRewards.perDay", "per day")}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cumulative deposits chart */}
      {cumulativeData.length > 1 && (
        <Card className="border-border/55 bg-card/60 surface-3d overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("profile.nodeRewards.depositTimeline", "Deposit Timeline")}
              </span>
            </div>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="depGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(38 95% 55%)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(38 95% 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="hsl(228 22% 28%)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(215 28% 65%)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(215 28% 65%)" }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(228 24% 12%)",
                      border: "1px solid hsl(228 22% 32%)",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    formatter={(v: number) => [`$${v.toLocaleString()}`, t("profile.nodeRewards.cumulative", "Cumulative")]}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="hsl(38 95% 55%)"
                    strokeWidth={2}
                    fill="url(#depGrad)"
                    dot={{ r: 2, fill: "hsl(38 95% 55%)", strokeWidth: 0 }}
                    animationDuration={900}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer note — projection disclosure */}
      <p className="text-[10px] text-muted-foreground/60 text-center px-4">
        {t(
          "profile.nodeRewards.disclaimer",
          "Daily yield is a projection based on tier rate; actual settlements activate post-launch.",
        )}
      </p>
    </div>
  );
}
