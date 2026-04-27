import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Unlock, Calendar, Receipt, TrendingUp, TrendingDown, RotateCcw, Coins, ArrowRight } from "lucide-react";
import { InfoCard } from "../components/FlowElements";
import { COLORS, MOBILE_LAYOUT } from "../animations/constants";

interface StepProps {
  phase: number;
  language: string;
}

// 静态释放税率 (与系统参数一致)
const releaseOptions = [
  { days: 30, tax: 3, color: "#10B981" },
  { days: 15, tax: 6, color: "#3B82F6" },
  { days: 7, tax: 10, color: "#8B5CF6" },
  { days: 1, tax: 20, color: "#F59E0B" },
];

const releaseModes = [
  {
    id: "principal-interest",
    labelZh: "本+利释放",
    labelEn: "P+I Release",
    descZh: "每日释放本金和利息",
    descEn: "Release principal + interest daily",
    effectZh: "质押本金逐渐减少",
    effectEn: "Principal decreases",
    icon: TrendingDown,
    color: "#F59E0B",
    example: { day1: "10", day30: "0" }
  },
  {
    id: "interest-only",
    labelZh: "仅利息释放",
    labelEn: "Interest Only",
    descZh: "每日只提取利息",
    descEn: "Withdraw interest only daily",
    effectZh: "质押本金保持不变",
    effectEn: "Principal stays same",
    icon: Coins,
    color: "#3B82F6",
    example: { day1: "10", day30: "10" }
  },
  {
    id: "compound",
    labelZh: "复利滚存",
    labelEn: "Compound",
    descZh: "利息叠加到本金",
    descEn: "Interest added to principal",
    effectZh: "质押本金逐渐增加",
    effectEn: "Principal increases",
    icon: TrendingUp,
    color: "#10B981",
    example: { day1: "10", day30: "13" }
  },
];

