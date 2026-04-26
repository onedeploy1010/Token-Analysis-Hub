import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useLocation } from "wouter";
import { useActiveAccount } from "thirdweb/react";
import { motion, AnimatePresence } from "framer-motion";
import { getAddress } from "thirdweb/utils";
import {
  LayoutDashboard, Users, Copy, CheckCircle2, Share2, ExternalLink,
  TrendingUp, Wallet, Link as LinkIcon, Gift, ChevronRight, Sparkles,
  Coins, DollarSign, Search, ArrowUp, ArrowDown, Zap, FlaskConical, X,
} from "lucide-react";
import { useDemoStore } from "@/lib/demo-store";
import {
  ComposedChart, Bar, Line, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUsdtBalance } from "@/hooks/rune/use-usdt";
import { useReferrerOf } from "@/hooks/rune/use-community";
import { useUserPurchase, useNodeConfigs, type NodeConfig } from "@/hooks/rune/use-node-presell";
import { useGetRuneOverview } from "@rune/api-client-react";
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

/** Inline BSC mark — four yellow diamonds in the official layout. Tiny
 *  stylised version that reads cleanly at 14-16 px next to the chain
 *  name. Kept local since `lucide-react` doesn't ship a BSC icon and
 *  we only need the one. */
function BscLogo({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="#F3BA2F" aria-hidden className={className}>
      <path d="M12 2l2.4 2.4-2.4 2.4-2.4-2.4L12 2z" />
      <path d="M6.8 7.2l2.4 2.4-2.4 2.4-2.4-2.4 2.4-2.4z" />
      <path d="M17.2 7.2l2.4 2.4-2.4 2.4-2.4-2.4 2.4-2.4z" />
      <path d="M12 12.4l2.4 2.4L12 17.2l-2.4-2.4L12 12.4z" />
      <path d="M12 19.6l2.4 2.4-2.4 2.4V19.6z" opacity="0" />
      <path d="M9.2 12.4l2.8 2.8-2.8 2.8-2.8-2.8 2.8-2.8z" opacity="0" />
    </svg>
  );
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
          <span className="opacity-85">${(meta.priceUsdt / 1000).toFixed(meta.priceUsdt % 1000 ? 1 : 0)}K</span>
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
  // Per the member-facing 节点权益说明: STRATEGIC (50k) is the apex tier and
  // gets the purple + strongest glow; GUARDIAN (10k) is amber; BUILDER
  // (5k) emerald; PIONEER (2.5k) blue. On-chain nodeIds 101 → STRATEGIC,
  // 201 → GUARDIAN — matching NODE_META.
  501: { glow: "shadow-[0_0_80px_rgba(148,163,184,0.24)]",  ring: "border-slate-500/50",   from: "from-slate-900/70",   to: "to-slate-950/95", accent: "text-slate-300",   accentBright: "text-slate-200",   gradient: "from-slate-500/18 via-slate-700/5 to-transparent",   rgb: "148, 163, 184", chip: "bg-slate-500/10 border-slate-500/40 text-slate-200" },
  401: { glow: "shadow-[0_0_80px_rgba(96,165,250,0.32)]",   ring: "border-blue-500/50",    from: "from-blue-950/70",    to: "to-slate-950/95", accent: "text-blue-300",    accentBright: "text-blue-200",    gradient: "from-blue-500/20 via-blue-700/5 to-transparent",    rgb: "96, 165, 250",  chip: "bg-blue-500/10 border-blue-500/40 text-blue-200" },
  301: { glow: "shadow-[0_0_80px_rgba(52,211,153,0.30)]",   ring: "border-emerald-500/50", from: "from-emerald-950/70", to: "to-slate-950/95", accent: "text-emerald-300", accentBright: "text-emerald-200", gradient: "from-emerald-500/20 via-emerald-700/5 to-transparent", rgb: "52, 211, 153",  chip: "bg-emerald-500/10 border-emerald-500/40 text-emerald-200" },
  201: { glow: "shadow-[0_0_80px_rgba(251,191,36,0.34)]",   ring: "border-amber-500/55",   from: "from-amber-950/70",   to: "to-slate-950/95", accent: "text-amber-300",   accentBright: "text-amber-200",   gradient: "from-amber-500/22 via-amber-700/5 to-transparent",   rgb: "251, 191, 36",  chip: "bg-amber-500/10 border-amber-500/45 text-amber-200" },
  101: { glow: "shadow-[0_0_80px_rgba(192,132,252,0.38)]",  ring: "border-purple-500/60",  from: "from-purple-950/70",  to: "to-slate-950/95", accent: "text-purple-300",  accentBright: "text-purple-200",  gradient: "from-purple-500/24 via-purple-700/6 to-transparent",  rgb: "192, 132, 252", chip: "bg-purple-500/10 border-purple-500/45 text-purple-200" },
};

/** Unified easing — every dashboard entrance + hover rides this curve so
 *  the timing reads as coordinated instead of "each component had its own
 *  idea". Matches the project's `.token-card-3d` transition choice. */
const EASE = [0.22, 1, 0.36, 1] as const;

