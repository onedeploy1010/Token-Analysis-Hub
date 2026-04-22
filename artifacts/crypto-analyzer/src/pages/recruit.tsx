import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronUp, Zap, Shield, TrendingUp, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetRuneOverview } from "@workspace/api-client-react";
import type { RuneNodeDefinition } from "@workspace/api-client-react";
import { useShowZh } from "@/contexts/language-context";
import { useActiveAccount } from "thirdweb/react";
import { useNodeConfigs } from "@/hooks/rune/use-node-presell";
import { type NodeId } from "@/lib/thirdweb/contracts";
import { useReferrerOf } from "@/hooks/rune/use-community";

/** Map the REST response's tier key to the on-chain nodeId. */
const LEVEL_TO_NODE_ID: Record<string, NodeId> = {
  guardian:  101,
  strategic: 201,
  builder:   301,
  pioneer:   401,
};

/** Shape of one element returned by NodePresell.getNodeConfigs. */
interface OnChainNodeConfig {
  nodeId: bigint;
  payToken: string;
  payAmount: bigint;
  maxLimit: bigint;
  curNum: bigint;
}

// ─── Node style maps ────────────────────────────────────────────────────────
const NODE_BG: Record<string, string> = {
  pioneer:  "from-blue-950/70 to-blue-900/20 border-blue-700/40",
  builder:  "from-green-950/70 to-green-900/20 border-green-700/40",
  guardian: "from-amber-950/70 to-amber-900/20 border-amber-700/40",
  strategic:"from-purple-950/70 to-purple-900/20 border-purple-700/40",
};
const NODE_ACCENT: Record<string, string> = {
  pioneer:  "text-blue-400",
  builder:  "text-green-400",
  guardian: "text-amber-400",
  strategic:"text-purple-400",
};
const NODE_BADGE: Record<string, string> = {
  pioneer:  "bg-blue-900/50 text-blue-300 border-blue-700/40",
  builder:  "bg-green-900/50 text-green-300 border-green-700/40",
  guardian: "bg-amber-900/50 text-amber-300 border-amber-700/40",
  strategic:"bg-purple-900/50 text-purple-300 border-purple-700/40",
};
const NODE_BTN: Record<string, string> = {
  pioneer:  "bg-blue-600 hover:bg-blue-500 text-white",
  builder:  "bg-green-600 hover:bg-green-500 text-white",
  guardian: "bg-amber-600 hover:bg-amber-500 text-white",
  strategic:"bg-purple-600 hover:bg-purple-500 text-white",
};
const NODE_GLOW: Record<string, string> = {
  pioneer:  "shadow-[0_0_40px_rgba(59,130,246,0.15)]",
  builder:  "shadow-[0_0_40px_rgba(34,197,94,0.15)]",
  guardian: "shadow-[0_0_40px_rgba(251,191,36,0.15)]",
  strategic:"shadow-[0_0_40px_rgba(168,85,247,0.15)]",
};
const NODE_PROGRESS_BAR: Record<string, string> = {
  pioneer:  "[&>div]:bg-blue-500",
  builder:  "[&>div]:bg-green-500",
  guardian: "[&>div]:bg-amber-500",
  strategic:"[&>div]:bg-purple-500",
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
    aZh: "以符主节点（$10,000投入）为基准：仅计入180天USDT收益$8,424，折算年化≈170.82%。不含TOKEN空投及母TOKEN市值增长部分。",
  },
];

const STEPS = [
  { en: "Choose Tier",      zh: "选择节点等级",  descEn: "Select the node tier that matches your investment capacity", descZh: "根据投资规模选择最适合您的节点等级" },
  { en: "Complete KYC",     zh: "完成 KYC 认证", descEn: "Submit identity documents and pass compliance review",      descZh: "提交身份信息，通过合规审核" },
  { en: "Transfer Funds",   zh: "划转募集资金",  descEn: "Transfer USDT to the node contract address",                descZh: "将 USDT 划转至节点合约地址" },
  { en: "Activate Node",    zh: "激活节点权柄",  descEn: "Node activates immediately after contract confirmation",   descZh: "合约确认后节点立即激活，开始产生收益" },
];

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

