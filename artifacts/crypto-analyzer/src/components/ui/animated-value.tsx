import { useEffect, useRef, useState } from "react";
import CountUp from "react-countup";
import { cn } from "@/lib/utils";

interface AnimatedValueProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
  // 是否显示变化闪烁效果
  showFlash?: boolean;
  // 格式化函数
  formatter?: (value: number) => string;
  // 是否禁用动画
  disabled?: boolean;
}

export function AnimatedValue({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 0.8,
  className,
  showFlash = false,
  formatter,
  disabled = false,
}: AnimatedValueProps) {
  const prevValue = useRef(value);
  const [flashClass, setFlashClass] = useState("");

  useEffect(() => {
    if (showFlash && prevValue.current !== value) {
      const isIncrease = value > prevValue.current;
      setFlashClass(isIncrease ? "value-flash" : "value-flash-decrease");

      const timer = setTimeout(() => setFlashClass(""), 600);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
    prevValue.current = value;
  }, [value, showFlash]);

  if (disabled) {
    const displayValue = formatter ? formatter(value) : value.toFixed(decimals);
    return (
      <span className={cn("countup-value", className)}>
        {prefix}
        {displayValue}
        {suffix}
      </span>
    );
  }

  return (
    <span className={cn("countup-value", flashClass, className)}>
      <CountUp
        start={prevValue.current}
        end={value}
        duration={duration}
        decimals={decimals}
        prefix={prefix}
        suffix={suffix}
        formattingFn={formatter}
        preserveValue
        useEasing
      />
    </span>
  );
}

// 货币值动画
interface AnimatedCurrencyProps {
  value: number;
  className?: string;
  showFlash?: boolean;
  compact?: boolean;
}

export function AnimatedCurrency({
  value,
  className,
  showFlash = true,
  compact = false,
}: AnimatedCurrencyProps) {
  const formatter = (n: number) => {
    if (compact) {
      if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
      if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
      if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  };

  return (
    <AnimatedValue
      value={value}
      formatter={formatter}
      className={className}
      showFlash={showFlash}
      duration={0.6}
    />
  );
}

// 代币数量动画
interface AnimatedTokensProps {
  value: number;
  className?: string;
  showFlash?: boolean;
  compact?: boolean;
  suffix?: string;
}

export function AnimatedTokens({
  value,
  className,
  showFlash = true,
  compact = false,
  suffix = " B18",
}: AnimatedTokensProps) {
  const formatter = (n: number) => {
    if (compact) {
      if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
      if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
      if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    }
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  };

  return (
    <AnimatedValue
      value={value}
      formatter={formatter}
      suffix={suffix}
      className={className}
      showFlash={showFlash}
      duration={0.6}
    />
  );
}

// 百分比动画
interface AnimatedPercentProps {
  value: number;
  className?: string;
  showFlash?: boolean;
  decimals?: number;
}

export function AnimatedPercent({
  value,
  className,
  showFlash = true,
  decimals = 2,
}: AnimatedPercentProps) {
  const displayValue = value * 100; // Convert 0.05 to 5

  return (
    <AnimatedValue
      value={displayValue}
      decimals={decimals}
      suffix="%"
      className={className}
      showFlash={showFlash}
      duration={0.5}
    />
  );
}

// 价格动画 (带 $ 符号)
interface AnimatedPriceProps {
  value: number;
  className?: string;
  showFlash?: boolean;
  decimals?: number;
}

export function AnimatedPrice({
  value,
  className,
  showFlash = true,
  decimals = 2,
}: AnimatedPriceProps) {
  return (
    <AnimatedValue
      value={value}
      prefix="$"
      decimals={decimals}
      className={className}
      showFlash={showFlash}
      duration={0.6}
    />
  );
}

// 天数动画
interface AnimatedDaysProps {
  value: number;
  className?: string;
  suffix?: string;
}

export function AnimatedDays({
  value,
  className,
  suffix = " days",
}: AnimatedDaysProps) {
  return (
    <AnimatedValue
      value={value}
      decimals={0}
      suffix={suffix}
      className={className}
      duration={0.4}
    />
  );
}
