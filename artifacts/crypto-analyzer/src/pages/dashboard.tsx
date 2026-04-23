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
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
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
      className={`inline-flex items-center gap-1.5 rounded-md border border-border/40 bg-card/40 px-2 py-0.5 font-mono text-[11px] sm:text-xs transition-colors duration-300 ${copied ? "border-emerald-500/50 bg-emerald-500/5" : "hover:border-amber-500/30"} ${isShort ? "" : "break-all"} ${className}`}
      title={display}
    >
      <span className={isShort ? "" : "select-all"}>{isShort ? short(address) : display}</span>
      <button
        type="button"
        onClick={copy}
        className={`rounded-sm transition-all duration-200 shrink-0 ${copied ? "animate-copy-pop text-emerald-400" : "opacity-60 hover:opacity-100 hover:text-amber-400"}`}
        aria-label="Copy address"
      >
        {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
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
  /** Raw "r, g, b" triple mirroring NODE_META.rgb — used for CSS custom
   *  props so shadows/glows can mix the tier colour at arbitrary alpha. */
  rgb: string;
  /** Bright accent-50ish chip foreground, used on ultra-short numeric
   *  readouts where text-*-300 is still a touch dim against the ink bg. */
  accentBright: string;
  /** Per-tier chip background used for tier pills on the hero + reward cards.
   *  Strong enough to register on the dark bg, never competing with `.num-gold`. */
  chip: string;
}> = {
  401: { glow: "shadow-[0_0_80px_rgba(96,165,250,0.32)]",   ring: "border-blue-500/50",    from: "from-blue-950/70",    to: "to-slate-950/95", accent: "text-blue-300",    accentBright: "text-blue-200",    gradient: "from-blue-500/20 via-blue-700/5 to-transparent",    rgb: "96, 165, 250",  chip: "bg-blue-500/10 border-blue-500/40 text-blue-200" },
  301: { glow: "shadow-[0_0_80px_rgba(52,211,153,0.30)]",   ring: "border-emerald-500/50", from: "from-emerald-950/70", to: "to-slate-950/95", accent: "text-emerald-300", accentBright: "text-emerald-200", gradient: "from-emerald-500/20 via-emerald-700/5 to-transparent", rgb: "52, 211, 153",  chip: "bg-emerald-500/10 border-emerald-500/40 text-emerald-200" },
  101: { glow: "shadow-[0_0_80px_rgba(251,191,36,0.38)]",   ring: "border-amber-500/60",   from: "from-amber-950/70",   to: "to-slate-950/95", accent: "text-amber-300",   accentBright: "text-amber-200",   gradient: "from-amber-500/24 via-amber-700/6 to-transparent",   rgb: "251, 191, 36",  chip: "bg-amber-500/10 border-amber-500/45 text-amber-200" },
  201: { glow: "shadow-[0_0_80px_rgba(192,132,252,0.30)]",  ring: "border-purple-500/50",  from: "from-purple-950/70",  to: "to-slate-950/95", accent: "text-purple-300",  accentBright: "text-purple-200",  gradient: "from-purple-500/20 via-purple-700/5 to-transparent",  rgb: "192, 132, 252", chip: "bg-purple-500/10 border-purple-500/40 text-purple-200" },
};

/** Unified easing — every dashboard entrance + hover rides this curve so
 *  the timing reads as coordinated instead of "each component had its own
 *  idea". Matches the project's `.token-card-3d` transition choice. */
