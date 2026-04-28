// 动画常量配置

export const ANIMATION_DURATION = {
  fast: 0.3,
  normal: 0.5,
  slow: 0.8,
  verySlow: 1.2,
};

export const SPRING_CONFIG = {
  gentle: { type: "spring" as const, stiffness: 120, damping: 14 },
  bouncy: { type: "spring" as const, stiffness: 300, damping: 20 },
  stiff: { type: "spring" as const, stiffness: 400, damping: 30 },
  wobbly: { type: "spring" as const, stiffness: 180, damping: 12 },
  snappy: { type: "spring" as const, stiffness: 500, damping: 25 },
};

export const EASING = {
  easeOut: [0.16, 1, 0.3, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  bounce: [0.68, -0.55, 0.265, 1.55],
  smooth: [0.43, 0.13, 0.23, 0.96],
};

// 入场动画变体
export const FADE_IN_UP = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

export const FADE_IN_SCALE = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
};

export const SLIDE_IN_LEFT = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0 },
};

export const SLIDE_IN_RIGHT = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0 },
};

// 循环动画配置
export const FLOAT_ANIMATION = {
  y: [0, -8, 0],
  transition: { repeat: Infinity, duration: 2.5, ease: "easeInOut" },
};

export const PULSE_ANIMATION = {
  scale: [1, 1.05, 1],
  transition: { repeat: Infinity, duration: 2, ease: "easeInOut" },
};

export const GLOW_ANIMATION = {
  boxShadow: [
    "0 0 0 0 rgba(16, 185, 129, 0)",
    "0 0 20px 4px rgba(16, 185, 129, 0.3)",
    "0 0 0 0 rgba(16, 185, 129, 0)",
  ],
  transition: { repeat: Infinity, duration: 2 },
};

// 交错动画容器
export const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

export const STAGGER_ITEM = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// 移动端优化布局样式 (iPhone为标准)
export const MOBILE_LAYOUT = {
  // 容器样式 - 增加内边距和底部空间，确保居中
  container: "h-full flex flex-col items-center px-4 py-6 pb-32 overflow-y-auto",
  // 内容区域最大宽度 - 添加mx-auto确保居中
  content: "w-full max-w-md lg:max-w-4xl mx-auto",
  // 各phase区块之间的间距
  sectionGap: "mb-10",
  // 标题区域样式
  header: "text-center mb-8 w-full",
  // 底部说明卡片区域 - 隐藏在移动端
  footer: "mt-10 hidden lg:grid grid-cols-1 lg:grid-cols-2 gap-3 max-w-4xl w-full pb-8 mx-auto",
};

// 颜色定义
export const COLORS = {
  usdc: "#2775CA",
  b18: "#10B981",
  treasury: "#8B5CF6",
  lp: "#F59E0B",
  burn: "#EF4444",
  bonus: "#F59E0B",
  spp: "#3B82F6",
  delivery: "#10B981",
  user: "#EC4899",
  warning: "#F97316",
};

// 步骤信息 - 基于B4626协议白皮书
// B18 = B4626 (4+6+2+6=18)，由ERC4626启发创新的数字银行清算协议
export const STEPS = [
  { id: 1, key: "intro", titleZh: "B18与B4626协议", titleEn: "B18 & B4626 Protocol" },
  { id: 2, key: "order-flow", titleZh: "三种参与方式", titleEn: "Three Ways to Join" },
  { id: 3, key: "lp-pairing", titleZh: "LP流动性配对", titleEn: "LP Pairing" },
  { id: 4, key: "staking", titleZh: "时间银行质押", titleEn: "Time Bank Staking" },
  { id: 5, key: "daily-release", titleZh: "线性释放", titleEn: "Linear Release" },
  { id: 6, key: "tax-buyback", titleZh: "释放税回购", titleEn: "Tax Buyback" },
  { id: 7, key: "spp-balance", titleZh: "SPP稳态国库", titleEn: "SPP Stability Treasury" },
  { id: 8, key: "withdrawal", titleZh: "国库兑付", titleEn: "Treasury Redemption" },
  { id: 9, key: "token-distribution", titleZh: "代币流转分配", titleEn: "Token Distribution" },
  { id: 10, key: "protocol-433", titleZh: "334补位机制", titleEn: "334 Queue Protocol" },
  { id: 11, key: "dynamic-rewards", titleZh: "等级收益", titleEn: "Tier Rewards" },
  { id: 12, key: "performance-rewards", titleZh: "业绩收益", titleEn: "Performance Rewards" },
  { id: 13, key: "summary", titleZh: "B4626协议总览", titleEn: "B4626 Protocol Overview" },
];
