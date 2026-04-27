import { useState, useMemo, ReactNode, cloneElement, isValidElement } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import { MobileHeader } from "./mobile-header";
import { UsageHelpDialog } from "./help-dialogs";
import {
  Calculator,
  Droplets,
  ArrowRightLeft,
  Award,
  BarChart3,
  TrendingUp,
  Check,
  X,
  Menu,
  RotateCcw,
  Sparkles,
  HelpCircle,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { CashFlowGuide } from "./cash-flow-guide";

interface Step {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: ReactNode;
}

// 释放模式类型
// amortizing: 等额本金还本付息 - 每日释放本金+利息，质押期间线性释放
// interestOnly: 按期付息到期还本 - 质押期间只释放利息，本金到期后释放
// compound: 复利滚存 - 利息复投到本金，到期后一起释放
export type ReleaseMode = 'amortizing' | 'interestOnly' | 'compound';

// 模拟订单类型
export interface SimulatedOrder {
  id: number;
  investment: number;           // 投资金额 USDC
  tokensPurchased: number;      // 购入代币数 (P0)
  stakingDays: number;          // 质押天数 (T)
  stakingDailyRate: number;     // 日利率 (r)
  releaseDays: number;          // 释放天数 (D)
  taxRate: number;              // 税率 tax(D)
  totalTokens: number;          // 本利合计
  totalValue: number;           // 本利价值 USDC
  releaseMode: ReleaseMode;     // 释放模式
  useCompound: boolean;         // 兼容旧字段（releaseMode='compound'时为true）
  createdAt: number;            // 创建时间戳
  releasedDays: number;         // 已模拟释放天数
  releasedUsdc: number;         // 已兑付USDC（累计）
}

interface MobileStepWizardProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  children: ReactNode[];
  metrics: any;
  onReset?: () => void;
  simulatedOrders?: SimulatedOrder[];
  onAddOrder?: (order: Omit<SimulatedOrder, 'id' | 'createdAt'>) => void;
  currentOrderIndex?: number;
  onOrderIndexChange?: (index: number) => void;
  onUpdateOrderReleasedDays?: (orderIndex: number, releasedDays: number) => void;
  onUpdateOrderReleasedUsdc?: (orderIndex: number, releasedUsdc: number) => void;
}

const stepsZh: Step[] = [
  {
    id: "staking",
    title: "一级市场质押",
    shortTitle: "质押",
    description: "购买代币并质押获取收益",
    icon: <Calculator className="h-5 w-5" />,
  },
  {
    id: "release",
    title: "质押释放提现",
    shortTitle: "释放",
    description: "本利释放和USDC提现",
    icon: <ArrowRightLeft className="h-5 w-5" />,
  },
  {
    id: "secondary",
    title: "二级市场买卖",
    shortTitle: "交易",
    description: "在LP池中买卖代币",
    icon: <Droplets className="h-5 w-5" />,
  },
  {
    id: "rewards",
    title: "动态奖励",
    shortTitle: "奖励",
    description: "团队业绩奖励计算",
    icon: <Award className="h-5 w-5" />,
  },
  {
    id: "distribution",
    title: "代币分配",
    shortTitle: "分配",
    description: "查看代币分布情况",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    id: "simulator",
    title: "现金流模拟",
    shortTitle: "模拟",
    description: "税收买入对价格影响",
    icon: <TrendingUp className="h-5 w-5" />,
  },
];

const stepsEn: Step[] = [
  {
    id: "staking",
    title: "Presale Staking",
    shortTitle: "Stake",
    description: "Buy tokens and stake for returns",
    icon: <Calculator className="h-5 w-5" />,
  },
  {
    id: "release",
    title: "Release & Withdraw",
    shortTitle: "Release",
    description: "Release P+I and withdraw USDC",
    icon: <ArrowRightLeft className="h-5 w-5" />,
  },
  {
    id: "secondary",
    title: "Secondary Market",
    shortTitle: "Trade",
    description: "Trade tokens in LP pool",
    icon: <Droplets className="h-5 w-5" />,
  },
  {
    id: "rewards",
    title: "Dynamic Rewards",
    shortTitle: "Rewards",
    description: "Team performance rewards",
    icon: <Award className="h-5 w-5" />,
  },
  {
    id: "distribution",
    title: "Token Distribution",
    shortTitle: "Tokens",
    description: "View token distribution",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    id: "simulator",
    title: "Cash Flow Sim",
    shortTitle: "Simulate",
    description: "Tax buyback price impact",
    icon: <TrendingUp className="h-5 w-5" />,
  },
];

