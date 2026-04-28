import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  label: string;
  shortLabel?: string; // 移动端短标签
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  className?: string;
  allowNavigation?: boolean;
}

export function StepIndicator({
  steps,
  currentStep,
  onStepClick,
  className,
  allowNavigation = false,
}: StepIndicatorProps) {
  const handleClick = (stepIndex: number) => {
    if (allowNavigation && onStepClick && stepIndex < currentStep) {
      onStepClick(stepIndex);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Step indicators with connectors */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          const isPending = index > currentStep;
          const canClick = allowNavigation && isCompleted;

          return (
            <div
              key={step.id}
              className="flex items-center flex-1 last:flex-none"
            >
              {/* Step circle */}
              <motion.button
                onClick={() => handleClick(index)}
                disabled={!canClick}
                className={cn(
                  "step-indicator-enhanced touch-feedback relative",
                  isCompleted && "completed",
                  isActive && "active",
                  isPending && "pending",
                  canClick && "cursor-pointer"
                )}
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                }}
                whileTap={canClick ? { scale: 0.95 } : undefined}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  >
                    <Check className="w-5 h-5" strokeWidth={3} />
                  </motion.div>
                ) : (
                  <span className="text-sm font-semibold">{step.id}</span>
                )}

                {/* Active ring animation */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    style={{
                      background: `linear-gradient(135deg, hsla(var(--primary) / 0.3) 0%, hsla(var(--chart-4) / 0.3) 100%)`,
                    }}
                  />
                )}
              </motion.button>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "step-connector mx-2 sm:mx-3",
                    isCompleted && "completed",
                    isActive && "active"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step labels - hidden on very small screens */}
      <div className="flex items-center justify-between mt-2">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <div
              key={`label-${step.id}`}
              className={cn(
                "flex-1 last:flex-none text-center",
                index < steps.length - 1 && "pr-2 sm:pr-3"
              )}
            >
              <span
                className={cn(
                  "text-[10px] sm:text-xs font-medium transition-colors",
                  isActive && "text-primary",
                  isCompleted && "text-chart-2",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}
              >
                {/* 移动端显示短标签 */}
                <span className="sm:hidden">{step.shortLabel || step.label}</span>
                {/* 桌面端显示完整标签 */}
                <span className="hidden sm:inline">{step.label}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 紧凑版步骤指示器 - 用于移动端顶部
interface CompactStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export function CompactStepIndicator({
  currentStep,
  totalSteps,
  className,
}: CompactStepIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <motion.div
          key={index}
          className={cn(
            "h-1.5 rounded-full transition-all",
            index === currentStep
              ? "bg-primary"
              : index < currentStep
              ? "bg-chart-2"
              : "bg-muted"
          )}
          initial={false}
          animate={{
            width: index === currentStep ? 24 : 8,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
          }}
        />
      ))}
    </div>
  );
}

// 垂直步骤指示器 - 用于桌面端侧边栏
interface VerticalStepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  className?: string;
}

export function VerticalStepIndicator({
  steps,
  currentStep,
  onStepClick,
  className,
}: VerticalStepIndicatorProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const canClick = isCompleted && onStepClick;

        return (
          <div key={step.id} className="flex items-start">
            <div className="flex flex-col items-center">
              {/* Step circle */}
              <motion.button
                onClick={() => canClick && onStepClick?.(index)}
                disabled={!canClick}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
                  isCompleted && "bg-chart-2 text-white",
                  isActive && "bg-primary text-white shadow-glow-primary",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground",
                  canClick && "cursor-pointer hover:opacity-80"
                )}
                whileTap={canClick ? { scale: 0.95 } : undefined}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" strokeWidth={3} />
                ) : (
                  step.id
                )}
              </motion.button>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 h-8 my-1 rounded-full",
                    index < currentStep ? "bg-chart-2" : "bg-border"
                  )}
                />
              )}
            </div>

            {/* Step label */}
            <div className="ml-4 pt-2">
              <span
                className={cn(
                  "text-sm font-medium",
                  isActive && "text-primary",
                  isCompleted && "text-chart-2",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
