import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Receipt, TrendingUp, ArrowRight, Coins, FileCode, Shield } from "lucide-react";
import { ContractBox, InfoCard } from "../components/FlowElements";
import { COLORS, MOBILE_LAYOUT } from "../animations/constants";

interface StepProps {
  phase: number;
  language: string;
}

export function Step5TaxBuyback({ phase, language }: StepProps) {
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
        <div className="inline-flex items-center gap-2 bg-chart-2/10 rounded-full px-4 py-1 mb-3">
          <TrendingUp className="h-4 w-4 text-chart-2" />
          <span className="text-xs font-bold text-chart-2">{language === "zh" ? "智能合约自动执行" : "Smart Contract Auto-Execution"}</span>
        </div>
        <h2 className="text-2xl lg:text-4xl font-bold mb-2">
          {language === "zh" ? "税收回购" : "Tax Buyback"}
        </h2>
        <p className="text-muted-foreground text-sm lg:text-base">
          {language === "zh"
            ? "币价为何平稳上涨？智能合约自动用税收USDC回购B18"
            : "Why does price rise steadily? Smart contract auto-buys B18 with tax USDC"}
        </p>
      </motion.div>

      {/* 流程图 */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12">
        {/* 税收USDC */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="relative"
        >
          <motion.div
            className="w-20 h-20 lg:w-24 lg:h-24 rounded-xl bg-gradient-to-br from-[#2775CA]/20 to-[#2775CA]/10 border-2 border-[#2775CA]/40 flex flex-col items-center justify-center"
            animate={{ boxShadow: ["0 0 0 0 rgba(39,117,202,0)", "0 0 20px 4px rgba(39,117,202,0.3)", "0 0 0 0 rgba(39,117,202,0)"] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
          >
            <Receipt className="h-8 w-8 text-[#2775CA] mb-1" />
            <motion.span
              className="text-xs font-bold text-[#2775CA]"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              $100
            </motion.span>
            <span className="text-[11px] text-muted-foreground">{language === "zh" ? "税收" : "Tax"}</span>
          </motion.div>
        </motion.div>

        {/* 箭头 + USDC飞行 */}
        {phase >= 1 && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2"
          >
            <motion.div
              animate={{
                x: [0, 30, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              className="w-8 h-8 rounded-full bg-[#2775CA] flex items-center justify-center text-white font-bold shadow-lg"
            >
              $
            </motion.div>
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
            >
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </motion.div>
          </motion.div>
        )}

        {/* AMM池 */}
        {phase >= 1 && (
          <motion.div
            ref={phase1Ref}
            initial={{ opacity: 0, scale: 0, rotate: 180 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 150, damping: 12, delay: 0.2 }}
            className="relative"
          >
            <motion.div
              className="w-28 h-28 lg:w-36 lg:h-36 rounded-full bg-gradient-to-br from-chart-4/20 to-chart-2/20 border-4 border-chart-4/50 flex items-center justify-center relative"
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                <Coins className="h-10 w-10 text-chart-4" />
              </motion.div>
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-chart-2/50"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
              />
              <motion.div
                className="absolute inset-2 rounded-full border-2 border-dashed border-chart-4/30"
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
              />
            </motion.div>
            <motion.div
              className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <span className="text-xs font-bold">AMM</span>
            </motion.div>
          </motion.div>
        )}

        {/* B18输出 + 价格上涨 */}
        {phase >= 2 && (
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
            className="flex items-center gap-2"
          >
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
            >
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </motion.div>
            <motion.div
              animate={{
                y: [0, -8, 0],
                boxShadow: ["0 4px 12px rgba(16,185,129,0.3)", "0 12px 24px rgba(16,185,129,0.4)", "0 4px 12px rgba(16,185,129,0.3)"],
              }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              className="w-10 h-10 rounded-full bg-[#10B981] flex items-center justify-center text-white font-bold shadow-lg"
            >
              B
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* 价格变化示意 */}
      {phase >= 2 && (
        <motion.div
          ref={phase2Ref}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 bg-chart-2/10 rounded-xl p-4 lg:p-6 border border-chart-2/30"
        >
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">{language === "zh" ? "回购前" : "Before"}</div>
              <div className="text-xl font-bold">$100.00</div>
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <TrendingUp className="h-8 w-8 text-chart-2" />
            </motion.div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">{language === "zh" ? "回购后" : "After"}</div>
              <div className="text-xl font-bold text-chart-2">$102.00</div>
            </div>
          </div>
          <div className="text-center mt-2">
            <span className="text-sm text-chart-2 font-bold">+2.00%</span>
          </div>
        </motion.div>
      )}

      {/* AMM公式 */}
      {phase >= 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-4 text-center"
        >
          <div className="inline-block bg-card rounded-lg px-4 py-2 border">
            <span className="text-xs text-muted-foreground">AMM: </span>
            <span className="font-mono font-bold">
              price = USDC_pool / B18_pool
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {language === "zh"
              ? "USDC增加 + B18减少 = 价格上涨"
              : "More USDC + Less B18 = Higher Price"}
          </p>
        </motion.div>
      )}

      {/* 自动回购 vs 央行公开市场操作 */}
      {phase >= 3 && (
        <motion.div
          ref={phase3Ref}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-4 bg-gradient-to-r from-primary/10 to-chart-2/10 rounded-xl p-4 border border-primary/30 max-w-lg w-full"
        >
          <div className="flex items-center gap-2 mb-3">
            <FileCode className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-primary">{language === "zh" ? "B18回购 vs 央行公开市场操作" : "B18 Buyback vs Central Bank OMO"}</span>
          </div>

          {/* 对比 */}
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="bg-destructive/10 rounded-lg p-2 border border-destructive/20">
              <div className="font-bold text-destructive mb-1">{language === "zh" ? "央行公开市场操作" : "Central Bank OMO"}</div>
              <div className="text-muted-foreground">{language === "zh" ? "人工决策、政策滞后、不透明、可被操纵" : "Manual decision, policy lag, opaque, can be manipulated"}</div>
            </div>
            <div className="bg-chart-2/10 rounded-lg p-2 border border-chart-2/20">
              <div className="font-bold text-chart-2 mb-1">{language === "zh" ? "B18智能合约回购" : "B18 Smart Buyback"}</div>
              <div className="text-muted-foreground">{language === "zh" ? "自动执行、实时响应、100%透明、无法篡改" : "Auto-execute, real-time, 100% transparent, immutable"}</div>
            </div>
          </div>

          <div className="text-xs space-y-2">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-chart-2 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-chart-2">{language === "zh" ? "通缩飞轮效应：" : "Deflationary Flywheel: "}</span>
                <span className="text-muted-foreground">
                  {language === "zh"
                    ? "税收→回购→减少供应→价格上涨→吸引投资→形成正循环"
                    : "Tax → Buyback → Reduce Supply → Price Up → Attract Investment → Positive Loop"}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Coins className="h-4 w-4 text-chart-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-chart-4">{language === "zh" ? "通缩目标：" : "Deflation Target: "}</span>
                <span className="text-muted-foreground">
                  {language === "zh"
                    ? "从10,100,000通缩至1,000,000，90%永久销毁"
                    : "From 10.1M to 1M, 90% permanently burned"}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
