import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronUp, Zap, Shield, TrendingUp, FlaskConical, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetRuneOverview } from "@rune/api-client-react";
import { useShowZh } from "@/contexts/language-context";
import { useActiveAccount } from "thirdweb/react";
import { useNodeConfigs, useUserPurchase } from "@/hooks/rune/use-node-presell";
import { NODE_IDS, NODE_META, type NodeId } from "@/lib/thirdweb/contracts";
import { useReferrerOf } from "@/hooks/rune/use-community";
import { emitOpenPurchase } from "@/lib/rune/purchase-signal";
import { useDemoStore } from "@/lib/demo-store";

/** Map the REST response's tier key to the on-chain nodeId.
 *  101 is the apex (FOUNDER 50k); 501 is the entry tier (INITIAL 1k). */
const LEVEL_TO_NODE_ID: Record<string, NodeId> = {
  founder:  101,
  super:    201,
  advanced: 301,
  mid:      401,
  initial:  501,
};

/** Card render order — entry tier first (cheapest left, apex right). */
const TIER_ORDER: readonly NodeId[] = [501, 401, 301, 201, 101] as const;

/** Off-chain marketing metadata that REST normally supplies. Baked
 *  client-side too so we still render all 5 cards if the api-server is
 *  stale or returns fewer nodes. Values come from 节点招募计划. */
type TierStatic = {
  privatePrice: number;
  dailyUsdt:    number;
  airdropPerSeat: number;
  seats:        number;
};
const TIER_STATIC: Record<NodeId, TierStatic> = {
  101: { privatePrice: 0.016, dailyUsdt: 234,  airdropPerSeat: 75000, seats:   20 },
  201: { privatePrice: 0.020, dailyUsdt: 46.8, airdropPerSeat: 13000, seats:  200 },
  301: { privatePrice: 0.024, dailyUsdt: 23.4, airdropPerSeat:  6250, seats:  400 },
  401: { privatePrice: 0.026, dailyUsdt: 11.7, airdropPerSeat:  3000, seats:  800 },
  501: { privatePrice: 0.028, dailyUsdt:  4.7, airdropPerSeat:  1000, seats: 1000 },
};

/** Shape of one element returned by NodePresell.getNodeConfigs.
 *  `directRate` is in basis points (10000 = 100%). */
interface OnChainNodeConfig {
  nodeId: bigint;
  payToken: string;
  payAmount: bigint;
  maxLimit: bigint;
  curNum: bigint;
  directRate: bigint;
}

// ─── Node style maps ────────────────────────────────────────────────────────
const NODE_BG: Record<string, string> = {
  initial:  "from-slate-900/70 to-slate-800/20 border-slate-600/40",
  mid:      "from-blue-950/70 to-blue-900/20 border-blue-700/40",
  advanced: "from-green-950/70 to-green-900/20 border-green-700/40",
  super:    "from-amber-950/70 to-amber-900/20 border-amber-700/40",
  founder:  "from-purple-950/70 to-purple-900/20 border-purple-700/40",
};
const NODE_ACCENT: Record<string, string> = {
  initial:  "text-slate-300",
  mid:      "text-blue-400",
  advanced: "text-green-400",
  super:    "text-amber-400",
  founder:  "text-purple-400",
};
const NODE_BADGE: Record<string, string> = {
  initial:  "bg-slate-800/60 text-slate-200 border-slate-600/40",
  mid:      "bg-blue-900/50 text-blue-300 border-blue-700/40",
  advanced: "bg-green-900/50 text-green-300 border-green-700/40",
  super:    "bg-amber-900/50 text-amber-300 border-amber-700/40",
  founder:  "bg-purple-900/50 text-purple-300 border-purple-700/40",
};
const NODE_BTN: Record<string, string> = {
  initial:  "bg-slate-600 hover:bg-slate-500 text-white",
  mid:      "bg-blue-600 hover:bg-blue-500 text-white",
  advanced: "bg-green-600 hover:bg-green-500 text-white",
  super:    "bg-amber-600 hover:bg-amber-500 text-white",
  founder:  "bg-purple-600 hover:bg-purple-500 text-white",
};
const NODE_GLOW: Record<string, string> = {
  initial:  "shadow-[0_0_40px_rgba(148,163,184,0.12)]",
  mid:      "shadow-[0_0_40px_rgba(59,130,246,0.15)]",
  advanced: "shadow-[0_0_40px_rgba(34,197,94,0.15)]",
  super:    "shadow-[0_0_40px_rgba(251,191,36,0.15)]",
  founder:  "shadow-[0_0_40px_rgba(168,85,247,0.15)]",
};
const NODE_PROGRESS_BAR: Record<string, string> = {
  initial:  "[&>div]:bg-slate-400",
  mid:      "[&>div]:bg-blue-500",
  advanced: "[&>div]:bg-green-500",
  super:    "[&>div]:bg-amber-500",
  founder:  "[&>div]:bg-purple-500",
};

