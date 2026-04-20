import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import { SimulatedOrder } from "./mobile-step-wizard";
import {
  Calculator,
  Droplets,
  ArrowRightLeft,
  Award,
  BarChart3,
  TrendingUp,
  Check,
  Sparkles,
  RotateCcw,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  BookOpen,
} from "lucide-react";

interface Step {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: React.ReactNode;
}

const stepsZh: Step[] = [
  { id: "staking", title: "一级市场质押", shortTitle: "质押", description: "购买代币并质押获取收益", icon: <Calculator className="h-5 w-5" /> },
  { id: "release", title: "质押释放提现", shortTitle: "释放", description: "本利释放和USDC提现", icon: <ArrowRightLeft className="h-5 w-5" /> },
  { id: "secondary", title: "二级市场买卖", shortTitle: "交易", description: "在LP池中买卖代币", icon: <Droplets className="h-5 w-5" /> },
  { id: "rewards", title: "动态奖励", shortTitle: "奖励", description: "团队业绩奖励计算", icon: <Award className="h-5 w-5" /> },
  { id: "distribution", title: "代币分配", shortTitle: "分配", description: "查看代币分布情况", icon: <BarChart3 className="h-5 w-5" /> },
  { id: "simulator", title: "现金流模拟", shortTitle: "模拟", description: "税收买入对价格影响", icon: <TrendingUp className="h-5 w-5" /> },
];

const stepsEn: Step[] = [
  { id: "staking", title: "Presale Staking", shortTitle: "Stake", description: "Buy tokens and stake for returns", icon: <Calculator className="h-5 w-5" /> },
  { id: "release", title: "Release & Withdraw", shortTitle: "Release", description: "Release P+I and withdraw USDC", icon: <ArrowRightLeft className="h-5 w-5" /> },
  { id: "secondary", title: "Secondary Market", shortTitle: "Trade", description: "Trade tokens in LP pool", icon: <Droplets className="h-5 w-5" /> },
  { id: "rewards", title: "Dynamic Rewards", shortTitle: "Rewards", description: "Team performance rewards", icon: <Award className="h-5 w-5" /> },
  { id: "distribution", title: "Token Distribution", shortTitle: "Tokens", description: "View token distribution", icon: <BarChart3 className="h-5 w-5" /> },
  { id: "simulator", title: "Cash Flow Simulation", shortTitle: "Simulate", description: "Tax buyback price impact", icon: <TrendingUp className="h-5 w-5" /> },
];

