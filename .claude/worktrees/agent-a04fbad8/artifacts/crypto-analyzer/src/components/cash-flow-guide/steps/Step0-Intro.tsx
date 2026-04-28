import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Landmark, Coins, Shield, Zap, ArrowRight, Code, Building2, Sparkles } from "lucide-react";
import { InfoCard } from "../components/FlowElements";
import { COLORS, SPRING_CONFIG, MOBILE_LAYOUT } from "../animations/constants";

interface StepProps {
  phase: number;
  language: string;
}

export function Step0Intro({ phase, language }: StepProps) {
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
      {/* 主标题 - B18 品牌展示 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...SPRING_CONFIG.bouncy }}
        className={MOBILE_LAYOUT.header}
      >
        <motion.div
          className="inline-flex items-center justify-center w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br from-[#10B981] via-[#3B82F6] to-[#8B5CF6] shadow-2xl mb-4"
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(16, 185, 129, 0)",
              "0 0 40px 10px rgba(16, 185, 129, 0.3)",
              "0 0 0 0 rgba(16, 185, 129, 0)",
            ],
          }}
          transition={{ repeat: Infinity, duration: 3 }}
        >
          <motion.span
            className="text-4xl lg:text-5xl font-bold text-white"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            B18
          </motion.span>
        </motion.div>
        <h1 className="text-3xl lg:text-5xl font-bold mb-2 bg-gradient-to-r from-[#10B981] via-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
          B4626 Protocol
        </h1>
        <p className="text-muted-foreground text-sm lg:text-base">
          {language === "zh"
            ? "区块链原生数字银行清算协议"
            : "Blockchain-Native Digital Banking Protocol"}
        </p>
      </motion.div>

      <div className={MOBILE_LAYOUT.content}>
        {/* B18 = B4626 解释 */}
        {phase >= 1 && (
          <motion.div
            ref={phase1Ref}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`bg-gradient-to-r from-[#10B981]/10 to-[#3B82F6]/10 rounded-2xl p-5 border border-[#10B981]/30 ${MOBILE_LAYOUT.sectionGap}`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#10B981]/20 flex items-center justify-center">
                <Code className="h-6 w-6 text-[#10B981]" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{language === "zh" ? "为什么叫 B18?" : "Why B18?"}</h3>
                <p className="text-sm text-muted-foreground">B4626 → 4+6+2+6 = 18</p>
              </div>
            </div>

            {/* 数字拆解动画 */}
            <div className="flex items-center justify-center gap-2 lg:gap-4 mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <div className="text-2xl lg:text-3xl font-bold text-[#10B981]">B</div>
                <div className="text-[10px] text-muted-foreground">{language === "zh" ? "银行" : "Bank"}</div>
              </motion.div>
              {[4, 6, 2, 6].map((num, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.4 + i * 0.15, type: "spring" }}
                  className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg bg-primary/20 flex items-center justify-center"
                >
                  <span className="text-xl lg:text-2xl font-bold text-primary">{num}</span>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-xl lg:text-2xl font-bold text-muted-foreground"
              >=</motion.div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.1, type: "spring", stiffness: 200 }}
                className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-[#10B981] to-[#3B82F6] flex items-center justify-center"
              >
                <span className="text-xl lg:text-2xl font-bold text-white">18</span>
              </motion.div>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              {language === "zh"
                ? "灵感来自以太坊 ERC-4626 代币化金库标准，创新应用于数字银行清算"
                : "Inspired by Ethereum ERC-4626 Tokenized Vault Standard, innovatively applied to digital banking"}
            </div>
          </motion.div>
        )}

        {/* 核心理念：代币化银行 */}
        {phase >= 2 && (
          <motion.div
            ref={phase2Ref}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`grid grid-cols-1 gap-4 ${MOBILE_LAYOUT.sectionGap}`}
          >
            {/* 传统银行 */}
            <div className="bg-destructive/5 rounded-xl p-4 border border-destructive/20">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-5 w-5 text-destructive" />
                <span className="font-bold text-destructive">{language === "zh" ? "传统银行" : "Traditional Bank"}</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-destructive">✗</span>
                  <span>{language === "zh" ? "中心化运营，规则不透明" : "Centralized, opaque rules"}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">✗</span>
                  <span>{language === "zh" ? "存款准备金仅10%，挤兑风险" : "10% reserve ratio, bank run risk"}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">✗</span>
                  <span>{language === "zh" ? "利率极低，通胀侵蚀购买力" : "Low rates, inflation erodes value"}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">✗</span>
                  <span>{language === "zh" ? "跨境转账慢且费用高" : "Slow & expensive cross-border"}</span>
                </li>
              </ul>
            </div>

            {/* B18 协议 */}
            <div className="bg-chart-2/5 rounded-xl p-4 border border-chart-2/20">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-chart-2" />
                <span className="font-bold text-chart-2">{language === "zh" ? "B18 协议" : "B18 Protocol"}</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-chart-2">✓</span>
                  <span>{language === "zh" ? "智能合约自动执行，规则透明" : "Smart contract automation, transparent"}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-chart-2">✓</span>
                  <span>{language === "zh" ? "50%国库+50% LP，334全额保障" : "50% Treasury + 50% LP, 334 full protection"}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-chart-2">✓</span>
                  <span>{language === "zh" ? "时间银行高收益，通缩机制" : "Time Bank high yield, deflationary"}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-chart-2">✓</span>
                  <span>{language === "zh" ? "链上即时清算，全球无边界" : "On-chain instant settlement, borderless"}</span>
                </li>
              </ul>
            </div>
          </motion.div>
        )}

        {/* B4626 协议四大支柱 */}
        {phase >= 3 && (
          <motion.div
            ref={phase3Ref}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={MOBILE_LAYOUT.sectionGap}
          >
            <h3 className="text-center font-bold text-lg mb-4">
              {language === "zh" ? "B4626 协议四大支柱" : "Four Pillars of B4626"}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  icon: Landmark,
                  title: language === "zh" ? "时间银行" : "Time Bank",
                  desc: language === "zh" ? "质押生息复利增长" : "Stake for compound interest",
                  color: "#10B981",
                },
                {
                  icon: Shield,
                  title: language === "zh" ? "SPP 稳定池" : "SPP Stabilizer",
                  desc: language === "zh" ? "双向调控价格稳定" : "Bidirectional price control",
                  color: "#3B82F6",
                },
                {
                  icon: Coins,
                  title: language === "zh" ? "国库兑付" : "Treasury Redemption",
                  desc: language === "zh" ? "334机制全额保障" : "334 mechanism full coverage",
                  color: "#8B5CF6",
                },
                {
                  icon: Zap,
                  title: language === "zh" ? "通缩引擎" : "Deflation Engine",
                  desc: language === "zh" ? "20%销毁推动价值" : "20% burn drives value",
                  color: "#F59E0B",
                },
              ].map((pillar, i) => (
                <motion.div
                  key={pillar.title}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="bg-card rounded-xl p-4 border text-center hover:shadow-lg transition-shadow"
                >
                  <div
                    className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center"
                    style={{ backgroundColor: `${pillar.color}20` }}
                  >
                    <pillar.icon className="h-6 w-6" style={{ color: pillar.color }} />
                  </div>
                  <div className="font-bold text-sm" style={{ color: pillar.color }}>
                    {pillar.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">{pillar.desc}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 系统流程预览 */}
        {phase >= 4 && (
          <motion.div
            ref={phase4Ref}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-primary/5 rounded-xl p-4 border border-primary/20"
          >
            <h3 className="text-center font-bold text-primary mb-4">
              {language === "zh" ? "接下来您将了解..." : "Coming Up Next..."}
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              {[
                language === "zh" ? "三种参与方式" : "Ways to Join",
                language === "zh" ? "LP配对机制" : "LP Pairing",
                language === "zh" ? "时间银行质押" : "Time Staking",
                language === "zh" ? "释放与税收" : "Release & Tax",
                language === "zh" ? "SPP价格稳定" : "SPP Stability",
                language === "zh" ? "国库兑付" : "Redemption",
                language === "zh" ? "代币分配" : "Distribution",
                language === "zh" ? "334补位" : "334 Protocol",
                language === "zh" ? "等级收益" : "Tier Rewards",
                language === "zh" ? "业绩奖励" : "Performance",
              ].map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                  className="flex items-center gap-1"
                >
                  <span className="bg-primary/20 text-primary px-2 py-1 rounded-full">{item}</span>
                  {i < 9 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                </motion.div>
              ))}
            </div>
            <div className="text-center mt-4 text-sm text-muted-foreground">
              {language === "zh"
                ? "点击或滑动继续，开始深入了解 B4626 协议"
                : "Click or swipe to continue exploring B4626 Protocol"}
            </div>
          </motion.div>
        )}
      </div>

    </div>
  );
}
