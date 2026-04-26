import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronUp, Zap, Shield, TrendingUp, FlaskConical,
  Wallet, UserPlus, Coins, Loader2, CheckCircle2, AlertCircle,
  ShieldCheck, ArrowRight, X, BookOpen,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useActiveAccount } from "thirdweb/react";
import { useDemoStore } from "@/lib/demo-store";
import { DEMO_ADDRESS } from "@/lib/demo-mock-data";
import { NODE_META, type NodeId } from "@/lib/thirdweb/contracts";
import { useShowZh } from "@/contexts/language-context";

// ─── Tutorial step state ────────────────────────────────────────────────────
// 0: recruit page, wallet not connected
// 1: wallet "connected", bind referrer modal open
// 2: referrer bound, purchase node modal open
// 3: purchased, redirecting to /dashboard
type TStep = 0 | 1 | 2 | 3;

// ─── Mock node configs (no on-chain read needed in tutorial) ────────────────
interface MockConfig {
  nodeId: NodeId;
  payAmount: bigint;
  maxLimit: bigint;
  curNum: bigint;
  directRate: bigint;
}

const TUTORIAL_CONFIGS: MockConfig[] = [
  { nodeId: 501, payAmount: 1000n * 10n ** 18n, maxLimit: 1000n, curNum: 234n, directRate: 500n },
  { nodeId: 401, payAmount: 2500n * 10n ** 18n, maxLimit:  800n, curNum: 156n, directRate: 800n },
  { nodeId: 301, payAmount: 5000n * 10n ** 18n, maxLimit:  400n, curNum:  89n, directRate: 1000n },
  { nodeId: 201, payAmount:10000n * 10n ** 18n, maxLimit:  200n, curNum:  47n, directRate: 1200n },
  { nodeId: 101, payAmount:50000n * 10n ** 18n, maxLimit:   20n, curNum:   8n, directRate: 1500n },
];

function fmt18(raw: bigint): string {
  return (raw / 10n ** 18n).toLocaleString("en-US");
}

// ─── Visual look-up tables (same as recruit.tsx) ───────────────────────────
const NODE_BG: Record<string, string> = {
  initial:  "from-slate-900/70 to-slate-800/20 border-slate-600/40",
  mid:      "from-blue-950/70 to-blue-900/20 border-blue-700/40",
  advanced: "from-green-950/70 to-green-900/20 border-green-700/40",
  super:    "from-amber-950/70 to-amber-900/20 border-amber-700/40",
  founder:  "from-purple-950/70 to-purple-900/20 border-purple-700/40",
};
const NODE_ACCENT: Record<string, string> = {
  initial: "text-slate-300", mid: "text-blue-400",
  advanced: "text-green-400", super: "text-amber-400", founder: "text-purple-400",
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
  initial: "[&>div]:bg-slate-400", mid: "[&>div]:bg-blue-500",
  advanced: "[&>div]:bg-green-500", super: "[&>div]:bg-amber-500",
  founder: "[&>div]:bg-purple-500",
};

const TIER_ORDER: readonly NodeId[] = [501, 401, 301, 201, 101] as const;

const TIER_STATIC: Record<NodeId, { privatePrice: number; dailyUsdt: number; airdropPerSeat: number; seats: number }> = {
  101: { privatePrice: 0.016, dailyUsdt: 234,  airdropPerSeat: 75000, seats:   20 },
  201: { privatePrice: 0.020, dailyUsdt: 46.8, airdropPerSeat: 13000, seats:  200 },
  301: { privatePrice: 0.024, dailyUsdt: 23.4, airdropPerSeat:  6250, seats:  400 },
  401: { privatePrice: 0.026, dailyUsdt: 11.7, airdropPerSeat:  3000, seats:  800 },
  501: { privatePrice: 0.028, dailyUsdt:  4.7, airdropPerSeat:  1000, seats: 1000 },
};

