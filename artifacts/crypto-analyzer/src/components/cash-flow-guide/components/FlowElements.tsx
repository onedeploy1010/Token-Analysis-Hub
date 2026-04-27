import { motion } from "framer-motion";
import { ReactNode } from "react";
import { COLORS, SPRING_CONFIG } from "../animations/constants";

// 合约/实体方块
interface ContractBoxProps {
  icon: ReactNode;
  label: string;
  sublabel?: string;
  color: string;
  delay?: number;
  isActive?: boolean;
  size?: "sm" | "md" | "lg";
}

export function ContractBox({
  icon,
  label,
  sublabel,
  color,
  delay = 0,
  isActive = false,
  size = "md"
}: ContractBoxProps) {
  const sizeClasses = {
    sm: "w-16 h-16 lg:w-20 lg:h-20",
    md: "w-20 h-20 lg:w-28 lg:h-28",
    lg: "w-24 h-24 lg:w-32 lg:h-32",
  };

  const iconSizes = {
    sm: "h-6 w-6 lg:h-8 lg:w-8",
    md: "h-8 w-8 lg:h-10 lg:w-10",
    lg: "h-10 w-10 lg:h-12 lg:w-12",
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ ...SPRING_CONFIG.bouncy, delay }}
      className={`${sizeClasses[size]} rounded-2xl flex flex-col items-center justify-center gap-1 lg:gap-2 relative`}
      style={{
        background: `linear-gradient(135deg, ${color}20, ${color}10)`,
        border: `2px solid ${color}${isActive ? '80' : '40'}`,
        boxShadow: isActive ? `0 0 20px ${color}40` : 'none',
      }}
    >
      <motion.div
        className={iconSizes[size]}
        style={{ color }}
        animate={isActive ? { scale: [1, 1.1, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        {icon}
      </motion.div>
      <span className="text-[11px] lg:text-xs font-medium text-center leading-tight px-1">{label}</span>
      {sublabel && (
        <span className="text-[11px] lg:text-[11px] text-muted-foreground">{sublabel}</span>
      )}
    </motion.div>
  );
}

// 动画箭头
interface FlowArrowProps {
  direction: "right" | "down" | "left" | "up" | "diagonal-down-right" | "diagonal-down-left";
  color?: string;
  delay?: number;
  animated?: boolean;
  label?: string;
  length?: "short" | "medium" | "long";
}

export function FlowArrow({
  direction,
  color = COLORS.usdc,
  delay = 0,
  animated = true,
  label,
  length = "medium"
}: FlowArrowProps) {
  const lengthPx = { short: 40, medium: 60, long: 100 };
  const len = lengthPx[length];

  const getPath = () => {
    switch (direction) {
      case "right":
        return `M0,12 L${len - 10},12 M${len - 15},7 L${len - 5},12 L${len - 15},17`;
      case "left":
        return `M${len},12 L10,12 M15,7 L5,12 L15,17`;
      case "down":
        return `M12,0 L12,${len - 10} M7,${len - 15} L12,${len - 5} L17,${len - 15}`;
      case "up":
        return `M12,${len} L12,10 M7,15 L12,5 L17,15`;
      case "diagonal-down-right":
        return `M0,0 L${len - 14},${len - 14} M${len - 20},${len - 10} L${len - 8},${len - 8} L${len - 10},${len - 20}`;
      case "diagonal-down-left":
        return `M${len},0 L14,${len - 14} M20,${len - 10} L8,${len - 8} L10,${len - 20}`;
      default:
        return "";
    }
  };

  const svgSize = direction.includes("diagonal")
    ? { width: len, height: len }
    : direction === "right" || direction === "left"
    ? { width: len, height: 24 }
    : { width: 24, height: len };

  return (
    <div className="relative flex items-center justify-center">
      <motion.svg
        width={svgSize.width}
        height={svgSize.height}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay }}
      >
        <motion.path
          d={getPath()}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: delay + 0.2, duration: 0.5 }}
        />
        {animated && (
          <motion.circle
            r={4}
            fill={color}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              offsetDistance: ["0%", "100%"],
            }}
            transition={{
              delay: delay + 0.7,
              duration: 1,
              repeat: Infinity,
              repeatDelay: 1,
            }}
            style={{ offsetPath: `path("${getPath().split(' M')[0]}")` }}
          />
        )}
      </motion.svg>
      {label && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.3 }}
          className="absolute text-[11px] font-bold whitespace-nowrap"
          style={{ color }}
        >
          {label}
        </motion.span>
      )}
    </div>
  );
}

// 代币图标
interface TokenIconProps {
  type: "usdc" | "b18";
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

export function TokenIcon({ type, size = "md", animated = false }: TokenIconProps) {
  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const color = type === "usdc" ? COLORS.usdc : COLORS.b18;

  return (
    <motion.div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold`}
      style={{
        background: `linear-gradient(135deg, ${color}, ${color}CC)`,
        color: "white",
        boxShadow: `0 2px 8px ${color}40`,
      }}
      animate={animated ? { scale: [1, 1.1, 1] } : {}}
      transition={{ repeat: Infinity, duration: 1.5 }}
    >
      {type === "usdc" ? "$" : "B"}
    </motion.div>
  );
}

// 飞行代币动画
interface FlyingTokenProps {
  type: "usdc" | "b18";
  from: { x: number; y: number };
  to: { x: number; y: number };
  delay?: number;
  duration?: number;
  amount?: string;
}

export function FlyingToken({
  type,
  from,
  to,
  delay = 0,
  duration = 0.8,
  amount
}: FlyingTokenProps) {
  const color = type === "usdc" ? COLORS.usdc : COLORS.b18;

  return (
    <motion.div
      className="absolute flex items-center gap-1 pointer-events-none z-10"
      initial={{ x: from.x, y: from.y, opacity: 0, scale: 0.5 }}
      animate={{
        x: to.x,
        y: to.y,
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1, 1, 0.5],
      }}
      transition={{
        delay,
        duration,
        ease: "easeInOut",
      }}
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
        style={{ background: color }}
      >
        {type === "usdc" ? "$" : "B"}
      </div>
      {amount && (
        <span className="text-xs font-bold" style={{ color }}>
          {amount}
        </span>
      )}
    </motion.div>
  );
}

// 百分比标签
interface PercentBadgeProps {
  value: number;
  color: string;
  delay?: number;
  label?: string;
}

export function PercentBadge({ value, color, delay = 0, label }: PercentBadgeProps) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ ...SPRING_CONFIG.bouncy, delay }}
      className="flex flex-col items-center gap-0.5"
    >
      <div
        className="px-2 py-1 rounded-full text-xs font-bold text-white"
        style={{ background: color }}
      >
        {value}%
      </div>
      {label && (
        <span className="text-[11px] text-muted-foreground">{label}</span>
      )}
    </motion.div>
  );
}

// 说明卡片
interface InfoCardProps {
  title: string;
  content: string;
  icon?: ReactNode;
  color?: string;
  delay?: number;
}

export function InfoCard({ title, content, icon, color = COLORS.b18, delay = 0 }: InfoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-card/80 backdrop-blur-sm rounded-xl p-3 lg:p-4 border shadow-lg"
      style={{ borderColor: `${color}40` }}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon && <div style={{ color }}>{icon}</div>}
        <h4 className="font-bold text-sm lg:text-base" style={{ color }}>{title}</h4>
      </div>
      <p className="text-xs lg:text-sm text-muted-foreground leading-relaxed">{content}</p>
    </motion.div>
  );
}
