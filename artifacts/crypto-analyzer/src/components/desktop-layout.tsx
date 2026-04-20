import { ReactNode, useState, cloneElement, isValidElement } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DesktopSidebar } from "./desktop-sidebar";
import { MetricsBar } from "./metrics-bar";
import { MobileHeader } from "./mobile-header";
import { UsageHelpDialog } from "./help-dialogs";
import { CashFlowGuide } from "./cash-flow-guide";
import { useLanguage } from "@/contexts/language-context";
import { SimulatedOrder } from "./mobile-step-wizard";

const TOTAL_STEPS = 6;

interface DesktopLayoutProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  children: ReactNode[];
  metrics: any;
  onReset?: () => void;
  simulatedOrders?: SimulatedOrder[];
  currentOrderIndex?: number;
  onOrderIndexChange?: (index: number) => void;
  onUpdateOrderReleasedDays?: (orderIndex: number, releasedDays: number) => void;
  onUpdateOrderReleasedUsdc?: (orderIndex: number, releasedUsdc: number) => void;
  onDesktopPurchase?: (result: { tokensPurchased: number; usdtSpent: number }) => void;
}

export function DesktopLayout({
  currentStep,
  onStepChange,
  children,
  metrics,
  onReset,
  simulatedOrders = [],
  currentOrderIndex = 0,
  onOrderIndexChange,
  onUpdateOrderReleasedDays,
  onUpdateOrderReleasedUsdc,
  onDesktopPurchase,
}: DesktopLayoutProps) {
  const { language } = useLanguage();

  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`desktop-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* 左侧导航栏 */}
      <DesktopSidebar
        currentStep={currentStep}
        onStepChange={onStepChange}
        simulatedOrders={simulatedOrders}
        currentOrderIndex={currentOrderIndex}
        onOrderIndexChange={onOrderIndexChange}
        onReset={onReset}
        onShowHelp={() => setShowHelpDialog(true)}
        onShowGuide={() => setShowGuide(true)}
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
      />

      {/* 主内容区域 */}
      <div className="desktop-main">
        {/* Header */}
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
          totalInvestment={metrics.totalInvestment}
          totalReleased={metrics.totalReleased}
          totalScheduledRelease={metrics.totalScheduledRelease}
          onReset={onReset}
        />

        {/* Metrics Bar */}
        <div className="desktop-metrics-wrapper">
          <MetricsBar
            tokenPrice={metrics.tokenPrice}
            priceChange={metrics.priceChange}
            circulatingSupply={metrics.circulatingSupply}
            treasuryBalance={metrics.treasuryBalance}
            sppBalance={metrics.sppBalance}
            totalBurned={metrics.totalBurned}
            vestingBalance={metrics.vestingBalance}
            bonusPoolBalance={metrics.bonusPoolBalance}
            lpPoolTokens={metrics.lpPoolTokens}
            lpPoolUsdt={metrics.lpPoolUsdt}
            lpUsdtAdded={metrics.lpUsdtAdded}
            lpB18Added={metrics.lpB18Added}
            lpB18FromDelivery={metrics.lpB18FromDelivery}
            totalInvestment={metrics.totalInvestment}
            totalReleased={metrics.totalReleased}
            totalScheduledRelease={metrics.totalScheduledRelease}
          />
        </div>

        {/* 内容区域 */}
        <div className="desktop-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="desktop-step-content"
            >
              {currentStep === 0 && isValidElement(children[0]) && onDesktopPurchase ? (
                // 投资页面注入onPurchase用于创建订单
                cloneElement(children[0] as React.ReactElement<any>, {
                  onPurchase: onDesktopPurchase,
                })
              ) : currentStep === 1 && isValidElement(children[1]) ? (
                // 释放页面需要注入多订单相关props
                cloneElement(children[1] as React.ReactElement<any>, {
                  simulatedOrders,
                  currentOrderIndex,
                  onOrderIndexChange,
                  onUpdateOrderReleasedDays,
                  onUpdateOrderReleasedUsdc,
                })
              ) : (
                children[currentStep]
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 底部导航 */}
        <div className="desktop-nav-footer">
          <button
            className="desktop-nav-btn prev"
            onClick={() => onStepChange(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            {language === "zh" ? "上一步" : "Previous"}
          </button>
          <div className="desktop-nav-dots">
            {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
              <button
                key={index}
                className={`desktop-nav-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                onClick={() => onStepChange(index)}
              />
            ))}
          </div>
          <button
            className="desktop-nav-btn next"
            onClick={() => onStepChange(Math.min(TOTAL_STEPS - 1, currentStep + 1))}
            disabled={currentStep === TOTAL_STEPS - 1}
          >
            {language === "zh" ? "下一步" : "Next"}
          </button>
        </div>
      </div>

      {/* 帮助弹窗 */}
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