interface DesktopSidebarProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  simulatedOrders?: SimulatedOrder[];
  currentOrderIndex?: number;
  onOrderIndexChange?: (index: number) => void;
  onReset?: () => void;
  onShowHelp?: () => void;
  onShowGuide?: () => void;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export function DesktopSidebar({
  currentStep,
  onStepChange,
  simulatedOrders = [],
  currentOrderIndex = 0,
  onOrderIndexChange,
  onReset,
  onShowHelp,
  onShowGuide,
  collapsed = false,
  onCollapse,
}: DesktopSidebarProps) {
  const { language } = useLanguage();
  const steps = language === "zh" ? stepsZh : stepsEn;

  return (
    <aside className={`desktop-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* 品牌区域 */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <h2 className="text-base font-bold text-foreground">B18 Simulator</h2>
            <p className="text-[10px] text-muted-foreground">
              {language === "zh" ? "代币经济模拟器" : "Tokenomics Simulator"}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-8 w-8 shrink-0"
          onClick={() => onCollapse?.(!collapsed)}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* 进度概览 */}
      <div className="sidebar-progress">
        {!collapsed ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                {language === "zh" ? "模拟进度" : "Progress"}
              </span>
              <span className="text-xs font-medium text-primary">
                {currentStep + 1} / {steps.length}
              </span>
            </div>
            <div className="sidebar-progress-bar">
              <motion.div
                className="sidebar-progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
          </>
        ) : (
          <div className="text-center">
            <span className="text-sm font-bold text-primary">{currentStep + 1}/{steps.length}</span>
          </div>
        )}
      </div>

      {/* 步骤导航 */}
      <div className="sidebar-steps">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;

          return (
            <motion.button
              key={step.id}
              className={`sidebar-step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${collapsed ? 'collapsed' : ''}`}
              onClick={() => onStepChange(index)}
              whileTap={{ scale: 0.98 }}
              title={collapsed ? step.title : undefined}
            >
              <div className={`sidebar-step-icon ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                {isCompleted ? <Check className="h-4 w-4" /> : <span className="text-sm font-bold">{index + 1}</span>}
              </div>
              {!collapsed && (
                <>
                  <div className="sidebar-step-content">
                    <div className="sidebar-step-title">{step.shortTitle}</div>
                    <div className="sidebar-step-desc">{step.description}</div>
                  </div>
                  <div className="sidebar-step-indicator">
                    {isActive && (
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-primary"
                        layoutId="sidebarActiveIndicator"
                      />
                    )}
                    {isCompleted && <Check className="h-3 w-3 text-chart-2" />}
                    {!isActive && !isCompleted && <ChevronRight className="h-4 w-4 text-muted-foreground/40" />}
                  </div>
                </>
              )}
            </motion.button>
          );
        })}
      </div>


      {/* 订单列表 */}
      {simulatedOrders.length > 0 && !collapsed && (
        <div className="sidebar-orders">
          <div className="sidebar-orders-title">
            {language === "zh" ? `订单列表 (${simulatedOrders.length})` : `Orders (${simulatedOrders.length})`}
          </div>
          <div className="sidebar-orders-list">
            {simulatedOrders.map((order, index) => (
              <button
                key={order.id}
                className={`sidebar-order-item ${index === currentOrderIndex ? 'active' : ''}`}
                onClick={() => onOrderIndexChange?.(index)}
              >
                <span className="order-num">#{index + 1}</span>
                <span className="order-amount">${order.investment.toLocaleString()}</span>
                <span className="order-days">{order.stakingDays}{language === "zh" ? "天" : "d"}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 现金流指南按钮 */}
      <div className={`px-3 mb-2 ${collapsed ? 'px-2' : ''}`}>
        <Button
          variant="default"
          size={collapsed ? "icon" : "sm"}
          className={collapsed ? "h-9 w-9 nav-gradient" : "w-full nav-gradient text-white hover:opacity-90"}
          onClick={onShowGuide}
          title={collapsed ? (language === "zh" ? "现金流指南" : "Cash Flow Guide") : undefined}
        >
          <BookOpen className="h-4 w-4" />
          {!collapsed && <span className="ml-2">{language === "zh" ? "现金流指南" : "Cash Flow Guide"}</span>}
        </Button>
      </div>

      {/* 底部操作 */}
      <div className={`sidebar-footer ${collapsed ? 'collapsed' : ''}`}>
        <Button
          variant="outline"
          size={collapsed ? "icon" : "sm"}
          className={collapsed ? "h-9 w-9" : "sidebar-footer-btn"}
          onClick={onReset}
          title={collapsed ? (language === "zh" ? "重置" : "Reset") : undefined}
        >
          <RotateCcw className="h-4 w-4" />
          {!collapsed && <span>{language === "zh" ? "重置" : "Reset"}</span>}
        </Button>
        <Button
          variant="outline"
          size={collapsed ? "icon" : "sm"}
          className={collapsed ? "h-9 w-9" : "sidebar-footer-btn"}
          onClick={onShowHelp}
          title={collapsed ? (language === "zh" ? "帮助" : "Help") : undefined}
        >
          <HelpCircle className="h-4 w-4" />
          {!collapsed && <span>{language === "zh" ? "帮助" : "Help"}</span>}
        </Button>
      </div>
    </aside>
  );
}
