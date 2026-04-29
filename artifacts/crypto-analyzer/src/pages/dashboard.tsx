import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useLocation } from "wouter";
import { useActiveAccount } from "thirdweb/react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { getAddress } from "thirdweb/utils";
import {
  LayoutDashboard, Users, Copy, CheckCircle2, Share2, ExternalLink,
  TrendingUp, Wallet, Link as LinkIcon, Gift, ChevronRight, Sparkles,
  Coins, DollarSign, Search, ArrowUp, ArrowDown, Zap, FlaskConical, X,
  Network, Terminal, Eye, Radar, Layers,
} from "lucide-react";
import { useDemoStore } from "@/lib/demo-store";
import {
  ComposedChart, Bar, Line, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, AreaChart, Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUsdtBalance } from "@/hooks/rune/use-usdt";
import { useReferrerOf } from "@/hooks/rune/use-community";
import { useUserPurchase, useNodeConfigs, type NodeConfig } from "@/hooks/rune/use-node-presell";
import { useGetRuneOverview } from "@rune/api-client-react";
import { emitOpenPurchase } from "@/lib/rune/purchase-signal";
import { NoNodeReminder } from "@/components/rune/no-node-reminder";
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
        <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] ${pillBase}`} title={`${meta.nameEn} · $${meta.priceUsdt.toLocaleString("en-US")} USDT`}>
          <span className={meta.color}>{meta.nameCn}</span>
          <span className="opacity-85">${(meta.priceUsdt / 1000).toFixed(meta.priceUsdt % 1000 ? 1 : 0)}K</span>
        </span>
      ) : (
        <span className={`rounded-md border px-1.5 py-0.5 text-[11px] opacity-50 ${pillBase}`} title={t("mr.dash.team.noNode")}>
          {t("mr.dash.team.noNode")}
        </span>
      )}
      <span className={`rounded-md border px-1.5 py-0.5 text-[11px] ${pillBase}`} title={t("mr.dash.team.teamCountTip")}>
        👥 {stats.totalDownstreamCount}
      </span>
      <span className={`rounded-md border px-1.5 py-0.5 text-[11px] ${pillBase}`} title={t("mr.dash.team.teamVolumeTip")}>
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
  501: { glow: "shadow-[0_0_120px_rgba(148,163,184,0.65)]",  ring: "border-slate-400/70",   from: "from-slate-800/70",   to: "to-slate-900/95", accent: "text-slate-300",   accentBright: "text-slate-100",   gradient: "from-slate-400/50 via-slate-600/18 to-transparent",   rgb: "148, 163, 184", chip: "bg-slate-500/25 border-slate-400/65 text-slate-100" },
  401: { glow: "shadow-[0_0_120px_rgba(96,165,250,0.72)]",   ring: "border-blue-400/70",    from: "from-blue-900/65",    to: "to-slate-900/95", accent: "text-blue-300",    accentBright: "text-blue-100",    gradient: "from-blue-400/55 via-blue-600/18 to-transparent",    rgb: "96, 165, 250",  chip: "bg-blue-500/25 border-blue-400/65 text-blue-100" },
  301: { glow: "shadow-[0_0_120px_rgba(52,211,153,0.68)]",   ring: "border-emerald-400/70", from: "from-emerald-900/65", to: "to-slate-900/95", accent: "text-emerald-300", accentBright: "text-emerald-100", gradient: "from-emerald-400/55 via-emerald-600/18 to-transparent", rgb: "52, 211, 153",  chip: "bg-emerald-500/25 border-emerald-400/65 text-emerald-100" },
  201: { glow: "shadow-[0_0_120px_rgba(251,191,36,0.75)]",   ring: "border-amber-400/75",   from: "from-amber-900/65",   to: "to-slate-900/95", accent: "text-amber-300",   accentBright: "text-amber-100",   gradient: "from-amber-400/58 via-amber-600/18 to-transparent",   rgb: "251, 191, 36",  chip: "bg-amber-500/25 border-amber-400/70 text-amber-100" },
  101: { glow: "shadow-[0_0_120px_rgba(192,132,252,0.78)]",  ring: "border-purple-400/80",  from: "from-purple-900/65",  to: "to-slate-900/95", accent: "text-purple-300",  accentBright: "text-purple-100",  gradient: "from-purple-400/62 via-purple-600/20 to-transparent",  rgb: "192, 132, 252", chip: "bg-purple-500/25 border-purple-400/70 text-purple-100" },
};

/** Unified easing — every dashboard entrance + hover rides this curve so
 *  the timing reads as coordinated instead of "each component had its own
 *  idea". Matches the project's `.token-card-3d` transition choice. */
const EASE = [0.22, 1, 0.36, 1] as const;

/** Spring-powered count-up number display.
 *  Mounts at 0 and springs to `to` using Framer Motion's physics engine.
 *  `fmt` lets callers supply any formatter (currency, short-USD, etc.). */
function CountUp({ to, fmt }: { to: number; fmt?: (n: number) => string }) {
  const mv     = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 46, damping: 13, restDelta: 0.5 });
  const [n, setN] = useState(0);
  useEffect(() => { mv.set(to); }, [mv, to]);
  useEffect(() => spring.on("change", (v) => setN(v)), [spring]);
  return <>{fmt ? fmt(n) : Math.round(n).toLocaleString("en-US")}</>;
}

export default function Dashboard() {
  const { t } = useLanguage();
  const account = useActiveAccount();
  const { isDemoMode, demoAddress, demoNodeId: demoPurchasedNodeId, exitDemo, enterDemo } = useDemoStore();
  // Auto-activate demo mode when ?demo=<nodeId> URL param is present.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const d = p.get("demo");
    if (d && !isDemoMode) {
      const id = parseInt(d) as NodeId;
      if ([101, 201, 301, 401, 501].includes(id))
        enterDemo("0xdemo00000000000000000000000000000000000", id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // In demo mode use the demo address; otherwise use the real connected wallet.
  const address = isDemoMode ? (demoAddress ?? undefined) : account?.address;
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("overview");

  // Dashboard requires an address but does NOT require a purchase. Users
  // who only bound a referrer get a restricted view: referral link is
  // unlocked (so they can recruit downline) while team / rewards / detail
  // tabs are gated behind a purchase CTA, and the purchase modal nags on
  // a periodic timer until they buy.
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

  // Soft gate (2026-04-29 revert): bound-but-unpurchased users CAN enter
  // the dashboard. They get a restricted view with a persistent reminder
  // popup explaining that referral commission requires owning a node.
  // Only an unconnected wallet bounces back to /recruit.
  useEffect(() => {
    if (isDemoMode) return;
    if (!address) { navigate("/recruit"); return; }
  }, [address, isDemoMode, navigate]);

  if (!isDemoMode && !address) return null;

  // Restricted = bound (we got here, so they're connected) but no node yet.
  // Drives the OverviewTab's locked CTA, the Team/Rewards tab gates, and
  // the auto-popping NoNodeReminder dialog below.
  const restricted = !isDemoMode && !hasPurchased && previewNodeId === undefined;

  // One-shot reminder for the bound-but-unpurchased state. Wait for both
  // chain and DB signals before deciding so we don't flash the dialog open
  // and immediately closed when `hasPurchased` flips true. `dismissed`
  // resets when address or hasPurchased changes (purchase completion or
  // wallet switch closes the loop without manual dismissal).
  const [reminderOpen, setReminderOpen]           = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  useEffect(() => { setReminderDismissed(false); }, [address, hasPurchased]);
  useEffect(() => {
    if (!restricted) { setReminderOpen(false); return; }
    if (purchaseLoading || statsLoading) return;
    if (reminderDismissed) return;
    setReminderOpen(true);
  }, [restricted, purchaseLoading, statsLoading, reminderDismissed]);

  const meta = ownedNodeId ? NODE_META[ownedNodeId as NodeId] : null;
  const theme = ownedNodeId ? HERO_THEME[ownedNodeId as NodeId] : HERO_THEME[101];

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-10 max-w-6xl space-y-4 sm:space-y-8">
      {/* ── Page ambient warm glow — two fixed radial orbs that push
          light into the canvas so cards don't sit on pure black.    */}
      <div aria-hidden className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] rounded-full bg-amber-500/[0.035] blur-[120px]" />
        <div className="absolute top-[55%] right-[8%] w-[400px] h-[400px] rounded-full bg-cyan-500/[0.025] blur-[100px]" />
        <div className="absolute top-[40%] left-[50%] w-[600px] h-[600px] -translate-x-1/2 rounded-full bg-slate-400/[0.018] blur-[140px]" />
      </div>
      {/* ── Demo mode banner ── */}
      {isDemoMode && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-cyan-300">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 shrink-0" />
            <span className="font-medium">教学模式 Tutorial</span>
            <span className="text-cyan-400/60 hidden sm:inline">— 当前地址：{address ? `${address.slice(0, 8)}…${address.slice(-6)}` : "—"}</span>
          </div>
          <button
            type="button"
            onClick={() => { exitDemo(); navigate("/recruit"); }}
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

        {/* ── rune.homes brand DNA ─────────────────────────────────────
            Three decorative layers that echo the official site's
            cinematic dark-gold aesthetic. All aria-hidden / pointer-
            events-none so they never interfere with layout or UX.     */}

        {/* 1. Cinematic photo wash — opengraph.jpg at 4 % luminosity so
               the hero feels like it has depth behind the gradient.    */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "url('/opengraph.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center 30%",
            opacity: 0.045,
            mixBlendMode: "luminosity",
          }}
        />

        {/* 2. Ghost "符" rune — the same glyph the homepage uses as its
               hero character; rendered huge on the right side as a
               very-faint watermark that bleeds off the banner edge.    */}
        <div
          aria-hidden
          className="absolute bottom-[-10%] right-3 select-none pointer-events-none leading-none text-[clamp(8rem,40vw,17rem)] font-bold"
          style={{
            color: `rgba(${theme.rgb}, 0.055)`,
            fontFamily: "'Cinzel', 'Noto Serif SC', 'Songti SC', STSong, serif",
            filter: `blur(0.5px) drop-shadow(0 0 24px rgba(${theme.rgb},0.15))`,
          }}
        >
          符
        </div>

        {/* 3. Circular RUNE Protocol emblem — top-right corner,
               matches the logo on rune.homes exactly.                 */}
        <img
          src="/rune-logo-new.png"
          alt=""
          aria-hidden
          className="absolute top-4 right-5 w-10 h-10 object-contain pointer-events-none"
          style={{ opacity: 0.22, filter: "grayscale(30%)" }}
        />

        {/* Floating micro-particles — 9 tiny tier-tinted orbs drifting at
            independent speeds/offsets so the banner reads as "alive".     */}
        {[0,1,2,3,4,5,6,7,8].map((i) => (
          <motion.span
            key={`hprt${i}`}
            aria-hidden
            className="absolute rounded-full pointer-events-none"
            style={{
              width:  i % 3 === 0 ? 3 : i % 3 === 1 ? 2.5 : 1.5,
              height: i % 3 === 0 ? 3 : i % 3 === 1 ? 2.5 : 1.5,
              left: `${9 + (i * 11.3) % 78}%`,
              top:  `${12 + (i * 14.7) % 72}%`,
              background: `rgba(${theme.rgb}, 0.7)`,
              boxShadow: `0 0 7px 2px rgba(${theme.rgb}, 0.45)`,
            }}
            animate={{
              y:       [0, -(9 + (i % 4) * 4), 0],
              x:       [0, i % 2 === 0 ?  4 : -4, 0],
              opacity: [0.22 + (i % 3) * 0.07, 0.78 + (i % 3) * 0.07, 0.22 + (i % 3) * 0.07],
              scale:   [1, 1.3, 1],
            }}
            transition={{ duration: 4 + (i % 5) * 0.9, delay: i * 0.38, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        <div className="relative z-10 px-5 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-6">
          <div className="space-y-2 md:space-y-3 min-w-0">
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08, ease: EASE }}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-300/80"
            >
              <Sparkles className="h-3 w-3 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.65)]" /> {t("mr.dash.hub")}
            </motion.span>
            {meta ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.14, ease: EASE }}
                className="space-y-1"
              >
                <p className={`text-[11px] font-mono uppercase tracking-[0.32em] ${meta.color} drop-shadow-[0_0_18px_rgba(var(--tier-rgb),0.65)]`}>{meta.nameEn}</p>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-none">
                  <span
                    className={theme.accent}
                    style={{ textShadow: `0 0 48px rgba(${theme.rgb}, 0.7), 0 0 20px rgba(${theme.rgb}, 0.4)` }}
                  >
                    {meta.nameCn}
                  </span>
                  <span className="text-foreground/55 text-base sm:text-xl ml-2 sm:ml-3 font-mono tabular-nums">#{ownedNodeId}</span>
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
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground/85">{t("mr.dash.owned.paid")}</p>
                <p
                  className={`num text-2xl sm:text-3xl md:text-4xl font-bold tabular-nums ${theme.accentBright} leading-none mt-1`}
                  style={{ textShadow: `0 0 36px rgba(${theme.rgb}, 0.65), 0 0 16px rgba(${theme.rgb}, 0.4)` }}
                >
                  $<CountUp
                    to={ownedAmount ? Number(ownedAmount) / 1e18 : meta.priceUsdt}
                    fmt={(n) => Math.round(n).toLocaleString("en-US")}
                  />
                </p>
                <p className="text-[11px] text-muted-foreground/80 mt-1.5 tracking-[0.18em] uppercase">USDT</p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ── Brand tagline divider — echoes the 刻·下·即·永·恒 gold rule
          on rune.homes. Appears between the hero card and the tab bar
          so the "portal" transition from brand landing → app data
          reads as intentional. Fades in after the hero settles.     */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0.6 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.9, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center gap-3"
      >
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/70 to-transparent" />
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="shrink-0 text-[11px] tracking-[0.45em] font-medium select-none"
          style={{
            background: "linear-gradient(90deg, #92400e, #d97706, #fbbf24, #fef08a, #fbbf24, #d97706, #92400e)",
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: "rune-shine 5s ease-in-out infinite",
          }}
        >
          刻·下·即·永·恒
        </motion.span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
      </motion.div>

      {/* ── Tabs ── indicator uses `layoutId="dashTab"` so the underline
          morphs between tabs instead of cutting. Active tab also gets a
          soft radial glow beneath its label. */}
      {/* Segmented tab switcher — rounded container with a single sliding
          amber pill that `layoutId`s between active tabs. Replaces the old
          underline look with a more premium "control surface" feel and
          gives the new 4th tab (benefits) room to breathe. Scroll-x on
          mobile so 4 tabs + icons never clip on 360 px viewports. */}
      <div className="surface-3d rounded-xl border border-border/55 bg-card/60 p-1 overflow-x-auto scrollbar-hide">
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
            <OverviewTab address={address} restricted={restricted} />
          ) : tab === "team" ? (
            restricted ? <RestrictedTabPanel kind="team" /> : <TeamTab address={address} />
          ) : (
            restricted ? <RestrictedTabPanel kind="rewards" /> : <RewardsTab address={address} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bound-but-unpurchased: friendly nag dialog. Auto-opens once after
          on-chain + DB signals settle; dismissable, won't reappear unless
          the user reconnects or finishes a purchase. */}
      <NoNodeReminder open={reminderOpen} onClose={() => { setReminderOpen(false); setReminderDismissed(true); }} />
    </div>
  );
}

/** Replaces Team / Rewards tab content for unpurchased users. Re-uses the
 *  amber locked-card visuals from the OverviewTab so the gate feels
 *  consistent across tabs. The CTA fires `emitOpenPurchase()` which the
 *  RuneOnboarding listener catches to open PurchaseNodeModal. */
function RestrictedTabPanel({ kind }: { kind: "team" | "rewards" }) {
  const { t } = useLanguage();
  const tx = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };
  const title = kind === "team"
    ? tx("mr.dash.locked.team.title", "购买节点后查看团队")
    : tx("mr.dash.locked.rewards.title", "购买节点后查看返佣");
  const desc = kind === "team"
    ? tx("mr.dash.locked.team.desc", "节点上线即可看到下线层级、伞下出资和团队等级分布。")
    : tx("mr.dash.locked.rewards.desc", "持有节点后，邀请链接每一笔成交都会即时返佣到你的钱包，并在此查询明细。");
  return (
    <Card className="surface-3d relative overflow-hidden border-amber-500/55 bg-gradient-to-br from-amber-900/40 to-slate-700/85">
      <div className="absolute -top-16 -right-12 w-44 h-44 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
      <CardContent className="py-12 text-center space-y-3 relative z-10">
        <div className="text-amber-300 font-semibold text-base">{title}</div>
        <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">{desc}</p>
        <Button
          size="sm"
          onClick={() => emitOpenPurchase()}
          className="mt-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
        >
          {tx("mr.dash.locked.cta", "立即购买节点")}
        </Button>
      </CardContent>
    </Card>
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
      <div className={`absolute -top-20 -right-20 w-72 h-72 rounded-full bg-gradient-to-br ${theme.gradient} blur-3xl pointer-events-none opacity-90`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_55%)] pointer-events-none" />
      <CardHeader className="pb-3 border-b border-border/40 relative z-10">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className={`h-4 w-4 ${theme.accent}`} />
          <span>{t("mr.dash.owned.benefitsTitle")}</span>
          {meta && (
            <span className={`ml-auto text-[11px] font-mono uppercase tracking-[0.22em] rounded-md border px-2 py-0.5 ${theme.chip}`}>
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

        {/* 180-day cumulative USDT earnings sparkline */}
        {def && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.28, ease: EASE }}
            className="mt-4 pt-4 border-t border-border/30"
          >
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/87">180-Day Cumulative USDT</span>
              <span className={`text-xs font-mono font-semibold ${theme.accent}`}>${(def.dailyUsdt * 180).toLocaleString("en-US")}</span>
            </div>
            <ResponsiveContainer width="100%" height={64}>
              <AreaChart
                data={Array.from({ length: 19 }, (_, i) => ({ day: i * 10, usdt: Math.round(def.dailyUsdt * i * 10) }))}
                margin={{ top: 2, right: 2, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={`spark-fill-${nodeId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={`rgba(${theme.rgb},0.50)`} />
                    <stop offset="100%" stopColor={`rgba(${theme.rgb},0.02)`} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="usdt"
                  stroke={`rgba(${theme.rgb},0.9)`}
                  strokeWidth={1.5}
                  fill={`url(#spark-fill-${nodeId})`}
                  dot={false}
                  isAnimationActive
                />
                <XAxis dataKey="day" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "rgba(10,12,18,0.92)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", fontSize: "10px" }}
                  labelFormatter={(v) => `Day ${v}`}
                  formatter={(v: number) => [`$${v.toLocaleString("en-US")}`, "Cumulative"]}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}
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
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 55, damping: 14, delay }}
      whileHover={{ y: -3, scale: 1.02, transition: { type: "spring", stiffness: 320, damping: 18 } }}
      style={highlight ? { ["--tier-rgb" as string]: theme.rgb } : undefined}
      className={`relative rounded-xl border p-3 overflow-hidden transition-colors duration-300 ${
        highlight
          ? "surface-3d surface-3d-tinted border-white/20 bg-gradient-to-br from-white/[0.07] to-white/[0.02]"
          : "border-white/12 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/25"
      }`}
    >
      {highlight && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-80"
          style={{
            background: `radial-gradient(circle at 85% -20%, rgba(${theme.rgb}, 0.28), transparent 55%)`,
          }}
        />
      )}
      <div className="relative flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80 mb-1.5">
        <Icon className={`h-3 w-3 ${highlight ? theme.accent : "text-muted-foreground/80"}`} style={highlight ? { filter: `drop-shadow(0 0 6px rgba(${theme.rgb}, 0.5))` } : undefined} />
        <span>{label}</span>
      </div>
      <div
        className={`relative text-xl font-bold tabular-nums num ${highlight ? theme.accentBright : "text-foreground"}`}
        style={highlight ? { textShadow: `0 0 24px rgba(${theme.rgb}, 0.6), 0 0 10px rgba(${theme.rgb}, 0.35)` } : undefined}
      >
        {value}
      </div>
      {sub && <div className="relative text-[11px] text-muted-foreground/80 mt-1 tracking-[0.12em] uppercase">{sub}</div>}
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
  {
    labelKey:    "mr.dash.benefits.feat.promo",
    subKey:      "mr.dash.benefits.feat.promoSub",
    icon:        Network,
    all: true,   strategicBoost: false,
    iconCls:     "text-cyan-300",
    iconBg:      "bg-cyan-950/55",
    iconBorder:  "border-cyan-500/40",
    glowFrom:    "from-cyan-900/18",
    stripe:      "from-cyan-400/75 via-cyan-500/35 to-transparent",
  },
  {
    labelKey:    "mr.dash.benefits.feat.api",
    subKey:      "mr.dash.benefits.feat.apiSub",
    icon:        Terminal,
    all: true,   strategicBoost: true,
    iconCls:     "text-blue-300",
    iconBg:      "bg-blue-950/55",
    iconBorder:  "border-blue-500/40",
    glowFrom:    "from-blue-900/18",
    stripe:      "from-blue-400/75 via-blue-500/35 to-transparent",
  },
  {
    labelKey:    "mr.dash.benefits.feat.ai",
    subKey:      "mr.dash.benefits.feat.aiSub",
    icon:        Eye,
    all: true,   strategicBoost: true,
    iconCls:     "text-violet-300",
    iconBg:      "bg-violet-950/55",
    iconBorder:  "border-violet-500/40",
    glowFrom:    "from-violet-900/18",
    stripe:      "from-violet-400/75 via-violet-500/35 to-transparent",
  },
  {
    labelKey:    "mr.dash.benefits.feat.pred",
    subKey:      "mr.dash.benefits.feat.predSub",
    icon:        Radar,
    all: true,   strategicBoost: true,
    iconCls:     "text-amber-300",
    iconBg:      "bg-amber-950/55",
    iconBorder:  "border-amber-500/40",
    glowFrom:    "from-amber-900/18",
    stripe:      "from-amber-400/75 via-amber-500/35 to-transparent",
  },
  {
    labelKey:    "mr.dash.benefits.feat.quant",
    subKey:      "mr.dash.benefits.feat.quantSub",
    icon:        Layers,
    all: true,   strategicBoost: true,
    iconCls:     "text-emerald-300",
    iconBg:      "bg-emerald-950/55",
    iconBorder:  "border-emerald-500/40",
    glowFrom:    "from-emerald-900/18",
    stripe:      "from-emerald-400/75 via-emerald-500/35 to-transparent",
  },
];

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground/90 mb-2">
              {t("mr.dash.benefits.airdropSection")}
            </div>
            <div className="space-y-1.5">
              {AIRDROP_BATCHES.map((b, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md border border-amber-500/40 bg-gradient-to-r from-amber-950/45 to-card/30 px-3 py-2.5 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-amber-400/70 via-amber-500/50 to-amber-600/30 rounded-l pointer-events-none" />
                  <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)] w-12 shrink-0">{t(b.titleKey)}</span>
                  <span className="text-xl font-bold tabular-nums text-amber-200 drop-shadow-[0_0_10px_rgba(251,191,36,0.55)] w-12 shrink-0">{b.pct}%</span>
                  <p className="text-xs text-muted-foreground/90 leading-snug flex-1 min-w-0">{t(b.trig)}</p>
                </div>
              ))}
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
          <div className="rounded-lg border border-amber-500/60 bg-gradient-to-br from-amber-900/45 to-amber-950/20 p-4 shadow-[inset_0_1px_0_rgba(251,191,36,0.22),0_0_24px_rgba(251,191,36,0.12)]">
            <div className="text-xs uppercase tracking-[0.22em] text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)] mb-3">
              {t("mr.dash.benefits.poolShareTitle")}
            </div>
            <div className="space-y-3 tabular-nums">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground/90 mb-1">{t("mr.dash.benefits.weightCoeff")}</div>
                  <div className={`text-3xl sm:text-4xl font-bold ${theme.accentBright}`} style={{ textShadow: `0 0 20px rgba(${theme.rgb}, 0.5)` }}>{weight ? `${weight.coeff.toFixed(1)}×` : "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground/90 mb-1">{t("mr.dash.benefits.yourShare")}</div>
                  <div className="text-3xl sm:text-4xl font-bold text-white">{weight?.share ?? "—"}</div>
                </div>
              </div>
              {meta && (
                <div>
                  <div className="text-xs text-muted-foreground/87 mb-0.5">{t("mr.dash.owned.tier")}</div>
                  <div className={`text-base font-semibold ${meta.color}`}>{meta.nameEn} · {meta.nameCn}</div>
                </div>
              )}
            </div>
            <p className="text-[11px] font-mono text-muted-foreground/82 mt-3 tabular-nums border-t border-amber-500/10 pt-2.5">
              {t("mr.dash.benefits.poolFormula")}
            </p>
          </div>

          {/* Six-stream sources — where dividend pool money comes from. */}
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/90 mb-2.5">
              {t("mr.dash.benefits.poolSourcesTitle")}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {SIX_STREAMS.map((s, i) => (
                <div
                  key={s.key}
                  className="flex items-center gap-2.5 rounded-md border border-amber-500/35 bg-gradient-to-r from-amber-950/35 to-card/35 px-3 py-2 hover:border-amber-500/55 hover:from-amber-950/50 transition-colors duration-300"
                >
                  <span className="shrink-0 h-6 w-6 rounded-full bg-amber-500/22 border border-amber-500/50 flex items-center justify-center text-[11px] font-mono text-amber-300 tabular-nums drop-shadow-[0_0_6px_rgba(251,191,36,0.45)]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 leading-tight">
                    <div className="text-xs font-semibold text-foreground">{t(s.shortKey)}</div>
                    <div className="text-[11px] text-muted-foreground/80">{t(s.tagKey)}</div>
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
        {/* Command-matrix layout — each feature is a full-width row,
            like a classified entitlements panel or a Bloomberg terminal
            capabilities list. Far more imposing than a card grid.        */}
        <div className="rounded-xl border border-amber-500/20 overflow-hidden divide-y divide-white/[0.06]">
          {PLATFORM_FEATURES.map((f, idx) => {
            const available = f.all || (isStrategic && (f as any).strategicOnly);
            const boosted = f.strategicBoost && isStrategic;
            const Icon = f.icon;
            return (
              <div
                key={f.labelKey}
                className={`relative flex items-center gap-3 sm:gap-4 px-4 py-3.5 bg-gradient-to-r ${f.glowFrom} to-transparent transition-all duration-300 ${!available ? "opacity-38 grayscale" : "hover:brightness-[1.08]"}`}
              >
                {/* Left color stripe */}
                <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b ${f.stripe} pointer-events-none`} />

                {/* Ordinal index */}
                <span className={`text-[11px] font-mono tabular-nums leading-none ${f.iconCls} opacity-40 w-4 shrink-0 pl-1`}>
                  {String(idx + 1).padStart(2, "0")}
                </span>

                {/* Icon in bordered container */}
                <div className={`flex items-center justify-center w-9 h-9 rounded-lg border shrink-0 ${f.iconBorder} ${f.iconBg} ${f.iconCls}`}>
                  <Icon className="h-4 w-4 drop-shadow-[0_0_8px_currentColor]" />
                </div>

                {/* Label — takes all remaining space */}
                <p className="flex-1 text-sm font-semibold text-foreground/95 min-w-0 leading-tight">
                  {t(f.labelKey)}
                </p>

                {/* Boost badge + status — always right-aligned */}
                <div className="flex items-center gap-2.5 shrink-0">
                  {boosted && (
                    <span className="hidden sm:inline text-[11px] font-mono tracking-widest text-purple-300 bg-purple-950/70 border border-purple-500/35 rounded-full px-2 py-0.5 leading-none">
                      ×1.5 APEX
                    </span>
                  )}
                  <span className={`text-[11px] font-mono uppercase tracking-[0.18em] shrink-0 ${available ? "text-emerald-400" : "text-muted-foreground/62"}`}>
                    {available ? "● ACTIVE" : "○ LOCKED"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </BenefitGroup>

      <p className="text-[11px] text-muted-foreground/82 text-center pt-1">
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
      <Card className="surface-3d relative overflow-hidden bg-gradient-to-br from-slate-600/85 to-slate-700/90 border-amber-500/55">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.14),transparent_55%)] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent pointer-events-none" />
        <CardHeader className="pb-3 border-b border-amber-500/20 relative z-10 flex-row items-center justify-between gap-3 space-y-0">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="h-4 w-4 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.65)] shrink-0" />
            <span className="text-sm font-semibold text-foreground truncate">{title}</span>
            {subtitle && (
              <span className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground/87 hidden sm:inline truncate">{subtitle}</span>
            )}
          </div>
          {rightTag && (
            <span className="text-[11px] font-mono tabular-nums text-amber-200/85 shrink-0">{rightTag}</span>
          )}
        </CardHeader>
        <CardContent className="pt-5 pb-5 relative z-10">{children}</CardContent>
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
      <Card className="surface-3d relative overflow-hidden border-emerald-500/55 bg-gradient-to-br from-slate-600/70 via-emerald-950/55 to-slate-700/88">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-emerald-500/35 via-cyan-500/20 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.12),transparent_55%)] pointer-events-none" />
        <CardHeader className="pb-3 border-b border-emerald-500/20 relative z-10 flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.55)]" />
            <span className="bg-gradient-to-r from-emerald-200 to-cyan-200 bg-clip-text text-transparent">
              {t("mr.dash.pool.title")}
            </span>
          </CardTitle>
          <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.22em] text-emerald-300/80">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-live-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
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
              <span className="text-[11px] font-mono tabular-nums text-muted-foreground/82">
                {raisedPct.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-baseline gap-2 tabular-nums mb-2">
              <span className="text-2xl sm:text-3xl font-bold text-emerald-200 drop-shadow-[0_0_14px_rgba(52,211,153,0.5)]">
                $<CountUp to={totalRaised} fmt={formatShortUsd} />
              </span>
              <span className="text-xs text-muted-foreground/87">
                / ${formatShortUsd(fundraiseCap)} USDT
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-black/40 overflow-hidden border border-emerald-500/15 relative">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-teal-400 relative overflow-hidden"
                initial={{ width: 0 }}
                animate={{ width: `${raisedPct}%` }}
                transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
              >
                <div className="animate-bar-sweep absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
              </motion.div>
            </div>
            <div className="text-[11px] text-muted-foreground/82 mt-2">
              {fundraiseComplete
                ? t("mr.dash.pool.fundraiseDone")
                : t("mr.dash.pool.fundraiseHint")}
            </div>
          </div>

          {/* Projected initial TLP once the raise fills */}
          <div className="rounded-md border border-cyan-500/35 bg-cyan-950/25 p-3 space-y-1.5 shadow-[inset_0_1px_0_rgba(34,211,238,0.15)]">
            <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]">
              {fundraiseComplete ? t("mr.dash.pool.tlpInitial") : t("mr.dash.pool.tlpProjected")}
            </div>
            <div className="text-xl font-bold tabular-nums text-cyan-200 drop-shadow-[0_0_10px_rgba(34,211,238,0.45)]">
              ${formatShortUsd(fundraiseComplete ? tlpInitial : projectedTlp)} USDT
            </div>
            <p className="text-xs text-muted-foreground/90 leading-snug">
              {t("mr.dash.pool.tlpNote")}
            </p>
          </div>

          {/* Fund allocation donut + legend */}
          {(() => {
            const ALLOC = [
              { name: "TLP Pool",   pct: 40, color: "#34d399" },
              { name: "Operations", pct: 25, color: "#60a5fa" },
              { name: "Treasury",   pct: 25, color: "#a78bfa" },
              { name: "Sub LP",     pct: 10, color: "#fbbf24" },
            ];
            return (
              <div className="rounded-md border border-border/25 bg-black/25 p-3 flex flex-col sm:flex-row items-center gap-4">
                <div className="shrink-0">
                  <PieChart width={88} height={88}>
                    <Pie
                      data={ALLOC}
                      cx={40}
                      cy={40}
                      innerRadius={24}
                      outerRadius={40}
                      dataKey="pct"
                      strokeWidth={0}
                      paddingAngle={2}
                      isAnimationActive
                    >
                      {ALLOC.map((e, i) => (
                        <Cell key={i} fill={e.color} fillOpacity={0.85} />
                      ))}
                    </Pie>
                  </PieChart>
                </div>
                <div className="flex flex-col gap-1.5 flex-1 w-full">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/87 mb-0.5">Fund Allocation</div>
                  {ALLOC.map((e) => (
                    <div key={e.name} className="flex items-center gap-2 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: e.color }} />
                      <span className="text-muted-foreground/80 flex-1">{e.name}</span>
                      <span className="font-mono font-semibold tabular-nums" style={{ color: e.color }}>{e.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Four stage milestones */}
          <div className="pt-1">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/90 mb-3">
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
                    className={`rounded-md border p-3 transition-colors relative overflow-hidden ${
                      unlocked
                        ? "border-emerald-500/60 bg-emerald-950/35 shadow-[inset_0_1px_0_rgba(52,211,153,0.2)]"
                        : isNext
                        ? "border-amber-500/60 bg-amber-950/30 ring-1 ring-amber-500/30 shadow-[0_0_16px_rgba(251,191,36,0.15)]"
                        : "border-border/50 bg-card/45"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground/87">
                        {t(`mr.dash.pool.stage${i + 1}Num`)}
                      </span>
                      <span
                        className={`text-[11px] font-mono uppercase tracking-[0.18em] ${
                          unlocked
                            ? "text-emerald-300"
                            : isNext
                            ? "text-amber-300"
                            : "text-muted-foreground/72"
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
                      <span className={`text-2xl font-bold ${unlocked ? "text-emerald-200 drop-shadow-[0_0_10px_rgba(52,211,153,0.55)]" : isNext ? "text-amber-200 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" : "text-foreground/80"}`}>
                        {stage.pct}%
                      </span>
                      <span className="text-[11px] text-muted-foreground/82">
                        {t("mr.dash.pool.airdropRelease")}
                      </span>
                    </div>
                    <div className={`text-[11px] tabular-nums mt-1 ${unlocked ? "text-emerald-400/80" : isNext ? "text-amber-400/80" : "text-muted-foreground/90"}`}>
                      TLP ≥ ${stage.tlpM}M
                    </div>
                    <div className="text-[11px] text-muted-foreground/72 mt-1">
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
            <div className="rounded-lg border border-amber-500/55 bg-gradient-to-br from-amber-950/45 via-amber-950/15 to-transparent p-4 space-y-4 shadow-[0_0_20px_rgba(251,191,36,0.1),inset_0_1px_0_rgba(251,191,36,0.2)]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono uppercase tracking-[0.22em] text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]">
                  {t("mr.dash.pool.nextStageTitle")}
                </span>
                <span className="text-[11px] font-mono uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-950/40 text-amber-300 shrink-0">
                  {t(`mr.dash.pool.stage${nextStageIdx + 1}Num`)} · {nextStage.pct}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground/90 mb-1">
                    {t("mr.dash.pool.yourUnlock")}
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold tabular-nums text-amber-200">
                    {nextUnlockTokens.toLocaleString("en-US")}
                  </div>
                  <div className="text-[11px] text-muted-foreground/82 mt-0.5">
                    {t("mr.dash.pool.motherTokens")}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground/90 mb-1">
                    {t("mr.dash.pool.stagePrice")}
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground/95">
                    ${nextBatch.priceAt}
                  </div>
                  <div className="text-[11px] text-muted-foreground/82 mt-0.5">
                    {t("mr.dash.pool.perToken")}
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground/85 leading-snug pt-2.5 border-t border-amber-500/15">
                <span className="text-amber-300/90 font-semibold mr-1.5">{t("mr.dash.pool.trigger")}:</span>
                {t(nextBatch.trig)}
              </div>

              <div className="text-[11px] text-muted-foreground/77 tabular-nums">
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
      <Card className="surface-3d relative overflow-hidden border-fuchsia-500/50 bg-gradient-to-br from-fuchsia-950/60 via-purple-950/40 to-amber-950/20">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-fuchsia-500/40 via-purple-500/20 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.18),transparent_60%)] pointer-events-none" />
        <CardHeader className="pb-3 border-b border-fuchsia-500/20 relative z-10">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-fuchsia-300 drop-shadow-[0_0_8px_rgba(217,70,239,0.55)]" />
            <span className="bg-gradient-to-r from-fuchsia-200 via-purple-200 to-amber-200 bg-clip-text text-transparent">
              {t("mr.dash.genesis.title")}
            </span>
            <span className="ml-auto text-[11px] font-mono uppercase tracking-[0.22em] px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 shrink-0">
              {t("mr.dash.genesis.achievedBadge")}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4 relative z-10">
          {/* Trigger stats — show all three, highlight the one that
              actually qualified the user. */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
          <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-amber-300/85 mb-0.5">
                {t("mr.dash.genesis.rewardTitle")}
              </div>
              <div className="text-base font-bold tabular-nums text-amber-200">
                {t("mr.dash.genesis.rewardValue")}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground/90 mb-0.5">
                {t("mr.dash.genesis.weightLabel")}
              </div>
              <div className="text-sm font-semibold text-foreground/95 tabular-nums">
                {weight ? `${weight.coeff.toFixed(1)}×` : "—"}
                {meta && <span className="text-xs text-muted-foreground/87 ml-2">{meta.nameCn} · {meta.nameEn}</span>}
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
    <div className={`rounded-lg border p-3 ${triggered ? "border-fuchsia-500/65 bg-fuchsia-950/45" : "border-border/45 bg-card/40"}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground/80 truncate">{label}</span>
        {triggered && (
          <span className="text-[11px] font-mono uppercase tracking-[0.22em] text-fuchsia-300 shrink-0">✓ TRIGGER</span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5 tabular-nums">
        <span className={`text-3xl font-bold ${triggered ? "text-fuchsia-200" : "text-foreground/90"}`}>{value}</span>
        <span className="text-sm text-muted-foreground/87">/ {target}</span>
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
    <div className={`rounded-md border p-2.5 ${
      highlight
        ? "border-amber-500/40 bg-gradient-to-br from-amber-950/30 to-card/20 shadow-[inset_0_1px_0_rgba(251,191,36,0.15)]"
        : "border-border/50 bg-card/45"
    }`}>
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground/80 mb-1.5">{label}</div>
      <div
        className={`text-xl sm:text-2xl font-bold tabular-nums leading-tight ${highlight ? (theme?.accentBright ?? "text-amber-200") : "text-foreground"}`}
        style={highlight ? { textShadow: "0 0 18px rgba(251,191,36,0.5)" } : undefined}
      >{value}</div>
      {sub && <div className="text-xs text-muted-foreground/87 mt-1">{sub}</div>}
    </div>
  );
}

export function OverviewTab({ address, restricted = false }: { address: string; restricted?: boolean }) {
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
          <Card className="surface-3d relative overflow-hidden bg-gradient-to-br from-slate-600/80 to-slate-700/88 border-amber-500/60">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br from-amber-500/40 via-amber-600/20 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_55%)] pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/55 to-transparent pointer-events-none" />
            <CardHeader className="pb-3 border-b border-amber-500/20 relative z-10">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.7)]" />
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
                  <span className="opacity-60 uppercase text-[11px] tracking-widest block mb-0.5">{t("mr.dash.ref.upstream")}</span>
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

        {/* Restricted (bound but not purchased) — explains the commission
            rule per 2026-04-29 user direction: bind only ≠ commission.
            User must own a node to receive direct-referral payouts when
            their downline buys. */}
        {restricted && (
          <Card className="surface-3d relative overflow-hidden border-amber-500/55 bg-gradient-to-br from-amber-900/50 to-slate-700/85">
            <CardContent className="py-6 sm:py-7 space-y-3">
              <div className="text-center">
                <div className="text-amber-300 font-semibold text-base">
                  {t("mr.dash.locked.title") || "温馨提示 · 您还未购买节点"}
                </div>
              </div>
              <div className="max-w-md mx-auto space-y-2 text-xs sm:text-sm">
                <p className="text-muted-foreground/90 flex items-start gap-2">
                  <span className="text-emerald-400 shrink-0">✓</span>
                  <span>{t("mr.dash.locked.row1") || "您已绑定推荐关系，可以分享上方邀请链接发展下线"}</span>
                </p>
                <p className="text-amber-200/90 flex items-start gap-2">
                  <span className="text-amber-400 shrink-0">⚠</span>
                  <span>{t("mr.dash.locked.row2") || "但要拿到直推奖励，必须自己先购买节点"}</span>
                </p>
                <p className="text-emerald-200/90 flex items-start gap-2">
                  <span className="text-emerald-400 shrink-0">💰</span>
                  <span>{t("mr.dash.locked.row3") || "您持节点后，下线购买节点会按档位返佣 5%-15% 直接进入您的钱包"}</span>
                </p>
              </div>
              <div className="flex justify-center pt-1">
                <Button
                  size="sm"
                  onClick={() => emitOpenPurchase()}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-1.5"
                >
                  {t("mr.dash.locked.cta") || "立即购买节点"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Network-wide fundraise + 4-stage TLP unlock progress. Shown
            to everyone so any visitor understands where the protocol
            sits on the roadmap, not just holders. The `ownedNodeId`
            lets the card compute the viewer's tier-specific unlock at
            the next stage (tokens + USDT estimate). */}
        {!restricted && <PoolProgressCard ownedNodeId={nodeId} />}

        {/* Genesis (L6) earnings panel — only rendered once the viewer
            has actually qualified (any one of: ≥3 direct 符主 L5
            referrals, ≥5 团队 符主, or ≥30 团队 符魂). Keeps non-
            qualified users from seeing a mostly-empty panel that
            implies something they don't yet have. */}
        {!restricted && <GenesisEarningsPanel address={address} ownedNodeId={nodeId} />}

        {/* Full benefits digest below the referral panel — the same set
            of cards that used to live in a standalone Benefits tab:
            core card, mother-token P&L, airdrop batches, per-tier
            commission matrix, weight matrix, six streams + weight,
            platform feature matrix. All data is sourced from the
            member-facing node-benefits spec. */}
        {!restricted && <BenefitsSection ownedNodeId={nodeId} />}
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
export function TeamTab({ address }: { address: string }) {
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

      <Card className="surface-3d relative overflow-hidden bg-gradient-to-br from-slate-700/85 to-slate-700/90 border-amber-500/50">
        <div className="absolute -top-24 -right-16 w-64 h-64 rounded-full bg-gradient-to-br from-amber-500/20 via-transparent to-transparent blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_55%)] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent pointer-events-none" />
        <CardHeader className="pb-3 border-b border-amber-500/15 relative z-10">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.65)]" /> {t("mr.dash.team.treeTitle")}
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

      <p className="text-[11px] text-muted-foreground/87 text-center">
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
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/82" />}
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
        : "border-white/18 bg-gradient-to-br from-slate-700/75 to-slate-700/85 hover:border-white/28"
    }`}>
      {isSelf && (
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_55%)] pointer-events-none"
        />
      )}
      <div className="relative flex items-center gap-2 flex-wrap">
        <span className={`text-[11px] uppercase tracking-[0.2em] font-semibold px-1.5 py-0.5 rounded border ${
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
        <span className="relative text-[11px] text-muted-foreground sm:ml-auto tabular-nums">
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
      className="w-full flex items-center gap-2 py-2.5 px-3 rounded-lg border border-white/20 bg-white/[0.045] hover:border-amber-500/55 hover:bg-amber-500/[0.08] hover:shadow-[0_4px_20px_-8px_rgba(251,191,36,0.3)] transition-all duration-300 flex-wrap text-left group"
    >
      <CopyableAddress address={row.user} short />
      <TreeNodeBadges stats={stats} />
      <span className="text-[11px] text-muted-foreground ml-auto flex items-center gap-1.5">
        <span className="tabular-nums">{new Date(row.boundAt).toLocaleDateString()}</span>
        <ChevronRight className="h-3.5 w-3.5 opacity-50 transition-all duration-300 group-hover:opacity-100 group-hover:text-amber-400 group-hover:translate-x-0.5" />
      </span>
    </motion.button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Rewards tab — per-payout detail of direct-commission USDT earned
──────────────────────────────────────────────────────────────────────────── */
export function RewardsTab({ address }: { address: string }) {
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
          <Card className="surface-3d relative overflow-hidden bg-gradient-to-br from-slate-700/85 to-slate-700/90 border-amber-500/50">
            <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-gradient-to-br from-amber-500/20 via-transparent to-transparent blur-3xl pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_55%)] pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent pointer-events-none" />
            <CardHeader className="pb-3 border-b border-amber-500/15 relative z-10">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.65)]" /> {t("mr.dash.reward.monthlyTitle")}
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
        <Card className="surface-3d relative overflow-hidden bg-gradient-to-br from-slate-700/85 to-slate-700/90 border-amber-500/50">
          <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-gradient-to-br from-amber-500/15 via-transparent to-transparent blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.10),transparent_55%)] pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent pointer-events-none" />
          <CardHeader className="pb-3 border-b border-amber-500/15 relative z-10">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gift className="h-4 w-4 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.65)]" /> {t("mr.dash.reward.listTitle")}
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

      <p className="text-[11px] text-muted-foreground/87 text-center">
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
        <span className={`text-[11px] font-mono uppercase tracking-[0.2em] w-14 sm:w-16 shrink-0 ${meta?.color ?? "text-muted-foreground"}`}>
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
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 pb-2">
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={from}
          onChange={(e) => onFrom(e.target.value)}
          aria-label={t("mr.dash.reward.filterFrom")}
          className={`${inputCls} w-[120px] sm:w-[132px]`}
        />
        <span className="text-[11px] text-muted-foreground/87">→</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onTo(e.target.value)}
          aria-label={t("mr.dash.reward.filterTo")}
          className={`${inputCls} w-[120px] sm:w-[132px]`}
        />
      </div>
      <div className="relative flex-1 min-w-[140px]">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/77 pointer-events-none" />
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
      <Card className="surface-3d relative overflow-hidden bg-gradient-to-br from-slate-700/85 to-slate-700/90 border-amber-500/50">
        <div className="absolute -top-20 -right-10 w-56 h-56 rounded-full bg-gradient-to-br from-amber-500/22 via-transparent to-transparent blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_55%)] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent pointer-events-none" />

        <CardHeader className="pb-3 border-b border-amber-500/15 relative z-10">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.65)]" />
            {t("mr.dash.team.compTitle")}
            <span className="text-[11px] font-mono text-muted-foreground/80 tabular-nums ml-1">
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
            <div className="absolute top-0 right-2 z-10 inline-flex items-center gap-1 rounded-full border border-primary/25 bg-background/50 p-1 text-[11px] uppercase tracking-[0.18em] backdrop-blur">
              {(["direct", "team"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-full px-3 py-0.5 num tabular-nums transition-all ${
                    mode === m
                      ? "bg-primary/25 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.4)]"
                      : "text-muted-foreground/77 hover:text-primary/80"
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
      className={`group relative border rounded-xl p-4 sm:p-5 corner-brackets overflow-hidden surface-3d transition-all duration-300 ${
        highlight
          ? "border-amber-500/60 bg-gradient-to-br from-amber-900/45 via-slate-800/75 to-slate-700/85 hover:border-amber-400/80 hover:shadow-[0_0_36px_rgba(251,191,36,0.40),inset_0_1px_0_rgba(251,191,36,0.25)]"
          : "border-white/20 bg-gradient-to-br from-slate-600/65 to-slate-700/80 hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(251,191,36,0.12)]"
      }`}
    >
      {/* Hover glow aurora — appears behind content on hover */}
      <div
        aria-hidden
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${
          highlight
            ? "bg-[radial-gradient(circle_at_75%_-20%,rgba(251,191,36,0.22),transparent_55%)]"
            : "bg-[radial-gradient(circle_at_75%_-20%,rgba(251,191,36,0.08),transparent_55%)]"
        }`}
      />
      <div className="relative flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-[0.20em] text-muted-foreground/85">{label}</span>
        {Icon && (
          <Icon className={`h-4 w-4 transition-colors ${highlight ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" : "text-muted-foreground/77 group-hover:text-amber-400/70"}`} />
        )}
      </div>
      <div className={`relative text-2xl sm:text-3xl num tabular-nums ${highlight ? "num-gold" : "text-foreground"}`}>{value}</div>
      {sub && <div className="relative text-xs text-muted-foreground/80 mt-1.5 tracking-[0.14em] uppercase">{sub}</div>}
    </motion.div>
  );
}
