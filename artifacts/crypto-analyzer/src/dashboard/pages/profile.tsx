import { useMemo, useEffect, useState } from "react";
import { Skeleton } from "@dashboard/components/ui/skeleton";
import { PageEnter, PageEnterStagger, PageEnterItem } from "@dashboard/components/page-enter";
import { useActiveAccount } from "thirdweb/react";
import {
  Copy, ChevronRight, Bell, Settings, History, GitBranch, Server, Share2,
  ArrowLeftRight, User, Vault, Lock, Flame, TrendingUp, Coins, Wallet, Gift,
} from "lucide-react";
import { useToast } from "@dashboard/hooks/use-toast";
import { copyText } from "@dashboard/lib/copy";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { usePersonalStats } from "@/hooks/rune/use-team";
import { buildReferralUrl } from "@/hooks/rune/use-referral-param";
import { useUserPurchase } from "@/hooks/rune/use-node-presell";
import { NoNodeReminder } from "@/components/rune/no-node-reminder";
import { useNodeMembershipsRune } from "@dashboard/lib/data-rune";

const MENU_ITEMS = [
  { labelKey: "profile.myNodesLabel",      icon: Server,         path: "/profile/nodes",        descKey: "profile.nodeManagementDesc" },
  { labelKey: "profile.referralTeam",      icon: GitBranch,      path: "/profile/referral",     descKey: "profile.referralTeamDesc" },
  { labelKey: "profile.myVaultPositions",  icon: Vault,          path: "/profile/vault",        descKey: "profile.myVaultPositionsDesc" },
  { labelKey: "profile.swap",              icon: ArrowLeftRight, path: "/profile/swap",         descKey: "profile.swapDesc" },
  { labelKey: "profile.transactionHistory", icon: History,       path: "/profile/transactions", descKey: "profile.transactionHistoryDesc" },
  { labelKey: "profile.notifications",     icon: Bell,           path: "/profile/notifications", descKey: "profile.notificationsDesc" },
  { labelKey: "profile.settings",          icon: Settings,       path: "/profile/settings",     descKey: "profile.settingsDesc" },
];

// Mirrors `src/lib/thirdweb/contracts.ts NODE_META`. RUNE nodes have NO
// daily yield — the only earnings are direct-referral commission paid
// on-chain when a downline buys a node (rate set per tier on-chain).
const NODE_ID_TO_TIER: Record<number, string> = {
  101: "FOUNDER",
  201: "SUPER",
  301: "ADVANCED",
  401: "MID",
  501: "INITIAL",
};
const TIER_COLOR: Record<string, string> = {
  FOUNDER:  "hsl(266 60% 70%)",
  SUPER:    "hsl(38 95% 60%)",
  ADVANCED: "hsl(160 64% 55%)",
  MID:      "hsl(217 76% 64%)",
  INITIAL:  "hsl(215 28% 75%)",
};
const TIER_PRICE: Record<string, number> = {
  FOUNDER: 50000, SUPER: 10000, ADVANCED: 5000, MID: 2500, INITIAL: 1000,
};

