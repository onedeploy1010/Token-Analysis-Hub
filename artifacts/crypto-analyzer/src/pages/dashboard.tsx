import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useLocation } from "wouter";
import { useActiveAccount } from "thirdweb/react";
import { motion, AnimatePresence } from "framer-motion";
import { getAddress } from "thirdweb/utils";
import {
  LayoutDashboard, Users, Copy, CheckCircle2, Share2, ExternalLink,
  TrendingUp, Wallet, Link as LinkIcon, Gift, ChevronRight, Sparkles,
  Coins, DollarSign,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUsdtBalance } from "@/hooks/rune/use-usdt";
import { useReferrerOf } from "@/hooks/rune/use-community";
import { useUserPurchase, useNodeConfigs } from "@/hooks/rune/use-node-presell";
import { useGetRuneOverview } from "@workspace/api-client-react";
import { emitOpenPurchase } from "@/lib/rune/purchase-signal";
import { useTeam, usePersonalStats, useRewards, type ReferrerRow, type RewardRow, type PersonalStats } from "@/hooks/rune/use-team";
import { NODE_META, type NodeId, COMMUNITY_ROOT } from "@/lib/thirdweb/contracts";
import { runeChain } from "@/lib/thirdweb/chains";
import { buildReferralUrl } from "@/hooks/rune/use-referral-param";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";

type Tab = "overview" | "team" | "rewards";

/**
 * Render an address in EIP-55 mixed-case form even though the indexer
 * stores it lowercase — case only matters for display (checksum lets a
 * human spot typos), never for protocol equality. Returns `"—"` for
 * nullish inputs so callers can drop it straight into JSX.
 */
function checksum(a: string | undefined): string {
  if (!a) return "—";
  try {
    return getAddress(a);
  } catch {
    return a;
  }
}

