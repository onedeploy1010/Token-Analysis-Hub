import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { FlaskConical, Zap, ArrowRight, LayoutDashboard, Users, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDemoStore } from "@/lib/demo-store";
import { NODE_META, NODE_IDS, type NodeId } from "@/lib/thirdweb/contracts";

const EASE = [0.25, 0.1, 0.25, 1];

const TIER_PRICE: Record<NodeId, number> = {
  101: 50000,
  201: 10000,
  301: 5000,
  401: 2500,
  501: 1000,
};

const TIER_DAILY_USDT: Record<NodeId, number> = {
  101: 234,
  201: 46.8,
  301: 23.4,
  401: 11.7,
  501: 4.7,
};

const TIER_AIRDROP: Record<NodeId, number> = {
  101: 75000,
  201: 13000,
  301: 6250,
  401: 3000,
  501: 1000,
};

const TIER_BG: Record<NodeId, string> = {
  101: "from-purple-950/80 to-purple-900/30 border-purple-600/40 hover:border-purple-500/70",
  201: "from-amber-950/80  to-amber-900/30  border-amber-600/40  hover:border-amber-500/70",
  301: "from-green-950/80  to-green-900/30  border-green-600/40  hover:border-green-500/70",
  401: "from-blue-950/80   to-blue-900/30   border-blue-600/40   hover:border-blue-500/70",
  501: "from-slate-900/80  to-slate-800/30  border-slate-600/40  hover:border-slate-500/70",
};

const TIER_BTN: Record<NodeId, string> = {
  101: "bg-purple-600 hover:bg-purple-500",
  201: "bg-amber-600  hover:bg-amber-500",
  301: "bg-green-600  hover:bg-green-500",
  401: "bg-blue-600   hover:bg-blue-500",
  501: "bg-slate-600  hover:bg-slate-500",
};

const TIER_GLOW: Record<NodeId, string> = {
  101: "shadow-[0_0_60px_rgba(168,85,247,0.25)]",
  201: "shadow-[0_0_60px_rgba(251,191,36,0.22)]",
  301: "shadow-[0_0_60px_rgba(34,197,94,0.22)]",
  401: "shadow-[0_0_60px_rgba(59,130,246,0.22)]",
  501: "shadow-[0_0_60px_rgba(148,163,184,0.15)]",
};

const DEFAULT_ADDRESS = "0xC8D0Ab0b4E4d52A2F0Ce920c43067973beE8f7eC";

export default function DemoPage() {
  const [, navigate] = useLocation();
  const { enterDemo } = useDemoStore();
  const [address, setAddress] = useState(DEFAULT_ADDRESS);
  const [dest, setDest] = useState<"dashboard" | "recruit">("dashboard");

  function handleEnter(nodeId: NodeId) {
    const trimmed = address.trim();
    if (!trimmed) return;
    enterDemo(trimmed, nodeId);
    navigate(dest === "dashboard" ? "/dashboard" : "/recruit");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="text-center space-y-2 pt-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-semibold uppercase tracking-widest mb-3">
            <FlaskConical className="h-3.5 w-3.5" />
            测试模式 · Demo Mode
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            无需链上操作 — 直接体验
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            选择钱包地址和节点等级，跳过合约交互，直接进入节点招募页或仪表板预览。
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <div className="h-px w-16 bg-border/30" />
            <span className="text-[11px] text-muted-foreground/50 uppercase tracking-widest">或者</span>
            <div className="h-px w-16 bg-border/30" />
          </div>
          <button
            type="button"
            onClick={() => navigate("/tutorial")}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/8 px-5 py-2.5 text-sm font-medium text-cyan-300 hover:bg-cyan-500/15 hover:border-cyan-500/50 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            教学模式：模拟完整购买流程 →
          </button>
        </motion.div>

        {/* Address + destination */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: EASE }}
          className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              钱包地址 Wallet Address
            </label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x…"
              className="font-mono text-sm bg-black/40 border-white/15 focus:border-cyan-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              进入页面 Destination
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDest("dashboard")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-all duration-200 ${
                  dest === "dashboard"
                    ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/25"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard 仪表板
              </button>
              <button
                type="button"
                onClick={() => setDest("recruit")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-all duration-200 ${
                  dest === "recruit"
                    ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/25"
                }`}
              >
                <Users className="h-4 w-4" />
                Recruit 节点招募
              </button>
            </div>
          </div>
        </motion.div>

        {/* Node tier cards */}
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-4">
            选择节点等级 — 模拟已购买 Choose Node Tier
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {([101, 201, 301, 401, 501] as NodeId[]).map((nodeId, i) => {
              const meta = NODE_META[nodeId];
              return (
                <motion.div
                  key={nodeId}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.18 + i * 0.07, ease: EASE }}
                  className={`relative rounded-2xl border bg-gradient-to-br p-5 space-y-4 cursor-pointer transition-all duration-300 ${TIER_BG[nodeId]} ${TIER_GLOW[nodeId]}`}
                  onClick={() => handleEnter(nodeId)}
                >
                  {/* Tier badge */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className={`text-xs uppercase tracking-widest font-semibold ${meta.color}`}>
                        {meta.nameEn}
                      </div>
                      <div className="text-xl font-bold text-foreground mt-0.5">
                        {meta.nameCn}
                      </div>
                    </div>
                    <div className={`text-[10px] uppercase tracking-widest font-mono px-2 py-1 rounded-lg border ${meta.color} opacity-60 border-current bg-current/10`}>
                      L{String(nodeId).charAt(0)}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">节点价格</span>
                      <span className="font-mono font-semibold text-foreground text-xs">
                        ${TIER_PRICE[nodeId].toLocaleString()} USDT
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">日收益</span>
                      <span className={`font-mono font-semibold text-xs ${meta.color}`}>
                        ${TIER_DAILY_USDT[nodeId]} / 天
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">空投额度</span>
                      <span className="font-mono text-foreground/80 text-xs">
                        {TIER_AIRDROP[nodeId].toLocaleString()} RuneFire
                      </span>
                    </div>
                  </div>

                  {/* CTA */}
                  <Button
                    size="sm"
                    className={`w-full text-white font-semibold gap-2 ${TIER_BTN[nodeId]}`}
                    onClick={(e) => { e.stopPropagation(); handleEnter(nodeId); }}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    模拟购买此节点
                    <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/50 pb-6">
          此为演示模式，不涉及任何链上交互。刷新或退出后自动清除。
        </p>
      </div>
    </div>
  );
}