const EASE = [0.22, 1, 0.36, 1] as const;

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
          the layout; motion is limited to the decorative orb, a horizontal
          sweep, and a single fade-up entry on the content block.

          Depth recipe:
            1. gradient ink base (`from` → `to`)
            2. two counter-drifting radial orbs (tier accent + slate fill)
            3. inner rim bevel (top-edge highlight + bottom shadow via .surface-3d)
            4. subtle diagonal noise via radial overlay
            5. 8s horizontal sweep streak for a "live" feel */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE }}
        style={{ ["--tier-rgb" as string]: theme.rgb }}
        className={`surface-3d surface-3d-tinted relative overflow-hidden rounded-3xl border ${theme.ring} bg-gradient-to-br ${theme.from} ${theme.to} ${theme.glow}`}
      >
        {/* Pulse orb — top-right, tier-tinted, slow-breathing */}
        <motion.div
          aria-hidden
          className={`absolute -top-28 -right-28 w-[28rem] h-[28rem] rounded-full bg-gradient-to-br ${theme.gradient} blur-3xl pointer-events-none`}
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.55, 0.95, 0.55] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Secondary slate orb — bottom-left, counter-drifts so the banner
            always has *two* light sources rather than one flat wash. */}
        <motion.div
          aria-hidden
          className="absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-gradient-to-tr from-slate-400/5 via-transparent to-transparent blur-3xl pointer-events-none"
          animate={{ scale: [1.05, 0.92, 1.05], opacity: [0.35, 0.65, 0.35] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Top-left specular highlight — fixed, sells the bevel. */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_55%)] pointer-events-none" />
        {/* Horizontal sweep — a thin gold streak rides across every 8s. */}
        <div aria-hidden className="absolute inset-y-0 left-0 right-0 overflow-hidden pointer-events-none">
          <div className="animate-hero-sweep absolute top-0 bottom-0 w-[40%] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent mix-blend-overlay" />
        </div>
        {/* Grid shimmer — faint scanline texture anchored top-right */}
        <div aria-hidden className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 32px)",
            maskImage: "radial-gradient(ellipse at top right, black 10%, transparent 55%)",
            WebkitMaskImage: "radial-gradient(ellipse at top right, black 10%, transparent 55%)",
          }}
        />

        <div className="relative z-10 px-5 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-6">
          <div className="space-y-2 md:space-y-3 min-w-0">
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08, ease: EASE }}
              className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-foreground/60"
            >
              <Sparkles className="h-3 w-3 text-amber-400/90" /> {t("mr.dash.hub")}
            </motion.span>
            {meta ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.14, ease: EASE }}
                className="space-y-1"
              >
                <p className={`text-[11px] font-mono uppercase tracking-[0.32em] ${meta.color} drop-shadow-[0_0_12px_rgba(var(--tier-rgb),0.35)]`}>{meta.nameEn}</p>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-none">
                  <span
                    className={theme.accent}
                    style={{ textShadow: `0 0 32px rgba(${theme.rgb}, 0.35)` }}
                  >
                    {meta.nameCn}
                  </span>
                  <span className="text-foreground/35 text-base sm:text-xl ml-2 sm:ml-3 font-mono tabular-nums">#{ownedNodeId}</span>
                </h1>
              </motion.div>
            ) : (
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">{t("mr.dash.title")}</h1>
            )}
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.22, ease: EASE }}
              className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap pt-1"
            >
              <Wallet className="h-3.5 w-3.5 shrink-0" />
              <CopyableAddress address={address} />
              <span className="opacity-40">·</span>
              <span>{runeChain.name}</span>
            </motion.div>
          </div>

          {meta && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.2, ease: EASE }}
              className="flex items-center gap-4 shrink-0"
            >
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground/70">{t("mr.dash.owned.paid")}</p>
                <p
                  className={`num text-3xl md:text-4xl font-bold tabular-nums ${theme.accentBright} leading-none mt-1`}
                  style={{ textShadow: `0 0 24px rgba(${theme.rgb}, 0.4)` }}
                >
                  ${ownedAmount ? fmtUsdt(ownedAmount, 0) : meta.priceUsdt.toLocaleString("en-US")}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1.5 tracking-[0.18em] uppercase">USDT</p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ── Tabs ── indicator uses `layoutId="dashTab"` so the underline
          morphs between tabs instead of cutting. Active tab also gets a
          soft radial glow beneath its label. */}
      <div className="flex gap-1 border-b border-border/30 relative">
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
              className={`relative px-3 sm:px-5 py-2.5 text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 transition-colors duration-300 ${
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground/90"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="dashTabGlow"
                  aria-hidden
                  className="absolute inset-x-2 -bottom-px top-1 rounded-lg bg-gradient-to-t from-amber-400/10 to-transparent pointer-events-none"
                  transition={{ type: "spring", stiffness: 280, damping: 26 }}
                />
              )}
              <Icon className={`relative h-3.5 w-3.5 transition-colors ${active ? "text-amber-400" : ""}`} />
              <span className="relative">{label}</span>
              {active && (
                <motion.div
                  layoutId="dashTab"
                  className="absolute bottom-[-1px] left-2 right-2 h-[2px] rounded-full bg-gradient-to-r from-amber-500/0 via-amber-400 to-amber-500/0 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: EASE }}
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
    <Card
      style={{ ["--tier-rgb" as string]: theme.rgb }}
      className={`surface-3d surface-3d-tinted relative overflow-hidden bg-gradient-to-br ${theme.from} ${theme.to} border ${theme.ring}`}
    >
      <div className={`absolute -top-20 -right-20 w-56 h-56 rounded-full bg-gradient-to-br ${theme.gradient} blur-3xl pointer-events-none`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_55%)] pointer-events-none" />
      <CardHeader className="pb-3 border-b border-border/40 relative z-10">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className={`h-4 w-4 ${theme.accent}`} />
          <span>{t("mr.dash.owned.benefitsTitle")}</span>
          {meta && (
            <span className={`ml-auto text-[10px] font-mono uppercase tracking-[0.22em] rounded-md border px-2 py-0.5 ${theme.chip}`}>
              {meta.nameCn} · {meta.nameEn}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-5 relative z-10">
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: DollarSign, label: t("mr.dash.owned.daily"),    value: def ? `$${def.dailyUsdt}` : "—",                                                             sub: "USDT / day",       highlight: false },
            { icon: TrendingUp, label: t("mr.dash.owned.total180"), value: def ? `$${(def.dailyUsdt * 180).toLocaleString("en-US")}` : "—",                             sub: "180 days",         highlight: true  },
            { icon: Gift,       label: t("mr.dash.owned.airdrop"),  value: def ? def.airdropPerSeat.toLocaleString("en-US") : "—",                                      sub: "SUB",              highlight: false },
            { icon: Coins,      label: t("mr.dash.owned.rate"),     value: rateBps !== undefined ? `${(rateBps / 100).toFixed(rateBps % 100 === 0 ? 0 : 1)}%` : "—",    sub: t("mr.dash.owned.rateSub"), highlight: true },
          ].map((row, idx) => (
            <BenefitRow
              key={row.label}
              icon={row.icon}
              label={row.label}
              value={row.value}
              sub={row.sub}
              theme={theme}
              highlight={row.highlight}
              delay={0.04 + idx * 0.05}
            />
          ))}
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
  delay = 0,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  theme: typeof HERO_THEME[NodeId];
  highlight?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: EASE }}
      whileHover={{ y: -2 }}
      style={highlight ? { ["--tier-rgb" as string]: theme.rgb } : undefined}
      className={`relative rounded-xl border p-3 overflow-hidden transition-colors duration-300 ${
        highlight
          ? "surface-3d surface-3d-tinted border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01]"
          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20"
      }`}
    >
      {highlight && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            background: `radial-gradient(circle at 85% -20%, rgba(${theme.rgb}, 0.15), transparent 55%)`,
          }}
        />
      )}
      <div className="relative flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/75 mb-1.5">
        <Icon className={`h-3 w-3 ${highlight ? theme.accent : "text-muted-foreground/60"}`} />
        <span>{label}</span>
      </div>
      <div
        className={`relative text-xl font-bold tabular-nums num ${highlight ? theme.accentBright : "text-foreground"}`}
        style={highlight ? { textShadow: `0 0 18px rgba(${theme.rgb}, 0.35)` } : undefined}
      >
        {value}
      </div>
      {sub && <div className="relative text-[10px] text-muted-foreground/60 mt-1 tracking-[0.12em] uppercase">{sub}</div>}
    </motion.div>
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
      {/* KPI strip — cascaded entrances (40ms stagger) so the row
          "lands" as a chord instead of an impact. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={Wallet}      label="USDT"                             value={`${fmtUsdt(usdtRaw as bigint | undefined, 2)}`}                  sub={t("mr.dash.kpi.balance")}       delay={0.02} />
        <Kpi icon={Users}       label={t("mr.dash.kpi.direct")}          value={stats ? String(stats.directCount) : "…"}                        sub={t("mr.dash.kpi.wallets")}       delay={0.06} />
        <Kpi icon={Users}       label={t("mr.dash.kpi.teamTotal")}       value={stats ? String(stats.totalDownstreamCount) : "…"}               sub={t("mr.dash.kpi.inclIndirect")}  delay={0.10} />
        <Kpi icon={TrendingUp}  label={t("mr.dash.kpi.teamInvested")}    value={stats ? `$${fmtUsdt(stats.totalDownstreamInvested, 0)}` : "…"}  sub={t("mr.dash.kpi.allTime")}       delay={0.14} highlight />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Node benefits — the tier + price is already on the hero banner,
            so this card surfaces the actual privileges the user unlocked
            by holding the node: daily USDT payout, 180-day total, sub-token
            airdrop per seat, and the direct-commission rate they earn when
            a downline buys. */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.18, ease: EASE }}>
          <NodeBenefitsCard ownedNodeId={nodeId} />
        </motion.div>

        {/* Referral link — layered bevel card so it reads as the
            companion panel to the benefits card rather than a plain sheet. */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.22, ease: EASE }}>
          <Card className="surface-3d relative overflow-hidden bg-gradient-to-br from-slate-900/80 to-slate-950/90 border-amber-500/20">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br from-amber-500/15 via-amber-700/5 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_55%)] pointer-events-none" />
            <CardHeader className="pb-3 border-b border-border/40 relative z-10">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                {t("mr.dash.ref.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-3 relative z-10">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("mr.dash.ref.desc")}
              </p>
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg border border-amber-500/15 bg-black/40 px-3 py-2 text-[11px] font-mono text-foreground/85 truncate shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_-1px_0_rgba(0,0,0,0.4)]">
                  {referralUrl}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyLink}
                  className={`gap-1.5 shrink-0 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 hover:border-amber-400/60 hover:text-amber-200 transition-all ${copied ? "animate-copy-pop" : ""}`}
                >
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? t("mr.dash.ref.copied") : t("mr.dash.ref.copy")}
                </Button>
              </div>
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/30">
                <div className="text-xs text-muted-foreground">
                  <span className="opacity-60 uppercase text-[10px] tracking-widest block mb-0.5">{t("mr.dash.ref.upstream")}</span>
                  {isRoot ? (
                    <span className="text-amber-300 font-semibold drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]">ROOT</span>
                  ) : isBound && referrer ? (
                    <a
                      href={`${runeChain.blockExplorers?.[0]?.url ?? "https://bscscan.com"}/address/${referrer}`}
                      target="_blank" rel="noreferrer"
                      className="font-mono text-foreground hover:text-amber-400 inline-flex items-center gap-1 transition-colors"
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
                    className="gap-1.5 hover:bg-amber-500/10 hover:text-amber-200"
                    onClick={() => navigator.share({ title: t("mr.dash.ref.shareTitle"), url: referralUrl }).catch(() => {})}
                  >
                    <Share2 className="h-3.5 w-3.5" /> {t("mr.dash.ref.share")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
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
        <Kpi icon={Users}       label={t("mr.dash.team.direct")}            value={rootStats ? String(rootStats.directCount) : "…"}                          sub={t("mr.dash.team.firstLayer")} delay={0.02} />
        <Kpi icon={Users}       label={t("mr.dash.team.total")}             value={rootStats ? String(rootStats.totalDownstreamCount) : "…"}                 sub={t("mr.dash.team.recursive")}  delay={0.06} />
        <Kpi icon={Coins}       label={t("mr.dash.team.directInvested")}    value={rootStats ? `$${fmtUsdt(rootStats.directTotalInvested, 0)}` : "…"}        sub="USDT" delay={0.10} />
        <Kpi icon={TrendingUp}  label={t("mr.dash.team.teamInvested")}      value={rootStats ? `$${fmtUsdt(rootStats.totalDownstreamInvested, 0)}` : "…"}    sub="USDT" delay={0.14} />
        <Kpi icon={Gift}        label={t("mr.dash.team.directCommission")}  value={rootStats ? `$${fmtUsdt(rootStats.directCommission, 2)}` : "…"}           sub="USDT" delay={0.18} highlight />
        <Kpi icon={Sparkles}    label={t("mr.dash.team.teamCommission")}    value={rootStats ? `$${fmtUsdt(rootStats.teamCommission, 2)}` : "…"}             sub="USDT" delay={0.22} highlight />
      </div>

      <Card className="surface-3d relative overflow-hidden bg-gradient-to-br from-slate-900/80 to-slate-950/95 border-amber-500/15">
        <div className="absolute -top-24 -right-16 w-64 h-64 rounded-full bg-gradient-to-br from-amber-500/10 via-transparent to-transparent blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_55%)] pointer-events-none" />
        <CardHeader className="pb-3 border-b border-border/40 relative z-10">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" /> {t("mr.dash.team.treeTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4 relative z-10">
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
            depth={path.length - 1}
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

/** The current focus's summary: address + owned-tier + team badges +
 *  depth label ("ROOT" when isSelf, "第 N 层" otherwise). Renders the
 *  amber "you are here" styling when the focus is the root wallet. */
function FocusHeader({
  address,
  isSelf,
  stats,
  depth,
}: {
  address: string;
  depth: number;
  isSelf: boolean;
  stats: PersonalStats | undefined;
}) {
  const { t } = useLanguage();
  // Keep the header readable down to 320px: stack the address line on top
  // and the badge strip on its own row on mobile; collapse to a single
  // row once we hit `sm` so desktop still reads at a glance.
  return (
    <div className={`relative overflow-hidden rounded-xl border p-3 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3 sm:flex-wrap transition-all duration-300 ${
      isSelf
        ? "border-amber-500/55 bg-gradient-to-br from-amber-950/35 via-amber-950/15 to-slate-950/40 shadow-[inset_0_1px_0_rgba(251,191,36,0.12),0_8px_24px_-12px_rgba(251,191,36,0.3)]"
        : "border-white/10 bg-gradient-to-br from-slate-900/70 to-slate-950/80 hover:border-white/20"
    }`}>
      {isSelf && (
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_55%)] pointer-events-none"
        />
      )}
      <div className="relative flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] uppercase tracking-[0.2em] font-semibold px-1.5 py-0.5 rounded border ${
          isSelf
            ? "text-amber-200 border-amber-500/50 bg-amber-500/10 drop-shadow-[0_0_6px_rgba(251,191,36,0.3)]"
            : "text-muted-foreground border-white/15 bg-white/[0.03]"
        }`}>
          {isSelf ? t("mr.dash.team.rootSelf") : `L${depth}`}
        </span>
        <CopyableAddress
          address={address}
          short
          className={isSelf ? "!border-amber-500/40 !bg-amber-500/10 !text-amber-100" : ""}
        />
      </div>
      <div className="relative flex items-center gap-2 flex-wrap sm:contents">
        <TreeNodeBadges stats={stats} accent={isSelf ? "amber" : undefined} />
        <span className="relative text-[10px] text-muted-foreground sm:ml-auto tabular-nums">
          {stats ? `${stats.directCount} ${t("mr.dash.team.directShort")}` : ""}
        </span>
      </div>
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
    <motion.button
      type="button"
      onClick={onDrill}
      whileHover={{ x: 2 }}
      transition={{ duration: 0.2, ease: EASE }}
      className="w-full flex items-center gap-2 py-2.5 px-3 rounded-lg border border-white/10 bg-white/[0.02] hover:border-amber-500/50 hover:bg-amber-500/[0.06] hover:shadow-[0_4px_20px_-8px_rgba(251,191,36,0.3)] transition-all duration-300 flex-wrap text-left group"
    >
      <CopyableAddress address={row.user} short />
      <TreeNodeBadges stats={stats} />
      <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1.5">
        <span className="tabular-nums">{new Date(row.boundAt).toLocaleDateString()}</span>
        <ChevronRight className="h-3.5 w-3.5 opacity-50 transition-all duration-300 group-hover:opacity-100 group-hover:text-amber-400 group-hover:translate-x-0.5" />
      </span>
    </motion.button>
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
        <Kpi icon={Gift}       label={t("mr.dash.reward.total")}   value={stats ? `$${fmtUsdt(stats.directCommission, 2)}` : "…"} sub="USDT" delay={0.02} highlight />
        <Kpi icon={DollarSign} label={t("mr.dash.reward.count")}   value={stats ? String(stats.directPurchaseCount) : "…"}       sub={t("mr.dash.reward.countSub")} delay={0.06} />
        <Kpi icon={Sparkles}   label={t("mr.dash.reward.teamAll")} value={stats ? `$${fmtUsdt(stats.teamCommission, 2)}` : "…"}  sub="USDT" delay={0.10} />
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.12 + idx * 0.05, ease: EASE }}
                  whileHover={{ y: -3 }}
                  style={{ ["--tier-rgb" as string]: theme.rgb }}
                  className={`group surface-3d surface-3d-tinted relative overflow-hidden rounded-xl border ${theme.ring} bg-gradient-to-br ${theme.from} ${theme.to} p-4 transition-all duration-300`}
                >
                  {/* Orb — counter-tinted, pulses on hover */}
                  <div className={`absolute -top-10 -right-10 w-36 h-36 rounded-full bg-gradient-to-br ${theme.gradient} blur-2xl pointer-events-none transition-all duration-500 group-hover:scale-125`} />
                  {/* Specular top-left for bevel */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_55%)] pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-2">
                      <div className={`text-[10px] font-mono uppercase tracking-[0.22em] ${meta.color}`}>{meta.nameEn}</div>
                      <span className={`text-[9px] font-mono rounded border px-1.5 py-0.5 tabular-nums ${theme.chip}`}>#{nodeId}</span>
                    </div>
                    <div className="text-sm font-bold text-foreground/90 mt-0.5">{meta.nameCn}</div>
                    <div
                      className={`num text-2xl font-bold mt-3 tabular-nums ${theme.accentBright}`}
                      style={{ textShadow: `0 0 18px rgba(${theme.rgb}, 0.4)` }}
                    >
                      ${fmtUsdt(commission.toString(), 2)}
                    </div>
                    <div className="text-[10px] text-muted-foreground/70 mt-1.5 tracking-[0.12em] uppercase tabular-nums">
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3, ease: EASE }}
        >
          <Card className="surface-3d relative overflow-hidden bg-gradient-to-br from-slate-900/80 to-slate-950/95 border-amber-500/15">
            <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-gradient-to-br from-amber-500/8 via-transparent to-transparent blur-3xl pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_55%)] pointer-events-none" />
            <CardHeader className="pb-3 border-b border-border/40 relative z-10">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" /> {t("mr.dash.reward.monthlyTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 relative z-10">
              <MonthlyRewardChart rewards={rewards} />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Detail list — each on-chain commission payout as its own row.
          rewards are already ordered by paidAt DESC on the server. */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.35, ease: EASE }}
      >
        <Card className="surface-3d relative overflow-hidden bg-gradient-to-br from-slate-900/80 to-slate-950/95 border-amber-500/15">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.04),transparent_55%)] pointer-events-none" />
          <CardHeader className="pb-3 border-b border-border/40 relative z-10">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gift className="h-4 w-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" /> {t("mr.dash.reward.listTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 relative z-10">
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
      </motion.div>

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
  // Mobile: 2-row layout so nothing truncates past a 320px viewport.
  //   row-1: tier tag · address · amount
  //   row-2: date · rate · explorer icon
  // Desktop (sm+): single line so the detail list stays dense.
  return (
    <li className="group relative py-3 px-3 rounded-lg transition-all duration-300 hover:bg-white/[0.04] hover:translate-x-0.5">
      {/* Tier-colored left edge — appears on hover to confirm the row is interactive */}
      <span
        aria-hidden
        className={`absolute left-0 top-2 bottom-2 w-[2px] rounded-full opacity-0 group-hover:opacity-80 transition-opacity duration-300`}
        style={theme ? { backgroundColor: `rgb(${theme.rgb})`, boxShadow: `0 0 8px rgba(${theme.rgb}, 0.6)` } : undefined}
      />
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <span className={`text-[10px] font-mono uppercase tracking-[0.2em] w-14 sm:w-16 shrink-0 ${meta?.color ?? "text-muted-foreground"}`}>
          {meta?.nameEn ?? `#${row.nodeId}`}
        </span>
        <CopyableAddress address={row.downline} short />
        <span
          className={`ml-auto text-sm font-semibold shrink-0 tabular-nums num ${theme?.accentBright ?? "text-amber-300"}`}
          style={theme ? { textShadow: `0 0 12px rgba(${theme.rgb}, 0.35)` } : undefined}
        >
          +${fmtUsdt(row.commission, 4)}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-wrap mt-1.5 pl-[calc(3.5rem+0.5rem)] sm:pl-[calc(4rem+0.75rem)] text-[11px] text-muted-foreground/70">
        <span className="tabular-nums">{new Date(row.paidAt).toLocaleString()}</span>
        <span className="font-mono tabular-nums opacity-80">
          {(row.directRate / 100).toFixed(row.directRate % 100 === 0 ? 0 : 1)}%
        </span>
        {hasRealTx && (
          <a
            href={`${explorerBase}${row.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-muted-foreground/60 hover:text-amber-400 transition-colors inline-flex items-center gap-1"
            title={t("mr.dash.reward.viewTx")}
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
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
 * Monthly commission chart, anchored at April 2026 (the earliest real
 * activity) and extended through the current month. Each tier is its own
 * stacked area with a gradient fill and a subtle glow; recharts' SMOOTH
 * monotone interpolation gives the curve a crypto-dashboard feel instead
 * of the blocky stacked bars the first pass shipped.
 *
 * Months with no data render as zero-height slivers so the timeline is
 * continuous — users can see exactly when activity picked up.
 */
const TREND_START = { year: 2026, month: 3 }; // April = month index 3 in Date
type TrendDatum = { key: string; label: string; total: number; "101": number; "201": number; "301": number; "401": number };

function MonthlyRewardChart({ rewards }: { rewards: RewardRow[] }) {
  const data = useMemo<TrendDatum[]>(() => {
    const now = new Date();
    const start = new Date(TREND_START.year, TREND_START.month, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    // At least 6 columns even if the project is only a month old, so the
    // chart never looks squashed.
    const buckets: TrendDatum[] = [];
    const cursor = new Date(start);
    while (cursor <= end || buckets.length < 6) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({ key, label: `${cursor.getMonth() + 1}月`, total: 0, "101": 0, "201": 0, "301": 0, "401": 0 });
      cursor.setMonth(cursor.getMonth() + 1);
      if (buckets.length >= 18) break; // hard cap so a stale clock can't runaway
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const r of rewards) {
      const d = new Date(r.paidAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = byKey.get(key);
      if (!bucket) continue;
      const whole = Number(BigInt(r.commission) / 10n ** 18n);
      const nKey = String(r.nodeId) as "101";
      bucket[nKey] = (bucket[nKey] ?? 0) + whole;
      bucket.total += whole;
    }
    return buckets;
  }, [rewards]);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            {(Object.keys(TIER_FILL) as unknown as NodeId[]).map((id) => {
              const c = TIER_FILL[id as NodeId];
              return (
                <linearGradient id={`tier-${id}`} key={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={0.75} />
                  <stop offset="55%" stopColor={c} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={c} stopOpacity={0.01} />
                </linearGradient>
              );
            })}
            {/* Soft glow overlay reused for the total-line emphasis. */}
            <filter id="areaGlow" x="-10%" y="-10%" width="120%" height="130%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 5" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="rgba(255,255,255,0.35)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            dy={4}
          />
          <YAxis
            stroke="rgba(255,255,255,0.35)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
            width={48}
          />
          <Tooltip
            cursor={{ stroke: "rgba(251,191,36,0.35)", strokeWidth: 1 }}
            contentStyle={{
              background: "rgba(8, 15, 30, 0.95)",
              border: "1px solid rgba(251,191,36,0.35)",
              borderRadius: 10,
              fontSize: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
            labelStyle={{ color: "#fbbf24", fontWeight: 600, marginBottom: 4 }}
            formatter={(value: number, name: string) => {
              if (name === "total") return [`$${value.toLocaleString("en-US")}`, "合计"];
              return [`$${value.toLocaleString("en-US")}`, NODE_META[Number(name) as NodeId]?.nameCn ?? name];
            }}
          />
          {(["401", "301", "201", "101"] as const).map((id) => (
            <Area
              key={id}
              type="monotone"
              dataKey={id}
              stackId="tier"
              stroke={TIER_FILL[Number(id) as NodeId]}
              strokeWidth={1.5}
              fill={`url(#tier-${id})`}
              filter="url(#areaGlow)"
              animationDuration={800}
            />
          ))}
        </AreaChart>
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
  delay = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ComponentType<{ className?: string }>;
  highlight?: boolean;
  /** Stagger offset (seconds) so rows of Kpis cascade rather than all land
   *  together. Caller supplies 0.04–0.06s increments for a chord effect. */
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: EASE }}
      whileHover={{ y: -3 }}
      className={`group relative border rounded-xl p-4 corner-brackets overflow-hidden surface-3d transition-all duration-300 ${
        highlight
          ? "border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-slate-900/80 to-slate-950/90 hover:border-amber-400/60 hover:shadow-[0_0_28px_rgba(251,191,36,0.25),inset_0_1px_0_rgba(251,191,36,0.15)]"
          : "border-white/10 bg-gradient-to-br from-slate-900/70 to-slate-950/85 hover:border-white/25 hover:bg-slate-900/80"
      }`}
    >
      {/* Hover glow aurora — appears behind content on hover */}
      <div
        aria-hidden
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${
          highlight
            ? "bg-[radial-gradient(circle_at_75%_-20%,rgba(251,191,36,0.18),transparent_55%)]"
            : "bg-[radial-gradient(circle_at_75%_-20%,rgba(255,255,255,0.06),transparent_55%)]"
        }`}
      />
      <div className="relative flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">{label}</span>
        {Icon && (
          <Icon className={`h-3.5 w-3.5 transition-colors ${highlight ? "text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.45)]" : "text-muted-foreground/55 group-hover:text-foreground/80"}`} />
        )}
      </div>
      <div className={`relative text-xl num tabular-nums ${highlight ? "num-gold" : "text-foreground"}`}>{value}</div>
      {sub && <div className="relative text-[10px] text-muted-foreground/60 mt-1 tracking-[0.14em] uppercase">{sub}</div>}
    </motion.div>
  );
}
