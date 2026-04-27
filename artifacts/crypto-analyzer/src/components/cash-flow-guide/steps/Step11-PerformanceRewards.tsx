import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Gift, Layers, Calculator, ArrowDown, Calendar, Wallet, CheckCircle } from "lucide-react";
import { InfoCard } from "../components/FlowElements";
import { COLORS, MOBILE_LAYOUT } from "../animations/constants";

// 业绩奖励释放税率 (根据白皮书: 180天无税)
const releaseTaxOptions = [
  { days: 180, tax: 0, color: "#10B981", label: "无税", labelEn: "No Tax" },
  { days: 100, tax: 10, color: "#3B82F6", label: "10%", labelEn: "10%" },
  { days: 60, tax: 20, color: "#8B5CF6", label: "20%", labelEn: "20%" },
  { days: 30, tax: 30, color: "#F59E0B", label: "30%", labelEn: "30%" },
];

interface StepProps {
  phase: number;
  language: string;
}

export function Step11PerformanceRewards({ phase, language }: StepProps) {
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
  const layers = [
    { layer: 1, percent: 100 },
    { layer: 2, percent: 98 },
    { layer: 3, percent: 96 },
    { layer: 4, percent: 94 },
    { layer: 5, percent: 92 },
    { layer: 6, percent: 90 },
    { layer: 7, percent: 88 },
    { layer: "...", percent: null },
    { layer: "N", percent: 10 },
  ];

  return (
    <div className={MOBILE_LAYOUT.container}>
      {/* 标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={MOBILE_LAYOUT.header}
      >
        <h2 className="text-2xl lg:text-4xl font-bold mb-2">
          {language === "zh" ? "业绩奖励" : "Performance Rewards"}
        </h2>
        <p className="text-muted-foreground text-sm lg:text-base">
          {language === "zh"
            ? "奖励池B18按层级分配给符合条件的用户"
            : "Bonus pool B18 distributed by layer to qualified users"}
        </p>
      </motion.div>

      {/* 奖励池 */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="relative mb-10"
      >
        <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#F59E0B]/70 flex flex-col items-center justify-center shadow-xl">
          <Gift className="h-8 w-8 text-white mb-1" />
          <span className="text-white font-bold text-sm">{language === "zh" ? "奖励池" : "Bonus"}</span>
          <span className="text-white/80 text-xs">1,000 B18</span>
        </div>

        {/* 向下分发动画 */}
        {phase >= 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute -bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <ArrowDown className="h-6 w-6 text-[#F59E0B]" />
            </motion.div>
          </motion.div>
        )}
      </motion.div>

      {/* 层级递减图 */}
      {phase >= 1 && (
        <motion.div
          ref={phase1Ref}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-lg mb-10"
        >
          <h3 className="text-sm font-bold mb-3 text-center">
            {language === "zh" ? "层级奖励递减" : "Layer Reward Decay"}
          </h3>

          <div className="relative">
            {/* 层级条形图 */}
            <div className="space-y-1">
              {layers.map((item, i) => (
                <motion.div
                  key={item.layer}
                  initial={{ width: 0 }}
                  animate={{ width: item.percent ? `${item.percent}%` : "10%" }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="flex items-center gap-2"
                >
                  <span className="w-8 text-xs text-muted-foreground text-right">
                    {language === "zh" ? `第${item.layer}层` : `L${item.layer}`}
                  </span>
                  <div
                    className="h-6 rounded-r-full flex items-center justify-end pr-2 relative overflow-hidden"
                    style={{
                      background: item.percent
                        ? `linear-gradient(90deg, ${COLORS.lp}${Math.floor(40 + (item.percent / 100) * 60).toString(16)}, ${COLORS.lp})`
                        : COLORS.lp + "40",
                      width: item.percent ? `${item.percent}%` : "10%",
                    }}
                  >
                    {item.percent && (
                      <span className="text-xs font-bold text-white">{item.percent}%</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* 递减说明 */}
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="text-xs text-chart-2 font-bold">100%</span>
              <div className="flex-1 h-0.5 bg-gradient-to-r from-chart-2 to-muted" />
              <span className="text-xs text-muted-foreground">-2%/{language === "zh" ? "层" : "layer"}</span>
              <div className="flex-1 h-0.5 bg-gradient-to-r from-muted to-chart-4" />
              <span className="text-xs text-chart-4 font-bold">{language === "zh" ? "最低" : "Min"} 10%</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* 计算公式 */}
      {phase >= 2 && (
        <motion.div
          ref={phase2Ref}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-card rounded-xl p-4 border max-w-md w-full"
        >
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="h-5 w-5 text-chart-1" />
            <span className="font-bold">{language === "zh" ? "奖励计算公式" : "Reward Formula"}</span>
          </div>

          <div className="bg-muted/30 rounded-lg p-3 font-mono text-sm text-center mb-3">
            <div className="text-muted-foreground mb-1">{language === "zh" ? "你的奖励" : "Your Reward"} =</div>
            <div className="text-base">
              <span className="text-chart-1">{language === "zh" ? "小区业绩" : "Branch"}</span>
              <span className="mx-1">/</span>
              <span className="text-chart-2">{language === "zh" ? "全网小区业绩" : "Network"}</span>
              <span className="mx-1">×</span>
              <span className="text-[#F59E0B]">{language === "zh" ? "奖励池" : "Pool"}</span>
              <span className="mx-1">×</span>
              <span className="text-chart-4">{language === "zh" ? "层级%" : "Layer%"}</span>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{language === "zh" ? "你的小区业绩" : "Your Branch"}</span>
              <span className="font-mono">$50,000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{language === "zh" ? "全网小区业绩" : "Network Total"}</span>
              <span className="font-mono">$5,000,000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{language === "zh" ? "你的占比" : "Your Share"}</span>
              <span className="font-mono font-bold text-chart-1">1%</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="text-muted-foreground">{language === "zh" ? "第1层奖励" : "Layer 1 Reward"}</span>
              <span className="font-mono font-bold text-chart-2">1,000 × 1% × 100% = 10 B18</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{language === "zh" ? "第2层奖励" : "Layer 2 Reward"}</span>
              <span className="font-mono">1,000 × 1% × 98% = 9.8 B18</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* 释放与税收说明 */}
      {phase >= 3 && (
        <motion.div
          ref={phase3Ref}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="bg-card rounded-xl p-4 border max-w-md w-full mt-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-chart-1" />
            <span className="font-bold">{language === "zh" ? "提现释放与税收" : "Withdrawal & Tax"}</span>
          </div>

          <div className="space-y-3">
            {/* 流程说明 */}
            <div className="flex items-start gap-2 text-sm">
              <div className="w-5 h-5 rounded-full bg-chart-2/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[11px] font-bold text-chart-2">1</span>
              </div>
              <span className="text-muted-foreground">
                {language === "zh"
                  ? "选择释放天数 (30/60/100/180天)"
                  : "Choose release days (30/60/100/180)"}
              </span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <div className="w-5 h-5 rounded-full bg-chart-2/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[11px] font-bold text-chart-2">2</span>
              </div>
              <span className="text-muted-foreground">
                {language === "zh"
                  ? "扣除对应税率 (天数越长税率越低)"
                  : "Deduct tax rate (longer = lower tax)"}
              </span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <div className="w-5 h-5 rounded-full bg-chart-2/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[11px] font-bold text-chart-2">3</span>
              </div>
              <span className="text-muted-foreground">
                {language === "zh"
                  ? "税后B18分批释放到钱包"
                  : "After-tax B18 released in batches"}
              </span>
            </div>

            {/* 税率选项 */}
            <div className="grid grid-cols-4 gap-1 mt-3">
              {releaseTaxOptions.map((option, index) => (
                <motion.div
                  key={option.days}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.1 + index * 0.1 }}
                  className="bg-muted/30 rounded-lg p-2 text-center"
                  style={{ borderColor: `${option.color}40`, borderWidth: 1 }}
                >
                  <div className="font-bold text-xs" style={{ color: option.color }}>
                    {option.days}d
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {option.tax}%
                  </div>
                </motion.div>
              ))}
            </div>

            {/* 计算示例 */}
            <div className="bg-muted/30 rounded-lg p-2 text-center mt-2">
              <div className="text-[11px] text-muted-foreground mb-1">
                {language === "zh" ? "例: 10 B18 选择180天释放 (0%税)" : "Ex: 10 B18 with 180d release (0% tax)"}
              </div>
              <div className="font-mono text-xs">
                10 × (1 - 0%) = <span className="font-bold text-chart-2">10 B18</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 业绩奖励 vs 传统银行推荐奖励 */}
      {phase >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-4 bg-gradient-to-r from-[#F59E0B]/10 to-[#EC4899]/10 rounded-xl p-4 border border-[#F59E0B]/30 max-w-md w-full"
        >
          <div className="text-xs font-bold text-[#F59E0B] mb-2">{language === "zh" ? "业绩奖励 vs 传统银行推荐奖励" : "Performance Rewards vs Bank Referral Bonus"}</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-destructive/10 rounded-lg p-2 border border-destructive/20">
              <div className="font-bold text-destructive mb-1">{language === "zh" ? "银行推荐奖励" : "Bank Referral"}</div>
              <div className="text-muted-foreground">{language === "zh" ? "一次性固定金额(如$50)、仅直推、无深度" : "One-time fixed ($50), direct only, no depth"}</div>
            </div>
            <div className="bg-chart-2/10 rounded-lg p-2 border border-chart-2/20">
              <div className="font-bold text-chart-2 mb-1">{language === "zh" ? "B18业绩奖励" : "B18 Performance"}</div>
              <div className="text-muted-foreground">{language === "zh" ? "持续分红、多层深度(最低10%)、按比例分配" : "Ongoing dividends, multi-layer (min 10%), proportional"}</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