const FAQ_ITEMS = [
  {
    qEn: "How are node funds used?",
    qZh: "节点购买资金如何使用？",
    aEn: "Funds are allocated: 40% to TLP liquidity pool, 25% operations, 25% treasury, and 10% sub-token LP — all verifiable on-chain.",
    aZh: "募集资金按比例分配至 TLP 流动池（40%）、运营资金（25%）、国库储备（25%）及子TOKEN LP（10%），全程链上透明可查。",
  },
  {
    qEn: "How is daily USDT income settled?",
    qZh: "每日 USDT 收益如何结算？",
    aEn: "Settled automatically to your bound address every day at UTC 00:00 based on your node tier — no manual claim required.",
    aZh: "每日 UTC 00:00 按持仓节点等级自动结算至绑定地址，无需手动领取。",
  },
  {
    qEn: "When are sub-token airdrops distributed?",
    qZh: "子TOKEN空投何时发放？",
    aEn: "First airdrop within 30 days of mainnet launch, with quarterly supplements. Airdrop rights accrue in real time while you hold the node.",
    aZh: "主网上线后 30 天内完成首次空投，后续按季度补发。持有节点期间的空投权益实时累计。",
  },
  {
    qEn: "Can node seats be transferred?",
    qZh: "节点席位是否可以转让？",
    aEn: "Node seats are non-transferable during the current phase and locked until mainnet activation. Secondary market transfers will open after governance upgrades.",
    aZh: "当前阶段节点席位不可转让，合约锁定至主网激活。后续治理升级后将开放二级市场流通。",
  },
  {
    qEn: "How is the 170.82% APY calculated?",
    qZh: "年化 170.82% 如何计算？",
    aEn: "Based on Guardian node ($10,000): 180-day USDT income of $8,424 annualized ≈ 170.82%. Excludes token airdrops and MOTHER TOKEN appreciation.",
    aZh: "以符魂节点（$10,000投入）为基准：仅计入180天USDT收益$8,424，折算年化≈170.82%。不含TOKEN空投及母TOKEN市值增长部分。",
  },
];

const STEPS = [
  { en: "Connect Wallet",   zh: "连接钱包",      descEn: "Connect a Web3 wallet (MetaMask, TokenPocket, Trust, OKX…)",   descZh: "连接 Web3 钱包（MetaMask、TokenPocket、Trust、OKX 等）" },
  { en: "Bind Referrer",    zh: "绑定推荐关系",  descEn: "Submit the on-chain bind-referrer transaction once per wallet", descZh: "每个钱包提交一次链上绑定推荐人交易" },
  { en: "Choose Node",      zh: "选择节点",      descEn: "Pick the tier that matches your stake — L1 to L5",              descZh: "按投资规模选择节点等级（L1–L5）" },
  { en: "Pay & Activate",   zh: "支付激活",      descEn: "Approve USDT and pay; the node activates on contract confirm",  descZh: "授权并支付 USDT，合约确认后节点即时激活" },
];

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

