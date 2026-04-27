import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Lock, Clock, Percent, TrendingUp } from "lucide-react";
import { ContractBox, InfoCard } from "../components/FlowElements";
import { COLORS, SPRING_CONFIG, STAGGER_CONTAINER, STAGGER_ITEM, MOBILE_LAYOUT } from "../animations/constants";

interface StepProps {
  phase: number;
  language: string;
}

// 日利率与系统参数一致: 30天0.5%, 90天0.7%, 180天1.0%, 360天1.2%
const stakingOptions = [
  { days: 360, rate: 1.2, color: "#10B981" },
  { days: 180, rate: 1.0, color: "#3B82F6" },
  { days: 90, rate: 0.7, color: "#8B5CF6" },
  { days: 30, rate: 0.5, color: "#F59E0B" },
];

export function Step3Staking({ phase, language }: StepProps) {
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
          {language === "zh" ? "时间银行质押" : "Time Bank Staking"}
        </h2>
        <p className="text-muted-foreground text-sm lg:text-base">
          {language === "zh"
            ? "B4626时间计息引擎：选择质押周期，享受复利收益"
            : "B4626 Time Interest Engine: Choose staking period for compound returns"}
        </p>
      </motion.div>

      {/* 流程图 */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">
        {/* B18代币 */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...SPRING_CONFIG.wobbly, duration: 0.8 }}
          className="relative"
        >
          <motion.div
            className="w-20 h-20 lg:w-28 lg:h-28 rounded-full bg-gradient-to-br from-[#10B981] to-[#10B981]/70 flex items-center justify-center shadow-lg"
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          >
            <motion.span
              className="text-3xl lg:text-4xl font-bold text-white"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              B18
            </motion.span>
          </motion.div>
          {phase >= 1 && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...SPRING_CONFIG.bouncy, delay: 0.4 }}
              className="absolute -right-4 top-1/2 -translate-y-1/2"
            >
              <motion.div
                className="w-8 h-8 rounded-full bg-chart-2 flex items-center justify-center"
                animate={{ scale: [1, 1.2, 1], boxShadow: ["0 0 0 0 rgba(34,197,94,0.4)", "0 0 0 10px rgba(34,197,94,0)", "0 0 0 0 rgba(34,197,94,0)"] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <TrendingUp className="h-4 w-4 text-white" />
              </motion.div>
            </motion.div>
          )}
        </motion.div>

        {/* 箭头 */}
        {phase >= 1 && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center"
          >
            <div className="w-12 lg:w-20 h-0.5 bg-gradient-to-r from-[#10B981] to-chart-2" />
            <div className="w-0 h-0 border-t-4 border-b-4 border-l-8 border-transparent border-l-chart-2" />
          </motion.div>
        )}

        {/* 质押合约 */}
        {phase >= 1 && (
          <motion.div
            ref={phase1Ref}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ContractBox
              icon={<Lock className="h-full w-full" />}
              label={language === "zh" ? "质押合约" : "Staking"}
              sublabel={language === "zh" ? "用户锁仓" : "User Lock"}
              color={COLORS.b18}
              size="lg"
              isActive={phase >= 1}
            />
          </motion.div>
        )}
      </div>

      {/* 质押选项 */}
      {phase >= 2 && (
        <motion.div
          ref={phase2Ref}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, ...SPRING_CONFIG.gentle }}
          className="mt-8 lg:mt-12"
        >
          <motion.h3
            className="text-center text-sm lg:text-base font-semibold mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {language === "zh" ? "选择质押周期" : "Choose Staking Period"}
          </motion.h3>
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4"
            variants={STAGGER_CONTAINER}
            initial="hidden"
            animate="visible"
          >
            {stakingOptions.map((option, index) => (
              <motion.div
                key={option.days}
                variants={STAGGER_ITEM}
                whileHover={{ scale: 1.08, y: -4, boxShadow: "0 12px 24px -8px rgba(0,0,0,0.15)" }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="bg-card rounded-xl p-4 border-2 cursor-pointer"
                style={{ borderColor: option.color + "40" }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ repeat: Infinity, duration: 10 + index * 2, ease: "linear" }}
                  >
                    <Clock className="h-4 w-4" style={{ color: option.color }} />
                  </motion.div>
                  <span className="font-bold text-lg" style={{ color: option.color }}>
                    {option.days}
                  </span>
                  <span className="text-xs text-muted-foreground">{language === "zh" ? "天" : "days"}</span>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Percent className="h-3 w-3 text-muted-foreground" />
                    <motion.span
                      className="text-xl font-bold"
                      style={{ color: option.color }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2, delay: index * 0.3 }}
                    >
                      {option.rate}%
                    </motion.span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {language === "zh" ? "日利率" : "Daily Rate"}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}

      {/* 锁仓倒计时示意 */}
      {phase >= 3 && (
        <motion.div
          ref={phase3Ref}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 bg-chart-2/10 rounded-xl p-4 lg:p-6 border border-chart-2/30"
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
              className="w-12 h-12 rounded-full border-4 border-chart-2 border-t-transparent flex items-center justify-center"
            >
              <Clock className="h-5 w-5 text-chart-2" />
            </motion.div>
            <div>
              <p className="font-bold text-chart-2">
                {language === "zh" ? "质押锁定中..." : "Staking Locked..."}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "zh" ? "每日产生B18利息收益" : "Daily B18 interest earnings"}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* 时间银行 vs 传统定期存款 */}
      {phase >= 4 && (
        <motion.div
          ref={phase4Ref}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-4 bg-primary/10 rounded-xl p-4 border border-primary/30 max-w-2xl w-full"
        >
          <div className="flex items-center gap-2 mb-3">
            <Lock className="h-4 w-4 text-primary" />
            <span className="font-bold text-primary text-sm">{language === "zh" ? "时间银行 vs 传统定期存款" : "Time Bank vs Traditional Fixed Deposit"}</span>
          </div>

          {/* 利率对比 */}
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="bg-destructive/10 rounded-lg p-2 border border-destructive/20">
              <div className="font-bold text-destructive mb-1">{language === "zh" ? "传统银行定期" : "Traditional Fixed"}</div>
              <div className="text-muted-foreground">{language === "zh" ? "年利率2-4%，提前支取罚息50%，单利计算" : "2-4% APY, 50% penalty for early withdrawal, simple interest"}</div>
            </div>
            <div className="bg-chart-2/10 rounded-lg p-2 border border-chart-2/20">
              <div className="font-bold text-chart-2 mb-1">{language === "zh" ? "B18时间银行" : "B18 Time Bank"}</div>
              <div className="text-muted-foreground">{language === "zh" ? "日利率0.5-1.2%，灵活释放选项，复利增长" : "0.5-1.2% daily, flexible release options, compound growth"}</div>
            </div>
          </div>

          {/* 税收扣除计算示例 */}
          <div className="pt-3 border-t border-primary/20">
            <div className="font-bold text-xs text-chart-4 mb-2">
              {language === "zh" ? "📊 税收机制 = 激励长期持有" : "📊 Tax Mechanism = Incentivize Long-term Holding"}
            </div>
            <div className="bg-background/60 rounded-lg p-2 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{language === "zh" ? "质押本金" : "Staked Principal"}</span>
                <span className="font-mono">100 B18</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{language === "zh" ? "日利率 × 30天" : "0.5% × 30 days"}</span>
                <span className="font-mono text-chart-2">+15 B18</span>
              </div>
              <div className="flex justify-between text-destructive">
                <span>{language === "zh" ? "释放税 (剩7天=10%)" : "Release Tax (7d left=10%)"}</span>
                <span className="font-mono">-1.5 B18</span>
              </div>
              <div className="border-t border-muted pt-1 flex justify-between font-bold">
                <span>{language === "zh" ? "实际到账" : "Net Received"}</span>
                <span className="font-mono text-primary">113.5 B18</span>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {language === "zh"
                ? "* 税收用于回购B18推动币价，持有越久税率越低"
                : "* Tax used for buyback, longer holding = lower tax rate"}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
