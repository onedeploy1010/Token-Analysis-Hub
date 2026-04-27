import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Users, Trophy, TrendingUp, Minus, Zap, CheckCircle } from "lucide-react";
import { InfoCard } from "../components/FlowElements";
import { COLORS, MOBILE_LAYOUT } from "../animations/constants";

interface StepProps {
  phase: number;
  language: string;
}

// 等级收益 V1-V10 (无税收，直接发放)
const levels = [
  { level: "V1", threshold: "2万", thresholdEn: "$20K", percent: 10, color: "#10B981" },
  { level: "V2", threshold: "5万", thresholdEn: "$50K", percent: 20, color: "#3B82F6" },
  { level: "V3", threshold: "10万", thresholdEn: "$100K", percent: 30, color: "#8B5CF6" },
  { level: "V4", threshold: "30万", thresholdEn: "$300K", percent: 40, color: "#F59E0B" },
  { level: "V5", threshold: "100万", thresholdEn: "$1M", percent: 50, color: "#EC4899" },
  { level: "V6", threshold: "250万", thresholdEn: "$2.5M", percent: 60, color: "#14B8A6" },
  { level: "V7", threshold: "500万", thresholdEn: "$5M", percent: 70, color: "#6366F1" },
  { level: "V8", threshold: "1000万", thresholdEn: "$10M", percent: 80, color: "#F43F5E" },
  { level: "V9", threshold: "2000万", thresholdEn: "$20M", percent: 90, color: "#A855F7" },
  { level: "V10", threshold: "5000万", thresholdEn: "$50M", percent: 100, color: "#EAB308" },
];

