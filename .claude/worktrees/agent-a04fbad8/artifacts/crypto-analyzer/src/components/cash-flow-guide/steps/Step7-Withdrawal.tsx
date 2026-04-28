import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Wallet, Building2, ArrowRight, Clock, DollarSign, Shield, CheckCircle, FileCode } from "lucide-react";
import { ContractBox, InfoCard } from "../components/FlowElements";
import { COLORS, MOBILE_LAYOUT } from "../animations/constants";

interface StepProps {
  phase: number;
  language: string;
}

export function Step7Withdrawal({ phase, language }: StepProps) {
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
        <div className="inline-flex items-center gap-2 bg-chart-2/10 rounded-full px-4 py-1 mb-3">
          <Shield className="h-4 w-4 text-chart-2" />
          <span className="text-xs font-bold text-chart-2">{language === "zh" ? "有序清算 · 确保可提" : "Orderly Settlement · Guaranteed Withdrawal"}</span>
        </div>
        <h2 className="text-2xl lg:text-4xl font-bold mb-2">
          {language === "zh" ? "释放提现" : "Release Withdrawal"}
        </h2>
        <p className="text-muted-foreground text-sm lg:text-base">
          {language === "zh"
            ? "智能合约按市价兑付，分批有序释放到钱包 — 正规金融应有的风控"
            : "Smart contract redeems at market price, orderly batch release — proper financial risk control"}
        </p>
      </motion.div>

      {/* 流程图 */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10">
        {/* 用户B18 */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex flex-col items-center"
        >
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-gradient-to-br from-[#10B981] to-[#10B981]/70 flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">B18</span>
          </div>
          <span className="text-xs text-muted-foreground mt-2">10 B18</span>
        </motion.div>

        {/* 箭头 */}
        {phase >= 1 && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            className="flex items-center"
          >
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </motion.div>
        )}

        {/* 国库兑付 */}
        {phase >= 1 && (
          <motion.div
            ref={phase1Ref}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <ContractBox
              icon={<Building2 className="h-full w-full" />}
              label={language === "zh" ? "国库兑付" : "Treasury"}
              sublabel="@ $102"
              color={COLORS.treasury}
              size="md"
              isActive={phase === 1}
            />
          </motion.div>
        )}

        {/* 箭头 */}
        {phase >= 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </motion.div>
        )}

        {/* 分批释放 */}
        {phase >= 2 && (
          <motion.div
            ref={phase2Ref}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
            className="flex flex-col items-center"
          >
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    delay: 0.4 + i * 0.12,
                    type: "spring",
                    stiffness: 300,
                    damping: 15,
                  }}
                  className="w-6 h-6 rounded-full bg-[#2775CA] flex items-center justify-center text-white text-[10px] font-bold"
                >
                  <motion.span
                    animate={{ y: [0, -2, 0] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.15 }}
                  >
                    $
                  </motion.span>
                </motion.div>
              ))}
              <motion.span
                className="text-xs text-muted-foreground ml-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                ...
              </motion.span>
            </div>
            <motion.div
              className="flex items-center gap-1 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              >
                <Clock className="h-3 w-3 text-muted-foreground" />
              </motion.div>
              <span className="text-xs text-muted-foreground">
                {language === "zh" ? "分7天释放" : "7-day release"}
              </span>
            </motion.div>
          </motion.div>
        )}

        {/* 用户钱包 */}
        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
          >
            <ContractBox
              icon={<Wallet className="h-full w-full" />}
              label={language === "zh" ? "用户钱包" : "Wallet"}
              sublabel="$918"
              color={COLORS.user}
              size="md"
              isActive={phase === 3}
            />
          </motion.div>
        )}
      </div>

      {/* 计算明细 */}
      {phase >= 3 && (
        <motion.div
          ref={phase3Ref}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-8 bg-card rounded-xl p-4 lg:p-6 border max-w-md w-full"
        >
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-5 w-5 text-chart-2" />
            <span className="font-bold">{language === "zh" ? "兑付计算 (7天释放)" : "Redemption Calc (7-day)"}</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{language === "zh" ? "释放B18" : "B18 Released"}</span>
              <span className="font-mono">10 B18</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{language === "zh" ? "市场价格" : "Market Price"}</span>
              <span className="font-mono">$102</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{language === "zh" ? "总价值" : "Gross Value"}</span>
              <span className="font-mono">$1,020</span>
            </div>
            <div className="flex justify-between text-destructive">
              <span>{language === "zh" ? "税收扣除 (10%)" : "Tax Deduction (10%)"}</span>
              <span className="font-mono">-$102</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">{language === "zh" ? "实际到账" : "Net USDC"}</span>
              <span className="font-mono font-bold text-chart-2">$918</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{language === "zh" ? "每日释放" : "Daily"}</span>
              <span className="font-mono">$131.14/day × 7d</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* B18释放模式差异化优势 */}
      {phase >= 4 && (
        <motion.div
          ref={phase4Ref}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-6 w-full max-w-md"
        >
          <div className="bg-gradient-to-br from-chart-2/10 to-primary/10 rounded-2xl p-4 border border-chart-2/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-chart-2/20 flex items-center justify-center">
                <Shield className="h-6 w-6 text-chart-2" />
              </div>
              <div>
                <div className="text-base font-bold text-chart-2">
                  {language === "zh" ? "B18 释放模式差异化" : "B18 Release Model Advantage"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {language === "zh" ? "国库兑付 vs 传统LP变现" : "Treasury Redemption vs Traditional LP Selling"}
                </div>
              </div>
            </div>

            {/* 核心对比 */}
            <div className="grid grid-cols-1 gap-3 mb-4">
              {/* 传统模式 */}
              <div className="bg-destructive/10 rounded-xl p-3 border border-destructive/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-destructive/20 flex items-center justify-center">
                    <span className="text-destructive text-sm font-bold">✕</span>
                  </div>
                  <span className="text-sm font-bold text-destructive">
                    {language === "zh" ? "传统DeFi模式" : "Traditional DeFi"}
                  </span>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-destructive shrink-0">✕</span>
                    <span>{language === "zh" ? "质押释放代币在LP池变现" : "Sell released tokens in LP pool"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive shrink-0">✕</span>
                    <span>{language === "zh" ? "大量卖出压低代币价格" : "Mass selling depresses token price"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive shrink-0">✕</span>
                    <span>{language === "zh" ? "价格下跌引发恐慌抛售，死亡螺旋" : "Price drop triggers panic selling, death spiral"}</span>
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
                    {language === "zh" ? "B18 国库兑付模式" : "B18 Treasury Redemption"}
                  </span>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-chart-2 shrink-0">✓</span>
                    <span>{language === "zh" ? "国库直接兑付USDC，不在LP卖出" : "Treasury pays USDC directly, no LP selling"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-chart-2 shrink-0">✓</span>
                    <span>{language === "zh" ? "税收回购LP中的B18，推动币价上涨" : "Tax buys back B18 from LP, pushing price up"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-chart-2 shrink-0">✓</span>
                    <span>{language === "zh" ? "价格稳定上涨增强市场信心" : "Stable price rise boosts market confidence"}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 三重保障 */}
            <div className="bg-primary/10 rounded-xl p-3 border border-primary/30">
              <div className="text-sm font-bold text-primary mb-3 text-center">
                {language === "zh" ? "🛡️ 三重智能合约保障" : "🛡️ Triple Smart Contract Protection"}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/20 flex items-center justify-center mx-auto mb-1">
                    <Building2 className="h-5 w-5 text-[#8B5CF6]" />
                  </div>
                  <div className="font-bold text-[#8B5CF6]">{language === "zh" ? "国库" : "Treasury"}</div>
                  <div className="text-muted-foreground">{language === "zh" ? "100%兑付" : "100% Pay"}</div>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-lg bg-[#3B82F6]/20 flex items-center justify-center mx-auto mb-1">
                    <Shield className="h-5 w-5 text-[#3B82F6]" />
                  </div>
                  <div className="font-bold text-[#3B82F6]">SPP</div>
                  <div className="text-muted-foreground">{language === "zh" ? "价格稳定" : "Price Stable"}</div>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/20 flex items-center justify-center mx-auto mb-1">
                    <FileCode className="h-5 w-5 text-[#F59E0B]" />
                  </div>
                  <div className="font-bold text-[#F59E0B]">334</div>
                  <div className="text-muted-foreground">{language === "zh" ? "补位保障" : "Queue Fill"}</div>
                </div>
              </div>
              <div className="text-xs text-center text-primary mt-3 font-medium">
                {language === "zh"
                  ? "平衡现金流 · 币价稳定 · 提现安全"
                  : "Balance Cash Flow · Price Stability · Withdrawal Safety"}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
