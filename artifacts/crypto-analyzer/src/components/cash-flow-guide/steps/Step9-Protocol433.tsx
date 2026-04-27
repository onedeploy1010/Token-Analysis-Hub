import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { AlertTriangle, Building2, Zap, Users, Clock, ArrowDown, ListOrdered, Shield, Landmark, FileCode, CheckCircle } from "lucide-react";
import { InfoCard } from "../components/FlowElements";
import { COLORS, MOBILE_LAYOUT } from "../animations/constants";

interface StepProps {
  phase: number;
  language: string;
}

export function Step9Protocol433({ phase, language }: StepProps) {
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
        <div className="inline-flex items-center gap-2 bg-destructive/10 rounded-full px-4 py-1 mb-3">
          <Shield className="h-4 w-4 text-destructive" />
          <span className="text-xs font-bold text-destructive">{language === "zh" ? "正规金融风控机制" : "Standard Financial Risk Control"}</span>
        </div>
        <h2 className="text-2xl lg:text-4xl font-bold mb-2">
          {language === "zh" ? "334稳定补位机制" : "334 Queue Protocol"}
        </h2>
        <p className="text-muted-foreground text-sm lg:text-base">
          {language === "zh"
            ? "挤兑防守排队机制：正规银行都有的清算规则，确保每一分钱都能有序提取"
            : "Bank run defense: Standard settlement rules that ensure every dollar can be withdrawn orderly"}
        </p>
      </motion.div>

      {/* 334机制 vs 存款保险制度 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-r from-destructive/10 to-warning/10 rounded-2xl p-4 border border-destructive/30 mb-4 max-w-2xl w-full"
      >
        <div className="flex items-center gap-2 mb-3">
          <Landmark className="h-5 w-5 text-destructive" />
          <span className="font-bold text-destructive">{language === "zh" ? "334机制 vs 存款保险制度 (FDIC)" : "334 Mechanism vs Deposit Insurance (FDIC)"}</span>
        </div>

        <div className="bg-background/60 rounded-xl p-3 mb-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-warning">{language === "zh" ? "2023年硅谷银行案例：" : "2023 SVB Case: "}</span>
              <span className="text-muted-foreground">
                {language === "zh"
                  ? "FDIC仅保障25万美元以下存款。SVB 90%存款超过限额无保障，引发恐慌性挤兑导致48小时内倒闭。"
                  : "FDIC only insures deposits under $250K. 90% of SVB deposits exceeded limit with no protection, causing panic bank run and collapse in 48 hours."}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-destructive/10 rounded-lg p-2">
            <div className="font-bold text-destructive mb-1">{language === "zh" ? "存款保险局限性" : "Deposit Insurance Limits"}</div>
            <div className="text-muted-foreground">{language === "zh" ? "限额保障(25万)、事后补救、漫长理赔" : "Limited ($250K), post-hoc remedy, slow claims"}</div>
          </div>
          <div className="bg-chart-2/10 rounded-lg p-2">
            <div className="font-bold text-chart-2 mb-1">{language === "zh" ? "B18 334全额保障" : "B18 334 Full Protection"}</div>
            <div className="text-muted-foreground">{language === "zh" ? "三方分担、实时响应、全额保障无上限" : "Triple burden share, real-time, full protection no limit"}</div>
          </div>
        </div>
      </motion.div>

      {/* 触发条件 */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="flex items-center gap-4 mb-10"
      >
        <motion.div
          className="bg-destructive/10 rounded-xl p-4 text-center border border-destructive/30"
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          whileHover={{ scale: 1.05 }}
        >
          <div className="text-sm text-muted-foreground mb-1">{language === "zh" ? "当日提现" : "Withdrawals"}</div>
          <motion.div
            className="text-2xl font-bold text-destructive"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            $50,000
          </motion.div>
        </motion.div>
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 10, -10, 0],
          }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        >
          <AlertTriangle className="h-8 w-8 text-warning" />
        </motion.div>
        <motion.div
          className="bg-chart-2/10 rounded-xl p-4 text-center border border-chart-2/30"
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          whileHover={{ scale: 1.05 }}
        >
          <div className="text-sm text-muted-foreground mb-1">{language === "zh" ? "当日入单" : "Deposits"}</div>
          <div className="text-2xl font-bold text-chart-2">$30,000</div>
        </motion.div>
      </motion.div>

      {/* 启动协议 */}
      {phase >= 1 && (
        <motion.div
          ref={phase1Ref}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-warning/10 rounded-xl p-4 border border-warning/30 mb-10 max-w-md w-full"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <span className="font-bold text-warning">{language === "zh" ? "334补位启动" : "334 Protocol Active"}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {language === "zh"
              ? "提现需求超过入单收入，启动334分担机制 + 倒序赎回排队"
              : "Withdrawal exceeds deposits, 334 burden sharing + LIFO queue activated"}
          </p>
        </motion.div>
      )}

      {/* 三方分担 */}
      {phase >= 2 && (
        <motion.div
          ref={phase2Ref}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-4 mb-10 max-w-lg w-full"
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-[#8B5CF6]/10 rounded-xl p-4 text-center border-2 border-[#8B5CF6]/50"
          >
            <Building2 className="h-8 w-8 text-[#8B5CF6] mx-auto mb-2" />
            <div className="text-2xl font-bold text-[#8B5CF6]">40%</div>
            <div className="text-xs font-medium">{language === "zh" ? "国库" : "Treasury"}</div>
            <div className="text-xs text-muted-foreground mt-1">$20,000</div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-chart-2/10 rounded-xl p-4 text-center border-2 border-chart-2/50"
          >
            <Zap className="h-8 w-8 text-chart-2 mx-auto mb-2" />
            <div className="text-2xl font-bold text-chart-2">30%</div>
            <div className="text-xs font-medium">{language === "zh" ? "静态奖励" : "Static"}</div>
            <div className="text-xs text-muted-foreground mt-1">$15,000</div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-chart-4/10 rounded-xl p-4 text-center border-2 border-chart-4/50"
          >
            <Users className="h-8 w-8 text-chart-4 mx-auto mb-2" />
            <div className="text-2xl font-bold text-chart-4">30%</div>
            <div className="text-xs font-medium">{language === "zh" ? "动态奖励" : "Dynamic"}</div>
            <div className="text-xs text-muted-foreground mt-1">$15,000</div>
          </motion.div>
        </motion.div>
      )}

      {/* 排队机制 */}
      {phase >= 3 && (
        <motion.div
          ref={phase3Ref}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-card rounded-xl p-4 border max-w-md w-full"
        >
          <div className="flex items-center gap-2 mb-3">
            <ListOrdered className="h-5 w-5 text-chart-1" />
            <span className="font-bold">{language === "zh" ? "提现排队" : "Withdrawal Queue"}</span>
          </div>

          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.9 + i * 0.1 }}
                className="flex items-center justify-between bg-muted/30 rounded-lg p-2"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                    {i}
                  </span>
                  <span className="text-sm">{language === "zh" ? `用户${String.fromCharCode(64 + i)}` : `User ${String.fromCharCode(64 + i)}`}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">${(15000 - i * 3000).toLocaleString()}</span>
                  <Clock className="h-3 w-3 text-muted-foreground" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 恢复流程 */}
      {phase >= 4 && (
        <motion.div
          ref={phase4Ref}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-4 text-center"
        >
          <div className="inline-flex items-center gap-2 bg-chart-2/10 rounded-full px-4 py-2 border border-chart-2/30">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            >
              <Clock className="h-4 w-4 text-chart-2" />
            </motion.div>
            <span className="text-sm font-medium text-chart-2">
              {language === "zh" ? "现金流恢复后倒序赎回" : "LIFO redemption when cash flow recovers"}
            </span>
          </div>
        </motion.div>
      )}

      {/* 倒序赎回示意 - LIFO动画 */}
      {phase >= 5 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="mt-4 bg-card rounded-xl p-4 border max-w-md w-full"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold">{language === "zh" ? "LIFO 倒序赎回" : "LIFO Redemption Order"}</span>
            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">{language === "zh" ? "后进先出" : "Last In First Out"}</span>
          </div>

          <div className="relative">
            {/* 排队顺序 */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="text-xs text-muted-foreground">{language === "zh" ? "排队" : "Queue"}:</div>
              <motion.div
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0 }}
              >1</motion.div>
              <motion.div
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0.3 }}
              >2</motion.div>
              <motion.div
                className="w-8 h-8 rounded-full bg-chart-2 flex items-center justify-center text-xs font-bold text-white"
                animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >3</motion.div>
              <div className="text-xs text-muted-foreground">{language === "zh" ? "最后" : "Last"}</div>
            </div>

            {/* 赎回动画 */}
            <div className="flex items-center justify-center gap-2">
              <div className="text-xs text-chart-2 font-medium">{language === "zh" ? "优先赎回" : "Redeem First"}:</div>
              <motion.div
                className="flex items-center gap-1"
                initial={{ x: 0 }}
                animate={{ x: [0, 20, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <motion.div
                  className="w-8 h-8 rounded-full bg-chart-2 flex items-center justify-center text-xs font-bold text-white shadow-lg"
                  animate={{
                    boxShadow: ["0 0 0 0 rgba(34, 197, 94, 0)", "0 0 15px 5px rgba(34, 197, 94, 0.4)", "0 0 0 0 rgba(34, 197, 94, 0)"]
                  }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >3</motion.div>
                <ArrowDown className="h-4 w-4 text-chart-2 rotate-[-90deg]" />
                <span className="text-xs text-chart-2 font-mono">$12,000</span>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 智能合约安全保障 */}
      {phase >= 5 && (
        <motion.div
          ref={phase5Ref}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
          className="mt-4 bg-gradient-to-r from-primary/10 to-chart-2/10 rounded-xl p-4 border border-primary/30 max-w-lg w-full"
        >
          <div className="flex items-center gap-2 mb-3">
            <FileCode className="h-5 w-5 text-primary" />
            <span className="font-bold text-primary">{language === "zh" ? "智能合约自动执行" : "Smart Contract Auto-Execution"}</span>
          </div>

          <div className="text-xs space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-chart-2 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-chart-2">{language === "zh" ? "无人工干预：" : "No Human Intervention: "}</span>
                <span className="text-muted-foreground">
                  {language === "zh"
                    ? "所有规则由智能合约自动执行，避免人为操作风险"
                    : "All rules auto-executed by smart contract, eliminating human operation risks"}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-chart-2 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-chart-2">{language === "zh" ? "透明可验证：" : "Transparent & Verifiable: "}</span>
                <span className="text-muted-foreground">
                  {language === "zh"
                    ? "所有交易记录链上可查，用户可实时验证资金安全"
                    : "All transactions on-chain verifiable, users can verify fund safety in real-time"}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-chart-2 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-chart-2">{language === "zh" ? "确保可提取：" : "Guaranteed Withdrawal: "}</span>
                <span className="text-muted-foreground">
                  {language === "zh"
                    ? "在金融中获利固然重要，但确保资金能安全提取才是核心保障"
                    : "Making profit is important, but ensuring safe withdrawal is the core guarantee"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-primary/20 text-center">
            <span className="text-[11px] text-primary font-medium">
              {language === "zh"
                ? "🔒 B18：正规金融风控 + 区块链透明性 = 真正安全的数字银行"
                : "🔒 B18: Standard Finance Risk Control + Blockchain Transparency = Truly Safe Digital Bank"}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
