import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useActiveAccount } from "thirdweb/react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users, Copy, CheckCircle2, Share2, ExternalLink,
  TrendingUp, Wallet, Link as LinkIcon, Gift,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUsdtBalance } from "@/hooks/rune/use-usdt";
import { useReferrerOf } from "@/hooks/rune/use-community";
import { useUserPurchase } from "@/hooks/rune/use-node-presell";
import { emitOpenPurchase } from "@/lib/rune/purchase-signal";
import { useTeam, usePersonalStats, useRewards, type ReferrerRow, type RewardRow } from "@/hooks/rune/use-team";
import { NODE_META, type NodeId, COMMUNITY_ROOT } from "@/lib/thirdweb/contracts";
import { runeChain } from "@/lib/thirdweb/chains";
import { buildReferralUrl } from "@/hooks/rune/use-referral-param";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";

type Tab = "overview" | "team" | "rewards";

/** Short-hand 0x123…abcd formatter for display. */
const short = (a: string | undefined) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");

/**
 * Read-only address pill with select-all text and a copy icon. The user
 * asked for the dashboard to show the full address and let them copy it,
 * so we render the whole 42-char value in a mono span with `select-all`
 * (one click selects the full address for manual copy), plus an icon
 * button that writes to the clipboard.
 *
 * `stopPropagation` on the outer span so clicks inside don't bubble up
 * to parent rows — important for SelfRootNode where the row toggles the
 * tree open/closed.
 */