const FAQ_ITEMS = [
  {
    qEn: "How are node funds used?", qZh: "节点购买资金如何使用？",
    aEn: "Funds are allocated: 40% to TLP liquidity pool, 25% operations, 25% treasury, and 10% sub-token LP — all verifiable on-chain.",
    aZh: "募集资金按比例分配至 TLP 流动池（40%）、运营资金（25%）、国库储备（25%）及子TOKEN LP（10%），全程链上透明可查。",
  },
  {
    qEn: "How is daily USDT income settled?", qZh: "每日 USDT 收益如何结算？",
    aEn: "Settled automatically to your bound address every day at UTC 00:00 based on your node tier — no manual claim required.",
    aZh: "每日 UTC 00:00 按持仓节点等级自动结算至绑定地址，无需手动领取。",
  },
  {
    qEn: "When are sub-token airdrops distributed?", qZh: "子TOKEN空投何时发放？",
    aEn: "First airdrop within 30 days of mainnet launch, with quarterly supplements.",
    aZh: "主网上线后 30 天内完成首次空投，后续按季度补发。",
  },
];

// ─── Tutorial Guide Card ────────────────────────────────────────────────────
const GUIDE_STEPS = [
  {
    en: "Connect Wallet",
    zh: "第一步：连接钱包",
    descEn: "First, connect a Web3 wallet. In real usage you'd use MetaMask, OKX, Trust, or any compatible wallet.",
    descZh: "连接你的 Web3 钱包。真实操作时支持 MetaMask、OKX Wallet、TokenPocket、Trust 等钱包。",
    icon: Wallet,
    color: "cyan",
  },
  {
    en: "Bind Referrer",
    zh: "第二步：绑定推荐人",
    descEn: "Each wallet must bind a referrer exactly once. This on-chain transaction links you to the network tree.",
    descZh: "每个钱包需链上绑定推荐人一次，建立推荐关系后才能购买节点。",
    icon: UserPlus,
    color: "amber",
  },
  {
    en: "Purchase Node",
    zh: "第三步：购买节点",
    descEn: "Choose a node tier, approve USDT, and confirm the purchase. Your node activates instantly on-chain.",
    descZh: "选择节点等级，授权 USDT 并确认支付，节点在链上立即激活。",
    icon: Coins,
    color: "emerald",
  },
];

interface GuideCardProps {
  step: TStep;
  realAddress?: string;
  connectedAddr: string;
  onConnect: (addr?: string) => void;
  onExit: () => void;
}