function fmtUsdt(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(2)}K`;
  return `$${v.toFixed(2)}`;
}

/** Smooth eased count-up from 0 to `target` on mount. */
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    let startedAt = 0;
    const tick = (ts: number) => {
      if (!startedAt) startedAt = ts;
      const progress = Math.min(1, (ts - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function AnimUsdt({ value }: { value: number }) {
  const v = useCountUp(value);
  return <>{fmtUsdt(v)}</>;
}

/**
 * Profile main page. All earnings figures are USDT — RUNE token isn't
 * listed yet, so the only on-chain currency flowing today is USDT (paid
 * to direct referrers when a downline buys a node). RUNE/EMBER columns
 * stay as pre-launch placeholders until the lock + burn contracts ship.
 *
 * Data sources (each KPI footnoted in the UI):
 *  • directCommission / teamCommission → on-chain `usePersonalStats`
 *    (rune_referrers + rune_purchases joined by indexer GraphQL)
 *  • my-node investment + tier breakdown → `rune_purchases` filtered to
 *    the connected wallet
 *  • daily-yield estimate → tier × daily-rate × count (PROJECTION; the
 *    settlement contracts aren't live yet)
 */
export default function ProfilePage() {
  const { t } = useTranslation();
  const account = useActiveAccount();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const walletAddr = account?.address || "";
  const isConnected = !!walletAddr;

  const { data: stats, isLoading: statsLoading } = usePersonalStats(isConnected ? walletAddr : undefined);
  const { data: memberships = [], isLoading: nodesLoading } = useNodeMembershipsRune();
  const { hasPurchased: chainHasPurchased, isLoading: purchaseLoading } = useUserPurchase(walletAddr);

  // One-shot "no node yet" reminder — pops once when a bound user lands on
  // /app/profile without owning a node. Wait for both signals (chain +
  // GraphQL stats) before deciding so we don't flash open then closed.
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const dbHasPurchased = !!stats?.hasPurchased;
  const ownsNode = chainHasPurchased || dbHasPurchased || memberships.length > 0;
  useEffect(() => {
    if (!isConnected) return;
    if (statsLoading || purchaseLoading) return;
    if (reminderDismissed) return;
    if (!ownsNode) setReminderOpen(true);
  }, [isConnected, statsLoading, purchaseLoading, ownsNode, reminderDismissed]);
  // Reset dismissed flag when wallet changes.
  useEffect(() => { setReminderDismissed(false); }, [walletAddr]);

  // Commission rewards are stored on-chain as 18-decimal USDT (`uint256`).
  const directCommissionUsdt = useMemo(
    () => stats ? Number(stats.directCommission) / 1e18 : 0,
    [stats],
  );
  const teamCommissionUsdt = useMemo(
    () => stats ? Number(stats.teamCommission) / 1e18 : 0,
    [stats],
  );

  // Node ownership — read from BOTH sources and union them, because the
  // GraphQL `usePersonalStats.ownedNodeId` (used by OverviewTab) and the
  // Supabase `useNodeMembershipsRune` (queried directly here) can drift if
  // the indexer trails the on-chain event by a few blocks. Whichever
  // source sees a tier first wins; this matches whatever the user already
  // sees on /app/profile/nodes.
  const ownTierFromStats   = stats?.ownedNodeId && NODE_ID_TO_TIER[stats.ownedNodeId] ? NODE_ID_TO_TIER[stats.ownedNodeId] : null;
  const ownTierFromMembers = memberships.length > 0 ? memberships[0].nodeType : null;
  const ownTierLabel = ownTierFromStats ?? ownTierFromMembers;
  const ownTierColor = ownTierLabel ? TIER_COLOR[ownTierLabel] : "hsl(215 28% 65%)";

  const investedUsdt = ownTierLabel ? (TIER_PRICE[ownTierLabel] ?? 0) : 0;
  const nodeCount    = ownTierLabel ? 1 : 0; // RUNE = one node per wallet.

  // RUNE nodes don't pay daily yield — earnings come exclusively from the
  // direct-referral commission paid on-chain when a downline buys a node.
  // 总收益 = directCommissionUsdt (real, USDT, on-chain).
  const totalEarnings = directCommissionUsdt;

  // Match mainnet's referral URL format — `useReferralParam` reads
  // `?ref=` (and `?referrer=`) from the query string, so the link must
  // be built the same way. `buildReferralUrl` is the canonical helper.
  const referralLink = useMemo(() => buildReferralUrl(walletAddr), [walletAddr]);

  const copyToClipboard = async (text: string) => {
    await copyText(text);
    toast({ title: t("common.copied", "Copied"), description: t("common.copiedDesc", "Copied to clipboard") });
  };
  const shareReferralLink = () => {
    if (!referralLink) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "RUNE PROTOCOL", text: t("profile.inviteFriendsDesc", "Invite friends to RUNE PROTOCOL"), url: referralLink }).catch(() => {});
    } else {
      copyToClipboard(referralLink);
    }
  };

  const shortAddr = walletAddr ? `${walletAddr.slice(0, 6)}...${walletAddr.slice(-4)}` : "";

  return (
    <PageEnter>
    <div className="pb-24 lg:pb-8 lg:pt-4" data-testid="page-profile">

      {/* Hero header — stronger amber wash, layered glows */}
      <div className="relative overflow-hidden border-b border-amber-500/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.18),transparent_60%)] pointer-events-none" />
        <div className="absolute -top-20 -right-10 h-64 w-64 rounded-full bg-amber-500/[0.12] blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-12 left-10 h-40 w-40 rounded-full bg-amber-600/[0.08] blur-[70px] pointer-events-none" />
        <div className="relative px-4 lg:px-6 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center shrink-0 ring-2 ring-amber-400/60"
              style={{
                background: "linear-gradient(135deg, hsl(43,90%,58%), hsl(38,85%,42%))",
                boxShadow: "0 6px 24px hsl(38_95%_55%/0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
              }}
            >
              <User className="h-7 w-7 text-black/80" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              {!isConnected ? (
                <div className="text-[15px] font-bold text-foreground/70">{t("common.notConnected", "Not connected")}</div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-black text-foreground tracking-tight" data-testid="text-wallet-address">{shortAddr}</span>
                    <button onClick={() => copyToClipboard(walletAddr)} className="p-1 rounded-md transition-colors hover:bg-amber-500/15" data-testid="button-copy-address">
                      <Copy className="h-3.5 w-3.5 text-amber-300" />
                    </button>
                  </div>
                  <div className="font-mono text-[10px] text-foreground/45 truncate">{walletAddr}</div>
                </>
              )}
              {/* Node tier inline */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <div className="flex items-center gap-1.5 rounded-lg ring-1 ring-amber-400/30 bg-amber-500/[0.08] px-2.5 py-1">
                  <span className="text-[9px] uppercase tracking-[0.15em] text-amber-200/70 font-bold">
                    {t("profile.nodeTier", "Node")}
                  </span>
                  {!isConnected ? (
                    <span className="text-[12px] font-bold text-foreground/30">--</span>
                  ) : ownTierLabel ? (
                    <span className="text-[12px] font-black tabular-nums tracking-wide" style={{ color: ownTierColor, textShadow: `0 0 12px ${ownTierColor}` }} data-testid="text-node-tier">
                      {ownTierLabel}
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-foreground/50">
                      {t("profile.noNode", "Not held")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-6 pt-3 space-y-3">

        {/* Cumulative earnings hero — strong amber gradient, multi-layer glow,
            inner highlight for floating-tile depth (matches mainnet's
            surface-3d-tinted dashboard cards). */}
        <div
          className="surface-3d relative overflow-hidden rounded-3xl border-2 border-amber-500/45 p-4"
          style={{
            background: "linear-gradient(135deg, rgba(60,40,8,0.85), rgba(28,20,8,0.95) 60%, rgba(14,10,4,0.98))",
            boxShadow:
              "inset 0 1px 0 rgba(251,191,36,0.30), inset 0 -1px 0 rgba(0,0,0,0.30), 0 12px 36px -12px rgba(251,191,36,0.30), 0 28px 60px -20px rgba(0,0,0,0.55)",
          }}
        >
          <div className="pointer-events-none absolute -top-24 -right-12 h-64 w-64 rounded-full bg-amber-400/[0.30] blur-[90px]" />
          <div className="pointer-events-none absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-amber-600/[0.18] blur-[70px]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-amber-300" />
                  <span className="text-[11px] text-amber-200/85 font-bold uppercase tracking-[0.18em]">
                    {t("profile.totalEarnings", "Cumulative Earnings")}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 ring-1 ring-emerald-500/45 text-emerald-300">
                    USDT
                  </span>
                </div>
                {!isConnected || statsLoading ? (
                  <Skeleton className="h-10 w-36" />
                ) : (
                  <div
                    className="num-shimmer text-[34px] leading-none font-black tabular-nums tracking-tight"
                    style={{
                      filter: "drop-shadow(0 0 18px hsl(38 100% 55% / 0.45)) drop-shadow(0 1px 0 rgba(0,0,0,0.4))",
                    }}
                    data-testid="text-total-earnings"
                  >
                    <AnimUsdt value={totalEarnings} />
                  </div>
                )}
                <div className="text-[10px] text-amber-100/55 mt-2">
                  {t("profile.earningsSource", "Direct referral commission paid on-chain · USDT")}
                </div>
              </div>
              <div
                className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ring-2 ring-amber-400/55"
                style={{
                  background: "linear-gradient(135deg, rgba(251,191,36,0.30), rgba(180,90,10,0.20))",
                  boxShadow: "0 4px 18px hsl(38 95% 55% / 0.4), inset 0 1px 0 rgba(255,255,255,0.20)",
                }}
              >
                <Wallet className="h-5 w-5 text-amber-300" />
              </div>
            </div>

            {isConnected && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div
                  className="rounded-2xl px-2.5 py-3 ring-1 ring-emerald-400/35"
                  style={{
                    background: "linear-gradient(160deg, rgba(34,197,94,0.16), rgba(20,80,40,0.10) 60%, rgba(0,0,0,0.20))",
                    boxShadow: "inset 0 1px 0 rgba(34,197,94,0.30), 0 4px 14px -6px rgba(34,197,94,0.30)",
                  }}
                >
                  <div className="flex items-center gap-1 mb-1.5">
                    <Gift className="h-3 w-3 text-emerald-300" />
                    <span className="text-[9px] uppercase tracking-wider text-emerald-200/85 font-bold">
                      {t("profile.directCommission", "Direct")}
                    </span>
                  </div>
                  <div className="text-[15px] font-black text-emerald-200 tabular-nums" style={{ textShadow: "0 0 10px hsl(142 70% 50% / 0.4)" }}>
                    <AnimUsdt value={directCommissionUsdt} />
                  </div>
                  <div className="text-[9px] text-emerald-300/60 mt-0.5">USDT · on-chain</div>
                </div>
                <div
                  className="rounded-2xl px-2.5 py-3 ring-1 ring-blue-400/35"
                  style={{
                    background: "linear-gradient(160deg, rgba(59,130,246,0.16), rgba(20,40,80,0.10) 60%, rgba(0,0,0,0.20))",
                    boxShadow: "inset 0 1px 0 rgba(59,130,246,0.30), 0 4px 14px -6px rgba(59,130,246,0.30)",
                  }}
                >
                  <div className="flex items-center gap-1 mb-1.5">
                    <GitBranch className="h-3 w-3 text-blue-300" />
                    <span className="text-[9px] uppercase tracking-wider text-blue-200/85 font-bold">
                      {t("profile.teamVolume", "Team")}
                    </span>
                  </div>
                  <div className="text-[15px] font-black text-blue-200 tabular-nums" style={{ textShadow: "0 0 10px hsl(217 80% 60% / 0.4)" }}>
                    <AnimUsdt value={teamCommissionUsdt} />
                  </div>
                  <div className="text-[9px] text-blue-300/60 mt-0.5">USDT · gross</div>
                </div>
                <div
                  className="rounded-2xl px-2.5 py-3 ring-1 ring-amber-400/40"
                  style={{
                    background: "linear-gradient(160deg, rgba(251,191,36,0.18), rgba(120,80,10,0.10) 60%, rgba(0,0,0,0.20))",
                    boxShadow: "inset 0 1px 0 rgba(251,191,36,0.32), 0 4px 14px -6px rgba(251,191,36,0.32)",
                  }}
                >
                  <div className="flex items-center gap-1 mb-1.5">
                    <Coins className="h-3 w-3 text-amber-300" />
                    <span className="text-[9px] uppercase tracking-wider text-amber-200/85 font-bold">
                      {t("profile.investedKpi", "Invested")}
                    </span>
                  </div>
                  <div className="text-[15px] font-black text-amber-200 tabular-nums" style={{ textShadow: "0 0 10px hsl(38 95% 55% / 0.45)" }}>
                    <AnimUsdt value={investedUsdt} />
                  </div>
                  <div className="text-[9px] text-amber-300/60 mt-0.5">USDT · my node</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* My nodes summary + RUNE/EMBER pre-launch placeholder cells */}
        <div className="grid grid-cols-2 gap-2">
          <div
            className="rounded-2xl px-4 py-3.5 ring-1 ring-amber-400/45 surface-3d"
            style={{
              background: "linear-gradient(160deg, rgba(251,191,36,0.16), rgba(120,80,10,0.08) 60%, rgba(8,5,2,0.30))",
              boxShadow: "inset 0 1px 0 rgba(251,191,36,0.28), 0 6px 20px -8px rgba(251,191,36,0.28)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Server className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-[10px] text-amber-200/85 font-bold uppercase tracking-wider">
                {t("profile.myNodes", "My Nodes")}
              </span>
            </div>
            {!isConnected || statsLoading ? (
              <div className="text-[22px] font-bold text-foreground/30">--</div>
            ) : nodeCount > 0 ? (
              <>
                <div
                  className="num-gold text-[22px] font-black tabular-nums"
                  style={{ filter: "drop-shadow(0 0 12px hsl(38 95% 55% / 0.40))" }}
                >
                  {nodeCount}
                  <span className="text-[12px] font-normal ml-1.5 text-amber-300/70">× {ownTierLabel}</span>
                </div>
                <div className="text-[10px] text-amber-100/65 mt-1">
                  {fmtUsdt(investedUsdt)} {t("profile.invested", "invested")}
                </div>
              </>
            ) : (
              <>
                <div className="text-[22px] font-black text-foreground/35">0</div>
                <div className="text-[10px] text-foreground/50 mt-1">
                  {t("profile.noNodeYet", "No nodes yet")}
                </div>
              </>
            )}
          </div>
          <div
            className="rounded-2xl px-4 py-3.5 ring-1 ring-purple-400/30 surface-3d"
            style={{
              background: "linear-gradient(160deg, rgba(168,85,247,0.10), rgba(50,30,80,0.06) 60%, rgba(8,5,2,0.30))",
              boxShadow: "inset 0 1px 0 rgba(168,85,247,0.20), 0 6px 20px -8px rgba(168,85,247,0.18)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Lock className="h-3.5 w-3.5 text-purple-300" />
              <span className="text-[10px] text-purple-200/80 font-bold uppercase tracking-wider">
                RUNE / EMBER
              </span>
            </div>
            <div className="text-[22px] font-black text-foreground/30">--</div>
            <div className="text-[10px] text-purple-200/60 mt-1 flex items-center gap-1">
              <Flame className="h-2.5 w-2.5" />
              {t("profile.preLaunch", "Pre-launch")}
            </div>
          </div>
        </div>

        {/* Invite link card — same elevated treatment so it reads as a peer
            of the hero rather than a flat list item. */}
        {isConnected && referralLink && (
          <div
            className="rounded-2xl p-4 space-y-3 ring-1 ring-amber-500/30 surface-3d"
            style={{
              background: "linear-gradient(160deg, rgba(40,30,8,0.65), rgba(20,15,8,0.85) 70%, rgba(10,8,4,0.92))",
              boxShadow: "inset 0 1px 0 rgba(251,191,36,0.18), 0 8px 24px -10px rgba(251,191,36,0.20), 0 20px 40px -20px rgba(0,0,0,0.55)",
            }}>
            <div>
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                {t("profile.inviteFriends", "Invite Link")}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 rounded-xl px-3 py-2.5 font-mono text-[11px] text-foreground/80 truncate ring-1 ring-border/40 bg-muted/15">
                  {referralLink}
                </div>
                <button
                  onClick={() => copyToClipboard(referralLink)}
                  className="shrink-0 px-3 py-2.5 rounded-xl ring-1 ring-border/50 bg-muted/20 hover:ring-primary/40 transition-all active:scale-95"
                  data-testid="button-copy-referral"
                >
                  <Copy className="h-4 w-4 text-muted-foreground" />
                </button>
                <button
                  onClick={shareReferralLink}
                  className="shrink-0 px-3.5 py-2.5 rounded-xl font-medium transition-all hover:brightness-110 active:scale-95"
                  style={{ background: "linear-gradient(135deg, hsl(43,74%,50%), hsl(38,70%,40%))", boxShadow: "0 2px 8px hsl(38_95%_55%/0.25)" }}
                  data-testid="button-share-referral"
                >
                  <Share2 className="h-4 w-4 text-black" />
                </button>
              </div>
            </div>

            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ring-1 ring-primary/25 bg-primary/[0.04] hover:ring-primary/45 hover:bg-primary/[0.08]"
              onClick={() => navigate("/profile/referral")}
              data-testid="menu-referral"
            >
              <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-primary/15 ring-1 ring-primary/30">
                <GitBranch className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-foreground">
                  {t("profile.referralTeam", "Referral & Team")}
                </div>
                <div className="text-[10px] text-muted-foreground/80">
                  {stats ? `${stats.directCount} ${t("profile.direct", "direct")} · ${stats.totalDownstreamCount} ${t("profile.team", "team")}` : "—"}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </div>
        )}

        {/* Menu items (mobile + desktop) */}
        <div
          className="rounded-2xl overflow-hidden ring-1 ring-amber-500/25 surface-3d"
          style={{
            background: "linear-gradient(180deg, rgba(28,22,12,0.85), rgba(14,10,6,0.95))",
            boxShadow: "inset 0 1px 0 rgba(251,191,36,0.14), 0 8px 24px -10px rgba(0,0,0,0.55), 0 20px 40px -20px rgba(0,0,0,0.45)",
          }}>
          {MENU_ITEMS.map((item, idx) => (
            <button
              key={item.path}
              className="group w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-primary/[0.07] active:bg-primary/[0.10]"
              style={{ borderBottom: idx < MENU_ITEMS.length - 1 ? "1px solid hsl(228 22% 28% / 0.4)" : "none" }}
              onClick={() => navigate(item.path)}
              data-testid={`menu-${item.path.split("/").pop()}`}
            >
              <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 ring-1 ring-primary/25 transition-all group-hover:bg-primary/20 group-hover:ring-primary/45 group-hover:shadow-[0_0_14px_-2px_hsl(38_95%_55%/0.45)]">
                <item.icon className="h-4 w-4 text-primary transition-transform group-hover:scale-110" />
              </div>
              <div className="flex-1 min-w-0 transition-transform group-hover:translate-x-0.5">
                <div className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors">{t(item.labelKey)}</div>
                <div className="text-[10px] text-muted-foreground/80 mt-0.5">{t(item.descKey)}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-all group-hover:text-primary group-hover:translate-x-1" />
            </button>
          ))}
        </div>
      </div>
    </div>
    <NoNodeReminder
      open={reminderOpen}
      onClose={() => { setReminderOpen(false); setReminderDismissed(true); }}
    />
    </PageEnter>
  );
}