export function Step10DynamicRewards({ phase, language }: StepProps) {
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
          {language === "zh" ? "等级收益" : "Tier Rewards"}
        </h2>
        <p className="text-muted-foreground text-sm lg:text-base">
          {language === "zh"
            ? "基于团队小区业绩达标等级，无税收直接发放"
            : "Based on team branch performance tier, no tax, direct distribution"}
        </p>
      </motion.div>

      <div className={MOBILE_LAYOUT.content}>
        {/* 团队结构示意 */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center mb-4"
        >
          {/* 用户节点 */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg mb-2">
              <Users className="h-6 w-6 text-white" />
            </div>
            <span className="text-sm font-bold">{language === "zh" ? "你" : "You"}</span>
            <span className="text-xs text-chart-4">V3</span>
          </div>

          {/* 下级分支 */}
          {phase >= 1 && (
            <motion.div
              ref={phase1Ref}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex gap-4 lg:gap-6 mt-3"
            >
              {/* 大区 (排除) */}
              <div className="flex flex-col items-center opacity-50">
                <div className="w-2 h-6 border-l-2 border-muted-foreground/30" />
                <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-[11px] text-muted-foreground mt-1">{language === "zh" ? "大区" : "Max"}</span>
                <div className="px-1 py-0.5 bg-muted rounded text-[11px]">{language === "zh" ? "排除" : "Excluded"}</div>
              </div>

              {/* 小区们 (计入) */}
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-2 h-6 border-l-2 border-chart-2/50" />
                  <div className="w-10 h-10 rounded-full bg-chart-2/20 flex items-center justify-center border-2 border-chart-2/50">
                    <Users className="h-4 w-4 text-chart-2" />
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-1">{language === "zh" ? `小区${i}` : `B${i}`}</span>
                  <span className="text-[11px] text-chart-2">${(30 - i * 5)}K</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* 等级阶梯 */}
        {phase >= 2 && (
          <motion.div
            ref={phase2Ref}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-card rounded-xl p-4 border mb-4"
          >
            <h3 className="text-sm font-bold mb-3 text-center">{language === "zh" ? "等级达标条件 (小区业绩)" : "Level Requirements (Branch Performance)"}</h3>
            <div className="flex items-end justify-center gap-0.5 lg:gap-1 overflow-x-auto">
              {levels.map((lvl, i) => (
                <motion.div
                  key={lvl.level}
                  initial={{ height: 0 }}
                  animate={{ height: 20 + i * 8 }}
                  transition={{ delay: 0.7 + i * 0.05 }}
                  className="w-7 lg:w-9 rounded-t-lg flex flex-col items-center justify-end pb-0.5 shrink-0"
                  style={{ background: `linear-gradient(180deg, ${lvl.color}, ${lvl.color}80)` }}
                >
                  <span className="text-white font-bold text-[11px]">{lvl.level}</span>
                  <span className="text-white/80 text-[11px]">{lvl.percent}%</span>
                </motion.div>
              ))}
            </div>
            <div className="flex justify-center gap-0.5 lg:gap-1 mt-1 overflow-x-auto">
              {levels.map((lvl) => (
                <div key={lvl.level} className="w-7 lg:w-9 text-center shrink-0">
                  <span className="text-[11px] text-muted-foreground">{language === "zh" ? lvl.threshold : lvl.thresholdEn}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 奖励计算 + 释放税率 */}
        <div className="grid grid-cols-1 grid-cols-1 gap-4">
          {/* 奖励计算 */}
          {phase >= 3 && (
            <motion.div
              ref={phase3Ref}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="bg-card rounded-xl p-4 border"
            >
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-5 w-5 text-chart-4" />
                <span className="font-bold text-sm">{language === "zh" ? "奖励计算公式" : "Reward Formula"}</span>
              </div>

              {/* 公式说明 */}
              <div className="bg-primary/10 rounded-lg p-2 mb-3 text-center">
                <span className="text-xs font-mono">
                  {language === "zh" ? "团队每日利息" : "Team Daily Interest"} × 40% × {language === "zh" ? "等级%" : "Tier%"}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">{language === "zh" ? "团队B18每日利息" : "Team Daily B18 Interest"}</span>
                  <span className="font-mono text-xs">1,000 B18</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">{language === "zh" ? "基础分配比例" : "Base Distribution"}</span>
                  <span className="font-mono text-xs">× 40%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">{language === "zh" ? "你的等级 (V3)" : "Your Level (V3)"}</span>
                  <span className="font-mono text-xs">× 30%</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-chart-4">
                  <span>{language === "zh" ? "下级V2已领取" : "V2 Below Claimed"}</span>
                  <div className="flex items-center gap-1">
                    <Minus className="h-3 w-3" />
                    <span className="font-mono">× 20%</span>
                  </div>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="text-muted-foreground text-xs">{language === "zh" ? "级差奖励" : "Differential"}</span>
                  <span className="font-mono font-bold text-chart-2 text-xs">10%</span>
                </div>
                <div className="flex justify-between bg-chart-2/10 rounded-lg p-2">
                  <span className="font-medium text-xs">{language === "zh" ? "你获得" : "You Get"}</span>
                  <span className="font-mono font-bold text-chart-2 text-xs">
                    1,000 × 40% × 10% = 40 B18
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* 等级收益 vs 传统银行VIP服务 */}
          {phase >= 4 && (
            <motion.div
              ref={phase4Ref}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3 }}
              className="bg-chart-2/10 rounded-xl p-4 border border-chart-2/30"
            >
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-chart-2" />
                <span className="font-bold text-sm text-chart-2">{language === "zh" ? "等级收益 vs 传统银行VIP" : "Tier Rewards vs Bank VIP"}</span>
              </div>

              {/* 对比 */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-destructive/10 rounded-lg p-2 border border-destructive/20">
                  <div className="font-bold text-destructive mb-1">{language === "zh" ? "银行VIP" : "Bank VIP"}</div>
                  <div className="text-muted-foreground">{language === "zh" ? "门槛高(50万起)、仅享费率优惠" : "High threshold ($500K+), only fee discounts"}</div>
                </div>
                <div className="bg-chart-2/10 rounded-lg p-2 border border-chart-2/20">
                  <div className="font-bold text-chart-2 mb-1">{language === "zh" ? "B18等级" : "B18 Tier"}</div>
                  <div className="text-muted-foreground">{language === "zh" ? "V1仅2万起、实际收益分红、无税直发" : "V1 from $20K, actual profit share, no tax"}</div>
                </div>
              </div>

              {/* 发放示例 */}
              <div className="bg-chart-2/20 rounded-lg p-3 text-center">
                <div className="text-[11px] text-muted-foreground mb-1">
                  {language === "zh" ? "等级收益 = 直接发放，无释放周期，无税收" : "Tier Rewards = Direct, No Release Period, No Tax"}
                </div>
                <div className="font-mono text-sm">
                  40 B18 → <span className="font-bold text-chart-2">40 B18</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