function GuideCard({ step, realAddress, connectedAddr, onConnect, onExit }: GuideCardProps) {
  const showZh = useShowZh();
  const guideIdx = Math.min(step, 2);
  const guide = GUIDE_STEPS[guideIdx];
  const Icon = guide.icon;

  const colorMap = {
    cyan:    { border: "border-cyan-500/40",    bg: "bg-cyan-500/8",    icon: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400",   text: "text-cyan-300",   dot: "bg-cyan-400",   dotInactive: "bg-cyan-900" },
    amber:   { border: "border-amber-500/40",   bg: "bg-amber-500/8",   icon: "bg-amber-500/15 border-amber-500/30 text-amber-400", text: "text-amber-300",  dot: "bg-amber-400",  dotInactive: "bg-amber-900" },
    emerald: { border: "border-emerald-500/40", bg: "bg-emerald-500/8", icon: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400", text: "text-emerald-300", dot: "bg-emerald-400", dotInactive: "bg-emerald-900" },
  } as const;
  const c = colorMap[guide.color as keyof typeof colorMap];

  return (
    <motion.div
      key={step}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl border ${c.border} ${c.bg} p-4 md:p-5`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`mt-0.5 w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${c.icon}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${c.text}`}>
              教学模式 · Tutorial
            </span>
            {/* Step dots */}
            <div className="flex items-center gap-1 ml-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`inline-block w-1.5 h-1.5 rounded-full transition-colors ${
                    i <= guideIdx ? c.dot : c.dotInactive
                  }`}
                />
              ))}
            </div>
            <span className={`text-[10px] ${c.text} opacity-60`}>{guideIdx + 1} / 3</span>
          </div>

          <p className="text-sm font-semibold text-foreground mb-0.5">
            {showZh ? guide.zh : guide.en}
          </p>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            {showZh ? guide.descZh : guide.descEn}
          </p>
        </div>

        {/* Action / exit */}
        <div className="flex items-center gap-2 shrink-0">
          {step === 0 && realAddress ? (
            <Button
              onClick={() => onConnect(realAddress)}
              size="sm"
              className="h-8 px-3 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-black gap-1.5"
            >
              <Wallet className="h-3 w-3" />
              {showZh ? "使用此钱包" : "Use This Wallet"}
            </Button>
          ) : step === 0 ? (
            <Button
              onClick={() => onConnect()}
              size="sm"
              className="h-8 px-3 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-black gap-1.5"
            >
              <Wallet className="h-3 w-3" />
              {showZh ? "模拟连接" : "Simulate Connect"}
            </Button>
          ) : null}
          {step === 3 && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-300">
              <Loader2 className="h-3 w-3 animate-spin" />
              {showZh ? "跳转中..." : "Redirecting..."}
            </div>
          )}
          <button
            type="button"
            onClick={onExit}
            className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Real wallet detected strip (step 0) */}
      {step === 0 && realAddress && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-emerald-300 font-mono">
            {realAddress.slice(0, 6)}…{realAddress.slice(-6)}
          </span>
          <span className="text-[10px] text-muted-foreground/50 ml-1">
            {showZh ? "· 检测到已连接钱包" : "· Wallet detected"}
          </span>
        </div>
      )}

      {/* Wallet address strip after connect */}
      {step >= 1 && connectedAddr && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-emerald-300 font-mono">
            {connectedAddr.slice(0, 6)}…{connectedAddr.slice(-6)}
          </span>
          <span className="text-[10px] text-muted-foreground/50 ml-1">
            {showZh ? "· 钱包已连接" : "· Wallet connected"}
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ─── Tutorial Bind Referrer Modal ────────────────────────────────────────────
type BindTxState = "idle" | "checking" | "ok" | "submitting" | "confirmed";

interface TutorialBindModalProps {
  open: boolean;
  onClose: () => void;
  onBound: () => void;
}

function TutorialBindModal({ open, onClose, onBound }: TutorialBindModalProps) {
  const showZh = useShowZh();
  const [input, setInput] = useState("0x0000000000000000000000000000000000000001");
  const [txState, setTxState] = useState<BindTxState>("idle");

  useEffect(() => {
    if (!open) { setTxState("idle"); return; }
    // Auto-run the pre-check simulation when the modal opens
    const t = setTimeout(() => setTxState("ok"), 600);
    return () => clearTimeout(t);
  }, [open]);

  async function handleBind() {
    setTxState("submitting");
    await new Promise((r) => setTimeout(r, 1400));
    setTxState("confirmed");
    await new Promise((r) => setTimeout(r, 800));
    onBound();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && txState !== "submitting") onClose(); }}>
      <DialogContent className="bg-[#080f1e] border border-amber-700/30 max-w-md">
        <DialogHeader>
          <div className="inline-flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-amber-400" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400">
              {showZh ? "步骤 2 / 3 · 绑定推荐关系" : "Step 2 / 3 · Bind Referrer"}
            </span>
          </div>
          <DialogTitle className="text-xl font-bold">
            {showZh ? "绑定推荐人" : "Bind Referrer"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {showZh
              ? "每个钱包只能绑定一次。绑定成功后即可购买节点。"
              : "Each wallet binds exactly once. After binding you can purchase a node."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Tutorial hint */}
          <div className="flex items-center gap-2 rounded-lg border border-cyan-500/25 bg-cyan-500/8 px-3 py-2">
            <BookOpen className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span className="text-[11px] text-cyan-300">
              {showZh
                ? "教学模式：已预填 ROOT 地址，可直接点击「链上绑定」"
                : "Tutorial: ROOT address pre-filled — click 'Bind On-chain' to proceed"}
            </span>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {showZh ? "推荐人钱包地址" : "Referrer Wallet Address"}
            </Label>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={txState === "submitting" || txState === "confirmed"}
              className="font-mono text-sm bg-background/60"
              placeholder="0x…"
            />

            <AnimatePresence mode="wait">
              {txState === "checking" && (
                <motion.p key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {showZh ? "校验推荐人..." : "Validating referrer…"}
                </motion.p>
              )}
              {txState === "ok" && (
                <motion.p key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-[11px] text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3" />
                  {showZh ? "已验证 · 推荐人有效（ROOT）" : "Validated · Referrer is ROOT (network origin)"}
                </motion.p>
              )}
              {txState === "submitting" && (
                <motion.p key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-[11px] text-amber-300 flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {showZh ? "模拟链上提交中..." : "Simulating on-chain submission…"}
                </motion.p>
              )}
              {txState === "confirmed" && (
                <motion.p key="confirmed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-[11px] text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3" />
                  {showZh ? "交易已确认 · 绑定成功！" : "Transaction confirmed · Bound successfully!"}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={txState === "submitting" || txState === "confirmed"}
              className="flex-1"
            >
              {showZh ? "稍后" : "Later"}
            </Button>
            <Button
              className="flex-1 font-semibold"
              disabled={txState === "submitting" || txState === "confirmed" || txState === "idle" || txState === "checking"}
              onClick={handleBind}
            >
              {txState === "submitting" || txState === "confirmed"
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : showZh ? "链上绑定（模拟）" : "Bind On-chain (simulated)"}
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground/50 text-center">
            {showZh
              ? "真实操作会消耗少量 BNB 作为 Gas 费"
              : "Real usage consumes a small amount of BNB as gas fee"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tutorial Purchase Node Modal ────────────────────────────────────────────
type BuyTxState = "select" | "approving" | "buying" | "done";

interface TutorialPurchaseModalProps {
  open: boolean;
  onClose: () => void;
  onPurchased: (nodeId: NodeId) => void;
}

function TutorialPurchaseModal({ open, onClose, onPurchased }: TutorialPurchaseModalProps) {
  const showZh = useShowZh();
  const [selected, setSelected] = useState<NodeId | null>(null);
  const [txState, setTxState] = useState<BuyTxState>("select");

  useEffect(() => {
    if (open) { setSelected(null); setTxState("select"); }
  }, [open]);

  async function handleBuy() {
    if (!selected) return;
    setTxState("approving");
    await new Promise((r) => setTimeout(r, 1600));
    setTxState("buying");
    await new Promise((r) => setTimeout(r, 1800));
    setTxState("done");
    await new Promise((r) => setTimeout(r, 700));
    onPurchased(selected);
  }

  const busy = txState === "approving" || txState === "buying";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <DialogContent className="bg-[#080f1e] border border-amber-700/30 max-w-md max-h-[88dvh] overflow-y-auto p-4 gap-3">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Coins className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300 truncate">
              {showZh ? "步骤 3 / 3 · 选择节点并购买" : "Step 3 / 3 · Select Node & Purchase"}
            </span>
          </div>
          <DialogTitle className="text-base font-bold leading-tight">
            {showZh ? "购买节点席位" : "Purchase Node Seat"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-[11px] leading-snug">
            {showZh ? "选择适合你的节点等级，支付 USDT 即可立即激活。" : "Choose your tier and pay USDT to activate instantly."}
          </DialogDescription>

          {/* Tutorial hint */}
          <div className="flex items-center gap-2 rounded-lg border border-cyan-500/25 bg-cyan-500/8 px-3 py-2">
            <BookOpen className="h-3 w-3 text-cyan-400 shrink-0" />
            <span className="text-[10px] text-cyan-300">
              {showZh ? "教学模式：选择节点后点击按钮，系统模拟链上购买流程" : "Tutorial: Select a tier then click purchase — the flow is fully simulated"}
            </span>
          </div>
        </DialogHeader>

        {/* Tier list */}
        <div className="flex flex-col gap-1.5">
          {[...TUTORIAL_CONFIGS].sort((a, b) => b.nodeId - a.nodeId).map((cfg) => {
            const meta = NODE_META[cfg.nodeId];
            const remaining = Number(cfg.maxLimit - cfg.curNum);
            const directPct = Number(cfg.directRate) / 100;
            const isActive = selected === cfg.nodeId;

            return (
              <button
                key={cfg.nodeId}
                type="button"
                disabled={busy || txState === "done"}
                onClick={() => setSelected(cfg.nodeId)}
                className={`group relative flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-all text-left overflow-hidden ${
                  isActive
                    ? "border-amber-500 bg-amber-500/[0.06] shadow-[0_0_0_1px_hsl(38,90%,50%,0.45)]"
                    : "border-border/40 bg-card/40 hover:border-border/80"
                }`}
              >
                <span
                  className="absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{ backgroundColor: `rgb(${meta.rgb})`, opacity: isActive ? 1 : 0.55 }}
                  aria-hidden
                />
                <span
                  className="ml-0.5 h-8 w-8 rounded-md shrink-0 flex items-center justify-center font-bold text-sm"
                  style={{
                    backgroundColor: `rgba(${meta.rgb}, 0.14)`,
                    color: `rgb(${meta.rgb})`,
                    border: `1px solid rgba(${meta.rgb}, 0.32)`,
                  }}
                >
                  {meta.nameCn.charAt(meta.nameCn.length - 1)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[13px] font-bold text-foreground truncate">{meta.nameCn}</span>
                    <span className={`text-[9px] font-mono uppercase tracking-[0.16em] ${meta.color} truncate`}>
                      {meta.nameEn}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground/85 truncate leading-tight">
                    <span>{remaining} {showZh ? "席位剩余" : "seats left"}</span>
                    <span className="opacity-40 mx-1">·</span>
                    <span className="text-amber-300/85">{directPct}% {showZh ? "直推返佣" : "direct commission"}</span>
                  </div>
                </div>
                <div className="text-right shrink-0 leading-none">
                  <div className="text-sm font-bold tabular-nums text-amber-300">
                    {fmt18(cfg.payAmount)}
                  </div>
                  <div className="text-[8px] text-muted-foreground/70 mt-0.5 font-mono uppercase tracking-[0.18em]">USDT</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tx status strips */}
        <AnimatePresence mode="wait">
          {txState === "approving" && (
            <motion.div key="approving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-md border border-blue-700/30 bg-blue-950/20 px-2.5 py-1.5 text-[11px] text-blue-200">
              <Loader2 className="h-3 w-3 animate-spin" />
              {showZh ? "模拟 USDT 授权中..." : "Simulating USDT approval…"}
            </motion.div>
          )}
          {txState === "buying" && (
            <motion.div key="buying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-md border border-amber-700/30 bg-amber-950/20 px-2.5 py-1.5 text-[11px] text-amber-200">
              <Loader2 className="h-3 w-3 animate-spin" />
              {showZh ? "模拟节点购买交易中..." : "Simulating node purchase transaction…"}
            </motion.div>
          )}
          {txState === "done" && (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-md border border-emerald-700/30 bg-emerald-950/20 px-2.5 py-1.5 text-[11px] text-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              {showZh ? "购买成功！节点已激活，正在跳转..." : "Purchase confirmed! Node activated — redirecting…"}
            </motion.div>
          )}
          {txState === "select" && !selected && (
            <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
              <AlertCircle className="h-3 w-3" />
              {showZh ? "请先选择一个节点等级" : "Please select a node tier first"}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} disabled={busy || txState === "done"} className="flex-1 h-9 text-sm">
            {showZh ? "稍后" : "Later"}
          </Button>
          <Button
            className="flex-1 font-semibold gap-1.5 h-9 text-sm"
            disabled={!selected || busy || txState === "done"}
            onClick={handleBuy}
          >
            {busy
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {showZh ? "授权并购买（模拟）" : "Approve & Buy (simulated)"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tutorial 4-step visual guide (same as recruit page) ───────────────────
const STEPS = [
  { en: "Connect Wallet",  zh: "连接钱包",     descEn: "Connect a Web3 wallet (MetaMask, TokenPocket, Trust, OKX…)",   descZh: "连接 Web3 钱包（MetaMask、TokenPocket、Trust、OKX 等）" },
  { en: "Bind Referrer",   zh: "绑定推荐关系", descEn: "Submit the on-chain bind-referrer transaction once per wallet",  descZh: "每个钱包提交一次链上绑定推荐人交易" },
  { en: "Choose Node",     zh: "选择节点",     descEn: "Pick the tier that matches your stake — L1 to L5",              descZh: "按投资规模选择节点等级（L1–L5）" },
  { en: "Pay & Activate",  zh: "支付激活",     descEn: "Approve USDT and pay; the node activates on contract confirm",  descZh: "授权并支付 USDT，合约确认后节点即时激活" },
];

// ─── Main Tutorial Page ─────────────────────────────────────────────────────
export default function Tutorial() {
  const showZh = useShowZh();
  const { enterDemo } = useDemoStore();
  const [, navigate] = useLocation();
  const account = useActiveAccount();
  const [step, setStep] = useState<TStep>(0);
  const [walletAddress, setWalletAddress] = useState<string>(DEMO_ADDRESS);
  const [bindOpen, setBindOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function handleConnect(addr?: string) {
    const resolved = addr ?? DEMO_ADDRESS;
    setWalletAddress(resolved);
    setStep(1);
    setBindOpen(true);
  }

  function handleBound() {
    setBindOpen(false);
    setStep(2);
    setBuyOpen(true);
  }

  function handlePurchased(nodeId: NodeId) {
    setBuyOpen(false);
    setStep(3);
    enterDemo(walletAddress, nodeId);
    setTimeout(() => navigate("/dashboard"), 1500);
  }

  function handleExit() {
    navigate("/recruit");
  }

  const walletConnected = step >= 1;

  return (
    <div className="container mx-auto px-4 py-10 space-y-14 max-w-6xl">

      {/* ── Step 0: wallet connect entry banner ── */}
      {step === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-cyan-500/30 bg-cyan-500/6 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-xl border border-cyan-500/30 bg-cyan-500/15 flex items-center justify-center shrink-0">
              <BookOpen className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 block">
                教学模式 · Tutorial
              </span>
              <span className="text-[12px] text-muted-foreground leading-snug">
                {showZh
                  ? "连接钱包后开始模拟完整的节点购买流程"
                  : "Connect your wallet to simulate the full node purchase flow"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {account?.address ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-mono border border-emerald-500/30 bg-emerald-500/10 rounded-lg px-2.5 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {account.address.slice(0, 6)}…{account.address.slice(-6)}
                </div>
                <Button
                  onClick={() => handleConnect(account.address)}
                  size="sm"
                  className="h-8 px-3 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-black gap-1.5"
                >
                  <ArrowRight className="h-3 w-3" />
                  {showZh ? "使用此钱包" : "Use This Wallet"}
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => handleConnect()}
                size="sm"
                className="h-8 px-3 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-black gap-1.5"
              >
                <Wallet className="h-3 w-3" />
                {showZh ? "模拟连接钱包" : "Simulate Connect"}
              </Button>
            )}
            <button
              type="button"
              onClick={handleExit}
              className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Step 1+: full tutorial guide card ── */}
      {step >= 1 && (
        <GuideCard
          step={step}
          realAddress={account?.address}
          connectedAddr={walletAddress}
          onConnect={handleConnect}
          onExit={handleExit}
        />
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
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-border/30">
            {[
              { en: "Total Seats",   zh: "总席位",     val: "2,420" },
              { en: "Node Tiers",    zh: "节点等级",   val: "5" },
              { en: "Opening Price", zh: "开盘价",     val: "$0.028" },
              { en: "USDT APY",      zh: "年化收益率", val: "170.82%", gold: true },
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
          {TIER_ORDER.map((nodeId, i) => {
            const meta  = NODE_META[nodeId];
            const stat  = TIER_STATIC[nodeId];
            const cfg   = TUTORIAL_CONFIGS.find((c) => c.nodeId === nodeId)!;
            const level = meta.level;

            const investment    = Number(cfg.payAmount / 10n ** 18n);
            const seats         = Number(cfg.maxLimit);
            const seatsRemaining = Number(cfg.maxLimit - cfg.curNum);
            const directRatePct = Number(cfg.directRate) / 100;
            const occupiedPct   = Math.round(((seats - seatsRemaining) / seats) * 100);

            return (
              <motion.div
                key={nodeId}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                className={`relative flex flex-col rounded-2xl border bg-gradient-to-b p-5 ${NODE_BG[level]} ${NODE_GLOW[level]}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-1 ${NODE_ACCENT[level]}`}>
                      {meta.nameEn}
                    </div>
                    <div className="text-xl font-bold text-foreground">{showZh ? meta.nameCn : meta.nameEn}</div>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider border rounded px-2 py-0.5 ${NODE_BADGE[level]}`}>
                    Lv.{i + 1}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1">
                  {[
                    { labelZh: "投资门槛",     labelEn: "Investment",        val: `$${investment.toLocaleString()}`,   accent: true },
                    { labelZh: "私募价格",     labelEn: "Private",            val: `$${stat.privatePrice.toFixed(3)}` },
                    { labelZh: "席位总量",     labelEn: "Total Seats",        val: showZh ? `${seats.toLocaleString()} 席` : `${seats.toLocaleString()}` },
                    { labelZh: "每日USDT收益", labelEn: "Daily USDT",         val: `$${stat.dailyUsdt}`,               accent: true },
                    { labelZh: "子TOKEN空投",  labelEn: "Airdrop",            val: `${stat.airdropPerSeat.toLocaleString()} SUB` },
                    { labelZh: "直推返佣",     labelEn: "Direct Commission",  val: `${directRatePct}%`,                accent: true },
                  ].map(({ labelZh, labelEn, val, accent: isAccent }) => (
                    <div key={labelEn} className="flex items-center justify-between gap-1">
                      <span className="text-[11px] text-muted-foreground/60">{showZh ? labelZh : labelEn}</span>
                      <span className={`text-sm font-semibold ${isAccent ? NODE_ACCENT[level] : "text-foreground/90"}`}>{val}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-[10px] text-muted-foreground/50">
                    <span>{showZh ? "席位占用 Occupancy" : "Occupancy"}</span>
                    <span className={NODE_ACCENT[level]}>{occupiedPct}%</span>
                  </div>
                  <Progress value={occupiedPct} className={`h-1.5 bg-white/5 ${NODE_PROGRESS_BAR[level]}`} />
                  <div className="text-[10px] text-muted-foreground/40 text-right">
                    {showZh ? `剩余 ${seatsRemaining.toLocaleString()} 席` : `${seatsRemaining.toLocaleString()} left`}
                  </div>
                </div>

                {/* CTA — state changes as tutorial progresses */}
                {!walletConnected ? (
                  <div className="mt-4 h-9 rounded-lg border border-dashed border-amber-700/30 bg-amber-950/10 flex items-center justify-center text-[11px] text-amber-200/70">
                    {showZh ? "连接钱包后可购买" : "Connect wallet to purchase"}
                  </div>
                ) : step === 3 ? (
                  <Button
                    variant="outline"
                    className="mt-4 w-full h-9 text-sm font-medium border-emerald-700/40 text-emerald-200 cursor-default"
                  >
                    {showZh ? "已购买 · 查看面板" : "Purchased · Open Dashboard"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => setBuyOpen(true)}
                    disabled={step === 1}
                    className={`mt-4 w-full h-9 text-sm font-semibold ${NODE_BTN[level]}`}
                  >
                    {step === 1
                      ? showZh ? "请先完成绑定..." : "Complete binding first…"
                      : showZh ? "立即购买 · Buy Now" : "Buy Now"
                    }
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border/30" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground/60 px-3">
            {showZh ? "操作流程 · How It Works" : "How It Works"}
          </h2>
          <div className="h-px flex-1 bg-border/30" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map(({ en, zh, descEn, descZh }, idx) => (
            <motion.div
              key={en}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className={`relative rounded-xl border p-4 space-y-2 transition-colors ${
                idx === Math.min(step, 3)
                  ? "border-cyan-500/40 bg-cyan-500/5"
                  : idx < step
                  ? "border-emerald-700/30 bg-emerald-950/10"
                  : "border-border/30 bg-card/20"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  idx < step
                    ? "bg-emerald-500/20 text-emerald-300"
                    : idx === Math.min(step, 3)
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "bg-white/5 text-muted-foreground"
                }`}>
                  {idx < step ? "✓" : idx + 1}
                </span>
                <span className={`text-sm font-semibold ${
                  idx < step ? "text-emerald-200" : idx === Math.min(step, 3) ? "text-cyan-200" : "text-foreground"
                }`}>
                  {showZh ? zh : en}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground/70 leading-relaxed pl-8">
                {showZh ? descZh : descEn}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border/30" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground/60 px-3">
            {showZh ? "常见问题 · FAQ" : "FAQ"}
          </h2>
          <div className="h-px flex-1 bg-border/30" />
        </div>
        {FAQ_ITEMS.map(({ qEn, qZh, aEn, aZh }, i) => (
          <div key={i} className="rounded-xl border border-border/30 bg-card/20 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left text-sm font-medium hover:bg-white/[0.02] transition-colors"
            >
              <span>{showZh ? qZh : qEn}</span>
              {openFaq === i
                ? <ChevronUp className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
            </button>
            <AnimatePresence>
              {openFaq === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <p className="px-4 pb-4 text-[13px] text-muted-foreground/70 leading-relaxed border-t border-border/20 pt-3">
                    {showZh ? aZh : aEn}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </section>

      {/* ── Modals ── */}
      <TutorialBindModal
        open={bindOpen}
        onClose={() => setBindOpen(false)}
        onBound={handleBound}
      />
      <TutorialPurchaseModal
        open={buyOpen}
        onClose={() => setBuyOpen(false)}
        onPurchased={handlePurchased}
      />
    </div>
  );
}