export function Step4DailyRelease({ phase, language }: StepProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const phase1Ref = useRef<HTMLDivElement>(null);
  const phase2Ref = useRef<HTMLDivElement>(null);
  const phase3Ref = useRef<HTMLDivElement>(null);
  const phase4Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refs = [null, phase1Ref, phase2Ref, phase3Ref, phase4Ref];
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
          {language === "zh" ? "每日释放模式" : "Daily Release Modes"}
        </h2>
        <p className="text-muted-foreground text-sm lg:text-base">
          {language === "zh"
            ? "质押期间，用户可选择三种不同的释放模式"
            : "During staking, users can choose from three release modes"}
        </p>
      </motion.div>

      <div className={MOBILE_LAYOUT.content}>
        {/* 三种释放模式 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 grid-cols-1 gap-4 mb-10"
        >
          {releaseModes.map((mode, index) => (
            <motion.div
              key={mode.id}
              ref={index === 0 ? phase1Ref : index === 1 ? phase2Ref : phase3Ref}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15 }}
              className={`rounded-2xl p-4 border-2 transition-all ${
                phase >= index + 1
                  ? `bg-[${mode.color}]/10 border-[${mode.color}]/50`
                  : "bg-muted/20 border-transparent"
              }`}
              style={{
                backgroundColor: phase >= index + 1 ? `${mode.color}15` : undefined,
                borderColor: phase >= index + 1 ? `${mode.color}50` : undefined,
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${mode.color}20` }}
                >
                  <mode.icon className="h-6 w-6" style={{ color: mode.color }} />
                </div>
                <div>
                  <div className="font-bold" style={{ color: mode.color }}>
                    {language === "zh" ? mode.labelZh : mode.labelEn}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {language === "zh" ? mode.descZh : mode.descEn}
                  </div>
                </div>
              </div>

              {phase >= index + 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {/* 效果说明 */}
                  <div
                    className="rounded-lg p-2 mb-3 text-center"
                    style={{ backgroundColor: `${mode.color}15` }}
                  >
                    <span className="text-sm font-medium" style={{ color: mode.color }}>
                      {language === "zh" ? mode.effectZh : mode.effectEn}
                    </span>
                  </div>

                  {/* 本金变化示例 */}
                  <div className="bg-background/60 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-2 text-center">
                      {language === "zh" ? "质押本金 (B18)" : "Principal (B18)"}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-center">
                        <div className="text-[11px] text-muted-foreground">{language === "zh" ? "第1天" : "Day 1"}</div>
                        <div className="font-mono font-bold">{mode.example.day1}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="text-center">
                        <div className="text-[11px] text-muted-foreground">{language === "zh" ? "第30天" : "Day 30"}</div>
                        <div className="font-mono font-bold" style={{ color: mode.color }}>
                          {mode.example.day30}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* 释放天数选择 (影响税率) */}
        {phase >= 4 && (
          <motion.div
            ref={phase4Ref}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card rounded-2xl p-4 border mb-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-chart-4" />
              <span className="font-bold">{language === "zh" ? "释放天数选择 (影响税率)" : "Release Days (Affects Tax Rate)"}</span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {releaseOptions.map((option, index) => (
                <motion.div
                  key={option.days}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="bg-muted/30 rounded-xl p-3 text-center border-2 transition-all hover:scale-105 cursor-pointer"
                  style={{ borderColor: `${option.color}40` }}
                >
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <span className="font-bold text-lg" style={{ color: option.color }}>
                      {option.days}
                    </span>
                    <span className="text-xs text-muted-foreground">{language === "zh" ? "天" : "d"}</span>
                  </div>
                  <div
                    className="inline-block px-2 py-1 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: option.color }}
                  >
                    {language === "zh" ? "税" : "Tax"}: {option.tax}%
                  </div>
                  {option.tax === 3 && (
                    <div className="text-[11px] text-chart-2 mt-1 font-medium">
                      {language === "zh" ? "✨ 最低税率" : "✨ Lowest Tax"}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="mt-4 text-xs text-muted-foreground text-center">
              {language === "zh"
                ? "释放天数越短，税率越高。税收用于二级市场回购B18推动币价上涨。"
                : "Shorter release = higher tax. Tax is used to buy back B18, pushing price up."}
            </div>
          </motion.div>
        )}

        {/* 三种释放模式 vs 传统银行活期/定期二选一 */}
        {phase >= 4 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-chart-1/10 rounded-2xl p-4 border border-chart-1/30"
          >
            <div className="flex items-center gap-2 mb-3">
              <Coins className="h-5 w-5 text-chart-1" />
              <span className="font-bold text-chart-1">{language === "zh" ? "灵活性 vs 传统银行" : "Flexibility vs Traditional Bank"}</span>
            </div>

            {/* 对比说明 */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="bg-destructive/10 rounded-lg p-2 border border-destructive/20">
                <div className="font-bold text-destructive mb-1">{language === "zh" ? "传统银行" : "Traditional Bank"}</div>
                <div className="text-muted-foreground">{language === "zh" ? "活期利率极低(0.3%)，定期到期才能取，二选一" : "Demand rate very low (0.3%), fixed must wait maturity, either-or"}</div>
              </div>
              <div className="bg-chart-2/10 rounded-lg p-2 border border-chart-2/20">
                <div className="font-bold text-chart-2 mb-1">{language === "zh" ? "B18三种模式" : "B18 Three Modes"}</div>
                <div className="text-muted-foreground">{language === "zh" ? "本+利渐出、仅利息、复利滚存，随时可切换" : "P+I gradual, interest only, compound, switch anytime"}</div>
              </div>
            </div>

            {/* 价格上涨价值提升 */}
            <div className="bg-background/60 rounded-xl p-3">
              <div className="text-xs font-bold mb-2 text-center">{language === "zh" ? "B18持有价值随币价上涨" : "B18 Value Rises with Price"}</div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-muted/30 rounded-lg p-2">
                  <div className="text-muted-foreground mb-1">{language === "zh" ? "购入时" : "At Purchase"}</div>
                  <div className="font-mono">10 B18 × $100 = <span className="font-bold">$1,000</span></div>
                </div>
                <div className="bg-chart-2/20 rounded-lg p-2 border border-chart-2/30">
                  <div className="text-chart-2 mb-1">{language === "zh" ? "币价上涨后" : "After Rise"}</div>
                  <div className="font-mono">10 B18 × $120 = <span className="font-bold text-chart-2">$1,200</span></div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
