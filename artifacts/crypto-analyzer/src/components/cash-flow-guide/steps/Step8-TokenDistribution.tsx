import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Coins, FileText, Flame, Gift, Shield, ArrowRight } from "lucide-react";
import { InfoCard } from "../components/FlowElements";
import { COLORS, MOBILE_LAYOUT } from "../animations/constants";

interface StepProps {
  phase: number;
  language: string;
}

const distributions = [
  { percent: 50, label: "交付合约", labelEn: "Delivery", icon: FileText, color: "#10B981" },
  { percent: 20, label: "销毁", labelEn: "Burn", icon: Flame, color: "#EF4444" },
  { percent: 20, label: "奖励池", labelEn: "Bonus", icon: Gift, color: "#F59E0B" },
  { percent: 10, label: "SPP", labelEn: "SPP", icon: Shield, color: "#3B82F6" },
];

export function Step8TokenDistribution({ phase, language }: StepProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const phase1Ref = useRef<HTMLDivElement>(null);
  const phase2Ref = useRef<HTMLDivElement>(null);
  const phase3Ref = useRef<HTMLDivElement>(null);
  const phase4Ref = useRef<HTMLDivElement>(null);
  const phase5Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refs = [null, phase1Ref, phase2Ref, phase3Ref, phase4Ref, phase5Ref];
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
          {language === "zh" ? "代币分配" : "Token Distribution"}
        </h2>
        <p className="text-muted-foreground text-sm lg:text-base">
          {language === "zh"
            ? "兑付的B18代币按比例分配到四个方向"
            : "Redeemed B18 tokens distributed to four destinations"}
        </p>
      </motion.div>

      {/* 移动端使用卡片列表布局 */}
      <div className={MOBILE_LAYOUT.content}>
        {/* 中心代币池 */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex justify-center mb-10"
        >
          <div className="w-20 h-20 lg:w-28 lg:h-28 rounded-full bg-gradient-to-br from-[#10B981] to-[#10B981]/70 flex flex-col items-center justify-center shadow-xl">
            <Coins className="h-6 w-6 lg:h-8 lg:w-8 text-white mb-1" />
            <span className="text-white font-bold text-sm lg:text-base">960 B18</span>
          </div>
        </motion.div>

        {/* 向下箭头 */}
        <div className="flex justify-center mb-4">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <ArrowRight className="h-6 w-6 rotate-90 text-muted-foreground" />
          </motion.div>
        </div>

        {/* 分配卡片 - 移动端2列，桌面端4列 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4"
        >
          {distributions.map((dist, index) => (
            <motion.div
              key={dist.label}
              ref={index === 0 ? phase1Ref : index === 1 ? phase2Ref : index === 2 ? phase3Ref : phase4Ref}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={phase >= index + 1 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0.3, y: 0, scale: 0.95 }}
              transition={{ delay: index * 0.15 }}
              className="relative rounded-xl p-4 text-center"
              style={{
                background: `linear-gradient(135deg, ${dist.color}15, ${dist.color}08)`,
                border: `2px solid ${dist.color}50`,
              }}
            >
              {/* 百分比标签 */}
              <div
                className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg"
                style={{ background: dist.color }}
              >
                {dist.percent}%
              </div>

              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2"
                style={{ backgroundColor: `${dist.color}20` }}
              >
                <dist.icon className="h-6 w-6" style={{ color: dist.color }} />
              </div>

              <div className="font-bold text-sm" style={{ color: dist.color }}>
                {language === "zh" ? dist.label : dist.labelEn}
              </div>

              {phase >= index + 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-2"
                >
                  <div className="font-mono font-bold text-sm" style={{ color: dist.color }}>
                    {(960 * dist.percent / 100).toFixed(0)} B18
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {index === 0 && (language === "zh" ? "回归储备供应新单" : "Return to reserves")}
                    {index === 1 && (language === "zh" ? "永久移除减少供应" : "Permanently removed")}
                    {index === 2 && (language === "zh" ? "分配给业绩达标用户" : "Distributed to qualified")}
                    {index === 3 && (language === "zh" ? "价格稳定储备" : "Price stabilization")}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* 代币分配 vs 传统银行利润分配 */}
        {phase >= 4 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-6 bg-card rounded-xl p-4 border"
          >
            <div className="text-xs font-bold mb-2 text-center">{language === "zh" ? "B18分配 vs 传统银行利润分配" : "B18 Distribution vs Traditional Bank Profit"}</div>
            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
              <div className="bg-destructive/10 rounded-lg p-2 border border-destructive/20">
                <div className="font-bold text-destructive mb-1">{language === "zh" ? "传统银行" : "Traditional Bank"}</div>
                <div className="text-muted-foreground">{language === "zh" ? "利润不透明、管理费高昂(1-2%)、股东优先" : "Opaque profit, high fees (1-2%), shareholders first"}</div>
              </div>
              <div className="bg-chart-2/10 rounded-lg p-2 border border-chart-2/20">
                <div className="font-bold text-chart-2 mb-1">{language === "zh" ? "B18透明分配" : "B18 Transparent Distribution"}</div>
                <div className="text-muted-foreground">{language === "zh" ? "50/20/20/10链上可查，20%销毁回馈持有者" : "50/20/20/10 on-chain verifiable, 20% burned for holders"}</div>
              </div>
            </div>
            <div className="text-center text-[10px] text-muted-foreground">
              {language === "zh"
                ? "每一笔分配都在链上可查，20%直接销毁减少供应，长期推动币价上涨"
                : "Every distribution is on-chain verifiable, 20% burned to reduce supply, supporting long-term price growth"}
            </div>
          </motion.div>
        )}

        {/* 白皮书核心机制 */}
        {phase >= 5 && (
          <motion.div
            ref={phase5Ref}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="mt-4 bg-primary/10 rounded-xl p-4 border border-primary/30"
          >
            <div className="text-sm font-bold text-primary mb-3">{language === "zh" ? "B4626 代币经济学" : "B4626 Tokenomics"}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-background/60 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <FileText className="h-3 w-3 text-[#10B981]" />
                  <span className="font-bold text-[#10B981]">{language === "zh" ? "交付合约" : "Delivery"}</span>
                </div>
                <div className="text-muted-foreground">{language === "zh" ? "循环供应新用户认购，系统自持续运行" : "Recycled for new subscriptions"}</div>
              </div>
              <div className="bg-background/60 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Flame className="h-3 w-3 text-[#EF4444]" />
                  <span className="font-bold text-[#EF4444]">{language === "zh" ? "永久销毁" : "Burn"}</span>
                </div>
                <div className="text-muted-foreground">{language === "zh" ? "目标从1010万通缩至100万" : "Target: 10.1M → 1M supply"}</div>
              </div>
              <div className="bg-background/60 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Gift className="h-3 w-3 text-[#F59E0B]" />
                  <span className="font-bold text-[#F59E0B]">{language === "zh" ? "奖励池" : "Bonus Pool"}</span>
                </div>
                <div className="text-muted-foreground">{language === "zh" ? "等级+业绩奖励分发" : "Tier + performance rewards"}</div>
              </div>
              <div className="bg-background/60 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Shield className="h-3 w-3 text-[#3B82F6]" />
                  <span className="font-bold text-[#3B82F6]">SPP</span>
                </div>
                <div className="text-muted-foreground">{language === "zh" ? "智能价格稳定储备池" : "Smart Price Stabilizer"}</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
