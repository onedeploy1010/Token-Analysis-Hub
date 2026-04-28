import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Shield, TrendingUp, TrendingDown, Scale, ArrowUpDown } from "lucide-react";
import { ContractBox, InfoCard } from "../components/FlowElements";
import { COLORS, MOBILE_LAYOUT } from "../animations/constants";

interface StepProps {
  phase: number;
  language: string;
}

export function Step6SPPBalance({ phase, language }: StepProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const phase1Ref = useRef<HTMLDivElement>(null);
  const phase2Ref = useRef<HTMLDivElement>(null);
  const phase3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refs = [null, phase1Ref, phase2Ref, phase3Ref];
    const targetRef = refs[phase];
    if (targetRef?.current) {
      setTimeout(() => {
        const container = containerRef.current!;
        const target = targetRef.current!;
        // 滚动到目标元素顶部，留出顶部边距
        container.scrollTo({
          top: target.offsetTop - 16,
          behavior: "smooth"
        });
      }, 350);
    }
  }, [phase]);

  return (
    <div ref={containerRef} className={MOBILE_LAYOUT.container}>
      {/* 标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={MOBILE_LAYOUT.header}
      >
        <h2 className="text-2xl lg:text-4xl font-bold mb-2">
          {language === "zh" ? "SPP平衡合约" : "SPP Balance Contract"}
        </h2>
        <p className="text-muted-foreground text-sm lg:text-base">
          {language === "zh"
            ? "智能价格稳定机制，双向调控市场价格"
            : "Smart Price Stabilizer - bidirectional market price control"}
        </p>
      </motion.div>

      {/* SPP合约中心 - 使用flex布局避免挤压 */}
      <div className="flex items-center justify-center gap-4 lg:gap-8 mb-10">
        {/* 买入方向 - 价格过低 */}
        {phase >= 1 && (
          <motion.div
            ref={phase1Ref}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center"
          >
            <div className="flex items-center gap-2">
              <div className="bg-chart-2/10 rounded-xl p-3 border border-chart-2/30 text-center">
                <TrendingDown className="h-5 w-5 text-destructive mx-auto mb-1" />
                <div className="text-xs font-bold">{language === "zh" ? "价格过低" : "Price Low"}</div>
              </div>
              <motion.div
                animate={{ x: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                <div className="w-7 h-7 rounded-full bg-[#2775CA] flex items-center justify-center text-white font-bold text-xs">$</div>
              </motion.div>
            </div>
            <div className="mt-2 text-center text-xs text-chart-2">
              {language === "zh" ? "USDC买入B18" : "Buy B18"}
            </div>
          </motion.div>
        )}

        {/* SPP中心 */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 10 }}
          className="relative flex flex-col items-center"
        >
          <motion.div
            className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br from-[#3B82F6]/30 to-[#8B5CF6]/30 border-4 border-[#3B82F6] flex items-center justify-center relative"
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(59,130,246,0)",
                "0 0 20px 6px rgba(59,130,246,0.25)",
                "0 0 0 0 rgba(59,130,246,0)",
              ],
            }}
            transition={{ repeat: Infinity, duration: 3 }}
          >
            <Shield className="h-10 w-10 lg:h-12 lg:w-12 text-[#3B82F6]" />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-dashed border-[#3B82F6]/30"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
            />
          </motion.div>
          <div className="mt-2 text-center">
            <span className="text-sm font-bold text-[#3B82F6]">SPP</span>
            <div className="text-xs text-muted-foreground">
              {language === "zh" ? "价格稳定池" : "Price Stabilizer"}
            </div>
          </div>
        </motion.div>

        {/* 卖出方向 - 价格过高 */}
        {phase >= 2 && (
          <motion.div
            ref={phase2Ref}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center"
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ x: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                <div className="w-7 h-7 rounded-full bg-[#10B981] flex items-center justify-center text-white font-bold text-xs">B</div>
              </motion.div>
              <div className="bg-chart-4/10 rounded-xl p-3 border border-chart-4/30 text-center">
                <TrendingUp className="h-5 w-5 text-chart-2 mx-auto mb-1" />
                <div className="text-xs font-bold">{language === "zh" ? "价格过高" : "Price High"}</div>
              </div>
            </div>
            <div className="mt-2 text-center text-xs text-chart-4">
              {language === "zh" ? "卖出B18获USDC" : "Sell B18"}
            </div>
          </motion.div>
        )}
      </div>

      {/* 浮动阈值说明 */}
      {phase >= 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mb-4"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-3 py-1 text-xs">
            <ArrowUpDown className="h-3 w-3 text-primary" />
            <span className="text-primary font-medium">
              {language === "zh" ? "买卖阈值根据市场情况动态调整" : "Buy/sell thresholds adjust dynamically"}
            </span>
          </div>
        </motion.div>
      )}

      {/* 价格区间示意 */}
      {phase >= 3 && (
        <motion.div
          ref={phase3Ref}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="w-full max-w-md"
        >
          <div className="relative h-12 bg-muted/30 rounded-full overflow-hidden">
            {/* 安全区间 */}
            <div className="absolute inset-y-0 left-[30%] right-[30%] bg-chart-2/20 border-x-2 border-chart-2" />

            {/* 买入区 */}
            <div className="absolute inset-y-0 left-0 w-[30%] bg-destructive/10 flex items-center justify-center">
              <span className="text-xs font-bold text-destructive">{language === "zh" ? "买入区" : "Buy"}</span>
            </div>

            {/* 卖出区 */}
            <div className="absolute inset-y-0 right-0 w-[30%] bg-chart-4/10 flex items-center justify-center">
              <span className="text-xs font-bold text-chart-4">{language === "zh" ? "卖出区" : "Sell"}</span>
            </div>

            {/* 当前价格指示器 */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary shadow-lg"
              animate={{ left: ["30%", "50%", "70%", "50%", "30%"] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{language === "zh" ? "如-5%" : "e.g. -5%"}</span>
            <span>{language === "zh" ? "基准价" : "Base"}</span>
            <span>{language === "zh" ? "如+10%" : "e.g. +10%"}</span>
          </div>
        </motion.div>
      )}

      {/* SPP vs 央行外汇干预 */}
      {phase >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-6 bg-gradient-to-r from-[#3B82F6]/10 to-[#8B5CF6]/10 rounded-xl p-4 border border-[#3B82F6]/30 max-w-md w-full"
        >
          <div className="text-xs font-bold text-[#3B82F6] mb-2">{language === "zh" ? "SPP vs 央行外汇干预" : "SPP vs Central Bank FX Intervention"}</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-destructive/10 rounded-lg p-2 border border-destructive/20">
              <div className="font-bold text-destructive mb-1">{language === "zh" ? "央行干预" : "Central Bank"}</div>
              <div className="text-muted-foreground">{language === "zh" ? "人工决策、滞后数周、不公开、可被投机" : "Manual, weeks delay, opaque, can be exploited"}</div>
            </div>
            <div className="bg-chart-2/10 rounded-lg p-2 border border-chart-2/20">
              <div className="font-bold text-chart-2 mb-1">{language === "zh" ? "SPP自动稳定" : "SPP Auto-Stabilize"}</div>
              <div className="text-muted-foreground">{language === "zh" ? "智能合约、实时响应、规则透明、无法操纵" : "Smart contract, real-time, transparent, immutable"}</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
