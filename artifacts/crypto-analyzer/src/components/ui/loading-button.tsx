import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  // 渐变主色按钮
  gradient?: boolean;
}

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    {
      loading = false,
      loadingText,
      children,
      className,
      disabled,
      variant = "default",
      size = "default",
      gradient = false,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    if (gradient) {
      return (
        <motion.button
          ref={ref}
          disabled={isDisabled}
          className={cn(
            "relative inline-flex items-center justify-center",
            "app-button app-button-primary",
            "min-h-[52px] px-6 py-3",
            "text-base font-semibold",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
          whileTap={{ scale: isDisabled ? 1 : 0.96 }}
          {...props}
        >
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
                {loadingText && <span>{loadingText}</span>}
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      );
    }

    return (
      <Button
        ref={ref}
        disabled={isDisabled}
        variant={variant}
        size={size}
        className={cn(
          "relative",
          loading && "cursor-wait",
          className
        )}
        {...props}
      >
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              {loadingText && <span>{loadingText}</span>}
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </Button>
    );
  }
);

LoadingButton.displayName = "LoadingButton";

// 主要操作按钮 - 带渐变和动感光圈效果
interface PrimaryActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
  icon?: ReactNode;
  fullWidth?: boolean;
  pulse?: boolean; // 是否显示脉冲光圈
}

export function PrimaryActionButton({
  loading = false,
  loadingText,
  children,
  icon,
  fullWidth = false,
  pulse = true,
  className,
  disabled,
  ...props
}: PrimaryActionButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      disabled={isDisabled}
      className={cn(
        "relative inline-flex items-center justify-center gap-2",
        "app-button app-button-primary",
        "min-h-[52px] px-6 py-3",
        "text-base font-semibold",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "overflow-visible",
        fullWidth && "w-full",
        className
      )}
      whileTap={{ scale: isDisabled ? 1 : 0.96 }}
      whileHover={{ scale: isDisabled ? 1 : 1.02 }}
      {...props}
    >
      {/* 动感光圈 - 脉冲效果 */}
      {pulse && !isDisabled && (
        <>
          <motion.span
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/40 to-chart-1/40"
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.6, 0, 0.6],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.span
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-chart-1/30 to-primary/30"
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.4, 0, 0.4],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.3,
            }}
          />
        </>
      )}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2 relative z-10"
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            {loadingText && <span>{loadingText}</span>}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2 relative z-10"
          >
            {icon}
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// 次要操作按钮
interface SecondaryActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export function SecondaryActionButton({
  children,
  icon,
  fullWidth = false,
  className,
  ...props
}: SecondaryActionButtonProps) {
  return (
    <motion.button
      className={cn(
        "relative inline-flex items-center justify-center gap-2",
        "app-button app-button-secondary",
        "min-h-[48px] px-5 py-2.5",
        "text-sm font-medium",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        fullWidth && "w-full",
        className
      )}
      whileTap={{ scale: 0.96 }}
      {...props}
    >
      {icon}
      {children}
    </motion.button>
  );
}

// 关闭面板按钮 - 带动感光圈效果
interface ClosePanelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode;
  fullWidth?: boolean;
  variant?: "default" | "primary";
}

export function ClosePanelButton({
  children,
  icon,
  fullWidth = false,
  variant = "default",
  className,
  ...props
}: ClosePanelButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <motion.button
      className={cn(
        "relative inline-flex items-center justify-center gap-2",
        "min-h-[44px] px-4 py-2.5 rounded-xl",
        "text-sm font-semibold",
        "overflow-visible",
        "transition-colors duration-200",
        isPrimary
          ? "bg-gradient-to-r from-primary to-chart-1 text-white shadow-lg"
          : "bg-muted/80 hover:bg-muted text-foreground border border-border/50",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        fullWidth && "w-full",
        className
      )}
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      {...props}
    >
      {/* 动感光圈 */}
      <motion.span
        className={cn(
          "absolute inset-0 rounded-xl",
          isPrimary
            ? "bg-gradient-to-r from-primary/50 to-chart-1/50"
            : "bg-muted-foreground/20"
        )}
        animate={{
          scale: [1, 1.06, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.span
        className={cn(
          "absolute inset-0 rounded-xl",
          isPrimary
            ? "bg-gradient-to-r from-chart-1/40 to-primary/40"
            : "bg-muted-foreground/10"
        )}
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.3, 0, 0.3],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.2,
        }}
      />
      <span className="relative z-10 flex items-center gap-2">
        {icon}
        {children}
      </span>
    </motion.button>
  );
}