/** Short-hand 0xC8D0…F7eC formatter for dense rows. */
const short = (a: string | undefined) => {
  if (!a) return "—";
  const c = checksum(a);
  return `${c.slice(0, 6)}…${c.slice(-4)}`;
};

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
  /** Display the truncated 0xC8D0…F7eC form but still copy the full 42-char address. */
  short?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  // Always render + copy EIP-55 checksum. The DB stores lowercase for
  // case-insensitive equality, but the UI hands users a checksummed
  // value so pastes back into other dapps/wallets keep the same form.
  const display = checksum(address);
  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(display);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — `select-all` on the full-width variant still
       *  lets the user select-and-copy manually. */
    }
  }
  return (
    <span
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1.5 rounded-md border border-border/40 bg-card/40 px-2 py-0.5 font-mono text-[11px] sm:text-xs ${isShort ? "" : "break-all"} ${className}`}
      title={display}
    >
      <span className={isShort ? "" : "select-all"}>{isShort ? short(address) : display}</span>
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

/**
 * Trio of per-node badges shown inline on every referral-tree row:
 *
 *  [tier + price]  [team headcount]  [umbrella volume]
 *
 * - Tier + price: from stats.ownedNodeId via NODE_META (hidden if unsold).
 * - Headcount:    stats.totalDownstreamCount = this user's transitive subtree.
 * - Umbrella vol: stats.totalDownstreamInvested = sum of every purchase
 *                 anywhere beneath this user, in whole USDT.
 *
 * `accent="amber"` re-skins the strip for the gold self-root row so the
 * user's own card stays visually distinct from grey downline rows.
 */
function TreeNodeBadges({
  stats,
  accent,
}: {
  stats: PersonalStats | undefined;
  accent?: "amber";
}) {
  const { t } = useLanguage();
  if (!stats) return null;
  const meta = stats.ownedNodeId ? NODE_META[stats.ownedNodeId as NodeId] : null;
  const pillBase = accent === "amber"
    ? "border-amber-700/40 bg-amber-950/20 text-amber-100"
    : "border-border/40 bg-card/30 text-foreground/80";
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {meta ? (
        <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] ${pillBase}`} title={`${meta.nameEn} · $${meta.priceUsdt.toLocaleString("en-US")} USDT`}>
          <span className={meta.color}>{meta.nameCn}</span>
          <span className="opacity-60">${(meta.priceUsdt / 1000).toFixed(meta.priceUsdt % 1000 ? 1 : 0)}K</span>
        </span>
      ) : (
        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] opacity-50 ${pillBase}`} title={t("mr.dash.team.noNode")}>
          {t("mr.dash.team.noNode")}
        </span>
      )}
      <span className={`rounded-md border px-1.5 py-0.5 text-[10px] ${pillBase}`} title={t("mr.dash.team.teamCountTip")}>
        👥 {stats.totalDownstreamCount}
      </span>
      <span className={`rounded-md border px-1.5 py-0.5 text-[10px] ${pillBase}`} title={t("mr.dash.team.teamVolumeTip")}>
        💰 ${fmtUsdt(stats.totalDownstreamInvested, 0)}
      </span>
    </div>
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
/**
 * Per-tier theme applied to the dashboard hero banner + rewards highlights.
 *   401 Pioneer   → blue
 *   301 Builder   → green
 *   101 Guardian  → amber
 *   201 Strategic → purple
 *
 * Each entry bundles the CSS fragments framer-motion can hand to className
 * directly, so callers only need `HERO_THEME[nodeId]` and can drop the
 * strings into whichever element needs the color treatment.
 */
const HERO_THEME: Record<NodeId, {
  glow: string; ring: string; from: string; to: string; accent: string; gradient: string;
}> = {
  401: { glow: "shadow-[0_0_80px_rgba(59,130,246,0.28)]",  ring: "border-blue-600/50",   from: "from-blue-950/70",   to: "to-slate-950/95", accent: "text-blue-300",   gradient: "from-blue-500/15 via-blue-700/5 to-transparent" },
  301: { glow: "shadow-[0_0_80px_rgba(34,197,94,0.28)]",    ring: "border-emerald-600/50",from: "from-emerald-950/70",to: "to-slate-950/95", accent: "text-emerald-300",gradient: "from-emerald-500/15 via-emerald-700/5 to-transparent" },
  101: { glow: "shadow-[0_0_80px_rgba(251,191,36,0.32)]",   ring: "border-amber-600/55", from: "from-amber-950/70",  to: "to-slate-950/95", accent: "text-amber-300",  gradient: "from-amber-500/18 via-amber-700/5 to-transparent" },
  201: { glow: "shadow-[0_0_80px_rgba(168,85,247,0.28)]",   ring: "border-purple-600/50",from: "from-purple-950/70", to: "to-slate-950/95", accent: "text-purple-300", gradient: "from-purple-500/15 via-purple-700/5 to-transparent" },
};

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
  const { hasPurchased, isLoading: purchaseLoading, nodeId: ownedNodeId, amount: ownedAmount } = useUserPurchase(address);
  useEffect(() => {
    if (!address) { navigate("/recruit"); return; }
    if (!purchaseLoading && !hasPurchased) {
      navigate("/recruit");
      emitOpenPurchase();
    }
  }, [address, hasPurchased, purchaseLoading, navigate]);

  if (!address || !hasPurchased) return null;

  const meta = ownedNodeId ? NODE_META[ownedNodeId as NodeId] : null;
  const theme = ownedNodeId ? HERO_THEME[ownedNodeId as NodeId] : HERO_THEME[101];

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl space-y-8">
      {/* ── Hero banner ── tier-themed, with slow-pulse glow + big level title.
          Stays stable at first render so reloading mid-session doesn't reshuffle
          the layout; motion is limited to the decorative orb + a single fade-up
          entry on the content block. */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={`relative overflow-hidden rounded-3xl border ${theme.ring} bg-gradient-to-br ${theme.from} ${theme.to} ${theme.glow}`}
      >
        <motion.div
          aria-hidden
          className={`absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br ${theme.gradient} blur-3xl pointer-events-none`}
          animate={{ scale: [0.9, 1.08, 0.9], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_55%)] pointer-events-none" />

        <div className="relative z-10 px-6 py-8 md:px-10 md:py-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-3 min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-foreground/60">
              <Sparkles className="h-3 w-3" /> {t("mr.dash.hub")}
            </span>
            {meta ? (
              <div className="space-y-1">
                <p className={`text-[11px] font-mono uppercase tracking-[0.28em] ${meta.color}`}>{meta.nameEn}</p>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-none">
                  <span className={theme.accent}>{meta.nameCn}</span>
                  <span className="text-foreground/40 text-xl ml-3 font-mono">#{ownedNodeId}</span>
                </h1>
              </div>
            ) : (
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t("mr.dash.title")}</h1>
            )}
            <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap pt-1">
              <Wallet className="h-3.5 w-3.5 shrink-0" />
              <CopyableAddress address={address} />
              <span className="opacity-40">·</span>
              <span>{runeChain.name}</span>
            </div>
          </div>

          {meta && (
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">{t("mr.dash.owned.paid")}</p>
                <p className={`num text-2xl md:text-3xl font-bold tabular-nums ${theme.accent}`}>
                  ${ownedAmount ? fmtUsdt(ownedAmount, 0) : meta.priceUsdt.toLocaleString("en-US")}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">USDT</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

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

      {/* ── Tab panels ── crossfade between panels so the view doesn't snap
          when switching; `mode="wait"` keeps only one panel mounted at a
          time which avoids double-fetching GraphQL hooks. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          {tab === "overview" ? (
            <OverviewTab address={address} />
          ) : tab === "team" ? (
            <TeamTab address={address} />
          ) : (
            <RewardsTab address={address} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Node benefits card — tier-themed, shows the privileges the user
   unlocked by holding their node. Data sources:
     - REST overview (dailyUsdt, airdropPerSeat, privatePrice) — marketing
       metadata that doesn't live on-chain.
     - On-chain `getNodeConfigs().directRate` — canonical bps rate the
       contract will actually pay out.
──────────────────────────────────────────────────────────────────────────── */
function NodeBenefitsCard({ ownedNodeId }: { ownedNodeId: number | undefined }) {
  const { t } = useLanguage();
  const { data: overview } = useGetRuneOverview();
  const { data: configs } = useNodeConfigs();

  if (!ownedNodeId) {
    return (
      <Card className="bg-card/70 backdrop-blur border-border">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" /> {t("mr.dash.owned.benefitsTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {t("mr.dash.owned.noneYet")}
        </CardContent>
      </Card>
    );
  }

  const meta = NODE_META[ownedNodeId as NodeId];
  const theme = HERO_THEME[ownedNodeId as NodeId];
  const level = meta?.level;
  const def = overview?.nodes?.find((n) => n.level === level);
  const cfg = (configs as any)?.find?.((c: { nodeId: bigint }) => Number(c.nodeId) === ownedNodeId);
  const rateBps = cfg ? Number(cfg.directRate) : undefined;

  return (
    <Card className={`relative overflow-hidden bg-gradient-to-br ${theme.from} ${theme.to} border ${theme.ring}`}>
      <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br ${theme.gradient} blur-3xl pointer-events-none`} />
      <CardHeader className="pb-3 border-b border-border/40 relative z-10">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className={`h-4 w-4 ${theme.accent}`} />
          <span>{t("mr.dash.owned.benefitsTitle")}</span>
          {meta && (
            <span className={`ml-auto text-[10px] font-mono uppercase tracking-[0.2em] ${meta.color}`}>
              {meta.nameCn} · {meta.nameEn}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-5 relative z-10">
        <div className="grid grid-cols-2 gap-4">
          <BenefitRow icon={DollarSign} label={t("mr.dash.owned.daily")}    value={def ? `$${def.dailyUsdt}` : "—"} sub="USDT / day" theme={theme} />
          <BenefitRow icon={TrendingUp} label={t("mr.dash.owned.total180")} value={def ? `$${(def.dailyUsdt * 180).toLocaleString("en-US")}` : "—"} sub="180 days" theme={theme} highlight />
          <BenefitRow icon={Gift}       label={t("mr.dash.owned.airdrop")}  value={def ? def.airdropPerSeat.toLocaleString("en-US") : "—"} sub="SUB" theme={theme} />
          <BenefitRow icon={Coins}      label={t("mr.dash.owned.rate")}     value={rateBps !== undefined ? `${(rateBps / 100).toFixed(rateBps % 100 === 0 ? 0 : 1)}%` : "—"} sub={t("mr.dash.owned.rateSub")} theme={theme} highlight />
        </div>
      </CardContent>
    </Card>
  );
}