type NavState = "closed" | "open";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};

const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
    scale: 0.98
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 40 : -40,
    opacity: 0,
    scale: 0.98
  })
};

const drawerVariants = {
  hidden: { x: "-100%", opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 30 }
  },
  exit: {
    x: "-100%",
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

export function MobileStepWizard({
  currentStep,
  onStepChange,
  children,
  metrics,
  onReset,
  simulatedOrders = [],
  onAddOrder,
  currentOrderIndex = 0,
  onOrderIndexChange,
  onUpdateOrderReleasedDays,
  onUpdateOrderReleasedUsdc,
}: MobileStepWizardProps) {
  const { language } = useLanguage();
  const [navState, setNavState] = useState<NavState>("closed");
  const [direction, setDirection] = useState(0);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const steps = useMemo(() => language === "zh" ? stepsZh : stepsEn, [language]);
  const step = steps[currentStep];

  const [userConfig, setUserConfig] = useState<{
    stakingDays: number;
    stakingDailyRate: number;
    releaseDays: number;
    taxRate: number;
  } | null>(null);

  // 当前质押配置缓存（用于创建订单）
  const [pendingStakingCalc, setPendingStakingCalc] = useState<any>(null);

  const handleStakingChange = (calc: any) => {
    // 缓存最新的质押计算结果
    setPendingStakingCalc(calc);

    if (!userConfig ||
        userConfig.stakingDays !== calc.stakingPeriodDays ||
        userConfig.stakingDailyRate !== calc.stakingDailyRate ||
        userConfig.releaseDays !== calc.releaseDays) {
      setUserConfig({
        stakingDays: calc.stakingPeriodDays,
        stakingDailyRate: calc.stakingDailyRate,
        releaseDays: calc.releaseDays,
        taxRate: (calc.stakingReleaseTax / calc.stakingTotalValue) || 0,
      });
    }
  };

  // 处理质押确认 → 调用原始onPurchase更新系统状态 + 创建新订单
  const handleStakingPurchase = (result: { tokensPurchased: number; usdtSpent: number }) => {
    // 1. 调用原始的onPurchase来更新系统状态（国库、LP等）
    const originalOnPurchase = (children[0] as any)?.props?.onPurchase;
    if (originalOnPurchase) {
      originalOnPurchase(result);
    }

    // 2. 创建新订单
    if (onAddOrder && pendingStakingCalc && simulatedOrders.length < 10) {
      // 获取释放模式，兼容旧的useCompound字段
      const releaseMode = pendingStakingCalc.releaseMode || (pendingStakingCalc.useCompound ? 'compound' : 'amortizing');
      onAddOrder({
        investment: result.usdtSpent,
        tokensPurchased: result.tokensPurchased,
        stakingDays: pendingStakingCalc.stakingPeriodDays,
        stakingDailyRate: pendingStakingCalc.stakingDailyRate,
        releaseDays: pendingStakingCalc.releaseDays,
        taxRate: (pendingStakingCalc.stakingReleaseTax / pendingStakingCalc.stakingTotalValue) || 0,
        totalTokens: pendingStakingCalc.stakingTotalTokens,
        totalValue: pendingStakingCalc.stakingTotalValue,
        releaseMode: releaseMode as ReleaseMode,
        useCompound: releaseMode === 'compound',
        releasedDays: 0,
        releasedUsdc: 0,
      });
    }
  };

  // 计算订单汇总数据
  const ordersSummary = useMemo(() => {
    const totalInvestment = simulatedOrders.reduce((sum, o) => sum + o.investment, 0);
    const totalTokens = simulatedOrders.reduce((sum, o) => sum + o.totalTokens, 0);
    const totalValue = simulatedOrders.reduce((sum, o) => sum + o.totalValue, 0);
    return { totalInvestment, totalTokens, totalValue, count: simulatedOrders.length };
  }, [simulatedOrders]);

  const goToStep = (index: number) => {
    setDirection(index > currentStep ? 1 : -1);
    onStepChange(index);
    setNavState("closed");
  };

  const openDrawer = () => setNavState("open");
  const closeDrawer = () => setNavState("closed");

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      {/* New Premium Header with Collapsible Metrics */}
      <MobileHeader
        tokenPrice={metrics.tokenPrice}
        priceChange={metrics.priceChange}
        treasuryBalance={metrics.treasuryBalance}
        sppBalance={metrics.sppBalance}
        totalBurned={metrics.totalBurned}
        vestingBalance={metrics.vestingBalance}
        bonusPoolBalance={metrics.bonusPoolBalance}
        lpPoolTokens={metrics.lpPoolTokens}
        lpPoolUsdt={metrics.lpPoolUsdt}
        totalInvestment={ordersSummary.totalInvestment || metrics.totalInvestment}
        totalReleased={metrics.totalReleased}
        totalScheduledRelease={ordersSummary.totalValue || metrics.totalScheduledRelease}
        userConfig={userConfig}
        onReset={onReset}
        ordersCount={ordersSummary.count}
      />

      {/* Content Area */}
      <div className="mobile-content-area">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="min-h-0"
          >
            {/* Content Card Wrapper */}
            <div className="mobile-content-card">
              <div className="mobile-content-header">
                <div className="mobile-content-icon">
                  {step.icon}
                </div>
                <div>
                  <div className="mobile-content-title">{step.title}</div>
                  <div className="mobile-content-subtitle">{step.description}</div>
                </div>
              </div>
              <div className="mobile-content-body">
                {currentStep === 0 && isValidElement(children[0]) ? (
                  <div key="staking-wrapper">
                    {cloneElement(children[0] as React.ReactElement<any>, {
                      onCalculationChange: handleStakingChange,
                      onPurchase: handleStakingPurchase,
                    })}
                    {/* 订单数量提示 */}
                    {simulatedOrders.length > 0 && (
                      <div className="mt-3 bg-chart-2/10 rounded-lg p-2.5 border border-chart-2/20">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{language === "zh" ? "已创建订单" : "Orders Created"}</span>
                          <span className="font-bold text-chart-2">{simulatedOrders.length}/10</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {language === "zh" ? "确认后添加新订单，在第2步查看所有订单" : "Confirm to add order, view all in Step 2"}
                        </div>
                      </div>
                    )}
                  </div>
                ) : currentStep === 1 && isValidElement(children[1]) ? (
                  <div key="release-wrapper">
                    {cloneElement(children[1] as React.ReactElement<any>, {
                      simulatedOrders,
                      currentOrderIndex,
                      onOrderIndexChange,
                      onUpdateOrderReleasedDays,
                      onUpdateOrderReleasedUsdc,
                    })}
                  </div>
                ) : children[currentStep]}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <div className="mobile-bottom-nav">
        <div className="mobile-nav-content">
          {navState === "closed" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {/* Step Numbers */}
              <div className="mobile-nav-steps">
                {steps.map((s, index) => (
                  <motion.button
                    key={s.id}
                    className={`mobile-nav-step ${
                      index === currentStep
                        ? "active"
                        : index < currentStep
                        ? "completed"
                        : "pending"
                    }`}
                    onClick={() => goToStep(index)}
                    whileTap={{ scale: 0.9 }}
                  >
                    {index < currentStep ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </motion.button>
                ))}
                <motion.div whileTap={{ scale: 0.9 }}>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={openDrawer}
                    className="h-10 w-10 rounded-xl ml-1"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </motion.div>
              </div>

              {/* Current Step Title */}
              <div className="mobile-nav-title">
                <div className="mobile-nav-title-text">{step.shortTitle}</div>
              </div>

              {/* Progress Dots */}
              <div className="mobile-nav-progress">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`mobile-nav-dot ${
                      index === currentStep
                        ? "active"
                        : index < currentStep
                        ? "completed"
                        : ""
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          )}

        </div>
      </div>

      {/* Full Drawer Navigation - 重新设计 */}
      <AnimatePresence>
        {navState === "open" && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={closeDrawer}
            />
            <motion.div
              className="drawer-container fixed left-0 top-0 bottom-0 w-[88%] max-w-[340px] z-[100] flex flex-col"
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* 头部品牌区域 */}
              <div className="drawer-header">
                <div className="flex items-center gap-3">
                  <div className="drawer-logo">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">B18 Simulator</h2>
                    <p className="text-xs text-muted-foreground">
                      {language === "zh" ? "代币经济模拟器" : "Tokenomics Simulator"}
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={closeDrawer}
                  className="h-9 w-9 rounded-full hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* 进度概览 */}
              <div className="drawer-progress">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">
                    {language === "zh" ? "模拟进度" : "Progress"}
                  </span>
                  <span className="text-xs font-medium text-primary">
                    {currentStep + 1} / {steps.length}
                  </span>
                </div>
                <div className="drawer-progress-bar">
                  <motion.div
                    className="drawer-progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* 步骤列表 */}
              <motion.div
                className="drawer-steps"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {steps.map((s, index) => {
                  const isCompleted = index < currentStep;
                  const isActive = index === currentStep;
                  const isPending = index > currentStep;

                  return (
                    <motion.button
                      key={s.id}
                      variants={itemVariants}
                      className={`drawer-step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                      onClick={() => goToStep(index)}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* 步骤图标 */}
                      <div className={`drawer-step-icon ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                        {isCompleted ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <span className="text-sm font-bold">{index + 1}</span>
                        )}
                      </div>

                      {/* 步骤内容 */}
                      <div className="drawer-step-content">
                        <div className="drawer-step-title">{s.title}</div>
                        <div className="drawer-step-desc">{s.description}</div>
                      </div>

                      {/* 右侧指示器 */}
                      <div className={`drawer-step-indicator ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                        {isActive && (
                          <motion.div
                            className="w-2 h-2 rounded-full bg-primary"
                            layoutId="drawerActiveIndicator"
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        )}
                        {isCompleted && <Check className="h-3.5 w-3.5 text-chart-2" />}
                        {isPending && <ChevronRight className="h-4 w-4 text-muted-foreground/50" />}
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>

              {/* 现金流指南按钮 */}
              <div className="px-4 mb-2">
                <Button
                  variant="default"
                  className="w-full nav-gradient text-white hover:opacity-90"
                  onClick={() => {
                    closeDrawer();
                    setShowGuide(true);
                  }}
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="ml-2">{language === "zh" ? "现金流指南" : "Cash Flow Guide"}</span>
                </Button>
              </div>

              {/* 底部功能区 */}
              <div className="drawer-footer">
                <Button
                  variant="outline"
                  className="drawer-footer-btn"
                  onClick={() => {
                    onReset?.();
                    closeDrawer();
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>{language === "zh" ? "重置模拟" : "Reset"}</span>
                </Button>
                <Button
                  variant="outline"
                  className="drawer-footer-btn"
                  onClick={() => {
                    closeDrawer();
                    setShowHelpDialog(true);
                  }}
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>{language === "zh" ? "使用帮助" : "Help"}</span>
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 使用说明弹窗 */}
      <UsageHelpDialog
        open={showHelpDialog}
        onOpenChange={setShowHelpDialog}
        language={language}
      />

      {/* 现金流指南 */}
      {showGuide && (
        <CashFlowGuide onClose={() => setShowGuide(false)} />
      )}
    </div>
  );
}

export { stepsZh, stepsEn };
