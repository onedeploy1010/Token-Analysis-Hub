import { useMemo } from "react";
import { Skeleton } from "@dashboard/components/ui/skeleton";
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

const NODE_ID_TO_TIER: Record<number, string> = {
  101: "BASIC", 201: "STANDARD", 301: "ADVANCED", 401: "SUPER", 501: "FOUNDER",
};
const TIER_COLOR: Record<string, string> = {
  BASIC:    "hsl(215 28% 65%)",
  STANDARD: "hsl(217 76% 58%)",
  ADVANCED: "hsl(173 58% 50%)",
  SUPER:    "hsl(38 95% 55%)",
  FOUNDER:  "hsl(266 60% 65%)",
};
const TIER_DAILY_RATE: Record<string, number> = {
  BASIC:    1000  * 0.01,
  STANDARD: 2500  * 0.012,
  ADVANCED: 5000  * 0.013,
  SUPER:    10000 * 0.014,
  FOUNDER:  50000 * 0.015,
};
const TIER_PRICE: Record<string, number> = {
  BASIC: 1000, STANDARD: 2500, ADVANCED: 5000, SUPER: 10000, FOUNDER: 50000,
};

function fmtUsdt(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(2)}K`;
  return `$${v.toFixed(2)}`;
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

  // Commission rewards are stored on-chain as 18-decimal USDT (`uint256`).
  const directCommissionUsdt = useMemo(
    () => stats ? Number(stats.directCommission) / 1e18 : 0,
    [stats],
  );
  const teamCommissionUsdt = useMemo(
    () => stats ? Number(stats.teamCommission) / 1e18 : 0,
    [stats],
  );

  // Node investment + projected daily yield (live data + protocol-defined
  // tier rates).
  const { investedUsdt, dailyYieldEstUsdt, primaryTier, primaryNodeId } = useMemo(() => {
    let invested = 0;
    let daily = 0;
    let primary: string | null = null;
    let primaryId: number | null = null;
    for (const m of memberships) {
      const tier = m.nodeType;
      invested += TIER_PRICE[tier] ?? 0;
      daily += TIER_DAILY_RATE[tier] ?? 0;
      if (!primary) { primary = tier; primaryId = TIER_PRICE[tier] ?? null; }
    }
    return { investedUsdt: invested, dailyYieldEstUsdt: daily, primaryTier: primary, primaryNodeId: primaryId };
  }, [memberships]);

  const totalEarnings = directCommissionUsdt; // Cumulative USDT actually received on chain.
  const ownNodeId = stats?.ownedNodeId ?? null;
  const ownTierLabel = ownNodeId && NODE_ID_TO_TIER[ownNodeId] ? NODE_ID_TO_TIER[ownNodeId] : primaryTier;
  const ownTierColor = ownTierLabel ? TIER_COLOR[ownTierLabel] : "hsl(215 28% 65%)";

  const referralLink = useMemo(() => {
    if (!walletAddr || typeof window === "undefined") return "";
    return `${window.location.origin}/r/${walletAddr}`;
  }, [walletAddr]);

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
    <div className="pb-24 lg:pb-8 lg:pt-4" data-testid="page-profile">

      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-border/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.10),transparent_60%)] pointer-events-none" />
        <div className="relative px-4 lg:px-6 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 ring-1 ring-primary/40"
              style={{ background: "linear-gradient(135deg, hsl(43,74%,50%), hsl(38,70%,38%))", boxShadow: "0 4px 16px hsl(38_95%_55%/0.25)" }}
            >
              <User className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              {!isConnected ? (
                <div className="text-[15px] font-bold text-muted-foreground">{t("common.notConnected", "Not connected")}</div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold text-foreground" data-testid="text-wallet-address">{shortAddr}</span>
                    <button onClick={() => copyToClipboard(walletAddr)} className="p-1 rounded-md transition-colors hover:bg-white/10" data-testid="button-copy-address">
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground/70 truncate">{walletAddr}</div>
                </>
              )}
              {/* Node tier inline */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <div className="flex items-center gap-1.5 rounded-lg ring-1 ring-border/50 bg-muted/20 px-2.5 py-1">
                  <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                    {t("profile.nodeTier", "Node")}
                  </span>
                  {!isConnected ? (
                    <span className="text-[12px] font-bold text-muted-foreground/40">--</span>
                  ) : ownTierLabel ? (
                    <span className="text-[12px] font-bold tabular-nums" style={{ color: ownTierColor }} data-testid="text-node-tier">
                      {ownTierLabel}
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-muted-foreground/60">
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

        {/* Cumulative earnings hero — USDT, on-chain */}
        <div className="surface-3d relative overflow-hidden rounded-2xl border border-border/55 bg-gradient-to-br from-card/80 to-card/40 p-4 backdrop-blur-sm shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-amber-500/[0.18] blur-[80px]" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                    {t("profile.totalEarnings", "Cumulative Earnings")}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 ring-1 ring-emerald-500/30 text-emerald-300">
                    USDT
                  </span>
                </div>
                {!isConnected || statsLoading ? (
                  <Skeleton className="h-9 w-32" />
                ) : (
                  <div className="text-[30px] leading-none font-black tabular-nums text-primary drop-shadow-[0_0_18px_hsl(38_95%_55%/0.4)]" data-testid="text-total-earnings">
                    {fmtUsdt(totalEarnings)}
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground/60 mt-1.5">
                  {t("profile.earningsSource", "On-chain commission paid to your wallet · USDT")}
                </div>
              </div>
              <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-primary/15 ring-1 ring-primary/30 shrink-0">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </div>

            {isConnected && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="rounded-xl px-2.5 py-2.5 ring-1 ring-border/40 bg-muted/15">
                  <div className="flex items-center gap-1 mb-1">
                    <Gift className="h-3 w-3 text-emerald-400" />
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      {t("profile.directCommission", "Direct")}
                    </span>
                  </div>
                  <div className="text-[14px] font-bold text-foreground tabular-nums">
                    {fmtUsdt(directCommissionUsdt)}
                  </div>
                  <div className="text-[9px] text-muted-foreground/70">USDT · on-chain</div>
                </div>
                <div className="rounded-xl px-2.5 py-2.5 ring-1 ring-border/40 bg-muted/15">
                  <div className="flex items-center gap-1 mb-1">
                    <GitBranch className="h-3 w-3 text-blue-400" />
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      {t("profile.teamVolume", "Team")}
                    </span>
                  </div>
                  <div className="text-[14px] font-bold text-foreground tabular-nums">
                    {fmtUsdt(teamCommissionUsdt)}
                  </div>
                  <div className="text-[9px] text-muted-foreground/70">USDT · gross</div>
                </div>
                <div className="rounded-xl px-2.5 py-2.5 ring-1 ring-border/40 bg-muted/15">
                  <div className="flex items-center gap-1 mb-1">
                    <Coins className="h-3 w-3 text-amber-400" />
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      {t("profile.nodeYield", "Node Est.")}
                    </span>
                  </div>
                  <div className="text-[14px] font-bold text-foreground tabular-nums">
                    {fmtUsdt(dailyYieldEstUsdt)}
                  </div>
                  <div className="text-[9px] text-muted-foreground/70">USDT/day · projection</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* My nodes summary + RUNE/EMBER pre-launch placeholder cells */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl px-4 py-3.5 ring-1 ring-primary/25 bg-primary/[0.06]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Server className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] text-muted-foreground font-medium">
                {t("profile.myNodes", "My Nodes")}
              </span>
            </div>
            {!isConnected || nodesLoading ? (
              <div className="text-[20px] font-bold text-muted-foreground/40">--</div>
            ) : memberships.length > 0 ? (
              <>
                <div className="text-[20px] font-black text-primary tabular-nums">
                  {memberships.length}
                  <span className="text-[12px] font-normal ml-1 text-muted-foreground/70">×</span>
                </div>
                <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                  {fmtUsdt(investedUsdt)} {t("profile.invested", "invested")}
                </div>
              </>
            ) : (
              <>
                <div className="text-[20px] font-black text-foreground/40">0</div>
                <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {t("profile.noNodeYet", "No nodes yet")}
                </div>
              </>
            )}
          </div>
          <div className="rounded-2xl px-4 py-3.5 ring-1 ring-border/40 bg-muted/15">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-medium">
                RUNE / EMBER
              </span>
            </div>
            <div className="text-[20px] font-black text-muted-foreground/40">--</div>
            <div className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
              <Flame className="h-2.5 w-2.5" />
              {t("profile.preLaunch", "Pre-launch")}
            </div>
          </div>
        </div>

        {/* Invite link card */}
        {isConnected && referralLink && (
          <div className="rounded-2xl p-4 space-y-3 ring-1 ring-border/55 bg-card/60 surface-3d">
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
        <div className="rounded-2xl overflow-hidden ring-1 ring-border/55 bg-card/60 surface-3d">
          {MENU_ITEMS.map((item, idx) => (
            <button
              key={item.path}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all hover:bg-primary/[0.05]"
              style={{ borderBottom: idx < MENU_ITEMS.length - 1 ? "1px solid hsl(228 22% 28% / 0.4)" : "none" }}
              onClick={() => navigate(item.path)}
              data-testid={`menu-${item.path.split("/").pop()}`}
            >
              <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 ring-1 ring-primary/25">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-foreground">{t(item.labelKey)}</div>
                <div className="text-[10px] text-muted-foreground/80 mt-0.5">{t(item.descKey)}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
