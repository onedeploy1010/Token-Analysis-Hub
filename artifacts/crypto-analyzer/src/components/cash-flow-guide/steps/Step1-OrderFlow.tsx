import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Wallet, Building2, Droplets, DollarSign, FileText, ArrowRight, Equal, TrendingUp, Clock } from "lucide-react";
import { ContractBox, InfoCard, PercentBadge } from "../components/FlowElements";
import { COLORS, SPRING_CONFIG, MOBILE_LAYOUT } from "../animations/constants";

interface StepProps {
  phase: number;
  language: string;
}

export function Step1OrderFlow({ phase, language }: StepProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const phase1Ref = useRef<HTMLDivElement>(null);
  const phase2Ref = useRef<HTMLDivElement>(null);
  const phase3Ref = useRef<HTMLDivElement>(null);
  const phase4Ref = useRef<HTMLDivElement>(null);
  const phase5Ref = useRef<HTMLDivElement>(null);

  // 自动滚动到新显示的内容 - 滚动到屏幕顶部
  useEffect(() => {
    const refs = [null, phase1Ref, phase2Ref, phase3Ref, phase4Ref, phase5Ref];
    const targetRef = refs[phase];
    if (targetRef?.current && containerRef?.current) {
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
  // 三种参与B18的方式
  const participationModes = [
    {
      id: "secondary",
      icon: TrendingUp,
      color: "#10B981",
      titleZh: "二级市场购买",
      titleEn: "Secondary Market",
      descZh: "在DEX交易所直接购买B18代币",
      descEn: "Buy B18 directly on DEX exchange",
      detailZh: "价格由市场供需决定，可随时买卖",
      detailEn: "Price determined by market, trade anytime",
    },
    {
      id: "treasury",
      icon: Building2,
      color: "#8B5CF6",
      titleZh: "国库债券认购",
      titleEn: "Treasury Bond",
      descZh: "限量发行，100%进入国库储备",
      descEn: "Limited issuance, 100% to treasury reserve",
      detailZh: "更高安全性，用于兑付用户提现",
      detailEn: "Higher security, for user redemption",
    },
    {
      id: "lp",
      icon: Droplets,
      color: "#F59E0B",
      titleZh: "LP债券认购",
      titleEn: "LP Bond",
      descZh: "50%国库 + 50%配对LP流动性",
      descEn: "50% treasury + 50% paired LP",
      detailZh: "POL协议自持流动性，价格稳定核心",
      detailEn: "POL Protocol Owned Liquidity",
    },
  ];

  return (
    <div ref={containerRef} className={MOBILE_LAYOUT.container}>
      {/* 标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={MOBILE_LAYOUT.header}
      >
        <h2 className="text-2xl lg:text-4xl font-bold mb-2">
          {language === "zh" ? "参与B18的三种方式" : "Three Ways to Get B18"}
        </h2>
        <p className="text-muted-foreground text-sm lg:text-base">
          {language === "zh"
            ? "用户可通过二级市场、国库债券、LP债券三种方式获得B18"
            : "Get B18 through secondary market, treasury bonds, or LP bonds"}
        </p>
      </motion.div>

      {/* 三种参与方式 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`${MOBILE_LAYOUT.content} grid grid-cols-1 gap-4 ${MOBILE_LAYOUT.sectionGap}`}
      >
        {participationModes.map((mode, index) => (
          <motion.div
            key={mode.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.15 }}
            className={`rounded-2xl p-4 border-2 transition-all ${
              mode.id === "lp" ? "ring-2 ring-primary/50" : ""
            }`}
            style={{
              backgroundColor: `${mode.color}10`,
              borderColor: `${mode.color}40`,
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
                  {language === "zh" ? mode.titleZh : mode.titleEn}
                </div>
                <div className="text-xs text-muted-foreground">
                  {language === "zh" ? mode.descZh : mode.descEn}
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground bg-background/60 rounded-lg p-2">
              {language === "zh" ? mode.detailZh : mode.detailEn}
            </div>
            {mode.id === "lp" && (
              <div className="mt-2 text-xs text-primary font-medium text-center">
                {language === "zh" ? "👇 以下动画详解此模式" : "👇 Animation explains this mode"}
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* LP债券详解标题 */}
      {phase >= 1 && (
        <motion.div
          ref={phase1Ref}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <div className="inline-flex items-center gap-2 bg-[#F59E0B]/10 rounded-full px-4 py-2 border border-[#F59E0B]/30">
            <Droplets className="h-4 w-4 text-[#F59E0B]" />
            <span className="text-sm font-bold text-[#F59E0B]">
              {language === "zh" ? "LP债券认购流程" : "LP Bond Subscription Flow"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {language === "zh"
              ? "$1,000 USDC → 50%国库 + 50%配对LP"
              : "$1,000 USDC → 50% Treasury + 50% LP Pairing"}
          </p>
        </motion.div>
      )}

      {/* 主流程图 - LP债券详细流程 */}
      {phase >= 1 && (
        <div className={MOBILE_LAYOUT.content}>
          {/* 用户入单 */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ ...SPRING_CONFIG.wobbly, delay: 0.1 }}
            className="flex justify-center mb-6"
          >
            <motion.div
              className="bg-gradient-to-r from-primary/20 to-chart-2/20 rounded-2xl p-4 border-2 border-primary/30 flex items-center gap-4"
              whileHover={{ scale: 1.02, boxShadow: "0 10px 40px -10px rgba(0,0,0,0.2)" }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <motion.div
                className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              >
                <Wallet className="h-7 w-7 text-primary" />
              </motion.div>
              <div>
                <div className="text-sm text-muted-foreground">{language === "zh" ? "用户入单" : "User Order"}</div>
                <motion.div
                  className="text-2xl font-bold text-primary"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  $1,000 <span className="text-base">USDC</span>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          {/* 向下箭头 */}
          {phase >= 2 && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex justify-center mb-4"
          >
            <div className="flex flex-col items-center">
              <motion.div
                className="w-0.5 h-6 bg-gradient-to-b from-primary to-muted"
                initial={{ height: 0 }}
                animate={{ height: 24 }}
                transition={{ duration: 0.3 }}
              />
              <motion.div
                className="text-xs text-muted-foreground my-1"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                {language === "zh" ? "50% / 50% 分配" : "50% / 50% Split"}
              </motion.div>
              <div className="flex gap-8">
                <motion.div
                  className="w-0.5 h-6 bg-[#8B5CF6]"
                  initial={{ height: 0 }}
                  animate={{ height: 24 }}
                  transition={{ delay: 0.3 }}
                />
                <motion.div
                  className="w-0.5 h-6 bg-[#F59E0B]"
                  initial={{ height: 0 }}
                  animate={{ height: 24 }}
                  transition={{ delay: 0.3 }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* 两路分配 */}
        {phase >= 2 && (
          <div ref={phase2Ref} className={`grid grid-cols-1 gap-4 ${MOBILE_LAYOUT.sectionGap}`}>
            {/* 左: 国库 */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#8B5CF6]/10 rounded-2xl p-4 border border-[#8B5CF6]/30"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/20 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-[#8B5CF6]" />
                </div>
                <div>
                  <div className="text-lg font-bold text-[#8B5CF6]">{language === "zh" ? "国库" : "Treasury"}</div>
                  <div className="text-xs text-muted-foreground">50% = $500 USDC</div>
                </div>
                <PercentBadge value={50} color="#8B5CF6" />
              </div>

              {phase >= 3 && (
                <motion.div
                  ref={phase3Ref}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-background/60 rounded-xl p-3 space-y-2"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{language === "zh" ? "USDC变化" : "USDC Change"}</span>
                    <span className="font-mono font-bold text-chart-2">+$500</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {language === "zh"
                      ? "用于用户提现兑付B18代币时支付USDC"
                      : "Used to pay USDC when users redeem B18 tokens"}
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* 右: LP流动池 + 交付合约 */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#F59E0B]/10 rounded-2xl p-4 border border-[#F59E0B]/30"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/20 flex items-center justify-center">
                  <Droplets className="h-6 w-6 text-[#F59E0B]" />
                </div>
                <div>
                  <div className="text-lg font-bold text-[#F59E0B]">{language === "zh" ? "LP流动池" : "LP Pool"}</div>
                  <div className="text-xs text-muted-foreground">50% = $500 USDC + B18</div>
                </div>
                <PercentBadge value={50} color="#F59E0B" />
              </div>

              {phase >= 3 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-2"
                >
                  {/* USDC 进入 */}
                  <div className="bg-background/60 rounded-xl p-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">USDC</span>
                      <span className="font-mono font-bold text-chart-2">+$500</span>
                    </div>
                  </div>

                  {/* B18 从交付合约进入 */}
                  {phase >= 4 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#10B981]/10 rounded-xl p-3 border border-[#10B981]/30"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-[#10B981]" />
                        <span className="text-xs font-medium text-[#10B981]">{language === "zh" ? "交付合约拨出" : "From Delivery"}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">B18</span>
                        <span className="font-mono font-bold text-[#10B981]">+5 B18</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {language === "zh" ? "价值 $500 (按当前价格 $100)" : "Worth $500 (at $100 price)"}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </motion.div>
          </div>
        )}

        {/* B18国库差异化优势 */}
        {phase >= 4 && (
          <motion.div
            ref={phase4Ref}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-gradient-to-br from-[#8B5CF6]/10 to-primary/10 rounded-2xl p-4 border border-[#8B5CF6]/30 mb-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/20 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-[#8B5CF6]" />
              </div>
              <div>
                <div className="text-base font-bold text-[#8B5CF6]">
                  {language === "zh" ? "B18 国库差异化优势" : "B18 Treasury Advantage"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {language === "zh"
                    ? "全网唯一选择去中心国库权限的项目"
                    : "The only project with decentralized treasury"}
                </div>
              </div>
            </div>

            {/* 核心理念 */}
            <div className="bg-[#8B5CF6]/20 rounded-xl p-3 mb-4 text-center">
              <div className="text-base font-bold text-[#8B5CF6]">
                {language === "zh" ? "国库不属于任何人，只属于规则" : "Treasury belongs to no one, only to rules"}
              </div>
            </div>

            {/* 对比 */}
            <div className="grid grid-cols-1 gap-3">
              {/* 传统模式 */}
              <div className="bg-destructive/10 rounded-xl p-3 border border-destructive/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-destructive/20 flex items-center justify-center">
                    <span className="text-destructive text-sm font-bold">✕</span>
                  </div>
                  <span className="text-sm font-bold text-destructive">
                    {language === "zh" ? "传统模式" : "Traditional"}
                  </span>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-destructive shrink-0">✕</span>
                    <span>{language === "zh" ? "国库由团队或多签控制" : "Treasury controlled by team"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive shrink-0">✕</span>
                    <span>{language === "zh" ? "资金流向需「被解释」" : "Fund flow needs explanation"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive shrink-0">✕</span>
                    <span>{language === "zh" ? "规则之外仍有人为判断" : "Human judgment beyond rules"}</span>
                  </li>
                </ul>
              </div>

              {/* B18模式 */}
              <div className="bg-chart-2/10 rounded-xl p-3 border border-chart-2/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-chart-2/20 flex items-center justify-center">
                    <span className="text-chart-2 text-sm font-bold">✓</span>
                  </div>
                  <span className="text-sm font-bold text-chart-2">
                    {language === "zh" ? "B18 模式" : "B18 Model"}
                  </span>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-chart-2 shrink-0">✓</span>
                    <span>{language === "zh" ? "国库权限设计为不可干预" : "Treasury non-intervenable"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-chart-2 shrink-0">✓</span>
                    <span>{language === "zh" ? "资金仅依协议条件出金" : "Funds only per protocol rules"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-chart-2 shrink-0">✓</span>
                    <span>{language === "zh" ? "无后门、无黑盒、无例外" : "No backdoor, no blackbox"}</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {/* 账户变化汇总 */}
        {phase >= 5 && (
          <motion.div
            ref={phase5Ref}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-card rounded-xl p-4 border"
          >
            <div className="text-sm font-bold mb-3">{language === "zh" ? "📊 账户变化汇总" : "📊 Account Changes"}</div>
            {/* 账户变化 - 2x2网格 */}
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div className="bg-muted/30 rounded-lg p-2">
                <div className="text-xs text-muted-foreground">{language === "zh" ? "国库" : "Treasury"}</div>
                <div className="font-mono font-bold text-chart-2">+$500 USDC</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-2">
                <div className="text-xs text-muted-foreground">{language === "zh" ? "交付合约" : "Delivery"}</div>
                <div className="font-mono font-bold text-destructive">-5 B18</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-2">
                <div className="text-xs text-muted-foreground">LP USDC</div>
                <div className="font-mono font-bold text-chart-2">+$500</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-2">
                <div className="text-xs text-muted-foreground">LP B18</div>
                <div className="font-mono font-bold text-[#10B981]">+5</div>
              </div>
            </div>

            {/* 本金与利息计算 */}
            <div className="bg-gradient-to-r from-chart-2/10 to-primary/10 rounded-xl p-3 border border-chart-2/20">
              {/* 本金公式 */}
              <div className="text-center mb-3">
                <div className="text-xs text-muted-foreground mb-1">{language === "zh" ? "质押数量计算" : "Staking Amount"}</div>
                <div className="font-mono text-sm">
                  $1,000 ÷ $100 = <span className="font-bold text-primary">10 B18</span>
                </div>
              </div>

              {/* 利息对比 */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-background/60 rounded-lg p-2 text-center">
                  <div className="text-muted-foreground mb-1">{language === "zh" ? "购入时@$100" : "Buy@$100"}</div>
                  <div className="font-mono">日息 0.1 B18</div>
                  <div className="text-muted-foreground">= $10/天</div>
                </div>
                <div className="bg-chart-2/20 rounded-lg p-2 text-center border border-chart-2/30">
                  <div className="text-chart-2 mb-1">{language === "zh" ? "涨价后@$150" : "Rise@$150"}</div>
                  <div className="font-mono">日息 0.1 B18</div>
                  <div className="font-bold text-chart-2">= $15/天</div>
                </div>
              </div>

              {/* 早入场优势 */}
              <div className="flex items-center gap-2 mt-3 bg-chart-2/10 rounded-lg p-2">
                <TrendingUp className="h-4 w-4 text-chart-2 shrink-0" />
                <span className="text-xs text-chart-2">
                  {language === "zh" ? "低价入场双重优势：更多B18 + 涨价后利息更值钱" : "Buy low: More B18 + Higher interest value"}
                </span>
              </div>
            </div>
          </motion.div>
        )}
        </div>
      )}

    </div>
  );
}