export default function Dashboard() {
  const { t } = useLanguage();
  const account = useActiveAccount();
  const { isDemoMode, demoAddress, demoNodeId: demoPurchasedNodeId, exitDemo } = useDemoStore();
  // In demo mode use the demo address; otherwise use the real connected wallet.
  const address = isDemoMode ? (demoAddress ?? undefined) : account?.address;
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("overview");

  // Dashboard is gated on hasPurchased. If the connected wallet hasn't
  // bought a node yet we bounce back to /recruit and fire the purchase
  // signal so RuneOnboarding re-opens the purchase modal. Disconnect
  // does the same — the dashboard is never shown with no address.
  //
  // Four purchase signals (any one suffices):
  //   1. on-chain getUserPurchaseData (the real production path)
  //   2. DB-side personalStats.hasPurchased (indexer-cached fallback)
  //   3. PREVIEW_ADDRESSES whitelist — explicit test fixtures so QA
  //      can walk the dashboard without burning a real tx.
  //   4. Demo mode — selected tier from the /demo test page.
  // Address keys are lowercase (EVM normalisation).
  const PREVIEW_ADDRESSES: Record<string, NodeId> = {
    "0xc8d0ab0b4e4d52a2f0ce920c43067973bee8f7ec": 501,
  };
  const previewNodeId = isDemoMode
    ? (demoPurchasedNodeId ?? undefined)
    : address ? PREVIEW_ADDRESSES[address.toLowerCase()] : undefined;

  const { hasPurchased: chainHasPurchased, isLoading: purchaseLoading, nodeId: chainNodeId, amount: ownedAmount } = useUserPurchase(address);
  const { data: gateStats, isLoading: statsLoading } = usePersonalStats(address);
  const dbHasPurchased = !!gateStats?.hasPurchased;
  const dbNodeId       = gateStats?.ownedNodeId ?? null;
  const hasPurchased   = isDemoMode || chainHasPurchased || dbHasPurchased || previewNodeId !== undefined;
  const ownedNodeId    = chainNodeId ?? (dbNodeId ?? previewNodeId);

  useEffect(() => {
    if (isDemoMode) return;
    if (!address) { navigate("/recruit"); return; }
    // Whitelisted preview addresses bypass the loading wait — we know
    // they're allowed in. Otherwise wait until both async signals
    // settle before redirecting so a slow roundtrip doesn't kick a
    // legitimately-purchased user mid-load.
    if (previewNodeId !== undefined) return;
    if (!purchaseLoading && !statsLoading && !hasPurchased) {
      navigate("/recruit");
      emitOpenPurchase();
    }
  }, [address, isDemoMode, hasPurchased, purchaseLoading, statsLoading, previewNodeId, navigate]);

  if (!isDemoMode && (!address || !hasPurchased)) return null;

  const meta = ownedNodeId ? NODE_META[ownedNodeId as NodeId] : null;
  const theme = ownedNodeId ? HERO_THEME[ownedNodeId as NodeId] : HERO_THEME[101];

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl space-y-8">
      {/* ── Demo mode banner ── */}
      {isDemoMode && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-sm text-cyan-300">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 shrink-0" />
            <span className="font-medium">测试模式 Demo Mode</span>
            <span className="text-cyan-400/60 hidden sm:inline">— 当前地址：{address ? `${address.slice(0, 8)}…${address.slice(-6)}` : "—"}</span>
          </div>
          <button
            type="button"
            onClick={() => { exitDemo(); navigate("/demo"); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 px-3 py-1 text-xs font-medium hover:bg-cyan-500/20 transition-colors"
          >
            <X className="h-3 w-3" /> 退出 Exit
          </button>
        </div>
      )}
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
              className="text-xs text-muted-foreground flex items-center gap-2 pt-1 min-w-0"
            >
              <Wallet className="h-3.5 w-3.5 shrink-0" />
              {/* `short` mode so the full 42-char address never wraps the
                  hero on mobile; the copy icon still writes the full
                  checksum value to the clipboard. */}
              <CopyableAddress address={address} short />
              <span className="opacity-50 shrink-0">·</span>
              <BscLogo className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{runeChain.name}</span>
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
                <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground/85">{t("mr.dash.owned.paid")}</p>
                <p
                  className={`num text-3xl md:text-4xl font-bold tabular-nums ${theme.accentBright} leading-none mt-1`}
                  style={{ textShadow: `0 0 24px rgba(${theme.rgb}, 0.4)` }}
                >
                  ${ownedAmount ? fmtUsdt(ownedAmount, 0) : meta.priceUsdt.toLocaleString("en-US")}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-1.5 tracking-[0.18em] uppercase">USDT</p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ── Tabs ── indicator uses `layoutId="dashTab"` so the underline
          morphs between tabs instead of cutting. Active tab also gets a
          soft radial glow beneath its label. */}
      {/* Segmented tab switcher — rounded container with a single sliding
          amber pill that `layoutId`s between active tabs. Replaces the old
          underline look with a more premium "control surface" feel and
          gives the new 4th tab (benefits) room to breathe. Scroll-x on
          mobile so 4 tabs + icons never clip on 360 px viewports. */}
      <div className="surface-3d rounded-xl border border-border/40 bg-card/40 p-1 overflow-x-auto scrollbar-hide">
        <div className="flex gap-0.5 min-w-max relative">
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
                className={`relative z-10 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors duration-300 whitespace-nowrap ${
                  active ? "text-amber-100" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="dashTabPill"
                    aria-hidden
                    className="absolute inset-0 rounded-lg bg-gradient-to-br from-amber-500/20 via-amber-600/15 to-amber-700/10 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.35),0_8px_24px_-8px_rgba(251,191,36,0.35)]"
                    transition={{ type: "spring", stiffness: 340, damping: 32 }}
                  />
                )}
                <Icon className={`relative h-3.5 w-3.5 transition-colors ${active ? "text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" : ""}`} />
                <span className="relative">{label}</span>
              </button>
            );
          })}
        </div>
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
        <Icon className={`h-3 w-3 ${highlight ? theme.accent : "text-muted-foreground/80"}`} />
        <span>{label}</span>
      </div>
      <div
        className={`relative text-xl font-bold tabular-nums num ${highlight ? theme.accentBright : "text-foreground"}`}
        style={highlight ? { textShadow: `0 0 18px rgba(${theme.rgb}, 0.35)` } : undefined}
      >
        {value}
      </div>
      {sub && <div className="relative text-[10px] text-muted-foreground/80 mt-1 tracking-[0.12em] uppercase">{sub}</div>}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Overview tab
──────────────────────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────
   Benefits spec data — mirrors `artifacts/crypto-analyzer/RUNE节点权益说明.md`.
   Hardcoded here because the REST overview doesn't carry airdrop batches,
   tier weights, or feature matrix. If the member doc ever changes, this
   is the single place to sync.
──────────────────────────────────────────────────────────────────────────── */

/** Airdrop release — 4 stages, back-loaded per the 2026 spec: 10/20/30/40
 *  unlocks gated on TLP + team-stake thresholds (final stage also has a
 *  180-day time fallback). Total = 100%. */
const AIRDROP_BATCHES = [
  { pct: 10, priceAt: 0.028, titleKey: "mr.dash.benefits.ad.b1", trig: "mr.dash.benefits.ad.b1Trig" },
  { pct: 20, priceAt: 0.070, titleKey: "mr.dash.benefits.ad.b2", trig: "mr.dash.benefits.ad.b2Trig" },
  { pct: 30, priceAt: 0.175, titleKey: "mr.dash.benefits.ad.b3", trig: "mr.dash.benefits.ad.b3Trig" },
  { pct: 40, priceAt: 0.350, titleKey: "mr.dash.benefits.ad.b4", trig: "mr.dash.benefits.ad.b4Trig" },
] as const;

/** Per-tier airdrop allocation.
 *
 *  Per-seat numbers come from the 节点招募计划 spec. The five tiers
 *  consume the full 10,000,000-token mother-token pool exactly:
 *    1k×1000 + 800×3000 + 400×6250 + 200×13000 + 20×75000 = 10,000,000.
 *  `total` is `perSeat × seats`. */
const AIRDROP_PER_TIER: Record<NodeId, { perSeat: number; total: string }> = {
  101: { perSeat: 75000, total: "1.50M" },
  201: { perSeat: 13000, total: "2.60M" },
  301: { perSeat:  6250, total: "2.50M" },
  401: { perSeat:  3000, total: "2.40M" },
  501: { perSeat:  1000, total: "1.00M" },
};

/** Six-stream dividend weight coefficients per tier.
 *
 *  `share` = (seats × coeff) / totalWeight. Per the 节点招募计划 spec
 *  the coefficients are 1.0 / 1.2 / 1.4 / 1.6 / 2.0 (initial → founder),
 *  so totalWeight at full sell-out is:
 *    1000×1.0 + 800×1.2 + 400×1.4 + 200×1.6 + 20×2.0 = 2,876
 *  Tier shares: L1 = 1000/2876 ≈ 34.8%, L2 = 960/2876 ≈ 33.4%,
 *               L3 = 560/2876 ≈ 19.5%, L4 = 320/2876 ≈ 11.1%,
 *               L5 = 40/2876 ≈ 1.4%. */
const WEIGHT_PER_TIER: Record<NodeId, { coeff: number; share: string }> = {
  101: { coeff: 2.0, share: "1.4%"  },
  201: { coeff: 1.6, share: "11.1%" },
  301: { coeff: 1.4, share: "19.5%" },
  401: { coeff: 1.2, share: "33.4%" },
  501: { coeff: 1.0, share: "34.8%" },
};

/** Six revenue streams in the ongoing dividend pool. Split each row into
 *  a short heading + a dense tagline so the grid reads as a badge strip
 *  instead of a wall of prose. */
const SIX_STREAMS = [
  { key: "qep",    shortKey: "mr.dash.benefits.six.qepShort",    tagKey: "mr.dash.benefits.six.qepTag"    },
  { key: "mother", shortKey: "mr.dash.benefits.six.motherShort", tagKey: "mr.dash.benefits.six.motherTag" },
  { key: "sub",    shortKey: "mr.dash.benefits.six.subShort",    tagKey: "mr.dash.benefits.six.subTag"    },
  { key: "c2c",    shortKey: "mr.dash.benefits.six.c2cShort",    tagKey: "mr.dash.benefits.six.c2cTag"    },
  { key: "new",    shortKey: "mr.dash.benefits.six.newShort",    tagKey: "mr.dash.benefits.six.newTag"    },
  { key: "pool",   shortKey: "mr.dash.benefits.six.poolShort",   tagKey: "mr.dash.benefits.six.poolTag"   },
] as const;

/** Platform-feature matrix. `strategicBoost` = 1.5× quota on the apex tier.
 *  The core-pool access row was moved into its own dedicated Genesis card
 *  since the Genesis (L5) path is now the sole route to pool share. */
const PLATFORM_FEATURES = [
  { labelKey: "mr.dash.benefits.feat.promo", all: true, strategicBoost: false },
  { labelKey: "mr.dash.benefits.feat.api",   all: true, strategicBoost: true  },
  { labelKey: "mr.dash.benefits.feat.ai",    all: true, strategicBoost: true  },
  { labelKey: "mr.dash.benefits.feat.pred",  all: true, strategicBoost: true  },
  { labelKey: "mr.dash.benefits.feat.quant", all: true, strategicBoost: true  },
] as const;

/* ─────────────────────────────────────────────────────────────────────────
   Benefits section — full member-doc digest laid out as 4 grouped cards:
     1. 收益 (Yield)       — daily / 180d / rate / weight
     2. 母币 (Mother token) — private price / qty / P&L / launch
     3. 子币 (Sub-token)    — airdrop total + 4 unlock batches
     4. 其他权益 (Other)    — direct commission matrix, strategic pool
                              (conditional), six dividend streams, platform
                              features. One sub-grouping per nested panel.

   Each section uses a shared <BenefitGroup> shell so visual rhythm stays
   consistent — no per-section orbs/glows fighting each other.
──────────────────────────────────────────────────────────────────────────── */
function BenefitsSection({ ownedNodeId }: { ownedNodeId: number | undefined }) {
  const { t } = useLanguage();
  const { data: overview } = useGetRuneOverview();
  const { data: configs } = useNodeConfigs();

  if (!ownedNodeId) {
    return (
      <Card className="bg-card/70 backdrop-blur border-border">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-30" />
          {t("mr.dash.owned.noneYet")}
        </CardContent>
      </Card>
    );
  }

  const meta = NODE_META[ownedNodeId as NodeId];
  const theme = HERO_THEME[ownedNodeId as NodeId];
  const cfg = (configs as any)?.find?.((c: { nodeId: bigint }) => Number(c.nodeId) === ownedNodeId);
  const rateBps = cfg ? Number(cfg.directRate) : undefined;
  const airdrop = AIRDROP_PER_TIER[ownedNodeId as NodeId];
  const weight = WEIGHT_PER_TIER[ownedNodeId as NodeId];
  const isStrategic = ownedNodeId === 101;

  // Launch prices come from the REST overview so ops can re-tune them
  // without redeploying the SPA — fall back to the documented defaults
  // (母币 $0.028 / 子币 $0.038) if the field is missing.
  const motherLaunch = overview?.motherToken?.launchPrice ?? 0.028;
  const subLaunch    = overview?.subToken?.launchPrice    ?? 0.038;

  return (
    <div className="space-y-4">

      {/* ── 1. 开盘价格 ── launch prices only (per 2026 spec).
             The earlier private-price / instant-P&L / daily-yield
             numbers aren't part of the current spec, so the card now
             shows just the two canonical opening prices. */}
      <BenefitGroup icon={Coins} title={t("mr.dash.benefits.groupPrices")} subtitle="OPENING PRICES" delay={0}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <BenefitCell label={t("mr.dash.benefits.motherLaunch")} value={`$${motherLaunch}`} sub={t("mr.dash.benefits.perToken")} theme={theme} highlight />
          <BenefitCell label={t("mr.dash.benefits.subLaunch")}    value={`$${subLaunch}`}    sub={t("mr.dash.benefits.perToken")} theme={theme} highlight />
        </div>
      </BenefitGroup>

      {/* ── 2. 达标分配 ── everything tier-allocated: airdrop 4-stage
             unlock + direct-commission matrix + dividend-weight matrix. */}
      <BenefitGroup
        icon={Gift}
        title={t("mr.dash.benefits.groupAllocations")}
        subtitle="STAGE-GATED ALLOCATIONS"
        rightTag={airdrop ? `${airdrop.perSeat.toLocaleString("en-US")} / ${t("mr.dash.benefits.airdropSeat")}` : undefined}
        delay={0.04}
      >
        <div className="space-y-4">
          {/* Mother-token airdrop · 4 stages */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground/75 mb-2">
              {t("mr.dash.benefits.airdropSection")}
            </div>
            <div className="space-y-1.5">
              {AIRDROP_BATCHES.map((b, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md border border-border/30 bg-card/25 px-3 py-2">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400/90 w-12 shrink-0">{t(b.titleKey)}</span>
                  <span className="text-base font-bold tabular-nums text-amber-300 w-10 shrink-0">{b.pct}%</span>
                  <p className="text-[11px] text-muted-foreground/85 leading-snug flex-1 min-w-0">{t(b.trig)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Direct commission matrix · per tier. Weight matrix was
              removed here — it lives prominently on the dividend-pool
              card with the formula, so duplicating it was noise. */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground/75 mb-2">
              {t("mr.dash.benefits.commTitle")}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {([401, 301, 201, 101] as NodeId[]).map((id) => {
                const m = NODE_META[id];
                const th = HERO_THEME[id];
                const pct = id === 401 ? 5 : id === 301 ? 8 : id === 201 ? 10 : 15;
                const isSelf = id === ownedNodeId;
                return (
                  <div
                    key={id}
                    className={`rounded-md border p-2.5 ${isSelf ? `${th.ring} bg-gradient-to-br ${th.from} ${th.to}` : "border-border/30 bg-card/25"}`}
                  >
                    <div className={`text-[9px] font-mono uppercase tracking-[0.22em] ${m.color}`}>{m.nameEn}</div>
                    <div className="text-[11px] font-semibold text-foreground/90 mt-0.5">{m.nameCn}</div>
                    <div className={`num text-lg font-bold mt-1.5 tabular-nums ${th.accentBright}`}>{pct}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </BenefitGroup>

      {/* ── 3. 分红池 · 六脉常态分红 ── income sources + the user's weight
             share in the pool. Shows where dividend dollars come from
             (QEP, token taxes, IPO, treasury) and what fraction of the
             pool this node captures. */}
      <BenefitGroup
        icon={TrendingUp}
        title={t("mr.dash.benefits.groupPool")}
        subtitle="DIVIDEND POOL"
        rightTag={rateBps !== undefined ? `${t("mr.dash.owned.rate")}: ${(rateBps / 100).toFixed(rateBps % 100 === 0 ? 0 : 1)}%` : undefined}
        delay={0.08}
      >
        <div className="space-y-4">
          {/* Your weight + network share prominent — this is the "you"
              side of the `userReward = (yourWeight / totalWeight) × pool`
              equation from the spec. */}
          <div className="rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-950/25 to-transparent p-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-amber-300/85 mb-2">
              {t("mr.dash.benefits.poolShareTitle")}
            </div>
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 tabular-nums">
              <div>
                <div className="text-[10px] text-muted-foreground/70 mb-0.5">{t("mr.dash.benefits.weightCoeff")}</div>
                <div className={`text-2xl font-bold ${theme.accentBright}`}>{weight ? `${weight.coeff.toFixed(1)}×` : "—"}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground/70 mb-0.5">{t("mr.dash.benefits.yourShare")}</div>
                <div className="text-2xl font-bold text-foreground">{weight?.share ?? "—"}</div>
              </div>
              {meta && (
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-[10px] text-muted-foreground/70 mb-0.5">{t("mr.dash.owned.tier")}</div>
                  <div className={`text-sm font-semibold ${meta.color}`}>{meta.nameEn} · {meta.nameCn}</div>
                </div>
              )}
            </div>
            <p className="text-[10px] font-mono text-muted-foreground/65 mt-2 tabular-nums border-t border-amber-500/10 pt-2">
              {t("mr.dash.benefits.poolFormula")}
            </p>
          </div>

          {/* Six-stream sources — where dividend pool money comes from. */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground/75 mb-2">
              {t("mr.dash.benefits.poolSourcesTitle")}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {SIX_STREAMS.map((s, i) => (
                <div
                  key={s.key}
                  className="flex items-center gap-2 rounded-md border border-border/30 bg-card/30 px-2 py-1.5"
                >
                  <span className="shrink-0 h-5 w-5 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[10px] font-mono text-amber-300 tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0 leading-tight">
                    <div className="text-[11px] font-semibold text-foreground/90 truncate">{t(s.shortKey)}</div>
                    <div className="text-[10px] text-muted-foreground/75 truncate">{t(s.tagKey)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </BenefitGroup>

      {/* ── 4. 平台功能 ── API / AI / predict / quant. STRATEGIC tier
             gets a 1.5× quota boost on the marked rows. */}
      <BenefitGroup icon={Sparkles} title={t("mr.dash.benefits.groupFeatures")} subtitle="PLATFORM FEATURES" delay={0.12}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {PLATFORM_FEATURES.map((f) => {
            const available = f.all || (isStrategic && (f as any).strategicOnly);
            const boosted = f.strategicBoost && isStrategic;
            return (
              <div key={f.labelKey} className="flex items-center gap-2.5 rounded-md border border-border/30 bg-card/25 px-2.5 py-1.5">
                <span className={`text-xs shrink-0 ${available ? "text-emerald-400" : "text-muted-foreground/50"}`}>
                  {available ? "✓" : "—"}
                </span>
                <p className="text-[11px] text-foreground/90 flex-1 min-w-0">{t(f.labelKey)}</p>
                {boosted && (
                  <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-purple-300 shrink-0">×1.5</span>
                )}
              </div>
            );
          })}
        </div>
      </BenefitGroup>

      <p className="text-[10px] text-muted-foreground/65 text-center pt-1">
        {t("mr.dash.benefits.footer")}
      </p>
    </div>
  );
}

/** Consistent shell for the 4 benefit groups — same surface, same header
 *  position, same motion timing. Avoids each group inventing its own
 *  glow/orb combo which made the page read "busy" before. */
function BenefitGroup({
  icon: Icon,
  title,
  subtitle,
  rightTag,
  delay = 0,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  rightTag?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: EASE }}
    >
      <Card className="surface-3d relative overflow-hidden bg-gradient-to-br from-slate-900/80 to-slate-950/95 border-amber-500/15">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.035),transparent_55%)] pointer-events-none" />
        <CardHeader className="pb-3 border-b border-border/30 relative z-10 flex-row items-center justify-between gap-3 space-y-0">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="h-4 w-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.45)] shrink-0" />
            <span className="text-sm font-semibold text-foreground truncate">{title}</span>
            {subtitle && (
              <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-muted-foreground/70 hidden sm:inline truncate">{subtitle}</span>
            )}
          </div>
          {rightTag && (
            <span className="text-[10px] font-mono tabular-nums text-amber-200/85 shrink-0">{rightTag}</span>
          )}
        </CardHeader>
        <CardContent className="pt-4 relative z-10">{children}</CardContent>
      </Card>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Genesis (L5) earnings panel

   Conditionally rendered on the Overview tab once the connected wallet has
   qualified for Genesis — either direct L4 (符主, nodeId 101) count ≥ 5 or
   team-wide L4 count ≥ 10. Shows the trigger stat, the user's base node
   weight (which carries into the Genesis pool allocation), and the
   reward path (10% of the core incentive pool, weighted by Genesis-peer
   score). Actual USDT earnings and pool size pull from future indexer
   fields; while those land we surface a "pending settlement" state so
   the qualification itself is visible immediately.
──────────────────────────────────────────────────────────────────────────── */
// Genesis triggers (per 节点招募计划 spec — ANY ONE qualifies):
//   1. ≥ 3 direct 联创 (founder, 50,000 U) referrals
//   2. ≥ 5 联创 nodes anywhere in the team
//   3. ≥ 30 超级 (super, 10,000 U) nodes anywhere in the team
const GENESIS_DIRECT_FOUNDER_THRESHOLD = 3;
const GENESIS_TEAM_FOUNDER_THRESHOLD   = 5;
const GENESIS_TEAM_SUPER_THRESHOLD     = 30;
const GENESIS_APEX_NODE_ID: NodeId = 101; // 联创节点 · 符主 · L5
const GENESIS_SUPER_NODE_ID: NodeId = 201; // 超级节点 · 符魂 · L4

/* ─────────────────────────────────────────────────────────────────────────
   Pool-progress card — "全网底池达标进度"

   Network-wide view of the 8M-USDT node fundraise and the 4-stage mother-
   token airdrop unlock schedule. The REST overview gives us the total cap
   (`fundraising.total`) and each tier's seat counts / remaining seats, so
   `totalRaised = Σ (seats − seatsRemaining) × investment`.

   Stage 1 (TLP ≥ 2.8M, unlocks 10%) is wired directly to fundraise
   completion — the initial TLP seeded at launch is exactly 2.8M when the
   8M raise fills. Stages 2–4 depend on post-launch market TLP growth
   which isn't sourced yet, so we mark them "awaiting market" after
   launch and "locked" before it.
──────────────────────────────────────────────────────────────────────────── */
const POOL_STAGES = [
  { pct: 10, tlpM: 2.8,  driver: "fundraise" as const },
  { pct: 20, tlpM: 7,    driver: "market"    as const },
  { pct: 30, tlpM: 17.5, driver: "market"    as const },
  { pct: 40, tlpM: 35,   driver: "market"    as const },
];

function PoolProgressCard({ ownedNodeId }: { ownedNodeId: number | undefined }) {
  const { t } = useLanguage();
  const { data: overview } = useGetRuneOverview();
  const { data: configs } = useNodeConfigs();

  const fundraiseCap = overview?.fundraising?.total ?? 8_000_000;
  const tlpInitial = overview?.fundraising?.tlpPool ?? 2_800_000;

  // Prefer on-chain NodePresell.curNum × payAmount for the network-wide
  // raise total — REST `seatsRemaining` is mock/static while the contract
  // reads are live. Bigint math first (payAmount is 18-dec wei and
  // multiplying the Number form overflows MAX_SAFE_INTEGER).
  const totalRaised = configs
    ? (configs as NodeConfig[]).reduce((sum, c) => {
        const priceUsdt = Number(c.payAmount / 10n ** 18n);
        const sold = Number(c.curNum);
        return sum + sold * priceUsdt;
      }, 0)
    : (overview?.nodes ?? []).reduce(
        (sum, n) => sum + Math.max(0, n.seats - n.seatsRemaining) * n.investment,
        0,
      );
  const raisedPct = fundraiseCap > 0 ? Math.min(100, (totalRaised / fundraiseCap) * 100) : 0;
  const fundraiseComplete = raisedPct >= 100;
  // Pre-launch estimate: fraction of 8M raised × 2.8M initial TLP seed.
  const projectedTlp = fundraiseCap > 0 ? (totalRaised / fundraiseCap) * tlpInitial : 0;

  // Next stage = first not-yet-unlocked. Pre-launch that's Stage 1;
  // once the raise fills Stage 1 unlocks and Stage 2 becomes next.
  const nextStageIdx = fundraiseComplete ? 1 : 0;
  const nextStage = POOL_STAGES[Math.min(3, nextStageIdx)];
  const nextBatch = AIRDROP_BATCHES[Math.min(3, nextStageIdx)];

  // Tier-specific detail for the viewer's own node: how many mother-
  // tokens will unlock at the next stage, and an estimated USDT value at
  // that stage's reference mother-price.
  const userAirdrop = ownedNodeId ? AIRDROP_PER_TIER[ownedNodeId as NodeId] : null;
  const userTierMeta = ownedNodeId ? NODE_META[ownedNodeId as NodeId] : null;
  const nextUnlockTokens = userAirdrop
    ? Math.round((userAirdrop.perSeat * nextStage.pct) / 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.03, ease: EASE }}
    >
      <Card className="surface-3d relative overflow-hidden border-emerald-500/25 bg-gradient-to-br from-slate-900/85 via-emerald-950/25 to-slate-950/95">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-emerald-500/20 via-cyan-500/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.06),transparent_55%)] pointer-events-none" />
        <CardHeader className="pb-3 border-b border-emerald-500/20 relative z-10 flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.55)]" />
            <span className="bg-gradient-to-r from-emerald-200 to-cyan-200 bg-clip-text text-transparent">
              {t("mr.dash.pool.title")}
            </span>
          </CardTitle>
          <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-emerald-300/80">
            {t("mr.dash.pool.networkTag")}
          </span>
        </CardHeader>
        <CardContent className="pt-4 space-y-4 relative z-10">
          {/* Total raise progress toward the 8M cap */}
          <div>
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
                {t("mr.dash.pool.raised")}
              </span>
              <span className="text-[10px] font-mono tabular-nums text-muted-foreground/65">
                {raisedPct.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-baseline gap-2 tabular-nums mb-2">
              <span className="text-2xl font-bold text-foreground">
                ${formatShortUsd(totalRaised)}
              </span>
              <span className="text-xs text-muted-foreground/65">
                / ${formatShortUsd(fundraiseCap)} USDT
              </span>
            </div>
            <div className="h-2 rounded-full bg-black/40 overflow-hidden border border-emerald-500/10">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-teal-400 transition-[width] duration-500"
                style={{ width: `${raisedPct}%` }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground/65 mt-2">
              {fundraiseComplete
                ? t("mr.dash.pool.fundraiseDone")
                : t("mr.dash.pool.fundraiseHint")}
            </div>
          </div>

          {/* Projected initial TLP once the raise fills */}
          <div className="rounded-md border border-cyan-500/20 bg-cyan-950/15 p-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-300/85 mb-0.5">
                {fundraiseComplete ? t("mr.dash.pool.tlpInitial") : t("mr.dash.pool.tlpProjected")}
              </div>
              <div className="text-base font-bold tabular-nums text-cyan-200">
                ${formatShortUsd(fundraiseComplete ? tlpInitial : projectedTlp)} USDT
              </div>
            </div>
            <span className="text-xs text-muted-foreground/75 flex-1 min-w-0">
              {t("mr.dash.pool.tlpNote")}
            </span>
          </div>

          {/* Four stage milestones */}
          <div className="pt-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground/75 mb-2">
              {t("mr.dash.pool.stagesTitle")}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {POOL_STAGES.map((stage, i) => {
                const unlocked =
                  stage.driver === "fundraise" ? fundraiseComplete : false;
                const isNext = i === nextStageIdx && !unlocked;
                return (
                  <div
                    key={i}
                    className={`rounded-md border p-2.5 transition-colors ${
                      unlocked
                        ? "border-emerald-500/50 bg-emerald-950/25"
                        : isNext
                        ? "border-amber-500/50 bg-amber-950/20 ring-1 ring-amber-500/20"
                        : "border-border/30 bg-card/25"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-muted-foreground/70">
                        {t(`mr.dash.pool.stage${i + 1}Num`)}
                      </span>
                      <span
                        className={`text-[9px] font-mono uppercase tracking-[0.18em] ${
                          unlocked
                            ? "text-emerald-300"
                            : isNext
                            ? "text-amber-300"
                            : "text-muted-foreground/55"
                        }`}
                      >
                        {unlocked
                          ? t("mr.dash.pool.statusUnlocked")
                          : isNext
                          ? t("mr.dash.pool.statusNext")
                          : t("mr.dash.pool.statusLocked")}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 tabular-nums">
                      <span className="text-lg font-bold text-foreground">
                        {stage.pct}%
                      </span>
                      <span className="text-[10px] text-muted-foreground/65">
                        {t("mr.dash.pool.airdropRelease")}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/75 tabular-nums mt-0.5">
                      TLP ≥ ${stage.tlpM}M
                    </div>
                    <div className="text-[9px] text-muted-foreground/55 mt-1">
                      {stage.driver === "fundraise"
                        ? t("mr.dash.pool.driverFundraise")
                        : t("mr.dash.pool.driverMarket")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Next-stage detail — tier-specific reward the viewer will
              receive when the next unlock triggers. Only shown when the
              viewer actually holds a node; otherwise there's nothing to
              project, so we hide the panel instead of rendering zeros. */}
          {userAirdrop && userTierMeta && (
            <div className="rounded-lg border border-amber-500/35 bg-gradient-to-br from-amber-950/30 via-amber-950/10 to-transparent p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-amber-300/90">
                  {t("mr.dash.pool.nextStageTitle")}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-950/40 text-amber-300 shrink-0">
                  {t(`mr.dash.pool.stage${nextStageIdx + 1}Num`)} · {nextStage.pct}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] text-muted-foreground/75 mb-0.5">
                    {t("mr.dash.pool.yourUnlock")}
                  </div>
                  <div className="text-lg font-bold tabular-nums text-amber-200">
                    {nextUnlockTokens.toLocaleString("en-US")}
                  </div>
                  <div className="text-[9px] text-muted-foreground/65">
                    {t("mr.dash.pool.motherTokens")}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground/75 mb-0.5">
                    {t("mr.dash.pool.stagePrice")}
                  </div>
                  <div className="text-lg font-bold tabular-nums text-foreground/95">
                    ${nextBatch.priceAt}
                  </div>
                  <div className="text-[9px] text-muted-foreground/65">
                    {t("mr.dash.pool.perToken")}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground/85 leading-snug pt-2 border-t border-amber-500/15">
                <span className="text-amber-300/90 font-semibold mr-1.5">{t("mr.dash.pool.trigger")}:</span>
                {t(nextBatch.trig)}
              </div>

              <div className="text-[10px] text-muted-foreground/60 tabular-nums">
                {userTierMeta.nameEn} · {userTierMeta.nameCn} ·{" "}
                {userAirdrop.perSeat.toLocaleString("en-US")} × {nextStage.pct}% ={" "}
                {nextUnlockTokens.toLocaleString("en-US")} RUNE
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** Compact USD format: 3.4M / 812K / 2.5K with two significant digits
 *  after the separator. Falls back to raw value for small numbers. */
function formatShortUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toFixed(0);
}

function GenesisEarningsPanel({ address, ownedNodeId }: { address: string; ownedNodeId: number | undefined }) {
  const { t } = useLanguage();
  const { data: stats } = usePersonalStats(address);

  // Eligibility comes entirely from the server-computed tier histograms
  // so we don't redo aggregation client-side.
  const directFounder = stats?.directByTier?.find((b) => b.nodeId === GENESIS_APEX_NODE_ID)?.count ?? 0;
  const teamFounder   = stats?.teamByTier?.find((b)   => b.nodeId === GENESIS_APEX_NODE_ID)?.count ?? 0;
  const teamSuper     = stats?.teamByTier?.find((b)   => b.nodeId === GENESIS_SUPER_NODE_ID)?.count ?? 0;
  const directHit  = directFounder >= GENESIS_DIRECT_FOUNDER_THRESHOLD;
  const teamFndHit = teamFounder   >= GENESIS_TEAM_FOUNDER_THRESHOLD;
  const teamSupHit = teamSuper     >= GENESIS_TEAM_SUPER_THRESHOLD;
  const isGenesis  = directHit || teamFndHit || teamSupHit;

  if (!isGenesis) return null;

  const meta = ownedNodeId ? NODE_META[ownedNodeId as NodeId] : null;
  const weight = ownedNodeId ? WEIGHT_PER_TIER[ownedNodeId as NodeId] : null;
  const triggeredBy: "direct" | "teamFounder" | "teamSuper" =
    directHit ? "direct" : teamFndHit ? "teamFounder" : "teamSuper";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.04, ease: EASE }}
    >
      <Card className="surface-3d relative overflow-hidden border-fuchsia-500/35 bg-gradient-to-br from-fuchsia-950/45 via-purple-950/30 to-amber-950/15">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-fuchsia-500/25 via-purple-500/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.12),transparent_60%)] pointer-events-none" />
        <CardHeader className="pb-3 border-b border-fuchsia-500/20 relative z-10">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-fuchsia-300 drop-shadow-[0_0_8px_rgba(217,70,239,0.55)]" />
            <span className="bg-gradient-to-r from-fuchsia-200 via-purple-200 to-amber-200 bg-clip-text text-transparent">
              {t("mr.dash.genesis.title")}
            </span>
            <span className="ml-auto text-[9px] font-mono uppercase tracking-[0.22em] px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 shrink-0">
              {t("mr.dash.genesis.achievedBadge")}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4 relative z-10">
          {/* Trigger stats — show all three, highlight the one that
              actually qualified the user. */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <GenesisTriggerCell
              label={t("mr.dash.genesis.triggerDirect")}
              value={directFounder}
              target={GENESIS_DIRECT_FOUNDER_THRESHOLD}
              triggered={triggeredBy === "direct"}
            />
            <GenesisTriggerCell
              label={t("mr.dash.genesis.triggerTeam")}
              value={teamFounder}
              target={GENESIS_TEAM_FOUNDER_THRESHOLD}
              triggered={triggeredBy === "teamFounder"}
            />
            <GenesisTriggerCell
              label={t("mr.dash.genesis.triggerTeamSuper")}
              value={teamSuper}
              target={GENESIS_TEAM_SUPER_THRESHOLD}
              triggered={triggeredBy === "teamSuper"}
            />
          </div>

          {/* Reward row — core pool share + user's weight */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-amber-300/85 mb-0.5">
                {t("mr.dash.genesis.rewardTitle")}
              </div>
              <div className="text-base font-bold tabular-nums text-amber-200">
                {t("mr.dash.genesis.rewardValue")}
              </div>
            </div>
            <div className="h-8 w-px bg-amber-500/20 hidden md:block" />
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/75 mb-0.5">
                {t("mr.dash.genesis.weightLabel")}
              </div>
              <div className="text-sm font-semibold text-foreground/95 tabular-nums">
                {weight ? `${weight.coeff.toFixed(1)}×` : "—"}
                {meta && <span className="text-xs text-muted-foreground/70 ml-2">{meta.nameCn} · {meta.nameEn}</span>}
              </div>
            </div>
          </div>

          {/* Pending settlement state — the indexer doesn't expose the
              Genesis total-weight / paid-out balance yet, so mark this
              explicitly instead of showing a zero that looks like a bug. */}
          <div className="rounded-md border border-dashed border-fuchsia-500/25 bg-fuchsia-950/10 p-3 text-[11px] text-muted-foreground/85 leading-snug">
            <span className="text-fuchsia-300/90 font-semibold mr-1">·</span>
            {t("mr.dash.genesis.pendingNote")}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function GenesisTriggerCell({
  label, value, target, triggered,
}: { label: string; value: number; target: number; triggered: boolean }) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  return (
    <div className={`rounded-lg border p-3 ${triggered ? "border-fuchsia-500/50 bg-fuchsia-950/30" : "border-border/30 bg-card/25"}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/80 truncate">{label}</span>
        {triggered && (
          <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-fuchsia-300 shrink-0">✓ TRIGGER</span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5 tabular-nums">
        <span className={`text-2xl font-bold ${triggered ? "text-fuchsia-200" : "text-foreground/90"}`}>{value}</span>
        <span className="text-xs text-muted-foreground/70">/ {target}</span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-black/40 overflow-hidden">
        <div
          className={`h-full ${triggered ? "bg-gradient-to-r from-fuchsia-500 to-purple-400" : "bg-muted-foreground/40"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Small numeric cell used inside BenefitGroup content — same DNA as
 *  NodeBenefitsCard's BenefitRow but borderless/padded for density. */
function BenefitCell({
  label, value, sub, theme, highlight = false,
}: {
  label: string; value: string; sub?: string;
  theme?: typeof HERO_THEME[NodeId];
  highlight?: boolean;
}) {
  return (
    <div className="rounded-md border border-border/30 bg-card/25 p-2.5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground/80 mb-1">{label}</div>
      <div className={`text-lg font-bold tabular-nums leading-tight ${highlight ? (theme?.accentBright ?? "text-amber-200") : "text-foreground"}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground/65 mt-0.5">{sub}</div>}
    </div>
  );
}

function OverviewTab({ address }: { address: string }) {
  const { t } = useLanguage();
  const { referrer, isBound, isRoot } = useReferrerOf(address);
  const { nodeId } = useUserPurchase(address);

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

  // Overview is deliberately lean: the connected wallet's sharing tools
  // on top, followed by a quick look at their node benefits. Headcount /
  // volume stats live on the Team tab, commission stats on Rewards — so
  // this page stays focused on "what do you have and how do you grow it".
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.02, ease: EASE }}>
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

        {/* Network-wide fundraise + 4-stage TLP unlock progress. Shown
            to everyone so any visitor understands where the protocol
            sits on the roadmap, not just holders. The `ownedNodeId`
            lets the card compute the viewer's tier-specific unlock at
            the next stage (tokens + USDT estimate). */}
        <PoolProgressCard ownedNodeId={nodeId} />

        {/* Genesis (L6) earnings panel — only rendered once the viewer
            has actually qualified (any one of: ≥3 direct 符主 L5
            referrals, ≥5 团队 符主, or ≥30 团队 符魂). Keeps non-
            qualified users from seeing a mostly-empty panel that
            implies something they don't yet have. */}
        <GenesisEarningsPanel address={address} ownedNodeId={nodeId} />

        {/* Full benefits digest below the referral panel — the same set
            of cards that used to live in a standalone Benefits tab:
            core card, mother-token P&L, airdrop batches, per-tier
            commission matrix, weight matrix, six streams + weight,
            platform feature matrix. All data is sourced from the
            member-facing node-benefits spec. */}
        <BenefitsSection ownedNodeId={nodeId} />
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
          drill-down focus. Team tab focuses on team SHAPE — headcount
          and umbrella volume. Commission stats live on the Rewards tab
          where they belong. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={Users}       label={t("mr.dash.team.direct")}            value={rootStats ? String(rootStats.directCount) : "…"}                          sub={t("mr.dash.team.firstLayer")} delay={0.02} />
        <Kpi icon={Users}       label={t("mr.dash.team.total")}             value={rootStats ? String(rootStats.totalDownstreamCount) : "…"}                 sub={t("mr.dash.team.recursive")}  delay={0.06} />
        <Kpi icon={Coins}       label={t("mr.dash.team.directInvested")}    value={rootStats ? `$${fmtUsdt(rootStats.directTotalInvested, 0)}` : "…"}        sub="USDT" delay={0.10} />
        <Kpi icon={TrendingUp}  label={t("mr.dash.team.teamInvested")}      value={rootStats ? `$${fmtUsdt(rootStats.totalDownstreamInvested, 0)}` : "…"}    sub="USDT" delay={0.14} highlight />
      </div>

      {/* Tier composition — 5 tier bars, toggleable between the user's
          direct downlines and the full transitive team. Gives a shape to
          the team in one glance without having to drill through levels. */}
      {rootStats && (rootStats.directByTier.length > 0 || rootStats.teamByTier.length > 0) && (
        <TierCompositionChart stats={rootStats} />
      )}

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

      <p className="text-[10px] text-muted-foreground/70 text-center">
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
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/65" />}
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

  // Filter + sort state. Dates are YYYY-MM-DD strings (the <input type="date">
  // native value); search is a case-insensitive substring match on the
  // downline address; order flips between desc (default, newest first) and asc.
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [order, setOrder] = useState<"desc" | "asc">("desc");

  const filtered = useMemo(() => {
    if (!rewards) return [];
    const fromTs = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
    const toTs = to ? new Date(`${to}T23:59:59`).getTime() : Infinity;
    const needle = q.trim().toLowerCase();
    const list = rewards.filter((r) => {
      const ts = new Date(r.paidAt).getTime();
      if (ts < fromTs || ts > toTs) return false;
      if (needle && !r.downline.toLowerCase().includes(needle)) return false;
      return true;
    });
    list.sort((a, b) => {
      const d = new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime();
      return order === "desc" ? -d : d;
    });
    return list;
  }, [rewards, from, to, q, order]);

  return (
    <div className="space-y-5">
      {/* Only two stats reflect the on-chain reality today: how many
          direct downlines actually converted into buyers, and the total
          USDT that's flowed into the wallet from those purchases. Team
          rewards aren't live (they'll come in with the tier-based rank
          bonus), so we don't surface a stub number that would read as
          zero forever. */}
      <div className="grid grid-cols-2 gap-3">
        <Kpi icon={Users}      label={t("mr.dash.reward.validDirect")} value={stats ? String(stats.directPurchaseCount) : "…"} sub={t("mr.dash.reward.validDirectSub")} delay={0.02} />
        <Kpi icon={Gift}       label={t("mr.dash.reward.cumulative")}  value={stats ? `$${fmtUsdt(stats.directCommission, 2)}` : "…"} sub="USDT" delay={0.06} highlight />
      </div>

      {/* Composed chart: bars for monthly purchase COUNT (left axis),
          line for monthly commission AMOUNT (right axis). One glance
          reveals when the team converted + how much USDT flowed. */}
      {rewards && rewards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18, ease: EASE }}
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

      {/* Detail list with filter controls. Date range + address search +
          asc/desc toggle cover the three ways a member usually wants to
          cut their commission history. */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.24, ease: EASE }}
      >
        <Card className="surface-3d relative overflow-hidden bg-gradient-to-br from-slate-900/80 to-slate-950/95 border-amber-500/15">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.04),transparent_55%)] pointer-events-none" />
          <CardHeader className="pb-3 border-b border-border/40 relative z-10">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gift className="h-4 w-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" /> {t("mr.dash.reward.listTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 relative z-10 space-y-3">
            <RewardListFilters
              from={from} to={to} q={q} order={order}
              onFrom={setFrom} onTo={setTo} onQ={setQ}
              onOrder={() => setOrder((o) => (o === "desc" ? "asc" : "desc"))}
            />
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{t("mr.dash.reward.loading")}</p>
            ) : !rewards || rewards.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Gift className="h-8 w-8 mx-auto mb-3 opacity-30" />
                {t("mr.dash.reward.empty")}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Search className="h-6 w-6 mx-auto mb-2 opacity-40" />
                {t("mr.dash.reward.noMatch")}
              </div>
            ) : (
              <ul className="divide-y divide-border/30">
                {filtered.map((r) => <RewardRowItem key={r.txHash} row={r} />)}
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <p className="text-[10px] text-muted-foreground/70 text-center">
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
      <div className="flex items-center gap-3 flex-wrap mt-1.5 pl-[calc(3.5rem+0.5rem)] sm:pl-[calc(4rem+0.75rem)] text-[11px] text-muted-foreground/85">
        <span className="tabular-nums">{new Date(row.paidAt).toLocaleString()}</span>
        <span className="font-mono tabular-nums opacity-80">
          {(row.directRate / 100).toFixed(row.directRate % 100 === 0 ? 0 : 1)}%
        </span>
        {hasRealTx && (
          <a
            href={`${explorerBase}${row.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-muted-foreground/80 hover:text-amber-400 transition-colors inline-flex items-center gap-1"
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
  101: "#c084fc", // purple-400 — STRATEGIC (符主)
  201: "#fbbf24", // amber-400  — GUARDIAN  (符魂)
  301: "#34d399", // emerald-400 — BUILDER  (符印)
  401: "#60a5fa", // blue-400   — PIONEER   (符胚)
  501: "#cbd5e1", // slate-300  — INITIAL   (初级)
};

/**
 * Monthly activity chart: bars for purchase count (left axis), a smooth
 * amber line with a glowing emerald dot for commission amount (right
 * axis). Anchored at April 2026 and extended through the current month
 * so the ramp is always visible. Bars + line let members read count and
 * $ in a single glance without per-tier slicing.
 */
const TREND_START = { year: 2026, month: 3 }; // April = month index 3 in Date
type TrendDatum = { key: string; label: string; count: number; amount: number };

function MonthlyRewardChart({ rewards }: { rewards: RewardRow[] }) {
  const { t } = useLanguage();
  const data = useMemo<TrendDatum[]>(() => {
    const now = new Date();
    const start = new Date(TREND_START.year, TREND_START.month, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    const buckets: TrendDatum[] = [];
    const cursor = new Date(start);
    while (cursor <= end || buckets.length < 6) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({ key, label: `${cursor.getMonth() + 1}月`, count: 0, amount: 0 });
      cursor.setMonth(cursor.getMonth() + 1);
      if (buckets.length >= 18) break;
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const r of rewards) {
      const d = new Date(r.paidAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = byKey.get(key);
      if (!bucket) continue;
      bucket.count += 1;
      bucket.amount += Number(BigInt(r.commission) / 10n ** 18n);
    }
    return buckets;
  }, [rewards]);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            {/* Bar gradient — amber-to-navy for the node count column. */}
            <linearGradient id="barCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.15} />
            </linearGradient>
            {/* Soft glow for the $ line. */}
            <filter id="lineGlow" x="-10%" y="-10%" width="120%" height="130%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 5" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="rgba(255,255,255,0.45)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            dy={4}
          />
          <YAxis
            yAxisId="left"
            stroke="rgba(251,191,36,0.55)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={36}
            allowDecimals={false}
            tickFormatter={(v) => `${v}`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="rgba(52,211,153,0.55)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              background: "rgba(8, 15, 30, 0.95)",
              border: "1px solid rgba(251,191,36,0.35)",
              borderRadius: 10,
              fontSize: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
            labelStyle={{ color: "#fbbf24", fontWeight: 600, marginBottom: 4 }}
            formatter={(value: number, name: string) => {
              if (name === "count") return [value, t("mr.dash.reward.chartCount")];
              return [`$${value.toLocaleString("en-US")}`, t("mr.dash.reward.chartAmount")];
            }}
          />
          <Bar
            yAxisId="left"
            dataKey="count"
            fill="url(#barCount)"
            radius={[6, 6, 0, 0]}
            animationDuration={700}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="amount"
            stroke="#34d399"
            strokeWidth={2.25}
            dot={{ r: 3.5, fill: "#34d399", stroke: "#0f172a", strokeWidth: 1.5 }}
            activeDot={{ r: 5, fill: "#34d399" }}
            filter="url(#lineGlow)"
            animationDuration={1000}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Date range + address search + asc/desc toggle for the rewards list. */
function RewardListFilters({
  from, to, q, order,
  onFrom, onTo, onQ, onOrder,
}: {
  from: string; to: string; q: string; order: "asc" | "desc";
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onQ: (v: string) => void;
  onOrder: () => void;
}) {
  const { t } = useLanguage();
  const inputCls = "h-9 px-2 rounded-md border border-border/40 bg-background/60 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40 transition-colors";
  return (
    <div className="flex flex-wrap items-center gap-2 pb-2">
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={from}
          onChange={(e) => onFrom(e.target.value)}
          aria-label={t("mr.dash.reward.filterFrom")}
          className={`${inputCls} w-[132px]`}
        />
        <span className="text-[10px] text-muted-foreground/70">→</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onTo(e.target.value)}
          aria-label={t("mr.dash.reward.filterTo")}
          className={`${inputCls} w-[132px]`}
        />
      </div>
      <div className="relative flex-1 min-w-[140px]">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
        <input
          type="text"
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder={t("mr.dash.reward.filterSearch")}
          className={`${inputCls} w-full pl-7 font-mono`}
        />
      </div>
      <button
        type="button"
        onClick={onOrder}
        className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-border/40 bg-background/60 text-xs text-foreground hover:border-amber-500/50 hover:text-amber-200 transition-colors"
        aria-label={order === "desc" ? t("mr.dash.reward.sortDesc") : t("mr.dash.reward.sortAsc")}
        title={order === "desc" ? t("mr.dash.reward.sortDesc") : t("mr.dash.reward.sortAsc")}
      >
        {order === "desc" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
        {order === "desc" ? t("mr.dash.reward.sortDesc") : t("mr.dash.reward.sortAsc")}
      </button>
    </div>
  );
}

/**
 * 4-bar histogram of the user's team composition by tier, with a
 * pill switcher — 直推 (direct downlines' purchases) vs 伞下 (full
 * transitive team). The pattern mirrors the token-price chart
 * switcher on the /recruit page so users feel at home.
 *
 * All four tiers render even when a bucket has 0 purchases, so the
 * baseline axis is stable and comparisons between views stay honest.
 */
function TierCompositionChart({ stats }: { stats: PersonalStats }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<"direct" | "team">("direct");

  const data = useMemo(() => {
    const source = mode === "direct" ? stats.directByTier : stats.teamByTier;
    const byId = new Map(source.map((r) => [r.nodeId, r.count]));
    // Iterate tiers from apex down so the chart reads STRATEGIC → PIONEER.
    return ([101, 201, 301, 401] as NodeId[]).map((id) => ({
      nodeId: id,
      label: NODE_META[id].nameCn,
      count: byId.get(id) ?? 0,
      color: TIER_FILL[id],
    }));
  }, [stats, mode]);

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.22, ease: EASE }}
    >
      <Card className="surface-3d relative overflow-hidden bg-gradient-to-br from-slate-900/80 to-slate-950/95 border-amber-500/15">
        <div className="absolute -top-20 -right-10 w-56 h-56 rounded-full bg-gradient-to-br from-amber-500/10 via-transparent to-transparent blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_55%)] pointer-events-none" />

        <CardHeader className="pb-3 border-b border-border/40 relative z-10">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            {t("mr.dash.team.compTitle")}
            <span className="text-[10px] font-mono text-muted-foreground/80 tabular-nums ml-1">
              {total} {t("mr.dash.team.compTotal")}
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-4 relative z-10">
          <div className="relative h-56 w-full">
            {/* Pill switcher — pinned inside the chart area, matching the
                rune page's Six-Stage Dual Line toggle so the interaction
                feels familiar. Primary-tinted fill + inset ring on the
                active pill; muted-foreground + hover-primary on inactive. */}
            <div className="absolute top-0 right-2 z-10 inline-flex items-center gap-1 rounded-full border border-primary/25 bg-background/50 p-1 text-[10px] uppercase tracking-[0.18em] backdrop-blur">
              {(["direct", "team"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-full px-3 py-0.5 num tabular-nums transition-all ${
                    mode === m
                      ? "bg-primary/25 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.4)]"
                      : "text-muted-foreground/60 hover:text-primary/80"
                  }`}
                >
                  {m === "direct" ? t("mr.dash.team.compDirect") : t("mr.dash.team.compTeam")}
                </button>
              ))}
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 28, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  {data.map((d) => (
                    <linearGradient id={`tierBar-${d.nodeId}`} key={d.nodeId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={d.color} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={d.color} stopOpacity={0.35} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 5" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="rgba(255,255,255,0.5)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  dy={4}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="rgba(255,255,255,0.45)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{
                    background: "rgba(8, 15, 30, 0.95)",
                    border: "1px solid rgba(251,191,36,0.35)",
                    borderRadius: 10,
                    fontSize: 12,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  }}
                  labelStyle={{ color: "#fbbf24", fontWeight: 600, marginBottom: 4 }}
                  formatter={(value: number) => [value, t("mr.dash.team.compCount")]}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} animationDuration={700}>
                  {data.map((d) => (
                    <Cell key={d.nodeId} fill={`url(#tierBar-${d.nodeId})`} stroke={d.color} strokeOpacity={0.6} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
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
        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/85">{label}</span>
        {Icon && (
          <Icon className={`h-3.5 w-3.5 transition-colors ${highlight ? "text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.45)]" : "text-muted-foreground/55 group-hover:text-foreground/80"}`} />
        )}
      </div>
      <div className={`relative text-xl num tabular-nums ${highlight ? "num-gold" : "text-foreground"}`}>{value}</div>
      {sub && <div className="relative text-[10px] text-muted-foreground/80 mt-1 tracking-[0.14em] uppercase">{sub}</div>}
    </motion.div>
  );
}
