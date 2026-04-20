import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Coins,
  Landmark,
  TrendingUp,
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  Receipt,
  Droplets,
  FileText,
  Flame,
  Gift,
  Truck,
  Users,
  Layers,
  DollarSign,
  Sparkles,
  ArrowRight,
  ArrowDown,
} from "lucide-react";

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: string;
}

// 分页式说明弹窗的通用内容类型
interface HelpPage {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  content: React.ReactNode;
}

// 通用分页说明弹窗组件
function PaginatedHelpDialog({
  open,
  onOpenChange,
  language,
  dialogTitle,
  pages,
}: HelpDialogProps & {
  dialogTitle: string;
  pages: HelpPage[];
}) {
  const [currentPage, setCurrentPage] = useState(0);

  // 弹窗打开时重置到第一页
  useEffect(() => {
    if (open) setCurrentPage(0);
  }, [open]);

  const goNext = () => setCurrentPage((p) => Math.min(p + 1, pages.length - 1));
  const goPrev = () => setCurrentPage((p) => Math.max(p - 1, 0));

  const page = pages[currentPage];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {language === "zh" ? "使用说明" : "Help guide"}
          </DialogDescription>
        </DialogHeader>

        {/* 内容区域 - 带动画切换 */}
        <div className="min-h-[380px] relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="h-full"
            >
              {/* 顶部图标区域 */}
              <div className={`${page.iconBg} pt-8 pb-6 px-6 text-center relative overflow-hidden`}>
                {/* 背景装饰 */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-4 left-4 w-20 h-20 rounded-full bg-white/20 blur-2xl" />
                  <div className="absolute bottom-2 right-8 w-16 h-16 rounded-full bg-white/15 blur-xl" />
                </div>

                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className={`w-16 h-16 rounded-2xl ${page.iconColor} mx-auto flex items-center justify-center shadow-lg mb-4`}
                >
                  {page.icon}
                </motion.div>

                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.3 }}
                >
                  <h3 className="text-xl font-bold text-white mb-1">{page.title}</h3>
                  <p className="text-white/70 text-sm">{page.subtitle}</p>
                </motion.div>

                {/* 页码指示 */}
                <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="text-white text-xs font-medium">
                    {currentPage + 1} / {pages.length}
                  </span>
                </div>
              </div>

              {/* 内容区域 */}
              <div className="p-5 space-y-4">
                {page.content}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 底部导航 */}
        <div className="p-4 pt-0 flex gap-3 border-t border-border/30 bg-muted/20">
          {/* 进度点 */}
          <div className="flex items-center gap-1.5 px-2">
            {pages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPage(idx)}
                className={`rounded-full transition-all duration-300 ${
                  idx === currentPage
                    ? "w-6 h-2 bg-primary"
                    : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>

          <div className="flex-1 flex gap-2">
            {currentPage > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goPrev}
                className="h-10 px-3"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            {currentPage === pages.length - 1 ? (
              <Button
                size="sm"
                onClick={() => onOpenChange(false)}
                className="flex-1 h-10 text-sm font-semibold"
              >
                <Sparkles className="h-4 w-4 mr-1.5" />
                {language === "zh" ? "我知道了" : "Got it"}
              </Button>
            ) : (
              <Button size="sm" onClick={goNext} className="flex-1 h-10 text-sm font-semibold">
                {language === "zh" ? "继续" : "Next"}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ========== 质押说明弹窗 ==========
export function StakingHelpDialog({ open, onOpenChange, language }: HelpDialogProps) {
  const pages: HelpPage[] = [
    {
      icon: <Coins className="h-8 w-8 text-white" />,
      iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
      iconColor: "bg-white/20 backdrop-blur",
      title: language === "zh" ? "质押购买" : "Staking",
      subtitle: language === "zh" ? "一级市场质押规则" : "Primary market rules",
      content: (
        <div className="space-y-3">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <div className="text-xs text-muted-foreground mb-1">{language === "zh" ? "购买公式" : "Purchase Formula"}</div>
            <div className="font-mono text-sm font-bold text-center text-emerald-700 dark:text-emerald-400">
              B18 = USDC ÷ P
            </div>
            <div className="text-[10px] text-center text-muted-foreground mt-1">
              P = X / Y ({language === "zh" ? "LP池USDC/B18" : "LP USDC/B18"})
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-muted/50 rounded-xl text-center">
              <div className="text-xl font-bold text-emerald-600">0%</div>
              <div className="text-[10px] text-muted-foreground">{language === "zh" ? "滑点费用" : "Slippage"}</div>
            </div>
            <div className="p-2 bg-muted/50 rounded-xl text-center">
              <div className="text-xl font-bold text-primary">∞</div>
              <div className="text-[10px] text-muted-foreground">{language === "zh" ? "无限量" : "Unlimited"}</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: <Landmark className="h-8 w-8 text-white" />,
      iconBg: "bg-gradient-to-br from-blue-500 to-indigo-600",
      iconColor: "bg-white/20 backdrop-blur",
      title: language === "zh" ? "资金分配" : "Allocation",
      subtitle: language === "zh" ? "智能合约自动拆分" : "Smart contract auto-split",
      content: (
        <div className="space-y-3">
          {/* 流程图 */}
          <div className="flex flex-col items-center">
            <div className="px-4 py-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              USDC {language === "zh" ? "质押" : "Stake"}
            </div>
            <div className="w-px h-4 bg-border" />
            <ChevronDown className="h-4 w-4 text-muted-foreground -my-1" />
            <div className="w-px h-2 bg-border" />
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1 h-px bg-border" />
              <div className="w-2 h-2 rounded-full bg-primary" />
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="flex w-full gap-2 mt-2">
              <div className="flex-1 p-3 bg-blue-500/10 rounded-xl text-center border border-blue-500/20">
                <Landmark className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-blue-600">50%</div>
                <div className="text-xs">{language === "zh" ? "国库" : "Treasury"}</div>
              </div>
              <div className="flex-1 p-3 bg-indigo-500/10 rounded-xl text-center border border-indigo-500/20">
                <Droplets className="h-5 w-5 text-indigo-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-indigo-600">50%</div>
                <div className="text-xs">LP {language === "zh" ? "池" : "Pool"}</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-white" />,
      iconBg: "bg-gradient-to-br from-violet-500 to-purple-600",
      iconColor: "bg-white/20 backdrop-blur",
      title: language === "zh" ? "三种收益模式" : "Three Modes",
      subtitle: language === "zh" ? "选择适合的收益结构" : "Choose your return structure",
      content: (
        <div className="space-y-2">
          <div className="p-2 bg-violet-500/10 rounded-xl border border-violet-500/20">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded bg-violet-500 flex items-center justify-center text-white text-[10px] font-bold">1</div>
              <span className="font-semibold text-xs">{language === "zh" ? "等额本金" : "Amortizing"}</span>
            </div>
            <div className="font-mono text-[10px] text-center bg-muted/50 rounded p-1">
              {language === "zh" ? "每日 = P₀/T + P×r" : "Daily = P₀/T + P×r"}
            </div>
          </div>
          <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold">2</div>
              <span className="font-semibold text-xs">{language === "zh" ? "按期付息" : "Interest Only"}</span>
            </div>
            <div className="font-mono text-[10px] text-center bg-muted/50 rounded p-1">
              {language === "zh" ? "利息 = P₀×r, 本金到期释放" : "Interest = P₀×r, Principal at maturity"}
            </div>
          </div>
          <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded bg-purple-500 flex items-center justify-center text-white text-[10px] font-bold">3</div>
              <span className="font-semibold text-xs">{language === "zh" ? "复利滚存" : "Compound"}</span>
            </div>
            <div className="font-mono text-[10px] text-center bg-muted/50 rounded p-1">
              P = P₀×(1+r)^(T-1) + P₀×r
            </div>
            <div className="text-[9px] text-center text-muted-foreground mt-0.5">
              {language === "zh" ? "封顶: 180天593.74%, 360天3600%" : "Cap: 180d=593.74%, 360d=3600%"}
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: <Shield className="h-8 w-8 text-white" />,
      iconBg: "bg-gradient-to-br from-rose-500 to-pink-600",
      iconColor: "bg-white/20 backdrop-blur",
      title: language === "zh" ? "风险保护" : "Protection",
      subtitle: language === "zh" ? "433 内存保护机制" : "433 Protection Mechanism",
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-rose-500/10 rounded-xl text-center border border-rose-500/20">
              <div className="text-2xl font-bold text-rose-600">30%</div>
              <div className="text-xs text-muted-foreground">{language === "zh" ? "静态" : "Static"}</div>
            </div>
            <div className="p-3 bg-pink-500/10 rounded-xl text-center border border-pink-500/20">
              <div className="text-2xl font-bold text-pink-600">30%</div>
              <div className="text-xs text-muted-foreground">{language === "zh" ? "动态" : "Dynamic"}</div>
            </div>
            <div className="p-3 bg-fuchsia-500/10 rounded-xl text-center border border-fuchsia-500/20">
              <div className="text-2xl font-bold text-fuchsia-600">40%</div>
              <div className="text-xs text-muted-foreground">{language === "zh" ? "国库" : "Treasury"}</div>
            </div>
          </div>
          <div className="p-3 bg-muted/50 rounded-xl">
            <p className="text-xs text-muted-foreground text-center">
              {language === "zh" ? "LIFO 队列机制，优先保障早期质押者" : "LIFO queue prioritizes early stakers"}
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <PaginatedHelpDialog
      open={open}
      onOpenChange={onOpenChange}
      language={language}
      dialogTitle={language === "zh" ? "质押说明" : "Staking Guide"}
      pages={pages}
    />
  );
}

// ========== 释放提现说明弹窗 ==========
export function ReleaseHelpDialog({ open, onOpenChange, language }: HelpDialogProps) {
  const pages: HelpPage[] = [
    {
      icon: <Calendar className="h-8 w-8 text-white" />,
      iconBg: "bg-gradient-to-br from-cyan-500 to-blue-600",
      iconColor: "bg-white/20 backdrop-blur",
      title: language === "zh" ? "释放公式" : "Release Formula",
      subtitle: language === "zh" ? "三种模式的释放计算" : "Three mode calculations",
      content: (
        <div className="space-y-2">
          <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
            <div className="text-[10px] text-muted-foreground mb-1">{language === "zh" ? "等额本金每日释放" : "Amortizing Daily"}</div>
            <div className="font-mono text-xs font-bold text-center">
              {language === "zh" ? "释放 = (P₀/D + P×r) × (1-tax)" : "Release = (P₀/D + P×r) × (1-tax)"}
            </div>
          </div>
          <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <div className="text-[10px] text-muted-foreground mb-1">{language === "zh" ? "按期付息" : "Interest Only"}</div>
            <div className="font-mono text-xs font-bold text-center">
              {language === "zh" ? "利息 = P₀×r×(1-tax)/D" : "Interest = P₀×r×(1-tax)/D"}
            </div>
            <div className="text-[9px] text-center text-muted-foreground">{language === "zh" ? "本金到期后分D天释放" : "Principal released in D days after maturity"}</div>
          </div>
          <div className="p-2 bg-violet-500/10 rounded-xl border border-violet-500/20">
            <div className="text-[10px] text-muted-foreground mb-1">{language === "zh" ? "复利滚存" : "Compound"}</div>
            <div className="font-mono text-xs font-bold text-center">
              {language === "zh" ? "每日 = P_final×(1-tax)/D" : "Daily = P_final×(1-tax)/D"}
            </div>
            <div className="text-[9px] text-center text-muted-foreground">{language === "zh" ? "到期后才开始释放" : "Release starts after maturity"}</div>
          </div>
        </div>
      ),
    },
    {
      icon: <Receipt className="h-8 w-8 text-white" />,
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-600",
      iconColor: "bg-white/20 backdrop-blur",
      title: language === "zh" ? "税收结构" : "Tax Rates",
      subtitle: language === "zh" ? "仅针对利息部分缴税" : "Tax on interest only",
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-center border border-emerald-500/20">
              <div className="text-lg font-bold">30{language === "zh" ? "天" : "d"}</div>
              <div className="text-sm font-bold text-emerald-600">3%</div>
            </div>
            <div className="p-2 bg-amber-500/10 rounded-xl text-center border border-amber-500/20">
              <div className="text-lg font-bold">15{language === "zh" ? "天" : "d"}</div>
              <div className="text-sm font-bold text-amber-600">6%</div>
            </div>
            <div className="p-2 bg-orange-500/10 rounded-xl text-center border border-orange-500/20">
              <div className="text-lg font-bold">7{language === "zh" ? "天" : "d"}</div>
              <div className="text-sm font-bold text-orange-600">10%</div>
            </div>
            <div className="p-2 bg-red-500/10 rounded-xl text-center border border-red-500/20">
              <div className="text-lg font-bold">1{language === "zh" ? "天" : "d"}</div>
              <div className="text-sm font-bold text-red-600">20%</div>
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            {language === "zh" ? "释放周期越长，税率越低" : "Longer period = lower tax rate"}
          </p>
        </div>
      ),
    },
    {
      icon: <Landmark className="h-8 w-8 text-white" />,
      iconBg: "bg-gradient-to-br from-teal-500 to-cyan-600",
      iconColor: "bg-white/20 backdrop-blur",
      title: language === "zh" ? "税收USDC流向" : "Tax USDC Flow",
      subtitle: language === "zh" ? "全部用于LP回购B18" : "All used for LP buyback",
      content: (
        <div className="space-y-2">
          <div className="p-2 bg-teal-500/10 rounded-xl border border-teal-500/20">
            <div className="text-[10px] text-muted-foreground mb-1">{language === "zh" ? "LP买入公式 (含3%滑点)" : "LP Buy Formula (3% slip)"}</div>
            <div className="font-mono text-xs font-bold text-center">
              B18 = Y - k/(X + USDC×0.97)
            </div>
            <div className="text-[9px] text-center text-muted-foreground mt-1">k = X×Y, P = X/Y</div>
          </div>
          {/* 流程图 */}
          <div className="flex items-center justify-center gap-2">
            <div className="px-2 py-1.5 bg-amber-500/20 rounded-lg border border-amber-500/30 text-center">
              <div className="text-[10px] font-semibold">{language === "zh" ? "税USDC" : "Tax"}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="px-2 py-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30 text-center">
              <div className="text-[10px] font-semibold">LP</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="px-2 py-1.5 bg-emerald-500/20 rounded-lg border border-emerald-500/30 text-center">
              <div className="text-[10px] font-semibold">B18</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="px-2 py-1.5 bg-violet-500/20 rounded-lg border border-violet-500/30 text-center">
              <div className="text-[10px] font-semibold">SPP</div>
            </div>
          </div>
          <div className="text-[10px] text-center text-muted-foreground bg-muted/50 rounded-lg p-2">
            {language === "zh" ? "税收USDC 100% 去LP购买B18，B18全部进入SPP合约" : "100% tax USDC buys B18 from LP, all B18 goes to SPP"}
          </div>
        </div>
      ),
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-white" />,
      iconBg: "bg-gradient-to-br from-indigo-500 to-violet-600",
      iconColor: "bg-white/20 backdrop-blur",
      title: language === "zh" ? "B18 分配" : "Distribution",
      subtitle: language === "zh" ? "兑付 B18 按比例分配" : "Redeemed B18 distribution",
      content: (
        <div className="space-y-2">
          {/* 流程图 */}
          <div className="flex flex-col items-center">
            <div className="px-4 py-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-sm font-semibold text-indigo-700 dark:text-indigo-400">
              {language === "zh" ? "兑付 B18" : "Redeem B18"}
            </div>
            <div className="w-px h-3 bg-border" />
            <ChevronDown className="h-4 w-4 text-muted-foreground -my-1" />
            <div className="w-px h-2 bg-border" />
            {/* 分支线 */}
            <div className="relative w-full h-4">
              <div className="absolute top-0 left-1/2 w-[90%] -translate-x-1/2 h-px bg-border" />
              <div className="absolute top-0 left-[5%] w-px h-4 bg-border" />
              <div className="absolute top-0 left-[35%] w-px h-4 bg-border" />
              <div className="absolute top-0 left-[65%] w-px h-4 bg-border" />
              <div className="absolute top-0 right-[5%] w-px h-4 bg-border" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-center">
              <Truck className="h-4 w-4 text-indigo-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-indigo-600">50%</div>
              <div className="text-[10px]">{language === "zh" ? "交付" : "Delivery"}</div>
            </div>
            <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20 text-center">
              <Flame className="h-4 w-4 text-red-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-red-600">20%</div>
              <div className="text-[10px]">{language === "zh" ? "销毁" : "Burn"}</div>
            </div>
            <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-center">
              <Gift className="h-4 w-4 text-amber-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-amber-600">20%</div>
              <div className="text-[10px]">{language === "zh" ? "奖金" : "Bonus"}</div>
            </div>
            <div className="p-2 bg-violet-500/10 rounded-xl border border-violet-500/20 text-center">
              <Shield className="h-4 w-4 text-violet-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-violet-600">10%</div>
              <div className="text-[10px]">SPP</div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <PaginatedHelpDialog
      open={open}
      onOpenChange={onOpenChange}
      language={language}
      dialogTitle={language === "zh" ? "释放说明" : "Release Guide"}
      pages={pages}
    />
  );
}

// ========== 二级市场说明弹窗 ==========
export function SecondaryMarketHelpDialog({ open, onOpenChange, language }: HelpDialogProps) {
  const pages: HelpPage[] = [
    {
      icon: <Droplets className="h-8 w-8 text-white" />,
      iconBg: "bg-gradient-to-br from-sky-500 to-blue-600",
      iconColor: "bg-white/20 backdrop-blur",
      title: language === "zh" ? "AMM 定价公式" : "AMM Formula",
      subtitle: language === "zh" ? "恒定乘积自动做市" : "Constant product market maker",
      content: (
        <div className="space-y-2">
          <div className="p-3 bg-sky-500/10 rounded-xl border border-sky-500/20">
            <div className="text-xs text-muted-foreground mb-1 text-center">{language === "zh" ? "核心公式" : "Core Formula"}</div>
            <div className="text-xl font-bold font-mono text-sky-600 text-center">k = X × Y</div>
            <div className="text-[10px] text-center text-muted-foreground mt-1">
              X = USDC, Y = B18, P = X/Y
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <div className="text-[10px] text-muted-foreground mb-1">{language === "zh" ? "买入B18" : "Buy B18"}</div>
              <div className="font-mono text-[10px] font-bold text-center">
                ΔY = Y - k/(X+ΔX×0.97)
              </div>
            </div>
            <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20">
              <div className="text-[10px] text-muted-foreground mb-1">{language === "zh" ? "卖出B18" : "Sell B18"}</div>
              <div className="font-mono text-[10px] font-bold text-center">
                ΔX = X - k/(Y+ΔY×0.97)
              </div>
            </div>
          </div>
          <div className="text-[10px] text-center text-muted-foreground bg-muted/50 rounded-lg p-2">
            {language === "zh" ? "滑点 3%: 实际成交 = 输入 × 0.97" : "3% slip: effective = input × 0.97"}
          </div>
        </div>
      ),
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-white" />,
      iconBg: "bg-gradient-to-br from-purple-500 to-indigo-600",
      iconColor: "bg-white/20 backdrop-blur",
      title: language === "zh" ? "价格影响" : "Price Impact",
      subtitle: language === "zh" ? "买卖对币价的影响" : "How trading affects price",
      content: (
        <div className="space-y-3">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <span className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">{language === "zh" ? "买入 = 价格上涨" : "Buy = Price Up"}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {language === "zh"
                ? "USDC进入LP池，B18流出，X增加Y减少，P=X/Y上升"
                : "USDC enters LP, B18 exits, X↑ Y↓, P=X/Y rises"}
            </div>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-rose-600 rotate-180" />
              <span className="font-semibold text-sm text-rose-700 dark:text-rose-400">{language === "zh" ? "卖出 = 价格下跌" : "Sell = Price Down"}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {language === "zh"
                ? "B18进入LP池，USDC流出，Y增加X减少，P=X/Y下降"
                : "B18 enters LP, USDC exits, Y↑ X↓, P=X/Y drops"}
            </div>
          </div>
          <div className="text-[10px] text-center text-muted-foreground bg-muted/50 rounded-lg p-2">
            {language === "zh" ? "3%滑点费留在LP池中，不做额外分配" : "3% slippage stays in LP pool, no extra distribution"}
          </div>
        </div>
      ),
    },
    {
      icon: <Shield className="h-8 w-8 text-white" />,
      iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
      iconColor: "bg-white/20 backdrop-blur",
      title: language === "zh" ? "SPP 护盘" : "SPP Shield",
      subtitle: language === "zh" ? "主动调节市场稳定" : "Active market stabilization",
      content: (
        <div className="space-y-3">
          {/* 市场过热流程 */}
          <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-rose-600" />
              <span className="font-semibold text-sm text-rose-700 dark:text-rose-400">{language === "zh" ? "价格过高" : "Price High"}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs">
              <span className="px-2 py-1 bg-rose-500/20 rounded-lg">SPP</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="px-2 py-1 bg-muted rounded-lg">{language === "zh" ? "卖B18" : "Sell B18"}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="px-2 py-1 bg-emerald-500/20 rounded-lg">{language === "zh" ? "补国库" : "Treasury"}</span>
            </div>
          </div>
          {/* 市场回调流程 */}
          <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-cyan-600 rotate-180" />
              <span className="font-semibold text-sm text-cyan-700 dark:text-cyan-400">{language === "zh" ? "价格过低" : "Price Low"}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs">
              <span className="px-2 py-1 bg-cyan-500/20 rounded-lg">{language === "zh" ? "国库" : "Treasury"}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="px-2 py-1 bg-muted rounded-lg">{language === "zh" ? "买B18" : "Buy B18"}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="px-2 py-1 bg-emerald-500/20 rounded-lg">{language === "zh" ? "托盘" : "Support"}</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <PaginatedHelpDialog
      open={open}
      onOpenChange={onOpenChange}
      language={language}
      dialogTitle={language === "zh" ? "二级市场" : "Market"}
      pages={pages}
    />
  );
}

// ========== 动态奖励说明弹窗 ==========
export function DynamicRewardsHelpDialog({ open, onOpenChange, language }: HelpDialogProps) {
  const pages: HelpPage[] = [
    {
      icon: <Users className="h-8 w-8 text-white" />,
      iconBg: "bg-gradient-to-br from-orange-500 to-amber-600",
      iconColor: "bg-white/20 backdrop-blur",
      title: language === "zh" ? "级别奖励" : "Tier Reward",
      subtitle: language === "zh" ? "基于伞下业绩的奖励" : "Team performance rewards",
      content: (
        <div className="space-y-2">
          <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
            <div className="text-[10px] text-muted-foreground mb-1">{language === "zh" ? "级别奖励公式" : "Tier Reward Formula"}</div>
            <div className="font-mono text-xs font-bold text-center text-orange-700 dark:text-orange-400">
              R = {language === "zh" ? "伞下业绩" : "Perf"} × 1.2% × 40% × {language === "zh" ? "级别" : "Tier"}
            </div>
            <div className="text-[9px] text-center text-muted-foreground mt-1">
              {language === "zh" ? "1.2% = 假设伞下都质押360天的日利率" : "1.2% = 360-day staking daily rate"}
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {[{v: "V1", p: "1×40%"}, {v: "V2", p: "2×40%"}, {v: "V5", p: "5×40%"}, {v: "V8", p: "8×40%"}, {v: "V10", p: "10×40%"}].map((t) => (
              <div key={t.v} className="p-1.5 bg-muted/50 rounded-lg text-center">
                <div className="text-xs font-bold text-orange-600">{t.v}</div>
                <div className="text-[8px] text-muted-foreground">{t.p}</div>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-center text-muted-foreground bg-emerald-500/10 rounded-lg p-1.5 border border-emerald-500/20">
            {language === "zh" ? "✓ 无需扣税，无需线性释放，立即到账" : "✓ No tax, no linear release, instant payout"}
          </div>
        </div>
      ),
    },
    {
      icon: <Layers className="h-8 w-8 text-white" />,
      iconBg: "bg-gradient-to-br from-pink-500 to-rose-600",
      iconColor: "bg-white/20 backdrop-blur",
      title: language === "zh" ? "业绩奖励" : "Layer Reward",
      subtitle: language === "zh" ? "50层小区业绩奖励" : "50 layers performance rewards",
      content: (
        <div className="space-y-2">
          <div className="p-2 bg-pink-500/10 rounded-xl border border-pink-500/20">
            <div className="text-[10px] text-muted-foreground mb-1">{language === "zh" ? "业绩奖励公式" : "Layer Reward Formula"}</div>
            <div className="font-mono text-[10px] font-bold text-center text-pink-700 dark:text-pink-400">
              R = ({language === "zh" ? "小区业绩" : "Layer"}/{language === "zh" ? "全网业绩" : "Total"}) × {language === "zh" ? "奖金池" : "Pool"} × {language === "zh" ? "层%" : "Rate"}
            </div>
          </div>
          <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <div className="text-[10px] text-muted-foreground mb-1">{language === "zh" ? "层级比例 (每层递减2%)" : "Layer Rate (-2% each)"}</div>
            <div className="font-mono text-[10px] font-bold text-center">
              Rate(n) = 100% - (n-1) × 2%
            </div>
          </div>
          <div className="flex items-center justify-between px-1">
            {[{l: "L1", r: "100%"}, {l: "L10", r: "82%"}, {l: "L25", r: "52%"}, {l: "L40", r: "22%"}, {l: "L50", r: "2%"}].map((item) => (
              <div key={item.l} className="text-center">
                <div className="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center border border-pink-500/20 mb-0.5">
                  <span className="font-bold text-[10px] text-pink-600">{item.r}</span>
                </div>
                <div className="text-[9px] text-muted-foreground">{item.l}</div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: <Gift className="h-8 w-8 text-white" />,
      iconBg: "bg-gradient-to-br from-amber-500 to-yellow-600",
      iconColor: "bg-white/20 backdrop-blur",
      title: language === "zh" ? "奖金池来源" : "Bonus Pool",
      subtitle: language === "zh" ? "兑付B18的20%进入奖金池" : "20% of redeemed B18",
      content: (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="px-2 py-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30 text-center">
              <div className="text-[10px] font-semibold">{language === "zh" ? "兑付B18" : "Redeem"}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="px-2 py-1.5 bg-amber-500/20 rounded-lg border border-amber-500/30 text-center">
              <div className="text-[10px] font-semibold">20%</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="px-2 py-1.5 bg-yellow-500/20 rounded-lg border border-yellow-500/30 text-center">
              <div className="text-[10px] font-semibold">{language === "zh" ? "奖金池" : "Pool"}</div>
            </div>
          </div>
          <div className="p-2 bg-muted/50 rounded-xl">
            <div className="text-[10px] text-muted-foreground mb-1">{language === "zh" ? "B18分配比例" : "B18 Distribution"}</div>
            <div className="grid grid-cols-4 gap-1 text-center">
              <div className="p-1 bg-indigo-500/10 rounded">
                <div className="text-[10px] font-bold text-indigo-600">50%</div>
                <div className="text-[8px] text-muted-foreground">{language === "zh" ? "交付" : "Delivery"}</div>
              </div>
              <div className="p-1 bg-red-500/10 rounded">
                <div className="text-[10px] font-bold text-red-600">20%</div>
                <div className="text-[8px] text-muted-foreground">{language === "zh" ? "销毁" : "Burn"}</div>
              </div>
              <div className="p-1 bg-amber-500/10 rounded">
                <div className="text-[10px] font-bold text-amber-600">20%</div>
                <div className="text-[8px] text-muted-foreground">{language === "zh" ? "奖金池" : "Bonus"}</div>
              </div>
              <div className="p-1 bg-violet-500/10 rounded">
                <div className="text-[10px] font-bold text-violet-600">10%</div>
                <div className="text-[8px] text-muted-foreground">SPP</div>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-center text-muted-foreground bg-muted/50 rounded-lg p-1.5">
            {language === "zh" ? "奖金池B18用于拨付业绩奖励" : "Bonus pool B18 pays layer rewards"}
          </div>
        </div>
      ),
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-white" />,
      iconBg: "bg-gradient-to-br from-green-500 to-emerald-600",
      iconColor: "bg-white/20 backdrop-blur",
      title: language === "zh" ? "激励体系" : "Incentives",
      subtitle: language === "zh" ? "可持续的奖励来源" : "Sustainable reward sources",
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center">
              <div className="text-lg font-bold text-emerald-600">{language === "zh" ? "静态" : "Static"}</div>
              <div className="text-xs text-muted-foreground">{language === "zh" ? "时间与质押" : "Time & Stake"}</div>
            </div>
            <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 text-center">
              <div className="text-lg font-bold text-green-600">{language === "zh" ? "动态" : "Dynamic"}</div>
              <div className="text-xs text-muted-foreground">{language === "zh" ? "结构贡献" : "Structure"}</div>
            </div>
          </div>
          <div className="p-3 bg-muted/50 rounded-xl">
            <div className="text-xs font-semibold mb-2">{language === "zh" ? "奖励来源：" : "Sources:"}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span>{language === "zh" ? "国库支付" : "Treasury"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-cyan-600" />
                <span>{language === "zh" ? "交易税收" : "Trading Tax"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-red-600" />
                <span>{language === "zh" ? "通缩销毁" : "Burn"}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span>{language === "zh" ? "市场平衡" : "Balance"}</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <PaginatedHelpDialog
      open={open}
      onOpenChange={onOpenChange}
      language={language}
      dialogTitle={language === "zh" ? "动态奖励" : "Rewards"}
      pages={pages}
    />
  );
}

// ========== 使用说明弹窗 ==========
export function UsageHelpDialog({ open, onOpenChange, language }: HelpDialogProps) {
  const pages: HelpPage[] = [
    {
      icon: <Sparkles className="h-8 w-8 text-white" />,
      iconBg: "bg-gradient-to-br from-violet-500 to-purple-600",
      iconColor: "bg-white/20 backdrop-blur",
      title: language === "zh" ? "B18 模拟器" : "B18 Simulator",
      subtitle: language === "zh" ? "代币经济模拟工具" : "Tokenomics Simulation Tool",
      content: (
        <div className="space-y-3">
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <div className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">
              ⚠️ {language === "zh" ? "重要说明" : "Important Notice"}
            </div>
            <div className="text-[11px] text-muted-foreground leading-relaxed space-y-1.5">
              <p>{language === "zh"
                ? "所有数据均根据输入条件模拟生成，最终收益取决于代币市值和质押热度等市场因素。"
                : "All data is simulated based on input conditions. Actual returns depend on token market cap and staking popularity."}</p>
              <p>{language === "zh"
                ? "所有操作数据会缓存并联动计算各种数据变化。"
                : "All operation data is cached and calculated together for data changes."}</p>
              <p className="font-semibold text-amber-700 dark:text-amber-400">{language === "zh"
                ? "完成模拟后，请按右上角「重置」按钮还原初始数据。"
                : "After simulation, press 'Reset' button (top-right) to restore initial data."}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-primary/10 rounded-lg">
              <div className="text-lg font-bold text-primary">6</div>
              <div className="text-[10px] text-muted-foreground">{language === "zh" ? "功能模块" : "Modules"}</div>
            </div>
            <div className="p-2 bg-chart-2/10 rounded-lg">
              <div className="text-lg font-bold text-chart-2">3</div>
              <div className="text-[10px] text-muted-foreground">{language === "zh" ? "投资模式" : "Modes"}</div>
            </div>
            <div className="p-2 bg-chart-3/10 rounded-lg">
              <div className="text-lg font-bold text-chart-3">∞</div>
              <div className="text-[10px] text-muted-foreground">{language === "zh" ? "模拟场景" : "Scenarios"}</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: <Coins className="h-8 w-8 text-white" />,
      iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
      iconColor: "bg-white/20 backdrop-blur",
      title: language === "zh" ? "第1步：质押" : "Step 1: Staking",
      subtitle: language === "zh" ? "一级市场购买与质押" : "Primary Market Purchase",
      content: (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground leading-relaxed">
            {language === "zh"
              ? "模拟购买质押后，可在数据总台查看国库、交付合约、LP池等数据变化，了解USDC和B18代币的流向。"
              : "After simulating purchase & stake, view treasury, delivery contract, LP pool changes in dashboard."}
          </div>
          <div className="p-3 bg-muted/50 rounded-xl">
            <div className="text-[10px] font-bold mb-2">{language === "zh" ? "三种投资模式：" : "3 Investment Modes:"}</div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-start gap-2">
                <ArrowDown className="h-3 w-3 mt-0.5 text-chart-2" />
                <span><b>{language === "zh" ? "等额本金" : "Amortizing"}</b>: {language === "zh" ? "每日释放本金+利息" : "Daily P+I release"}</span>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-3 w-3 mt-0.5 text-chart-3" />
                <span><b>{language === "zh" ? "按期付息" : "Interest Only"}</b>: {language === "zh" ? "利息先释放，本金到期" : "Interest first, principal at maturity"}</span>
              </div>
              <div className="flex items-start gap-2">
                <TrendingUp className="h-3 w-3 mt-0.5 text-chart-4" />
                <span><b>{language === "zh" ? "复利滚存" : "Compound"}</b>: {language === "zh" ? "利息复投，到期一起释放" : "Reinvest interest, release at maturity"}</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: <Receipt className="h-8 w-8 text-white" />,
      iconBg: "bg-gradient-to-br from-blue-500 to-indigo-600",
      iconColor: "bg-white/20 backdrop-blur",
      title: language === "zh" ? "第2步：释放" : "Step 2: Release",
      subtitle: language === "zh" ? "质押释放与提现模拟" : "Release & Withdrawal Simulation",
      content: (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground leading-relaxed">
            {language === "zh"
              ? "查看在第几天释放时现金流是否充足，通过日详情了解每日释放明细。"
              : "Check if cash flow is sufficient on release day, view daily release details."}
          </div>
          <div className="p-3 bg-chart-3/10 rounded-xl border border-chart-3/20">
            <div className="text-[10px] font-bold text-chart-3 mb-1.5">{language === "zh" ? "多订单功能" : "Multi-Order Feature"}</div>
            <div className="text-[11px] text-muted-foreground leading-relaxed space-y-1">
              <p>{language === "zh"
                ? "可查看多订单释放情况，只需返回第1步增加订单即可。"
                : "View multi-order release status by adding orders in Step 1."}</p>
              <p>{language === "zh"
                ? "第2步可滑动切换不同订单，查看各订单释放详情和现金流变化。"
                : "Swipe to switch orders in Step 2, view release details and cash flow for each."}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] p-2 bg-muted/50 rounded-lg">
            <Shield className="h-4 w-4 text-amber-600" />
            <span>{language === "zh" ? "334保护机制在现金流不足时自动启动" : "334 protection activates when cash flow insufficient"}</span>
          </div>
        </div>
      ),
    },
    {
      icon: <Droplets className="h-8 w-8 text-white" />,
      iconBg: "bg-gradient-to-br from-cyan-500 to-blue-600",
      iconColor: "bg-white/20 backdrop-blur",
      title: language === "zh" ? "第3步：交易" : "Step 3: Trading",
      subtitle: language === "zh" ? "二级市场买卖模拟" : "Secondary Market Simulation",
      content: (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground leading-relaxed">
            {language === "zh"
              ? "模拟二级市场随机买卖对币价的影响，主要用于查看SPP合约余额变化和买卖后的数据变化。"
              : "Simulate random buy/sell impact on price. View SPP contract balance and post-trade data changes."}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-chart-2/10 rounded-xl text-center">
              <TrendingUp className="h-5 w-5 mx-auto text-chart-2 mb-1" />
              <div className="text-[10px] font-bold">{language === "zh" ? "买入" : "Buy"}</div>
              <div className="text-[9px] text-muted-foreground">{language === "zh" ? "价格上涨" : "Price Up"}</div>
            </div>
            <div className="p-2.5 bg-chart-5/10 rounded-xl text-center">
              <ArrowDown className="h-5 w-5 mx-auto text-chart-5 mb-1" />
              <div className="text-[10px] font-bold">{language === "zh" ? "卖出" : "Sell"}</div>
              <div className="text-[9px] text-muted-foreground">{language === "zh" ? "价格下跌" : "Price Down"}</div>
            </div>
          </div>
          <div className="text-[10px] p-2 bg-chart-4/10 rounded-lg text-center">
            {language === "zh" ? "SPP合约可在高价卖出护盘，低价买入托底" : "SPP sells high to protect, buys low to support"}
          </div>
        </div>
      ),
    },
    {
      icon: <Users className="h-8 w-8 text-white" />,
      iconBg: "bg-gradient-to-br from-orange-500 to-amber-600",
      iconColor: "bg-white/20 backdrop-blur",
      title: language === "zh" ? "第4步：奖励" : "Step 4: Rewards",
      subtitle: language === "zh" ? "动态奖励模拟" : "Dynamic Rewards Simulation",
      content: (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground leading-relaxed">
            {language === "zh"
              ? "模拟业绩达标时各级别奖励（未扣除级差），以及奖金池分配给业绩奖励的每一层。"
              : "Simulate tier rewards when performance met (before tier difference), and bonus pool distribution per layer."}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-amber-500/10 rounded-xl">
              <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400">{language === "zh" ? "级别奖励" : "Tier Reward"}</div>
              <div className="text-[9px] text-muted-foreground">{language === "zh" ? "伞下业绩×1.2%×40%×级别" : "Perf×1.2%×40%×Tier"}</div>
            </div>
            <div className="p-2.5 bg-orange-500/10 rounded-xl">
              <div className="text-[10px] font-bold text-orange-700 dark:text-orange-400">{language === "zh" ? "业绩奖励" : "Layer Reward"}</div>
              <div className="text-[9px] text-muted-foreground">{language === "zh" ? "小区业绩/全网×奖金池×层%" : "Perf/Total×Pool×Layer%"}</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: <Layers className="h-8 w-8 text-white" />,
      iconBg: "bg-gradient-to-br from-pink-500 to-rose-600",
      iconColor: "bg-white/20 backdrop-blur",
      title: language === "zh" ? "第5步：分配" : "Step 5: Distribution",
      subtitle: language === "zh" ? "代币分配与流向" : "Token Distribution & Flow",
      content: (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground leading-relaxed">
            {language === "zh"
              ? "查看B18代币的分配情况和总体流向图示，了解各合约之间的代币流转。"
              : "View B18 token distribution and overall flow diagram between contracts."}
          </div>
          <div className="p-3 bg-muted/50 rounded-xl">
            <div className="text-[10px] font-bold mb-2">{language === "zh" ? "主要合约：" : "Main Contracts:"}</div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="flex items-center gap-1.5"><Landmark className="h-3 w-3 text-chart-1" /><span>{language === "zh" ? "国库" : "Treasury"}</span></div>
              <div className="flex items-center gap-1.5"><FileText className="h-3 w-3 text-chart-2" /><span>{language === "zh" ? "交付合约" : "Delivery"}</span></div>
              <div className="flex items-center gap-1.5"><Droplets className="h-3 w-3 text-chart-3" /><span>LP {language === "zh" ? "池" : "Pool"}</span></div>
              <div className="flex items-center gap-1.5"><Shield className="h-3 w-3 text-chart-4" /><span>SPP</span></div>
              <div className="flex items-center gap-1.5"><Gift className="h-3 w-3 text-amber-600" /><span>{language === "zh" ? "奖金池" : "Bonus"}</span></div>
              <div className="flex items-center gap-1.5"><Flame className="h-3 w-3 text-chart-5" /><span>{language === "zh" ? "销毁" : "Burn"}</span></div>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-white" />,
      iconBg: "bg-gradient-to-br from-green-500 to-emerald-600",
      iconColor: "bg-white/20 backdrop-blur",
      title: language === "zh" ? "第6步：模拟" : "Step 6: Simulation",
      subtitle: language === "zh" ? "现金流预测模拟器" : "Cash Flow Prediction",
      content: (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground leading-relaxed">
            {language === "zh"
              ? "整体预测模拟器，各种参数都可调节。设定SPP平衡币价条件，查看数据影响和图表变化。"
              : "Overall prediction simulator with adjustable parameters. Set SPP price balance conditions, view data impact."}
          </div>
          <div className="p-3 bg-muted/50 rounded-xl">
            <div className="text-[10px] font-bold mb-2">{language === "zh" ? "两种预测模式：" : "Two Prediction Modes:"}</div>
            <div className="space-y-2 text-[11px]">
              <div className="p-2 bg-chart-2/10 rounded-lg">
                <div className="font-semibold text-chart-2">{language === "zh" ? "模式一：营业额" : "Mode 1: Revenue"}</div>
                <div className="text-[10px] text-muted-foreground">{language === "zh" ? "设定营业额和日增长率" : "Set revenue and daily growth rate"}</div>
              </div>
              <div className="p-2 bg-chart-3/10 rounded-lg">
                <div className="font-semibold text-chart-3">{language === "zh" ? "模式二：随机订单" : "Mode 2: Random Orders"}</div>
                <div className="text-[10px] text-muted-foreground">{language === "zh" ? "10张随机订单及其选择条件" : "10 random orders with conditions"}</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <PaginatedHelpDialog
      open={open}
      onOpenChange={onOpenChange}
      language={language}
      dialogTitle={language === "zh" ? "使用说明" : "User Guide"}
      pages={pages}
    />
  );
}