// ─── Purchase dialog ──────────────────────────────────────────────────────────
function PurchaseDialog({ node, open, onClose }: { node: RuneNodeDefinition | null; open: boolean; onClose: () => void }) {
  const showZh = useShowZh();
  if (!node) return null;
  const accent = NODE_ACCENT[node.level];
  const badgeCls = NODE_BADGE[node.level];
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#080f1e] border border-border/40 max-w-md w-full">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className={`text-xs font-mono uppercase tracking-widest border rounded px-2 py-0.5 ${badgeCls}`}>
              {showZh ? `${node.nameCn} · ${node.nameEn}` : node.nameEn}
            </span>
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            {showZh ? "购买节点 · Purchase Node" : "Purchase Node"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {showZh ? "以下为所选节点详情，确认后可触发合约完成购买。" : "Review the selected node configuration. Confirming will trigger the purchase contract."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className="rounded-xl border border-border/30 bg-card/30 p-4 space-y-3">
            {[
              { labelZh: "节点名称",       labelEn: "Node",             value: showZh ? `${node.nameCn} ${node.nameEn}` : node.nameEn },
              { labelZh: "投资门槛",       labelEn: "Investment",       value: `$${fmt(node.investment)} USDT`, highlight: true },
              { labelZh: "私募价格",       labelEn: "Private Price",    value: `$${node.privatePrice.toFixed(3)}` },
              { labelZh: "每日收益",       labelEn: "Daily USDT",       value: `$${node.dailyUsdt} USDT`, highlight: true },
              { labelZh: "子TOKEN空投",    labelEn: "Airdrop",          value: `${fmt(node.airdropPerSeat)} SUB` },
              { labelZh: "180日USDT总收益", labelEn: "180-Day Income",  value: `$${fmt(node.dailyUsdt * 180)} USDT` },
            ].map(({ labelZh, labelEn, value, highlight }) => (
              <div key={labelEn} className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground/70 shrink-0">{showZh ? `${labelZh} / ${labelEn}` : labelEn}</span>
                <span className={`text-sm font-semibold text-right ${highlight ? accent : "text-foreground"}`}>{value}</span>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 px-4 py-3 flex items-start gap-3">
            <Shield className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-200/80 leading-relaxed">
              {showZh && <>
                <span className="font-semibold text-amber-300">功能暂未开放，敬请期待</span>
                <br />
                合约购买通道正在审计中，预计主网上线后开放。
                <br className="hidden sm:block" />
              </>}
              <span className={showZh ? "text-amber-200/50" : ""}>Contract purchase channel is under audit. Available after mainnet launch.</span>
            </p>
          </div>

          <Button
            disabled
            className="w-full h-11 font-semibold text-sm gap-2 opacity-50 cursor-not-allowed"
          >
            <Wallet className="h-4 w-4" />
            {showZh ? "连接钱包 / 触发合约" : "Connect Wallet / Trigger Contract"}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground/40">
            {showZh ? "当前阶段仅展示节点参数 · Contract integration coming soon" : "Contract integration coming soon"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
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
  const [selectedNode, setSelectedNode] = useState<RuneNodeDefinition | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // REST overview still supplies the marketing-style metadata (tier English
  // name, daily USDT projection, airdrop-per-seat, etc.) that isn't stored
  // on-chain — these are project constants, fine to keep off-chain.
  const { data: overview, isLoading } = useGetRuneOverview();

  // On-chain live reads: NodePresell.getNodeConfigs returns the four tiers'
  // real-time `curNum` / `maxLimit`, and Community.referrerOf tells us
  // whether the connected wallet is already bound. We overlay both on top
  // of the REST rows so the UI reflects the chain within 15 s of any tx.
  const { data: onChainConfigs } = useNodeConfigs();
  const onChainArray = (onChainConfigs as OnChainNodeConfig[] | undefined) ?? [];
  const onChainByNodeId = new Map<number, OnChainNodeConfig>(
    onChainArray.map((c) => [Number(c.nodeId), c]),
  );

  const { isBound, referrer, isRoot } = useReferrerOf(account?.address);

  const nodes = overview?.nodes ?? [];

  // Legacy "Buy Node" handler — kept only so the existing educational dialog
  // still opens for un-connected users. The real purchase flow is driven by
  // <RuneOnboarding/> below once the wallet is connected.
  function handleBuy(node: RuneNodeDefinition) {
    setSelectedNode(node);
    setDialogOpen(true);
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-14 max-w-6xl">

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
            {showZh ? "四级节点体系 · 双TOKEN通缩经济 · 机构级收益结构" : "4-Tier Nodes · Dual-Token Deflation · Institutional Returns"}
          </p>
          <p className="text-sm text-muted-foreground/60 max-w-xl mx-auto">
            RUNE Protocol Node Recruitment · Four-Tier System · Dual-Token Deflationary Economy
          </p>

          {/* Global metric strip */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-border/30">
            {[
              { en: "Total Seats",    zh: "总席位",     val: "1,440"  },
              { en: "Node Tiers",     zh: "节点等级",   val: "4"      },
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

      {/* ── Binding status strip ── Only rendered when a wallet is
          connected; reads `referrerOf` on-chain so the state reflects the
          network, not the URL param. */}
      {account && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`rounded-xl border px-4 py-3 text-xs flex items-center justify-between gap-3 ${
            isBound
              ? isRoot
                ? "border-amber-700/40 bg-amber-950/30 text-amber-200"
                : "border-green-700/40 bg-green-950/30 text-green-200"
              : "border-amber-700/40 bg-amber-950/30 text-amber-200"
          }`}
        >
          <span className="font-mono uppercase tracking-[0.18em] text-[10px] opacity-60">
            {showZh ? "链上绑定 · On-chain" : "On-chain"}
          </span>
          <span className="text-right font-medium">
            {!isBound
              ? showZh ? "尚未绑定推荐人" : "Not bound yet"
              : isRoot
              ? showZh ? "已绑定 ROOT · 顶级节点" : "Bound to ROOT"
              : showZh
              ? `已绑定 ${referrer!.slice(0, 6)}…${referrer!.slice(-4)}`
              : `Bound to ${referrer!.slice(0, 6)}…${referrer!.slice(-4)}`}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <NodeCardSkeleton key={i} />)
            : nodes.map((node, i) => {
                // Prefer on-chain tier stats (live) and fall back to REST (seed
                // metadata) while the chain read is still loading or if the
                // nodeId isn't deployed yet. payAmount is an 18-decimal USDT
                // value; convert to whole USDT for display.
                const onChain = onChainByNodeId.get(LEVEL_TO_NODE_ID[node.level]);
                const seats = onChain ? Number(onChain.maxLimit) : node.seats;
                const seatsRemaining = onChain
                  ? Number(onChain.maxLimit - onChain.curNum)
                  : node.seatsRemaining;
                const investment = onChain
                  ? Number(onChain.payAmount / 10n ** 18n)
                  : node.investment;
                const occupiedPct = seats > 0
                  ? Math.round(((seats - seatsRemaining) / seats) * 100)
                  : 0;
                const accent = NODE_ACCENT[node.level];
                const progressCls = NODE_PROGRESS_BAR[node.level];
                return (
                  <motion.div
                    key={node.level}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: i * 0.1 }}
                    className={`relative flex flex-col rounded-2xl border bg-gradient-to-b p-5 ${NODE_BG[node.level]} ${NODE_GLOW[node.level]}`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-1 ${accent}`}>
                          {node.nameEn}
                        </div>
                        <div className="text-xl font-bold text-foreground">{showZh ? node.nameCn : node.nameEn}</div>
                      </div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider border rounded px-2 py-0.5 ${NODE_BADGE[node.level]}`}>
                        Lv.{i + 1}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="space-y-2.5 flex-1">
                      {[
                        { labelZh: "投资门槛",     labelEn: "Investment",  val: `$${fmt(investment)}`, accent: true },
                        { labelZh: "私募价格",     labelEn: "Private",     val: `$${node.privatePrice.toFixed(3)}` },
                        { labelZh: "席位总量",     labelEn: "Total Seats", val: showZh ? `${fmt(seats)} 席` : `${fmt(seats)}` },
                        { labelZh: "每日USDT收益", labelEn: "Daily USDT",  val: `$${node.dailyUsdt}`, accent: true },
                        { labelZh: "子TOKEN空投",  labelEn: "Airdrop",     val: `${fmt(node.airdropPerSeat)} SUB` },
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

                    {/* Buy CTA — unified with the wallet flow.
                        Connection lives in the global header, so we never
                        repeat the Connect button on a node card. When
                        disconnected, a read-only label nudges users to the
                        header; when connected, the outline button opens the
                        per-tier details dialog (RuneOnboarding already drives
                        the actual purchase modal). */}
                    {account ? (
                      <Button
                        variant="outline"
                        onClick={() => handleBuy(node)}
                        className="mt-4 w-full h-9 text-sm font-medium border-amber-700/40 hover:border-amber-500/60 hover:bg-amber-500/5"
                      >
                        {showZh ? "查看详情 · Details" : "View Details"}
                      </Button>
                    ) : (
                      <div className="mt-4 h-9 rounded-lg border border-dashed border-amber-700/30 bg-amber-950/10 flex items-center justify-center text-[11px] text-amber-200/70">
                        {showZh ? "连接钱包后可购买" : "Connect wallet to purchase"}
                      </div>
                    )}
                  </motion.div>
                );
              })
          }
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

      {/* Purchase dialog */}
      <PurchaseDialog
        node={selectedNode}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
