import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { STEPS } from "./animations/constants";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  X,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  Hand,
} from "lucide-react";

// 步骤组件导入
import { Step0Intro } from "./steps/Step0-Intro";
import { Step1OrderFlow } from "./steps/Step1-OrderFlow";
import { Step2LPPairing } from "./steps/Step2-LPPairing";
import { Step3Staking } from "./steps/Step3-Staking";
import { Step4DailyRelease } from "./steps/Step4-DailyRelease";
import { Step5TaxBuyback } from "./steps/Step5-TaxBuyback";
import { Step6SPPBalance } from "./steps/Step6-SPPBalance";
import { Step7Withdrawal } from "./steps/Step7-Withdrawal";
import { Step8TokenDistribution } from "./steps/Step8-TokenDistribution";
import { Step9Protocol433 } from "./steps/Step9-Protocol433";
import { Step10DynamicRewards } from "./steps/Step10-DynamicRewards";
import { Step11PerformanceRewards } from "./steps/Step11-PerformanceRewards";
import { Step12Summary } from "./steps/Step12-Summary";

interface CashFlowGuideProps {
  onClose: () => void;
}

export function CashFlowGuide({ onClose }: CashFlowGuideProps) {
  const { language } = useLanguage();
  const { isDesktop } = useBreakpoint();
  const [currentStep, setCurrentStep] = useState(1);
  const [animationPhase, setAnimationPhase] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<number>(0);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const totalSteps = STEPS.length;
  const contentRef = useRef<HTMLDivElement>(null);

  // 获取步骤最大阶段数
  const getMaxPhases = (step: number): number => {
    const phases: Record<number, number> = {
      1: 4, // Intro: B18介绍
      2: 5, // OrderFlow: 三种参与方式
      3: 3, // LP配对
      4: 4, // 质押
      5: 4, // 释放
      6: 3, // 税收
      7: 3, // SPP
      8: 4, // 兑付
      9: 5, // 代币分配
      10: 5, // 334
      11: 4, // 等级收益
      12: 3, // 业绩奖励
      13: 5, // 总结
    };
    return phases[step] || 3;
  };

  // 下一阶段/步骤
  const nextPhase = useCallback(() => {
    const maxPhases = getMaxPhases(currentStep);
    if (animationPhase < maxPhases) {
      setAnimationPhase(animationPhase + 1);
    } else if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      setAnimationPhase(0);
    } else {
      setIsAutoPlay(false);
    }
  }, [currentStep, animationPhase, totalSteps]);

  // 上一步
  const prevStep = useCallback(() => {
    if (animationPhase > 0) {
      setAnimationPhase(animationPhase - 1);
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setAnimationPhase(getMaxPhases(currentStep - 1));
    }
  }, [animationPhase, currentStep]);

  // 跳转到指定步骤
  const goToStep = (step: number) => {
    setCurrentStep(step);
    setAnimationPhase(0);
  };

  // 重置当前动画
  const resetAnimation = () => {
    setAnimationPhase(0);
  };

  // 触摸/滑动手势处理
  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    const velocity = 200;

    if (info.offset.x < -threshold || info.velocity.x < -velocity) {
      setSwipeDirection(1);
      nextPhase();
    } else if (info.offset.x > threshold || info.velocity.x > velocity) {
      setSwipeDirection(-1);
      prevStep();
    }
  }, [nextPhase, prevStep]);

  // 点击内容区域推进动画
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, a')) {
      return;
    }
    nextPhase();
  }, [nextPhase]);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        nextPhase();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevStep();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPhase, prevStep, onClose]);

  // 自动播放
  useEffect(() => {
    if (!isAutoPlay) return;
    const timer = setInterval(() => nextPhase(), 2500);
    return () => clearInterval(timer);
  }, [isAutoPlay, nextPhase]);

  const renderStep = () => {
    const stepProps = { phase: animationPhase, language };

    switch (currentStep) {
      case 1: return <Step0Intro {...stepProps} />;
      case 2: return <Step1OrderFlow {...stepProps} />;
      case 3: return <Step2LPPairing {...stepProps} />;
      case 4: return <Step3Staking {...stepProps} />;
      case 5: return <Step4DailyRelease {...stepProps} />;
      case 6: return <Step5TaxBuyback {...stepProps} />;
      case 7: return <Step6SPPBalance {...stepProps} />;
      case 8: return <Step7Withdrawal {...stepProps} />;
      case 9: return <Step8TokenDistribution {...stepProps} />;
      case 10: return <Step9Protocol433 {...stepProps} />;
      case 11: return <Step10DynamicRewards {...stepProps} />;
      case 12: return <Step11PerformanceRewards {...stepProps} />;
      case 13: return <Step12Summary {...stepProps} />;
      default: return null;
    }
  };

  const currentStepInfo = STEPS[currentStep - 1];

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col">
      {/* 顶部导航栏 - 移动端可收起 */}
      <header className="shrink-0 border-b bg-card/50 backdrop-blur-sm">
        <AnimatePresence mode="wait">
          {isHeaderCollapsed ? (
            /* 收起时的迷你导航栏 - 仅移动端 */
            <motion.div
              key="collapsed"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden px-3 py-2 flex items-center justify-between"
            >
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs font-bold text-primary">{currentStep}/{totalSteps}</span>
                <div className="h-1.5 flex-1 max-w-24 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground truncate max-w-32">
                  {currentStepInfo ? (language === "zh" ? currentStepInfo.titleZh : currentStepInfo.titleEn) : ""}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsHeaderCollapsed(false)}
                  className="h-8 w-8"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ) : (
            /* 展开时的完整导航栏 */
            <motion.div
              key="expanded"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="container mx-auto px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="nav-gradient w-10 h-10 rounded-xl flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">
                    {language === "zh" ? "现金流系统指南" : "Cash Flow System Guide"}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {language === "zh"
                      ? `步骤 ${currentStep}/${totalSteps}: ${currentStepInfo.titleZh}`
                      : `Step ${currentStep}/${totalSteps}: ${currentStepInfo.titleEn}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* 收起按钮 - 仅移动端 */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsHeaderCollapsed(true)}
                  className="h-9 w-9 lg:hidden"
                  title={language === "zh" ? "收起导航" : "Collapse"}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>

                {/* 自动播放 */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsAutoPlay(!isAutoPlay)}
                  className="h-9 w-9"
                >
                  {isAutoPlay ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>

                {/* 重置动画 */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={resetAnimation}
                  className="h-9 w-9"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>

                {/* 关闭 */}
                <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 步骤指示器 - 收起header时隐藏 */}
      <AnimatePresence>
        {!isHeaderCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="shrink-0 py-3 px-4 overflow-hidden"
          >
            {/* 移动端：进度条 + 步骤数字 */}
            <div className="lg:hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">
                  {language === "zh" ? `步骤 ${currentStep}/${totalSteps}` : `Step ${currentStep}/${totalSteps}`}
                </span>
                <span className="text-xs font-medium text-primary">
                  {currentStepInfo ? (language === "zh" ? currentStepInfo.titleZh : currentStepInfo.titleEn) : ""}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              {/* 步骤点指示器 */}
              <div className="flex items-center justify-center gap-1 mt-2">
                {STEPS.map((step) => (
                  <button
                    key={step.id}
                    onClick={() => goToStep(step.id)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      currentStep === step.id
                        ? "bg-primary scale-125"
                        : currentStep > step.id
                        ? "bg-chart-2"
                        : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* 桌面端：完整步骤指示器 */}
            <div className="hidden lg:flex items-center justify-center gap-2">
              {STEPS.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => goToStep(step.id)}
                  className={`relative flex items-center transition-all ${
                    index < STEPS.length - 1 ? "pr-4" : ""
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      currentStep === step.id
                        ? "bg-primary text-primary-foreground scale-110 shadow-lg"
                        : currentStep > step.id
                        ? "bg-chart-2 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step.id}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`absolute right-0 top-1/2 -translate-y-1/2 w-4 h-0.5 ${
                        currentStep > step.id ? "bg-chart-2" : "bg-muted"
                      }`}
                    />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主内容区 - 支持点击和滑动 */}
      <main
        ref={contentRef}
        className="flex-1 overflow-hidden relative cursor-pointer"
        onClick={handleContentClick}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: swipeDirection >= 0 ? 50 : -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: swipeDirection >= 0 ? -50 : 50 }}
            transition={{ duration: 0.3 }}
            className="h-full"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* 移动端交互提示 */}
        {!isDesktop && animationPhase === 0 && currentStep === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-card/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border"
          >
            <Hand className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {language === "zh" ? "点击或滑动继续" : "Tap or swipe to continue"}
            </span>
          </motion.div>
        )}
      </main>

      {/* 底部导航 */}
      <footer className="shrink-0 border-t bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1 && animationPhase === 0}
            className="h-10"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {language === "zh" ? "上一步" : "Previous"}
          </Button>

          {/* 动画阶段指示器 */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: getMaxPhases(currentStep) + 1 }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  animationPhase >= i
                    ? "bg-primary scale-100"
                    : "bg-muted scale-75"
                }`}
              />
            ))}
          </div>

          <Button
            onClick={nextPhase}
            className="h-10"
            disabled={currentStep === totalSteps && animationPhase >= getMaxPhases(totalSteps)}
          >
            {animationPhase < getMaxPhases(currentStep)
              ? (language === "zh" ? "下一阶段" : "Next Phase")
              : (language === "zh" ? "下一步" : "Next Step")}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
