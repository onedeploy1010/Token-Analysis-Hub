import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { FileText, Droplets, Coins, ArrowRight, Equal, Info } from "lucide-react";
import { ContractBox, InfoCard, PercentBadge } from "../components/FlowElements";
import { COLORS, SPRING_CONFIG, MOBILE_LAYOUT } from "../animations/constants";

interface StepProps {
  phase: number;
  language: string;
}

export function Step2LPPairing({ phase, language }: StepProps) {
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
          {language === "zh" ? "LP配对机制" : "LP Pairing Mechanism"}
        </h2>
        <p className="text-muted-foreground text-sm lg:text-base">
          {language === "zh"
            ? "交付合约拨出B18与USDC 1:1等值配对添加流动性"
            : "Delivery releases B18 to pair with USDC at 1:1 equal value"}
        </p>
      </motion.div>

      <div className={MOBILE_LAYOUT.content}>
        {/* 配对流程 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`grid grid-cols-1 gap-4 ${MOBILE_LAYOUT.sectionGap}`}
        >
          {/* 交付合约 */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-[#10B981]/10 rounded-2xl p-4 border border-[#10B981]/30"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-[#10B981]/20 flex items-center justify-center">
                <FileText className="h-6 w-6 text-[#10B981]" />
              </div>
              <div>
                <div className="font-bold text-[#10B981]">
                  {language === "zh" ? "交付合约" : "Delivery"}
                </div>
                <div className="text-xs text-muted-foreground">B18 Reserve</div>
              </div>
            </div>
            <div className="bg-background/60 rounded-xl p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">
                {language === "zh" ? "拨出B18" : "Release B18"}
              </div>
              <div className="font-mono font-bold text-[#10B981]">5 B18</div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {language === "zh" ? "价值 $500" : "Worth $500"}
              </div>
            </div>
          </motion.div>

          {/* 等值配对说明 */}
          {phase >= 1 && (
            <motion.div
              ref={phase1Ref}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center"
            >
              <div className="w-20 h-20 rounded-full border-4 border-dashed border-chart-4/50 flex items-center justify-center bg-gradient-to-br from-[#10B981]/10 to-[#2775CA]/10 mb-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Equal className="h-8 w-8 text-chart-4" />
                </motion.div>
              </div>
              <div className="text-center">
                <div className="font-bold text-chart-4">1:1</div>
                <div className="text-xs text-muted-foreground">
                  {language === "zh" ? "等值配对" : "Equal Value"}
                </div>
              </div>
            </motion.div>
          )}

          {/* USDC */}
          {phase >= 1 && (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#2775CA]/10 rounded-2xl p-4 border border-[#2775CA]/30"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-[#2775CA]/20 flex items-center justify-center">
                  <Coins className="h-6 w-6 text-[#2775CA]" />
                </div>
                <div>
                  <div className="font-bold text-[#2775CA]">USDC</div>
                  <div className="text-xs text-muted-foreground">
                    {language === "zh" ? "入单50%" : "50% Order"}
                  </div>
                </div>
              </div>
              <div className="bg-background/60 rounded-xl p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">
                  {language === "zh" ? "配对USDC" : "Pair USDC"}
                </div>
                <div className="font-mono font-bold text-[#2775CA]">$500</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {language === "zh" ? "等值B18" : "Equal B18 Value"}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* 添加到LP池 */}
        {phase >= 2 && (
          <motion.div
            ref={phase2Ref}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={MOBILE_LAYOUT.sectionGap}
          >
            <div className="flex justify-center mb-4">
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="flex flex-col items-center text-muted-foreground"
              >
                <ArrowRight className="h-6 w-6 rotate-90" />
              </motion.div>
            </div>

            <div className="bg-[#F59E0B]/10 rounded-2xl p-4 border border-[#F59E0B]/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/20 flex items-center justify-center">
                  <Droplets className="h-6 w-6 text-[#F59E0B]" />
                </div>
                <div>
                  <div className="font-bold text-[#F59E0B]">
                    {language === "zh" ? "LP流动池" : "LP Pool"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {language === "zh" ? "1:1等比例添加 = 价格不变" : "1:1 Proportional Add = No Price Change"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background/60 rounded-xl p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">LP USDC</div>
                  <div className="font-mono font-bold text-[#2775CA]">+$500</div>
                </div>
                <div className="bg-background/60 rounded-xl p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">LP B18</div>
                  <div className="font-mono font-bold text-[#10B981]">+5</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 关键说明: 50/50分配 vs 传统银行10%准备金 */}
        {phase >= 3 && (
          <motion.div
            ref={phase3Ref}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-primary/10 rounded-2xl p-4 border border-primary/30"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Info className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-bold text-primary mb-2">
                  {language === "zh" ? "50/50分配 vs 传统银行准备金率" : "50/50 Split vs Traditional Reserve Ratio"}
                </div>

                {/* 准备金对比 */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="bg-destructive/10 rounded-lg p-2 border border-destructive/20">
                    <div className="text-destructive font-bold mb-1">{language === "zh" ? "传统银行 (部分准备金)" : "Traditional (Fractional Reserve)"}</div>
                    <div className="text-muted-foreground">{language === "zh" ? "仅10%准备金，90%贷出。一旦挤兑，流动性枯竭" : "Only 10% reserve, 90% loaned out. Bank run = liquidity crisis"}</div>
                  </div>
                  <div className="bg-chart-2/10 rounded-lg p-2 border border-chart-2/20">
                    <div className="text-chart-2 font-bold mb-1">{language === "zh" ? "B18 (50%国库)" : "B18 (50% Treasury)"}</div>
                    <div className="text-muted-foreground">{language === "zh" ? "50%直接进入国库储备，随时可兑付用户提现" : "50% goes to treasury reserve, always available for redemption"}</div>
                  </div>
                </div>

                {/* 价格稳定说明 */}
                <div className="bg-background/60 rounded-lg p-2 text-xs">
                  <div className="font-bold mb-1">{language === "zh" ? "为何入单时价格不变？" : "Why Price Stays Same During Order?"}</div>
                  <div className="text-muted-foreground">
                    {language === "zh"
                      ? "USDC与B18按1:1等值添加流动性，根据AMM公式 x * y = k，等比例增加不改变价格比。价格上涨发生在提现阶段的税收回购。"
                      : "USDC and B18 add liquidity at 1:1 equal value. Per AMM formula x * y = k, proportional increase doesn't change price ratio."}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

    </div>
  );
}