// ─── Node card skeleton ────────────────────────────────────────────────────────
function NodeCardSkeleton() {
  return (
    <div className="relative flex flex-col rounded-2xl border border-white/10 bg-white/5 p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-16 bg-white/10" />
          <Skeleton className="h-6 w-20 bg-white/10" />
        </div>
        <Skeleton className="h-5 w-10 rounded bg-white/10" />
      </div>
      <div className="space-y-2.5 flex-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between gap-1">
            <Skeleton className="h-3 w-20 bg-white/10" />
            <Skeleton className="h-3 w-16 bg-white/10" />
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between">
          <Skeleton className="h-2.5 w-24 bg-white/10" />
          <Skeleton className="h-2.5 w-8 bg-white/10" />
        </div>
        <Skeleton className="h-1.5 w-full bg-white/10 rounded-full" />
        <Skeleton className="h-2.5 w-20 bg-white/10 ml-auto" />
      </div>
      <Skeleton className="mt-4 h-9 w-full rounded-md bg-white/10" />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Recruit() {
  const showZh = useShowZh();
  const account = useActiveAccount();
  const { isDemoMode, demoAddress, demoNodeId, exitDemo } = useDemoStore();
  const [, navigate] = useLocation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // REST overview still supplies the marketing-style metadata (tier English
  // name, daily USDT projection, airdrop-per-seat, etc.) that isn't stored
  // on-chain — these are project constants, fine to keep off-chain.
  const { data: overview, isLoading } = useGetRuneOverview();

  // On-chain live reads: NodePresell.getNodeConfigs returns the five tiers'
  // real-time `curNum` / `maxLimit`, and Community.referrerOf tells us
  // whether the connected wallet is already bound. We overlay both on top
  // of the REST rows so the UI reflects the chain within 15 s of any tx.
  const { data: onChainConfigs } = useNodeConfigs();
  const onChainArray = (onChainConfigs as OnChainNodeConfig[] | undefined) ?? [];
  const onChainByNodeId = new Map<number, OnChainNodeConfig>(
    onChainArray.map((c) => [Number(c.nodeId), c]),
  );

  const { isBound: chainIsBound } = useReferrerOf(account?.address);
  const { hasPurchased: chainHasPurchased } = useUserPurchase(account?.address);

  // In demo mode, treat the selected address as already bound + purchased.
  const isBound = isDemoMode ? true : chainIsBound;
  const hasPurchased = isDemoMode ? true : chainHasPurchased;

  const nodes = overview?.nodes ?? [];

  return (
    <div className="container mx-auto px-4 py-10 space-y-14 max-w-6xl">

      {/* ── Demo banner ── */}
      {isDemoMode && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-sm text-cyan-300">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 shrink-0" />
            <span className="font-medium">测试模式 Demo Mode</span>
            {demoNodeId && (
              <span className="text-cyan-400/60 hidden sm:inline">
                — 模拟持有节点 #{demoNodeId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 px-3 py-1 text-xs font-medium hover:bg-cyan-500/20 transition-colors"
            >
              进入 Dashboard →
            </button>
            <button
              type="button"
              onClick={() => { exitDemo(); navigate("/demo"); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 px-3 py-1 text-xs font-medium hover:bg-cyan-500/20 transition-colors"
            >
              <X className="h-3 w-3" /> 退出
            </button>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md px-6 py-10 md:px-12 md:py-14 shadow-[0_8px_48px_rgba(0,0,0,0.5)] text-center"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-blue-500/8 rounded-full blur-[80px] pointer-events-none" />

        <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-primary/40 rounded-tl pointer-events-none" />
        <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-primary/40 rounded-tr pointer-events-none" />
        <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-primary/40 rounded-bl pointer-events-none" />
        <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-primary/40 rounded-br pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-900/20 px-4 py-1.5 mb-6">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">
              Node Recruitment · Open Now
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-tight mb-4">
            {showZh ? "符·节点权柄重铸" : "Node Tier Reforge"}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-2">
            {showZh ? "五级节点体系 · 双TOKEN通缩经济 · 机构级收益结构" : "5-Tier Nodes · Dual-Token Deflation · Institutional Returns"}
          </p>
          <p className="text-sm text-muted-foreground/60 max-w-xl mx-auto">
            RUNE Protocol Node Recruitment · Five-Tier System · Dual-Token Deflationary Economy
          </p>

          {/* Global metric strip */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-border/30">
            {[
              { en: "Total Seats",    zh: "总席位",     val: "2,420"  },
              { en: "Node Tiers",     zh: "节点等级",   val: "5"      },
              { en: "Opening Price",  zh: "开盘价",     val: "$0.028" },
              { en: "USDT APY",       zh: "年化收益率", val: "170.82%", gold: true },
            ].map(({ en, zh, val, gold }) => (
              <div key={en} className="space-y-1">
                <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/50 font-medium">{en}</div>
                <div className={`text-2xl sm:text-3xl font-bold leading-none ${gold ? "text-amber-400" : "text-foreground"}`}>{val}</div>
                {showZh && <div className="text-[10px] text-muted-foreground/65">{zh}</div>}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* The onboarding orchestrator is mounted globally in App.tsx so the
          bind / purchase / dashboard-redirect flow fires from any page the
          moment the user connects via the header. No page-level mount here. */}

      {/* ── Binding status strip ── Only render the "not bound yet"
          prompt; once bound, we don't surface the relationship on this
          page (it lives on the dashboard). */}
      {account && !isBound && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-xl border px-4 py-3 text-xs flex items-center justify-between gap-3 border-amber-700/40 bg-amber-950/30 text-amber-200"
        >
          <span className="font-mono uppercase tracking-[0.18em] text-[10px] opacity-60">
            {showZh ? "链上绑定 · On-chain" : "On-chain"}
          </span>
          <span className="text-right font-medium">
            {showZh ? "尚未绑定推荐人" : "Not bound yet"}
          </span>
        </motion.div>
      )}

      {/* ── Node cards ── */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="h-px flex-1 bg-border/30" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground/60 px-3">
            {showZh ? "节点等级 · Node Tiers" : "Node Tiers"}
          </h2>
          <div className="h-px flex-1 bg-border/30" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {isLoading && nodes.length === 0
            ? Array.from({ length: 5 }).map((_, i) => <NodeCardSkeleton key={i} />)
            : TIER_ORDER.map((nodeId, i) => {
                // The card source-of-truth is the static tier table plus
                // NODE_META; REST overlays whatever extra metadata it has
                // for that level (so an out-of-date api-server doesn't
                // hide a tier). On-chain takes priority for live numbers.
                const meta   = NODE_META[nodeId];
                const stat   = TIER_STATIC[nodeId];
                const rest   = nodes.find((n) => LEVEL_TO_NODE_ID[n.level] === nodeId);
                const onChain = onChainByNodeId.get(nodeId);
                const level  = meta.level;

                const investment    = onChain ? Number(onChain.payAmount / 10n ** 18n) : meta.priceUsdt;
                const seats         = onChain ? Number(onChain.maxLimit) : (rest?.seats ?? stat.seats);
                // seatsRemaining must be authoritative — only the on-chain
                // `curNum` reflects real purchases. REST `seatsRemaining` is
                // a static placeholder in the overview table and would lie
                // about occupancy on a freshly-deployed contract. Default
                // to full-available while the chain read is in flight.
                const seatsRemaining = onChain
                  ? Number(onChain.maxLimit - onChain.curNum)
                  : seats;
                // directRate is basis points (PREVISION = 10000).
                const directRatePct = onChain ? Number(onChain.directRate) / 100 : null;
                const occupiedPct = seats > 0
                  ? Math.round(((seats - seatsRemaining) / seats) * 100)
                  : 0;
                const accent = NODE_ACCENT[level];
                const progressCls = NODE_PROGRESS_BAR[level];

                const privatePrice    = rest?.privatePrice    ?? stat.privatePrice;
                const dailyUsdt       = rest?.dailyUsdt       ?? stat.dailyUsdt;
                const airdropPerSeat  = rest?.airdropPerSeat  ?? stat.airdropPerSeat;

                return (
                  <motion.div
                    key={nodeId}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: i * 0.1 }}
                    className={`relative flex flex-col rounded-2xl border bg-gradient-to-b p-5 ${NODE_BG[level]} ${NODE_GLOW[level]}`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-1 ${accent}`}>
                          {meta.nameEn}
                        </div>
                        <div className="text-xl font-bold text-foreground">{showZh ? meta.nameCn : meta.nameEn}</div>
                      </div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider border rounded px-2 py-0.5 ${NODE_BADGE[level]}`}>
                        Lv.{i + 1}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="space-y-2.5 flex-1">
                      {[
                        { labelZh: "投资门槛",     labelEn: "Investment",  val: `$${fmt(investment)}`, accent: true },
                        { labelZh: "私募价格",     labelEn: "Private",     val: `$${privatePrice.toFixed(3)}` },
                        { labelZh: "席位总量",     labelEn: "Total Seats", val: showZh ? `${fmt(seats)} 席` : `${fmt(seats)}` },
                        { labelZh: "每日USDT收益", labelEn: "Daily USDT",  val: `$${dailyUsdt}`, accent: true },
                        { labelZh: "子TOKEN空投",  labelEn: "Airdrop",     val: `${fmt(airdropPerSeat)} SUB` },
                        ...(directRatePct !== null
                          ? [{ labelZh: "直推返佣", labelEn: "Direct Commission", val: `${directRatePct}%`, accent: true }]
                          : []),
                      ].map(({ labelZh, labelEn, val, accent: isAccent }) => (
                        <div key={labelEn} className="flex items-center justify-between gap-1">
                          <span className="text-[11px] text-muted-foreground/60">{showZh ? labelZh : labelEn}</span>
                          <span className={`text-sm font-semibold ${isAccent ? accent : "text-foreground/90"}`}>{val}</span>
                        </div>
                      ))}
                    </div>

                    {/* Seat progress */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-[10px] text-muted-foreground/50">
                        <span>{showZh ? "席位占用 Occupancy" : "Occupancy"}</span>
                        <span className={accent}>{occupiedPct}%</span>
                      </div>
                      <Progress value={occupiedPct} className={`h-1.5 bg-white/5 ${progressCls}`} />
                      <div className="text-[10px] text-muted-foreground/40 text-right">
                        {showZh ? `剩余 ${fmt(seatsRemaining)} 席` : `${fmt(seatsRemaining)} left`}
                      </div>
                    </div>

                    {/* Buy CTA — three states tied to the on-chain user state:
                        1. disconnected → nudge toward the header Connect button
                        2. connected + already purchased → link to /dashboard
                           (contract limits each wallet to one purchase)
                        3. connected + not purchased → fire the re-open signal;
                           RuneOnboarding shows the Bind modal first if the
                           user still hasn't bound a referrer, then Purchase. */}
                    {!account ? (
                      <div className="mt-4 h-9 rounded-lg border border-dashed border-amber-700/30 bg-amber-950/10 flex items-center justify-center text-[11px] text-amber-200/70">
                        {showZh ? "连接钱包后可购买" : "Connect wallet to purchase"}
                      </div>
                    ) : hasPurchased ? (
                      <Button
                        variant="outline"
                        asChild
                        className="mt-4 w-full h-9 text-sm font-medium border-emerald-700/40 hover:border-emerald-500/60 hover:bg-emerald-500/5 text-emerald-200"
                      >
                        <a href="/dashboard">{showZh ? "已购买 · 查看面板" : "Purchased · Open Dashboard"}</a>
                      </Button>
                    ) : (
                      <Button
                        onClick={() => emitOpenPurchase()}
                        className={`mt-4 w-full h-9 text-sm font-semibold ${NODE_BTN[level]}`}
                      >
                        {showZh ? "立即购买 · Buy Now" : "Buy Now"}
                      </Button>
                    )}
                  </motion.div>
                );
              })
          }
        </div>
      </section>

      {/* ── Genesis (创世) tier — L5, condition-triggered.
             Surfaced above "Why RUNE" so visitors see the aspirational
             L5 path before the generic value props. */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="h-px flex-1 bg-border/30" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground/60 px-3">
            创世节点 · GENESIS · L5
          </h2>
          <div className="h-px flex-1 bg-border/30" />
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-950/50 via-purple-950/30 to-amber-950/15 p-6 md:p-8">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.15),transparent_55%)]" />
          <div className="relative space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full border border-fuchsia-500/50 bg-fuchsia-950/40 flex items-center justify-center">
                <Zap className="h-5 w-5 text-fuchsia-300" />
              </div>
              <div>
                <div className="text-xs font-mono uppercase tracking-[0.22em] text-fuchsia-300/80">GENESIS · L5</div>
                <div className="text-xl md:text-2xl font-bold bg-gradient-to-r from-fuchsia-200 via-purple-200 to-amber-200 bg-clip-text text-transparent">
                  {showZh ? "创世节点 · 条件触发" : "Genesis Node · Condition-triggered"}
                </div>
              </div>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {showZh
                ? "创世节点非购买获得。任一等级节点持有者达成以下任意一个条件，即自动升级为创世节点，除保留已购节点的权重分红外，额外从核心激励池 10% 中按创世权重比例分配收益。"
                : "Genesis is not purchasable — any tier holder who meets any one of the conditions below is auto-upgraded. Genesis peers keep their base-tier dividends and additionally share 10% of the core incentive pool by weighted allocation."}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-950/25 p-4">
                <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-fuchsia-300/80 mb-1.5">
                  {showZh ? "条件一 · 直推联创" : "Condition 1 · Direct Founders"}
                </div>
                <p className="text-sm text-foreground/95 leading-snug">
                  {showZh ? "直推 ≥ 3 个联创节点（符主 · L5）" : "Refer ≥ 3 founder-tier (符主 · L5) nodes directly"}
                </p>
              </div>
              <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-950/25 p-4">
                <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-fuchsia-300/80 mb-1.5">
                  {showZh ? "条件二 · 团队联创" : "Condition 2 · Team Founders"}
                </div>
                <p className="text-sm text-foreground/95 leading-snug">
                  {showZh ? "团队矩阵累计 ≥ 5 个联创节点（符主 · L5）" : "Accumulate ≥ 5 founder-tier (符主 · L5) nodes across the full team"}
                </p>
              </div>
              <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-950/25 p-4">
                <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-fuchsia-300/80 mb-1.5">
                  {showZh ? "条件三 · 团队超级" : "Condition 3 · Team Supers"}
                </div>
                <p className="text-sm text-foreground/95 leading-snug">
                  {showZh ? "团队矩阵累计 ≥ 30 个超级节点（符魂 · L4）" : "Accumulate ≥ 30 super-tier (符魂 · L4) nodes across the full team"}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/25 p-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-amber-300/85 shrink-0">
                {showZh ? "创世专属奖励" : "Genesis exclusive reward"}
              </span>
              <span className="text-base font-bold tabular-nums text-amber-200">
                {showZh ? "核心激励池 10%" : "10% of core incentive pool"}
              </span>
              <span className="text-xs text-muted-foreground/80">
                {showZh ? "按创世节点权重占比加权分配" : "weighted by Genesis-peer node score"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why RUNE ── */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="h-px flex-1 bg-border/30" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground/60 px-3">
            {showZh ? "为什么选择 RUNE · Why RUNE" : "Why RUNE"}
          </h2>
          <div className="h-px flex-1 bg-border/30" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: TrendingUp,
              title: "双TOKEN通缩",
              titleEn: "Dual-Token Deflation",
              desc: "母TOKEN（RUNE）锚定 TLP 流动池，子TOKEN（SUB）持续燃烧销毁，双重通缩驱动长期价值增长。",
              descEn: "MOTHER TOKEN (RUNE) anchored to TLP liquidity pool; SUB burned continuously — dual deflation drives long-term value.",
              accent: "text-amber-400",
              border: "border-amber-700/30",
              bg: "from-amber-950/50 to-amber-900/10",
            },
            {
              icon: Zap,
              title: "六阶价格路线",
              titleEn: "Six-Stage Price Roadmap",
              desc: "从私募价 $0.016 到开盘价 $0.028，再到 $0.5 长期目标，六阶定价路线清晰可追踪。",
              descEn: "From private price $0.016 to opening $0.028, targeting $0.5 long-term — six clearly defined pricing stages.",
              accent: "text-blue-400",
              border: "border-blue-700/30",
              bg: "from-blue-950/50 to-blue-900/10",
            },
            {
              icon: Shield,
              title: "生态激励",
              titleEn: "Ecosystem Incentives",
              desc: "节点持有者优先获得治理投票权、子TOKEN空投、新项目白名单及 OTC 渠道等多重生态权益。",
              descEn: "Node holders get priority governance rights, sub-token airdrops, whitelist access, and OTC channel benefits.",
              accent: "text-green-400",
              border: "border-green-700/30",
              bg: "from-green-950/50 to-green-900/10",
            },
          ].map(({ icon: Icon, title, titleEn, desc, descEn, accent, border, bg }) => (
            <div key={titleEn} className={`rounded-2xl border ${border} bg-gradient-to-b ${bg} p-6 space-y-3`}>
              <div className={`flex items-center gap-2 ${accent}`}>
                <Icon className="h-5 w-5" />
                <span className="font-bold text-base text-foreground">{showZh ? title : titleEn}</span>
              </div>
              {showZh && <p className={`text-xs font-mono uppercase tracking-widest ${accent} opacity-70`}>{titleEn}</p>}
              <p className="text-sm text-muted-foreground/80 leading-relaxed">{showZh ? desc : descEn}</p>
              {showZh && <p className="text-[11px] text-muted-foreground/40 leading-relaxed">{descEn}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ── Join flow ── */}
      <section>
        <div className="flex items-center gap-2 mb-8">
          <div className="h-px flex-1 bg-border/30" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground/60 px-3">
            加入流程 · How to Join
          </h2>
          <div className="h-px flex-1 bg-border/30" />
        </div>

        <div className="relative">
          {/* Timeline line */}
          <div className="hidden md:block absolute left-1/2 -translate-x-px top-8 bottom-8 w-px bg-border/30" />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12, duration: 0.4 }}
                className="flex flex-col items-center text-center gap-3"
              >
                <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 border-amber-500/50 bg-amber-950/60 text-amber-400 font-bold text-sm shadow-[0_0_20px_rgba(251,191,36,0.15)]">
                  {i + 1}
                </div>
                <div>
                  <div className="font-bold text-foreground text-sm mb-0.5">{showZh ? step.zh : step.en}</div>
                  {showZh && <div className="text-[10px] text-amber-400/70 uppercase tracking-wider mb-2">{step.en}</div>}
                  <p className="text-xs text-muted-foreground/70 leading-relaxed">{showZh ? step.descZh : step.descEn}</p>
                  {showZh && <p className="text-[11px] text-muted-foreground/40 leading-relaxed mt-1">{step.descEn}</p>}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="h-px flex-1 bg-border/30" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground/60 px-3">
            常见问题 · FAQ
          </h2>
          <div className="h-px flex-1 bg-border/30" />
        </div>

        <div className="space-y-2 max-w-3xl mx-auto">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={i}
                className="rounded-xl border border-border/30 bg-card/30 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-white/3 transition-colors"
                >
                  <span className="text-sm font-medium text-foreground/90">{showZh ? item.qZh : item.qEn}</span>
                  {isOpen
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  }
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1">
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {showZh ? item.aZh : item.aEn}
                        </p>
                        {showZh && (
                          <p className="text-sm leading-relaxed text-muted-foreground/55 mt-2">
                            {item.aEn}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
