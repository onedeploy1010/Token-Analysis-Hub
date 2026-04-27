import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import {
  Landmark,
  Coins,
  ArrowRightLeft,
  Shield,
  Flame,
  Gift,
  FileText,
  TrendingUp,
  Clock,
  Users,
  Wallet,
  Globe,
  Cpu,
  CreditCard,
  Building2,
  Banknote,
  RefreshCw,
  Calculator,
  Layers
} from "lucide-react";
import { MOBILE_LAYOUT } from "../animations/constants";

interface StepProps {
  phase: number;
  language: string;
}

export function Step12Summary({ phase, language }: StepProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const phase1Ref = useRef<HTMLDivElement>(null);
  const phase2Ref = useRef<HTMLDivElement>(null);
  const phase3Ref = useRef<HTMLDivElement>(null);
  const phase4Ref = useRef<HTMLDivElement>(null);
  const phase5Ref = useRef<HTMLDivElement>(null);

  // 自动滚动到新显示的内容
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
        <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-1 mb-3">
          <span className="text-xs font-bold text-primary">On-chain Banking System</span>
        </div>
        <h2 className="text-2xl lg:text-4xl font-bold mb-2">
          {language === "zh" ? "B18 链上银行系统" : "B18 On-chain Banking"}
        </h2>
        <p className="text-muted-foreground text-sm lg:text-base max-w-2xl">
          {language === "zh"
            ? "为Web3构建可计息、可周期化、可清算、可对冲、可支付的完整金融基础设施"
            : "Complete financial infrastructure for Web3: Interest-bearing, Cyclical, Settleable, Hedgeable, Payable"}
        </p>
      </motion.div>

      <div className={`${MOBILE_LAYOUT.content} space-y-10`}>
        {/* B4626协议层说明 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-[#8B5CF6]/10 to-[#3B82F6]/10 rounded-2xl p-4 lg:p-6 border border-[#8B5CF6]/30"
        >
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-5 w-5 text-[#8B5CF6]" />
            <h3 className="font-bold text-[#8B5CF6]">{language === "zh" ? "B4626 底层银行协议层" : "B4626 BankFi Protocol Layer"}</h3>
          </div>

          <p className="text-xs text-muted-foreground mb-4">
            {language === "zh"
              ? "B4626是对ERC-4626的银行化重构，提供计息、周期、清算与支付接口。B18 = B4626 (4+6+2+6=18)"
              : "B4626 is a bank-oriented reconstruction of ERC-4626, providing interest, cycle, settlement & payment interfaces."}
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            <div className="bg-background/60 rounded-lg p-2 text-center">
              <Calculator className="h-4 w-4 text-[#10B981] mx-auto mb-1" />
              <div className="text-[11px] font-bold">{language === "zh" ? "计息系统" : "Exposure"}</div>
            </div>
            <div className="bg-background/60 rounded-lg p-2 text-center">
              <Clock className="h-4 w-4 text-[#3B82F6] mx-auto mb-1" />
              <div className="text-[11px] font-bold">{language === "zh" ? "周期结构" : "Cycle"}</div>
            </div>
            <div className="bg-background/60 rounded-lg p-2 text-center">
              <RefreshCw className="h-4 w-4 text-[#F59E0B] mx-auto mb-1" />
              <div className="text-[11px] font-bold">{language === "zh" ? "自动兑付" : "Settlement"}</div>
            </div>
            <div className="bg-background/60 rounded-lg p-2 text-center">
              <Shield className="h-4 w-4 text-[#8B5CF6] mx-auto mb-1" />
              <div className="text-[11px] font-bold">{language === "zh" ? "储备体系" : "Treasury+SPP"}</div>
            </div>
            <div className="bg-background/60 rounded-lg p-2 text-center">
              <CreditCard className="h-4 w-4 text-[#EC4899] mx-auto mb-1" />
              <div className="text-[11px] font-bold">{language === "zh" ? "支付系统" : "UCard"}</div>
            </div>
          </div>
        </motion.div>

        {/* 代币模型 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl p-4 lg:p-6 border"
        >
          <div className="flex items-center gap-2 mb-4">
            <Coins className="h-5 w-5 text-[#10B981]" />
            <h3 className="font-bold">{language === "zh" ? "B18代币模型" : "B18 Token Model"}</h3>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">{language === "zh" ? "公链" : "Chain"}</div>
              <div className="font-bold text-primary">BASE</div>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">{language === "zh" ? "总量" : "Total Supply"}</div>
              <div className="font-bold">10,100,000</div>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">{language === "zh" ? "通缩目标" : "Deflation Target"}</div>
              <div className="font-bold text-chart-4">1,000,000</div>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">{language === "zh" ? "永不增发" : "No Inflation"}</div>
              <div className="font-bold text-chart-2">100%</div>
            </div>
          </div>
        </motion.div>

        {/* Time Bank三大产品 */}
        {phase >= 1 && (
          <motion.div
            ref={phase1Ref}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card rounded-2xl p-4 lg:p-6 border"
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-[#8B5CF6]" />
              <h3 className="font-bold">{language === "zh" ? "Time Bank 时间银行三大产品" : "Time Bank Three Products"}</h3>
            </div>

            <div className="grid grid-cols-1 grid-cols-1 gap-4">
              <div className="bg-[#2775CA]/10 rounded-xl p-4 border border-[#2775CA]/30">
                <div className="flex items-center gap-2 mb-2">
                  <Landmark className="h-5 w-5 text-[#2775CA]" />
                  <span className="font-bold text-[#2775CA]">{language === "zh" ? "国库债券" : "Treasury Bond"}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === "zh"
                    ? "币价调控时限量发售，赋予B18生态服务准备金储备"
                    : "Limited issuance for price regulation, providing reserve for B18 ecosystem"}
                </p>
                <div className="mt-2">
                  <span className="text-[11px] bg-[#2775CA]/20 rounded px-2 py-0.5">{language === "zh" ? "限量发售" : "Limited Issue"}</span>
                </div>
              </div>

              <div className="bg-[#F59E0B]/10 rounded-xl p-4 border border-[#F59E0B]/30">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRightLeft className="h-5 w-5 text-[#F59E0B]" />
                  <span className="font-bold text-[#F59E0B]">{language === "zh" ? "LP债券 (POL)" : "LP Bond (POL)"}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === "zh"
                    ? "协议自持流动性 Protocol Owned Liquidity，价格稳定核心"
                    : "Protocol Owned Liquidity, core of price stability"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-[11px] bg-[#F59E0B]/20 rounded px-2 py-0.5">30d: 0.5%</span>
                  <span className="text-[11px] bg-[#F59E0B]/20 rounded px-2 py-0.5">90d: 0.7%</span>
                  <span className="text-[11px] bg-[#F59E0B]/20 rounded px-2 py-0.5">180d: 1.0%</span>
                  <span className="text-[11px] bg-[#F59E0B]/20 rounded px-2 py-0.5">360d: 1.2%</span>
                </div>
              </div>

              <div className="bg-[#10B981]/10 rounded-xl p-4 border border-[#10B981]/30">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="h-5 w-5 text-[#10B981]" />
                  <span className="font-bold text-[#10B981]">{language === "zh" ? "B18质押" : "B18 Staking"}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === "zh"
                    ? "二级市场购买B18代币进行质押，享受时间计息复利"
                    : "Buy B18 from secondary market to stake, earn compound interest"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-[11px] bg-[#10B981]/20 rounded px-2 py-0.5">30d: 0.5%</span>
                  <span className="text-[11px] bg-[#10B981]/20 rounded px-2 py-0.5">90d: 0.7%</span>
                  <span className="text-[11px] bg-[#10B981]/20 rounded px-2 py-0.5">180d: 1.0%</span>
                  <span className="text-[11px] bg-[#10B981]/20 rounded px-2 py-0.5">360d: 1.2%</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 代币流转分配 */}
        {phase >= 2 && (
          <motion.div
            ref={phase2Ref}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-card rounded-2xl p-4 lg:p-6 border"
          >
            <div className="flex items-center gap-2 mb-4">
              <ArrowRightLeft className="h-5 w-5 text-[#F59E0B]" />
              <h3 className="font-bold">{language === "zh" ? "代币流转分配 (50/20/20/10)" : "Token Distribution (50/20/20/10)"}</h3>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-[#10B981]/10 rounded-xl p-3 text-center border border-[#10B981]/30">
                <FileText className="h-6 w-6 text-[#10B981] mx-auto mb-1" />
                <div className="text-lg font-bold text-[#10B981]">50%</div>
                <div className="text-xs">{language === "zh" ? "交付合约" : "Delivery"}</div>
              </div>
              <div className="bg-[#EF4444]/10 rounded-xl p-3 text-center border border-[#EF4444]/30">
                <Flame className="h-6 w-6 text-[#EF4444] mx-auto mb-1" />
                <div className="text-lg font-bold text-[#EF4444]">20%</div>
                <div className="text-xs">{language === "zh" ? "销毁" : "Burn"}</div>
              </div>
              <div className="bg-[#F59E0B]/10 rounded-xl p-3 text-center border border-[#F59E0B]/30">
                <Gift className="h-6 w-6 text-[#F59E0B] mx-auto mb-1" />
                <div className="text-lg font-bold text-[#F59E0B]">20%</div>
                <div className="text-xs">{language === "zh" ? "奖金池" : "Bonus Pool"}</div>
              </div>
              <div className="bg-[#3B82F6]/10 rounded-xl p-3 text-center border border-[#3B82F6]/30">
                <Shield className="h-6 w-6 text-[#3B82F6] mx-auto mb-1" />
                <div className="text-lg font-bold text-[#3B82F6]">10%</div>
                <div className="text-xs">SPP</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 334补位机制 + 等级收益 */}
        {phase >= 3 && (
          <div ref={phase3Ref} className="grid grid-cols-1 grid-cols-1 gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-[#F97316]/10 rounded-xl p-4 border border-[#F97316]/30"
            >
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-[#F97316]" />
                <span className="font-bold text-[#F97316]">{language === "zh" ? "334补位机制" : "334 Queue Protocol"}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {language === "zh"
                  ? "不是收益分配机制，而是挤兑防守排队机制"
                  : "Not profit distribution, but bank run defense queue mechanism"}
              </p>
              <div className="flex gap-2 text-xs">
                <span className="bg-[#8B5CF6]/20 rounded px-2 py-1">{language === "zh" ? "国库40%" : "Treasury 40%"}</span>
                <span className="bg-[#10B981]/20 rounded px-2 py-1">{language === "zh" ? "静态30%" : "Static 30%"}</span>
                <span className="bg-[#F59E0B]/20 rounded px-2 py-1">{language === "zh" ? "动态30%" : "Dynamic 30%"}</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 }}
              className="bg-[#EC4899]/10 rounded-xl p-4 border border-[#EC4899]/30"
            >
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-[#EC4899]" />
                <span className="font-bold text-[#EC4899]">{language === "zh" ? "等级收益 V1-V10" : "Tier Rewards V1-V10"}</span>
              </div>
              <div className="grid grid-cols-5 gap-1 text-center text-[11px]">
                {[
                  { v: "V1", u: "2万", p: "10%" },
                  { v: "V2", u: "5万", p: "20%" },
                  { v: "V3", u: "10万", p: "30%" },
                  { v: "V4", u: "30万", p: "40%" },
                  { v: "V5", u: "100万", p: "50%" },
                ].map((t) => (
                  <div key={t.v} className="bg-[#EC4899]/20 rounded p-1">
                    <div className="font-bold">{t.v}</div>
                    <div className="text-muted-foreground">{language === "zh" ? t.u : t.u.replace("万", "0K")}</div>
                    <div className="text-[#EC4899]">{t.p}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-1 text-center text-[11px] mt-1">
                {[
                  { v: "V6", u: "250万", p: "60%" },
                  { v: "V7", u: "500万", p: "70%" },
                  { v: "V8", u: "1000万", p: "80%" },
                  { v: "V9", u: "2000万", p: "90%" },
                  { v: "V10", u: "5000万", p: "100%" },
                ].map((t) => (
                  <div key={t.v} className="bg-[#EC4899]/20 rounded p-1">
                    <div className="font-bold">{t.v}</div>
                    <div className="text-muted-foreground">{language === "zh" ? t.u : t.u.replace("万", "0K")}</div>
                    <div className="text-[#EC4899]">{t.p}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* 业绩奖励系统 */}
        {phase >= 4 && (
          <motion.div
            ref={phase4Ref}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95 }}
            className="bg-[#F59E0B]/10 rounded-2xl p-4 lg:p-6 border border-[#F59E0B]/30"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-[#F59E0B]" />
              <h3 className="font-bold text-[#F59E0B]">{language === "zh" ? "业绩奖励系统" : "Performance Rewards System"}</h3>
            </div>

            {/* 计算公式 */}
            <div className="bg-background/60 rounded-xl p-3 mb-4">
              <div className="text-center mb-2">
                <span className="text-xs font-bold text-[#F59E0B]">{language === "zh" ? "层级奖励公式" : "Layer Reward Formula"}</span>
              </div>
              <div className="text-center font-mono text-xs bg-[#F59E0B]/10 rounded-lg p-2">
                {language === "zh"
                  ? "你的小区业绩 / 该层全网小区业绩 × 奖金池 × 层级%"
                  : "Your Branch / Global Branch × Bonus Pool × Layer%"}
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-1 text-[11px]">
                <span className="bg-[#F59E0B]/20 rounded px-1.5 py-0.5">{language === "zh" ? "第1层100%" : "L1:100%"}</span>
                <span className="bg-[#F59E0B]/20 rounded px-1.5 py-0.5">{language === "zh" ? "第2层98%" : "L2:98%"}</span>
                <span className="bg-[#F59E0B]/20 rounded px-1.5 py-0.5">{language === "zh" ? "第3层96%" : "L3:96%"}</span>
                <span className="text-muted-foreground">...</span>
                <span className="bg-[#F59E0B]/20 rounded px-1.5 py-0.5">{language === "zh" ? "递减至10%" : "→10%"}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 grid-cols-1 gap-4">
              <div className="bg-background/60 rounded-xl p-3">
                <div className="font-bold text-sm mb-2">{language === "zh" ? "直推奖励" : "Direct Referral"}</div>
                <p className="text-xs text-muted-foreground mb-2">
                  {language === "zh"
                    ? "第一层下级(直推)业绩占比 × 奖金池 × 100%"
                    : "Layer 1 (direct) branch share × Bonus Pool × 100%"}
                </p>
              </div>

              <div className="bg-background/60 rounded-xl p-3">
                <div className="font-bold text-sm mb-2">{language === "zh" ? "深度奖励" : "Depth Rewards"}</div>
                <p className="text-xs text-muted-foreground mb-2">
                  {language === "zh"
                    ? "每层按占比分配，层级越深比例递减2%至最低10%"
                    : "Each layer by share, decreasing 2% per layer to min 10%"}
                </p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[#F59E0B]/20 text-xs text-muted-foreground">
              {language === "zh"
                ? "* 业绩奖励来源于奖金池 (20%)，按各层小区业绩占全网该层业绩的比例分配"
                : "* Performance rewards from Bonus Pool (20%), distributed by branch performance ratio per layer"}
            </div>
          </motion.div>
        )}

        {/* B18 = 传统银行最佳实践 + 区块链创新 */}
        {phase >= 5 && (
          <motion.div
            ref={phase5Ref}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="bg-gradient-to-r from-chart-2/10 to-primary/10 rounded-2xl p-4 lg:p-6 border border-chart-2/30"
          >
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-chart-2" />
              <h3 className="font-bold text-chart-2">{language === "zh" ? "B18 = 传统银行最佳实践 + 区块链创新" : "B18 = Traditional Banking Best Practices + Blockchain Innovation"}</h3>
            </div>

            {/* 综合对比表 */}
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-1">{language === "zh" ? "维度" : "Dimension"}</th>
                    <th className="text-left py-2 px-1 text-destructive">{language === "zh" ? "传统银行" : "Traditional"}</th>
                    <th className="text-left py-2 px-1 text-chart-2">{language === "zh" ? "B18" : "B18"}</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-muted/30">
                    <td className="py-1.5 px-1 font-bold">{language === "zh" ? "准备金率" : "Reserve"}</td>
                    <td className="py-1.5 px-1">{language === "zh" ? "10%部分准备金" : "10% fractional"}</td>
                    <td className="py-1.5 px-1 text-chart-2">{language === "zh" ? "50%国库储备" : "50% treasury"}</td>
                  </tr>
                  <tr className="border-b border-muted/30">
                    <td className="py-1.5 px-1 font-bold">{language === "zh" ? "存款保险" : "Insurance"}</td>
                    <td className="py-1.5 px-1">{language === "zh" ? "限额25万美元" : "$250K limit"}</td>
                    <td className="py-1.5 px-1 text-chart-2">{language === "zh" ? "334全额保障" : "334 full coverage"}</td>
                  </tr>
                  <tr className="border-b border-muted/30">
                    <td className="py-1.5 px-1 font-bold">{language === "zh" ? "透明度" : "Transparency"}</td>
                    <td className="py-1.5 px-1">{language === "zh" ? "季报、可修饰" : "Quarterly, editable"}</td>
                    <td className="py-1.5 px-1 text-chart-2">{language === "zh" ? "链上实时可查" : "On-chain real-time"}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-1 font-bold">{language === "zh" ? "执行" : "Execution"}</td>
                    <td className="py-1.5 px-1">{language === "zh" ? "人工、可拒绝" : "Manual, can reject"}</td>
                    <td className="py-1.5 px-1 text-chart-2">{language === "zh" ? "智能合约自动" : "Smart contract auto"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-primary/10 rounded-xl p-3 text-center">
              <div className="text-sm font-bold text-primary mb-1">
                {language === "zh" ? "🔒 B4626协议 = 完整链上银行基础设施" : "🔒 B4626 Protocol = Complete On-chain Banking Infrastructure"}
              </div>
              <p className="text-xs text-muted-foreground">
                {language === "zh"
                  ? "计息、周期、兑付、储备、支付 — 为Web3构建可计息、可周期化、可清算、可对冲、可支付的完整金融基础设施"
                  : "Interest, Cycle, Settlement, Reserve, Payment — Building complete financial infrastructure for Web3: Interest-bearing, Cyclical, Settleable, Hedgeable, Payable"}
              </p>
            </div>
          </motion.div>
        )}

        {/* 未来扩展 */}
        {phase >= 5 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            className="bg-gradient-to-r from-primary/10 to-chart-4/10 rounded-2xl p-4 lg:p-6 border"
          >
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="font-bold">{language === "zh" ? "B18未来扩展性" : "B18 Future Expansion"}</h3>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="text-center p-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="text-xs font-bold">{language === "zh" ? "x402合规桥接" : "x402 Compliance"}</div>
              </div>
              <div className="text-center p-2">
                <div className="w-10 h-10 rounded-full bg-chart-2/20 flex items-center justify-center mx-auto mb-2">
                  <Landmark className="h-5 w-5 text-chart-2" />
                </div>
                <div className="text-xs font-bold">{language === "zh" ? "RWA回收模型" : "RWA Model"}</div>
              </div>
              <div className="text-center p-2">
                <div className="w-10 h-10 rounded-full bg-chart-4/20 flex items-center justify-center mx-auto mb-2">
                  <Cpu className="h-5 w-5 text-chart-4" />
                </div>
                <div className="text-xs font-bold">{language === "zh" ? "AI理财代理" : "AI Agent"}</div>
              </div>
              <div className="text-center p-2">
                <div className="w-10 h-10 rounded-full bg-[#EC4899]/20 flex items-center justify-center mx-auto mb-2">
                  <CreditCard className="h-5 w-5 text-[#EC4899]" />
                </div>
                <div className="text-xs font-bold">{language === "zh" ? "UCard支付" : "UCard Pay"}</div>
              </div>
              <div className="text-center p-2">
                <div className="w-10 h-10 rounded-full bg-[#F59E0B]/20 flex items-center justify-center mx-auto mb-2">
                  <Building2 className="h-5 w-5 text-[#F59E0B]" />
                </div>
                <div className="text-xs font-bold">{language === "zh" ? "BankFi输出" : "BankFi Output"}</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