function BenefitRow({
  icon: Icon,
  label,
  value,
  sub,
  theme,
  highlight = false,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  theme: typeof HERO_THEME[NodeId];
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/30 bg-card/30 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/70 mb-1.5">
        <Icon className="h-3 w-3" />
        <span>{label}</span>
      </div>
      <div className={`text-xl font-bold tabular-nums ${highlight ? theme.accent : "text-foreground"}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</div>}
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
  const { nodeId } = useUserPurchase(address);
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
        <Kpi icon={Wallet}      label="USDT"                             value={`${fmtUsdt(usdtRaw as bigint | undefined, 2)}`}                  sub={t("mr.dash.kpi.balance")} />
        <Kpi icon={Users}       label={t("mr.dash.kpi.direct")}          value={stats ? String(stats.directCount) : "…"}                        sub={t("mr.dash.kpi.wallets")} />
        <Kpi icon={Users}       label={t("mr.dash.kpi.teamTotal")}       value={stats ? String(stats.totalDownstreamCount) : "…"}               sub={t("mr.dash.kpi.inclIndirect")} />
        <Kpi icon={TrendingUp}  label={t("mr.dash.kpi.teamInvested")}    value={stats ? `$${fmtUsdt(stats.totalDownstreamInvested, 0)}` : "…"}  sub={t("mr.dash.kpi.allTime")} highlight />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Node benefits — the tier + price is already on the hero banner,
            so this card surfaces the actual privileges the user unlocked
            by holding the node: daily USDT payout, 180-day total, sub-token
            airdrop per seat, and the direct-commission rate they earn when
            a downline buys. */}
        <NodeBenefitsCard ownedNodeId={nodeId} />

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
   Team tab — drill-down navigation

   Instead of an ever-nesting tree that runs off the screen past ~4 levels,
   we keep the view flat: one "focus" wallet at a time with its direct
   downlines listed below, and a horizontal breadcrumb that shows the
   referral chain from the connected root wallet to the current focus.
   Click any downline to drill into it; click any breadcrumb segment to
   jump back up. The root (you) is always the first segment, even when
   you've descended many levels, so it's trivial to reset.
──────────────────────────────────────────────────────────────────────────── */
function TeamTab({ address }: { address: string }) {
  const { t } = useLanguage();
  // The referral chain: path[0] is always the connected wallet (root),
  // path[path.length-1] is the wallet currently being inspected. Drilling
  // appends; breadcrumb clicks truncate.
  const [path, setPath] = useState<string[]>([address.toLowerCase()]);
  // If the connected wallet changes (switch accounts), reset the chain so
  // we don't show the previous account's drill-in state.
  useEffect(() => { setPath([address.toLowerCase()]); }, [address]);

  const current = path[path.length - 1];
  const { data: stats } = usePersonalStats(current);
  const rootStats = usePersonalStats(path[0]).data;
  const { data: children, isLoading } = useTeam(current);

  function drillInto(child: string) {
    setPath((p) => [...p, child.toLowerCase()]);
  }
  function jumpTo(index: number) {
    setPath((p) => p.slice(0, index + 1));
  }

  return (
    <div className="space-y-5">
      {/* Root stats — always reflect the connected wallet, never the current
          drill-down focus. 6 cards keep the overview consistent when the
          user descends into someone else's team. */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi icon={Users}       label={t("mr.dash.team.direct")}            value={rootStats ? String(rootStats.directCount) : "…"}                          sub={t("mr.dash.team.firstLayer")} />
        <Kpi icon={Users}       label={t("mr.dash.team.total")}             value={rootStats ? String(rootStats.totalDownstreamCount) : "…"}                 sub={t("mr.dash.team.recursive")}  />
        <Kpi icon={Coins}       label={t("mr.dash.team.directInvested")}    value={rootStats ? `$${fmtUsdt(rootStats.directTotalInvested, 0)}` : "…"}        sub="USDT" />
        <Kpi icon={TrendingUp}  label={t("mr.dash.team.teamInvested")}      value={rootStats ? `$${fmtUsdt(rootStats.totalDownstreamInvested, 0)}` : "…"}    sub="USDT" />
        <Kpi icon={Gift}        label={t("mr.dash.team.directCommission")}  value={rootStats ? `$${fmtUsdt(rootStats.directCommission, 2)}` : "…"}           sub="USDT" highlight />
        <Kpi icon={Sparkles}    label={t("mr.dash.team.teamCommission")}    value={rootStats ? `$${fmtUsdt(rootStats.teamCommission, 2)}` : "…"}             sub="USDT" highlight />
      </div>

      <Card className="bg-card/70 backdrop-blur border-border">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-400" /> {t("mr.dash.team.treeTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Referral-chain breadcrumb. Always shows "Root (You)" as the
              first chip; subsequent chips are drilled-in wallets. The last
              chip is non-clickable since it IS the current view. */}
          <TeamBreadcrumb path={path} onJump={jumpTo} />

          {/* Focused wallet header — the current inspection target with its
              full badge strip. When focus === root, keep the amber accent so
              the "this is you" framing stays obvious. */}
          <FocusHeader
            address={current}
            isSelf={current === path[0]}
            stats={stats}
          />

          {/* Direct downlines of the current focus. Each row is clickable
              to drill in; keyboard / screen readers get a button role. */}
          <div className="space-y-1">
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{t("mr.dash.team.loading")}</p>
            ) : !children || children.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Users className="h-6 w-6 mx-auto mb-2 opacity-30" />
                {current === path[0] ? t("mr.dash.team.noInvitees") : t("mr.dash.team.noDownstream")}
              </div>
            ) : (
              children.map((child) => (
                <TeamRow key={child.user} row={child} onDrill={() => drillInto(child.user)} />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground/50 text-center">
        {t("mr.dash.team.treeNote")}
      </p>
    </div>
  );
}

/** Horizontal chain: Root (You) › 0xA… › 0xB… › current.
 *  Each non-terminal segment is a button that truncates `path` back to its
 *  index; the terminal segment is rendered as plain text. */
function TeamBreadcrumb({ path, onJump }: { path: string[]; onJump: (index: number) => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-1 flex-wrap text-xs">
      {path.map((addr, i) => {
        const isLast = i === path.length - 1;
        const isRoot = i === 0;
        const label = isRoot ? t("mr.dash.team.rootSelf") : short(addr);
        return (
          <div key={`${addr}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
            {isLast ? (
              <span className={`font-mono px-2 py-1 rounded-md text-[11px] ${
                isRoot
                  ? "bg-amber-950/30 border border-amber-700/40 text-amber-200"
                  : "bg-card/60 border border-border/50 text-foreground"
              }`}>
                {label}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onJump(i)}
                className={`font-mono px-2 py-1 rounded-md text-[11px] transition-colors ${
                  isRoot
                    ? "text-amber-300/80 hover:text-amber-300 hover:bg-amber-950/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                }`}
              >
                {label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The current focus's summary: address + owned-tier + team badges. Renders
 *  the amber "you are here" styling when the focus is the root wallet. */
function FocusHeader({
  address,
  isSelf,
  stats,
}: {
  address: string;
  isSelf: boolean;
  stats: PersonalStats | undefined;
}) {
  const { t } = useLanguage();
  return (
    <div className={`rounded-xl border p-3 flex items-center gap-3 flex-wrap ${
      isSelf
        ? "border-amber-700/50 bg-amber-950/20"
        : "border-border/50 bg-card/40"
    }`}>
      {isSelf && (
        <span className="text-[10px] uppercase tracking-[0.2em] text-amber-300/70 font-semibold">
          {t("mr.dash.team.rootSelf")}
        </span>
      )}
      <CopyableAddress
        address={address}
        short
        className={isSelf ? "!border-amber-700/40 !bg-amber-950/30 !text-amber-100" : ""}
      />
      <TreeNodeBadges stats={stats} accent={isSelf ? "amber" : undefined} />
      <span className="text-[10px] text-muted-foreground ml-auto">
        {stats ? `${stats.directCount} ${t("mr.dash.team.directShort")}` : ""}
      </span>
    </div>
  );
}

/** A single direct-downline row. Clicking drills into that wallet — the
 *  parent TeamTab pushes it onto the breadcrumb path and rerenders with
 *  the new focus. Badges come from `personalStats(row.user)` so users can
 *  scan who's worth drilling into without actually drilling. */
function TeamRow({ row, onDrill }: { row: ReferrerRow; onDrill: () => void }) {
  const { data: stats } = usePersonalStats(row.user);
  return (
    <button
      type="button"
      onClick={onDrill}
      className="w-full flex items-center gap-2 py-2 px-3 rounded-lg border border-border/40 bg-card/30 hover:border-amber-600/50 hover:bg-amber-950/10 transition-colors flex-wrap text-left group"
    >
      <CopyableAddress address={row.user} short />
      <TreeNodeBadges stats={stats} />
      <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1.5">
        {new Date(row.boundAt).toLocaleDateString()}
        <ChevronRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:text-amber-400 transition-all" />
      </span>
    </button>
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
        <Kpi icon={Gift}       label={t("mr.dash.reward.total")}   value={stats ? `$${fmtUsdt(stats.directCommission, 2)}` : "…"} sub="USDT" highlight />
        <Kpi icon={DollarSign} label={t("mr.dash.reward.count")}   value={stats ? String(stats.directPurchaseCount) : "…"}       sub={t("mr.dash.reward.countSub")} />
        <Kpi icon={Sparkles}   label={t("mr.dash.reward.teamAll")} value={stats ? `$${fmtUsdt(stats.teamCommission, 2)}` : "…"}  sub="USDT" />
      </div>

      {/* Per-tier breakdown — only render tiers the user has actually
          earned from, so a new wallet doesn't see four empty rows.
          Gradient bg + fade-up per card so the strip reads as a
          first-class breakdown rather than plain chip row. */}
      {byTier.size > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from(byTier.entries())
            .sort(([a], [b]) => a - b)
            .map(([nodeId, { count, commission }], idx) => {
              const meta = NODE_META[nodeId as NodeId];
              const theme = HERO_THEME[nodeId as NodeId];
              return (
                <motion.div
                  key={nodeId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -2 }}
                  className={`relative overflow-hidden rounded-xl border ${theme.ring} bg-gradient-to-br ${theme.from} ${theme.to} p-4 transition-shadow hover:${theme.glow}`}
                >
                  <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${theme.gradient} blur-2xl pointer-events-none`} />
                  <div className="relative z-10">
                    <div className={`text-[10px] font-mono uppercase tracking-[0.2em] ${meta.color}`}>{meta.nameEn}</div>
                    <div className="text-sm font-bold text-foreground mt-0.5">{meta.nameCn}</div>
                    <div className={`num text-xl font-bold mt-2 tabular-nums ${theme.accent}`}>${fmtUsdt(commission.toString(), 2)}</div>
                    <div className="text-[10px] text-muted-foreground/70 mt-1">
                      {count} × {t("mr.dash.reward.payouts")}
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </div>
      )}

      {/* Monthly commission trend — last 6 months bucketed from the same
          rewards list. Tier-coloured bars stack by (month, nodeId) so the
          shape of earnings-by-tier shows up at a glance. Recharts handles
          responsive sizing; we pin height so the card stays stable. */}
      {rewards && rewards.length > 0 && (
        <Card className="bg-card/70 backdrop-blur border-border">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-400" /> {t("mr.dash.reward.monthlyTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <MonthlyRewardChart rewards={rewards} />
          </CardContent>
        </Card>
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
  const theme = HERO_THEME[row.nodeId as NodeId];
  const explorerBase = row.chainId === 56
    ? "https://bscscan.com/tx/"
    : "https://testnet.bscscan.com/tx/";
  // Only link to the explorer when we actually have a real 0x… hash.
  // Backfilled state rows carry a synthetic `state:` prefix and can't be
  // resolved on-chain, so hide the external-link icon for them.
  const hasRealTx = row.txHash.startsWith("0x");
  return (
    <li className="group py-3 px-2 flex items-center gap-3 flex-wrap rounded-lg transition-colors hover:bg-white/[0.03]">
      <span className={`text-[10px] font-mono uppercase tracking-[0.18em] w-16 shrink-0 ${meta?.color ?? "text-muted-foreground"}`}>
        {meta?.nameEn ?? `#${row.nodeId}`}
      </span>
      <CopyableAddress address={row.downline} short />
      <div className="flex-1 min-w-0" />
      <span className="text-[11px] text-muted-foreground shrink-0">
        {new Date(row.paidAt).toLocaleString()}
      </span>
      <span className="text-[11px] text-muted-foreground/70 shrink-0 font-mono tabular-nums">
        {(row.directRate / 100).toFixed(row.directRate % 100 === 0 ? 0 : 1)}%
      </span>
      <span className={`text-sm font-semibold shrink-0 tabular-nums ${theme?.accent ?? "text-amber-400"}`}>
        +${fmtUsdt(row.commission, 4)}
      </span>
      {hasRealTx ? (
        <a
          href={`${explorerBase}${row.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground/50 hover:text-foreground transition-colors shrink-0 opacity-0 group-hover:opacity-100"
          title={t("mr.dash.reward.viewTx")}
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="w-3 shrink-0" />
      )}
    </li>
  );
}

/** Tailwind token → literal RGB so recharts (which only accepts inline
 *  fill/stroke) can render tier-accented bars that match the rest of the
 *  UI. Kept local since NODE_META only knows Tailwind classes. */
const TIER_FILL: Record<NodeId, string> = {
  101: "#fbbf24", // amber-400
  201: "#c084fc", // purple-400
  301: "#34d399", // emerald-400
  401: "#60a5fa", // blue-400
};

/**
 * Last-6-month commission histogram, grouped by tier. `rewards` is
 * already sorted desc by paidAt — we bucket into YYYY-MM labels and
 * accumulate per-nodeId so each bar stacks its tiers. If the rewards
 * list spans fewer than 6 months, the older buckets just render as
 * empty columns so the x-axis stays stable.
 */
function MonthlyRewardChart({ rewards }: { rewards: RewardRow[] }) {
  const data = useMemo(() => {
    const now = new Date();
    // Build the 6 most recent month keys ending at current month (oldest left).
    const buckets: { key: string; label: string; "101": number; "201": number; "301": number; "401": number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({ key, label: `${d.getMonth() + 1}月`, "101": 0, "201": 0, "301": 0, "401": 0 });
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const r of rewards) {
      const d = new Date(r.paidAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = byKey.get(key);
      if (!bucket) continue; // outside 6-month window
      const whole = Number(BigInt(r.commission) / 10n ** 18n);
      bucket[String(r.nodeId) as "101"] = (bucket[String(r.nodeId) as "101"] ?? 0) + whole;
    }
    return buckets;
  }, [rewards]);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{ background: "#080f1e", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#fbbf24", fontWeight: 600 }}
            formatter={(value: number, name: string) => [`$${value.toLocaleString("en-US")}`, NODE_META[Number(name) as NodeId]?.nameCn ?? name]}
          />
          {(["401", "301", "201", "101"] as const).map((nodeIdStr) => (
            <Bar key={nodeIdStr} dataKey={nodeIdStr} stackId="tier" radius={[0, 0, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={`${nodeIdStr}-${i}`} fill={TIER_FILL[Number(nodeIdStr) as NodeId]} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Shared KPI tile — accepts an optional lucide icon so the strip feels
   less text-heavy. Fades-in on mount and lifts slightly on hover; the
   highlight variant glows gold so critical numbers read even at a glance.
──────────────────────────────────────────────────────────────────────────── */
function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ComponentType<{ className?: string }>;
  highlight?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
      className={`relative border rounded-xl p-4 corner-brackets transition-all ${
        highlight
          ? "border-amber-700/50 bg-gradient-to-br from-amber-950/30 to-card/70 hover:border-amber-500/60 hover:shadow-[0_0_24px_rgba(251,191,36,0.18)]"
          : "border-border/50 bg-card/60 hover:border-border/80 hover:bg-card/80"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground/70">{label}</span>
        {Icon && (
          <Icon className={`h-3.5 w-3.5 ${highlight ? "text-amber-400/80" : "text-muted-foreground/50"}`} />
        )}
      </div>
      <div className={`text-xl num ${highlight ? "num-gold" : "text-foreground"}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground/60 mt-1">{sub}</div>}
    </motion.div>
  );
}