function CopyableAddress({
  address,
  short: isShort = false,
  className = "",
}: {
  address: string;
  /** Display the truncated 0x1234…abcd form but still copy the full 42-char address. */
  short?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — `select-all` on the full-width variant still
       *  lets the user select-and-copy manually. */
    }
  }
  // Short mode is for dense rows (tree children): we show 0x1234…abcd but
  // the copy button always writes the full address to the clipboard so the
  // user can paste a real Ethereum-format address.
  return (
    <span
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1.5 rounded-md border border-border/40 bg-card/40 px-2 py-0.5 font-mono text-[11px] sm:text-xs ${isShort ? "" : "break-all"} ${className}`}
      title={address}
    >
      <span className={isShort ? "" : "select-all"}>{isShort ? short(address) : address}</span>
      <button
        type="button"
        onClick={copy}
        className="opacity-60 hover:opacity-100 transition-opacity shrink-0"
        aria-label="Copy address"
      >
        {copied ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      </button>
    </span>
  );
}

/** 18-decimal bigint → human USDT string. */
function fmtUsdt(raw: bigint | undefined | string, dec = 2): string {
  if (raw === undefined || raw === null) return "—";
  const v = typeof raw === "string" ? BigInt(raw) : raw;
  const base = 10n ** 18n;
  const whole = v / base;
  const frac = v % base;
  if (dec === 0) return whole.toLocaleString("en-US");
  const fracStr = frac.toString().padStart(18, "0").slice(0, dec).replace(/0+$/, "");
  return fracStr ? `${whole.toLocaleString("en-US")}.${fracStr}` : whole.toLocaleString("en-US");
}

/**
 * Authenticated personal hub. Mounted at `/dashboard`. Guards itself —
 * if the user disconnects mid-session we bounce them back to /recruit
 * automatically so the state machine never shows empty data.
 */
export default function Dashboard() {
  const { t } = useLanguage();
  const account = useActiveAccount();
  const address = account?.address;
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("overview");

  // Dashboard is gated on hasPurchased. If the connected wallet hasn't
  // bought a node yet we bounce back to /recruit and fire the purchase
  // signal so RuneOnboarding re-opens the purchase modal. Disconnect
  // does the same — the dashboard is never shown with no address.
  const { hasPurchased, isLoading: purchaseLoading } = useUserPurchase(address);
  useEffect(() => {
    if (!address) { navigate("/recruit"); return; }
    if (!purchaseLoading && !hasPurchased) {
      navigate("/recruit");
      emitOpenPurchase();
    }
  }, [address, hasPurchased, purchaseLoading, navigate]);

  if (!address || !hasPurchased) return null;

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl space-y-8">
      {/* ── Header ── */}
      <div className="flex items-end justify-between border-b border-border/40 pb-5">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/60 block mb-1">{t("mr.dash.hub")}</span>
          <h1 className="text-2xl font-bold tracking-tight">{t("mr.dash.title")}</h1>
          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
            <Wallet className="h-3.5 w-3.5 shrink-0" />
            <CopyableAddress address={address} />
            <span className="opacity-40">·</span>
            <span>{runeChain.name}</span>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-border/30">
        {[
          { id: "overview" as const, Icon: LayoutDashboard, label: t("mr.dash.tab.overview") },
          { id: "team"     as const, Icon: Users,           label: t("mr.dash.tab.team") },
          { id: "rewards"  as const, Icon: Gift,            label: t("mr.dash.tab.rewards") },
        ].map(({ id, Icon, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative px-5 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors ${
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {active && (
                <motion.div
                  layoutId="dashTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab panels ── */}
      {tab === "overview" ? (
        <OverviewTab address={address} />
      ) : tab === "team" ? (
        <TeamTab address={address} />
      ) : (
        <RewardsTab address={address} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Overview tab
──────────────────────────────────────────────────────────────────────────── */
function OverviewTab({ address }: { address: string }) {
  const { t } = useLanguage();
  const { data: usdtRaw } = useUsdtBalance(address);
  const { referrer, isBound, isRoot } = useReferrerOf(address);
  const { hasPurchased, nodeId, payTime, amount } = useUserPurchase(address);
  const { data: stats } = usePersonalStats(address);

  const referralUrl = buildReferralUrl(address);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast({ title: t("mr.dash.ref.copiedToast"), description: t("mr.dash.ref.copiedDesc") });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: t("mr.dash.ref.copyFail"), description: t("mr.dash.ref.copyFailDesc"), variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="USDT"                 value={`${fmtUsdt(usdtRaw as bigint | undefined, 2)}`} sub={t("mr.dash.kpi.balance")} />
        <Kpi label={t("mr.dash.kpi.direct")} value={stats ? String(stats.directCount) : "…"}     sub={t("mr.dash.kpi.wallets")} />
        <Kpi label={t("mr.dash.kpi.teamTotal")} value={stats ? String(stats.totalDownstreamCount) : "…"} sub={t("mr.dash.kpi.inclIndirect")} />
        <Kpi label={t("mr.dash.kpi.teamInvested")} value={stats ? `$${fmtUsdt(stats.totalDownstreamInvested, 0)}` : "…"} sub={t("mr.dash.kpi.allTime")} highlight />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Owned node */}
        <Card className="bg-card/70 backdrop-blur border-border">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-400" /> {t("mr.dash.owned.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            {hasPurchased && nodeId ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className={`text-[10px] font-mono uppercase tracking-[0.22em] ${NODE_META[nodeId as NodeId]?.color ?? "text-foreground"}`}>
                      {NODE_META[nodeId as NodeId]?.nameEn}
                    </p>
                    <p className="text-2xl font-bold mt-1">{NODE_META[nodeId as NodeId]?.nameCn}</p>
                  </div>
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-border/30">
                  <div>
                    <p className="text-muted-foreground/60 uppercase text-[10px] tracking-widest mb-0.5">{t("mr.dash.owned.paid")}</p>
                    <p className="num text-foreground">${amount ? fmtUsdt(amount, 0) : "—"} USDT</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground/60 uppercase text-[10px] tracking-widest mb-0.5">{t("mr.dash.owned.purchased")}</p>
                    <p className="num text-foreground">{payTime ? new Date(Number(payTime) * 1000).toLocaleDateString() : "—"}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t("mr.dash.owned.noneYet")}
                <br />
                <Button size="sm" variant="link" onClick={() => (window.location.href = "/recruit")} className="text-amber-400">
                  {t("mr.dash.owned.goRecruit")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referral link */}
        <Card className="bg-card/70 backdrop-blur border-border">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-amber-400" /> {t("mr.dash.ref.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("mr.dash.ref.desc")}
            </p>
            <div className="flex gap-2">
              <div className="flex-1 rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-[11px] font-mono text-foreground/80 truncate">
                {referralUrl}
              </div>
              <Button size="sm" variant="outline" onClick={copyLink} className="gap-1.5 shrink-0">
                {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? t("mr.dash.ref.copied") : t("mr.dash.ref.copy")}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/30">
              <div className="text-xs text-muted-foreground">
                <span className="opacity-60 uppercase text-[10px] tracking-widest block">{t("mr.dash.ref.upstream")}</span>
                {isRoot ? (
                  <span className="text-amber-300 font-semibold">ROOT</span>
                ) : isBound && referrer ? (
                  <a
                    href={`${runeChain.blockExplorers?.[0]?.url ?? "https://bscscan.com"}/address/${referrer}`}
                    target="_blank" rel="noreferrer"
                    className="font-mono text-foreground hover:text-amber-400 inline-flex items-center gap-1"
                  >
                    {short(referrer)} <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">{t("mr.dash.ref.notBound")}</span>
                )}
              </div>
              {navigator.share && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5"
                  onClick={() => navigator.share({ title: t("mr.dash.ref.shareTitle"), url: referralUrl }).catch(() => {})}
                >
                  <Share2 className="h-3.5 w-3.5" /> {t("mr.dash.ref.share")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Team tab — recursive downstream tree
──────────────────────────────────────────────────────────────────────────── */

/** One node in the tree. Children are fetched lazily when expanded. */
function TeamNode({ row, depth }: { row: ReferrerRow; depth: number }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const { data: children, isLoading } = useTeam(open ? row.user : undefined);

  return (
    <div className="relative" style={{ marginLeft: depth === 0 ? 0 : 16 }}>
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-lg border transition-colors cursor-pointer ${
          open ? "border-amber-700/40 bg-amber-950/10" : "border-border/40 bg-card/30 hover:border-border/70"
        }`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`text-[11px] font-mono transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
        <CopyableAddress address={row.user} short />
        <span className="text-[10px] text-muted-foreground ml-auto">
          {new Date(row.boundAt).toLocaleDateString()}
        </span>
      </div>
      {open && (
        <div className="pl-3 border-l border-border/20 mt-1 space-y-1">
          {isLoading ? (
            <p className="text-[11px] text-muted-foreground py-1 px-2">{t("mr.dash.team.loadingShort")}</p>
          ) : !children || children.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/70 py-1 px-2">{t("mr.dash.team.noDownstream")}</p>
          ) : (
            children.map((child) => <TeamNode key={child.user} row={child} depth={depth + 1} />)
          )}
        </div>
      )}
    </div>
  );
}

function TeamTab({ address }: { address: string }) {
  const { t } = useLanguage();
  const { data: directTeam, isLoading } = useTeam(address);
  const { data: stats } = usePersonalStats(address);

  return (
    <div className="space-y-5">
      {/* 6-card grid per spec: headcount × 2, invest volume × 2, commission × 2.
          On desktop this sits on a single row (grid-cols-6); on tablet we drop
          to 3 columns so each cell stays legible; on mobile it stacks 2-wide. */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi label={t("mr.dash.team.direct")}            value={stats ? String(stats.directCount) : "…"}                          sub={t("mr.dash.team.firstLayer")} />
        <Kpi label={t("mr.dash.team.total")}             value={stats ? String(stats.totalDownstreamCount) : "…"}                 sub={t("mr.dash.team.recursive")}  />
        <Kpi label={t("mr.dash.team.directInvested")}    value={stats ? `$${fmtUsdt(stats.directTotalInvested, 0)}` : "…"}        sub="USDT" />
        <Kpi label={t("mr.dash.team.teamInvested")}      value={stats ? `$${fmtUsdt(stats.totalDownstreamInvested, 0)}` : "…"}    sub="USDT" />
        <Kpi label={t("mr.dash.team.directCommission")}  value={stats ? `$${fmtUsdt(stats.directCommission, 2)}` : "…"}           sub="USDT" highlight />
        <Kpi label={t("mr.dash.team.teamCommission")}    value={stats ? `$${fmtUsdt(stats.teamCommission, 2)}` : "…"}             sub="USDT" highlight />
      </div>

      <Card className="bg-card/70 backdrop-blur border-border">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-400" /> {t("mr.dash.team.treeTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-1">
          {/* Root node — the connected wallet itself. Expanding it loads
              the direct team (already pre-fetched via useTeam above, but
              TeamNode re-fetches per-user via its own hook when opened). */}
          <SelfRootNode address={address} directCount={stats?.directCount ?? directTeam?.length ?? 0} />
          {/* Keep the old flat list below the root so users can scan all
              direct downlines without expanding the tree. Nested levels
              still lazy-load via each TeamNode's own useTeam(open). */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t("mr.dash.team.loading")}</p>
          ) : !directTeam || directTeam.length === 0 ? null : null}
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground/50 text-center">
        {t("mr.dash.team.treeNote")}
      </p>
    </div>
  );
}

/**
 * Top-of-tree node rendering the connected wallet as the root. Expanding
 * it lazy-loads `team(address)` and renders each direct downline as a
 * nested <TeamNode/>, which in turn lazy-loads its own children.
 */
function SelfRootNode({ address, directCount }: { address: string; directCount: number }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(true); // default open so the first-level is visible
  const { data: children, isLoading } = useTeam(open ? address : undefined);

  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-lg border border-amber-700/50 bg-amber-950/20 cursor-pointer flex-wrap"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`text-[11px] font-mono transition-transform ${open ? "rotate-90" : ""} text-amber-300`}>▸</span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-amber-300/70 font-semibold">
          {t("mr.dash.team.rootSelf")}
        </span>
        <CopyableAddress address={address} short className="!border-amber-700/40 !bg-amber-950/30 !text-amber-100" />
        <span className="text-[10px] text-amber-300/60 ml-auto">
          {directCount} {t("mr.dash.team.directShort")}
        </span>
      </div>
      {open && (
        <div className="pl-3 border-l border-amber-700/30 mt-1 space-y-1">
          {isLoading ? (
            <p className="text-[11px] text-muted-foreground py-1 px-2">{t("mr.dash.team.loadingShort")}</p>
          ) : !children || children.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/70 py-2 px-2">{t("mr.dash.team.noInvitees")}</p>
          ) : (
            children.map((child) => <TeamNode key={child.user} row={child} depth={1} />)
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Rewards tab — per-payout detail of direct-commission USDT earned
──────────────────────────────────────────────────────────────────────────── */
function RewardsTab({ address }: { address: string }) {
  const { t } = useLanguage();
  const { data: stats } = usePersonalStats(address);
  const { data: rewards, isLoading } = useRewards(address);

  // Break the rewards list down by tier so the summary shows "where your
  // commissions came from" — derived client-side from the same rows the
  // table below renders so numbers can never drift.
  const byTier = new Map<number, { count: number; commission: bigint }>();
  for (const r of rewards ?? []) {
    const entry = byTier.get(r.nodeId) ?? { count: 0, commission: 0n };
    entry.count += 1;
    entry.commission += BigInt(r.commission);
    byTier.set(r.nodeId, entry);
  }

  return (
    <div className="space-y-5">
      {/* Top summary — three tiles the user already sees elsewhere, but
          with the rewards-tab framing. Total earned mirrors
          personalStats.directCommission; count mirrors directPurchaseCount. */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Kpi label={t("mr.dash.reward.total")}   value={stats ? `$${fmtUsdt(stats.directCommission, 2)}` : "…"} sub="USDT" highlight />
        <Kpi label={t("mr.dash.reward.count")}   value={stats ? String(stats.directPurchaseCount) : "…"}       sub={t("mr.dash.reward.countSub")} />
        <Kpi label={t("mr.dash.reward.teamAll")} value={stats ? `$${fmtUsdt(stats.teamCommission, 2)}` : "…"}  sub="USDT" />
      </div>

      {/* Per-tier breakdown — only render tiers the user has actually
          earned from, so a new wallet doesn't see four empty rows. */}
      {byTier.size > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from(byTier.entries())
            .sort(([a], [b]) => a - b)
            .map(([nodeId, { count, commission }]) => {
              const meta = NODE_META[nodeId as NodeId];
              return (
                <div key={nodeId} className="border border-border/40 bg-card/40 rounded-xl p-4">
                  <div className={`text-[10px] font-mono uppercase tracking-[0.2em] ${meta.color}`}>{meta.nameEn}</div>
                  <div className="text-sm font-bold text-foreground mt-0.5">{meta.nameCn}</div>
                  <div className="num text-lg num-gold mt-2">${fmtUsdt(commission.toString(), 2)}</div>
                  <div className="text-[10px] text-muted-foreground/60 mt-1">
                    {count} × {t("mr.dash.reward.payouts")}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Detail list — each on-chain commission payout as its own row.
          rewards are already ordered by paidAt DESC on the server. */}
      <Card className="bg-card/70 backdrop-blur border-border">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Gift className="h-4 w-4 text-amber-400" /> {t("mr.dash.reward.listTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t("mr.dash.reward.loading")}</p>
          ) : !rewards || rewards.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Gift className="h-8 w-8 mx-auto mb-3 opacity-30" />
              {t("mr.dash.reward.empty")}
            </div>
          ) : (
            <ul className="divide-y divide-border/30">
              {rewards.map((r) => <RewardRowItem key={r.txHash} row={r} />)}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground/50 text-center">
        {t("mr.dash.reward.note")}
      </p>
    </div>
  );
}

function RewardRowItem({ row }: { row: RewardRow }) {
  const { t } = useLanguage();
  const meta = NODE_META[row.nodeId as NodeId];
  const explorerBase = row.chainId === 56
    ? "https://bscscan.com/tx/"
    : "https://testnet.bscscan.com/tx/";
  return (
    <li className="py-3 flex items-center gap-3 flex-wrap">
      <span className={`text-[10px] font-mono uppercase tracking-[0.18em] w-16 shrink-0 ${meta?.color ?? "text-muted-foreground"}`}>
        {meta?.nameEn ?? `#${row.nodeId}`}
      </span>
      <CopyableAddress address={row.downline} short />
      <div className="flex-1 min-w-0" />
      <span className="text-[11px] text-muted-foreground shrink-0">
        {new Date(row.paidAt).toLocaleString()}
      </span>
      <span className="text-[11px] text-muted-foreground/70 shrink-0">
        {(row.directRate / 100).toFixed(row.directRate % 100 === 0 ? 0 : 1)}%
      </span>
      <span className="text-sm font-semibold text-amber-400 shrink-0 tabular-nums">
        +${fmtUsdt(row.commission, 4)}
      </span>
      <a
        href={`${explorerBase}${row.txHash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground/70 hover:text-foreground transition-colors shrink-0"
        title={t("mr.dash.reward.viewTx")}
      >
        <ExternalLink className="h-3 w-3" />
      </a>
    </li>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Shared KPI tile
──────────────────────────────────────────────────────────────────────────── */
function Kpi({ label, value, sub, highlight = false }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="border border-border/50 bg-card/60 rounded-xl p-4 corner-brackets">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70 mb-1.5">{label}</div>
      <div className={`text-xl num ${highlight ? "num-gold" : "text-foreground"}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground/60 mt-1">{sub}</div>}
    </div>
  );
}
