import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/language-context";
import { ThemeToggle } from "./theme-toggle";
import { LanguageToggle } from "./language-toggle";
import { formatCurrency, formatTokens, formatPercent } from "@/lib/tokenomics";
import { defaultSystemState } from "@shared/schema";
import {
  Coins,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Wallet,
  Flame,
  Activity,
  PieChart,
  Droplets,
  Gift,
  Shield,
  Package,
  Landmark,
} from "lucide-react";

interface MobileHeaderProps {
  tokenPrice: number;
  priceChange: number;
  treasuryBalance: number;
  sppBalance?: number;
  totalBurned: number;
  vestingBalance: number;
  bonusPoolBalance: number;
  lpPoolTokens: number;
  lpPoolUsdt: number;
  totalInvestment?: number;
  totalReleased?: number;
  totalScheduledRelease?: number;
  ordersCount?: number;
  userConfig?: {
    stakingDays: number;
    stakingDailyRate: number;
    releaseDays: number;
    taxRate: number;
  } | null;
  onReset?: () => void;
}

export function MobileHeader({
  tokenPrice = 0,
  priceChange = 0,
  treasuryBalance = 0,
  sppBalance = 0,
  totalBurned = 0,
  vestingBalance = 0,
  bonusPoolBalance = 0,
  lpPoolTokens = 0,
  lpPoolUsdt = 0,
  totalInvestment = 0,
  totalReleased = 0,
  totalScheduledRelease = 0,
  ordersCount = 0,
  userConfig = null,
  onReset,
}: MobileHeaderProps) {
  const { language, t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  const effectiveScheduledRelease = Math.max(totalScheduledRelease, totalReleased);
  const releaseProgress = effectiveScheduledRelease > 0
    ? Math.min(1, totalReleased / effectiveScheduledRelease)
    : 0;

  const priceUp = priceChange >= 0;

  return (
    <div className="mobile-header-premium">
      {/* Compact Header Bar */}
      <div className="mobile-header-bar">
        <div className="flex items-center gap-2">
          <img
            src="https://pbs.twimg.com/profile_images/2000057825087901696/7-AxijTb_400x400.jpg"
            alt="B18 Logo"
            className="mobile-logo-img"
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground">B18</span>
            <span className="text-[11px] text-muted-foreground leading-none">Simulator</span>
          </div>
        </div>

        {/* Center: Quick Price Display */}
        <motion.button
          className="mobile-price-pill"
          onClick={() => setIsExpanded(!isExpanded)}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-xs font-mono font-bold">${tokenPrice.toFixed(4)}</span>
          <span className={`text-[11px] font-bold ${priceUp ? "text-chart-2" : "text-destructive"}`}>
            {priceUp ? "+" : ""}{(priceChange * 100).toFixed(1)}%
          </span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </motion.div>
        </motion.button>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {onReset && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onReset}
              className="h-8 w-8 rounded-lg"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>

      {/* Expandable Metrics Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="metrics-panel-premium">
              {/* Section Title */}
              <div className="metrics-panel-header">
                <div className="metrics-live-badge">
                  <div className="metrics-live-dot" />
                  <span>{language === "zh" ? "实时数据" : "LIVE DATA"}</span>
                </div>
              </div>

              {/* ======== 区块1: 代币与LP - 紫色主题 ======== */}
              <div className="rounded-xl p-2.5 mb-2 border border-primary/20 bg-gradient-to-br from-primary/8 to-primary/3">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Coins className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                    {language === "zh" ? "代币与LP" : "Token & LP"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="bg-background/60 dark:bg-background/40 rounded-lg p-2 text-center border border-primary/10">
                    <div className="text-[11px] text-muted-foreground">{language === "zh" ? "价格" : "Price"}</div>
                    <div className="text-sm font-bold text-primary">${tokenPrice.toFixed(4)}</div>
                    <div className={`text-[11px] font-bold ${priceUp ? "text-chart-2" : "text-destructive"}`}>
                      {priceUp ? "+" : ""}{(priceChange * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-background/60 dark:bg-background/40 rounded-lg p-2 text-center border border-primary/10">
                    <div className="text-[11px] text-muted-foreground">LP USDC</div>
                    <div className="text-sm font-bold">{formatCurrency(lpPoolUsdt)}</div>
                  </div>
                  <div className="bg-background/60 dark:bg-background/40 rounded-lg p-2 text-center border border-primary/10">
                    <div className="text-[11px] text-muted-foreground">LP B18</div>
                    <div className="text-sm font-bold">{formatTokens(lpPoolTokens)}</div>
                  </div>
                </div>
              </div>

              {/* ======== 区块2: 资金池 - 蓝色主题 ======== */}
              <div className="rounded-xl p-2.5 mb-2 border border-chart-3/25 bg-gradient-to-br from-chart-3/10 to-chart-3/3">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-chart-3/20 flex items-center justify-center">
                    <Landmark className="h-3.5 w-3.5 text-chart-3" />
                  </div>
                  <span className="text-[11px] font-bold text-chart-3 uppercase tracking-wider">
                    {language === "zh" ? "资金池" : "Reserves"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-background/60 dark:bg-background/40 rounded-lg p-2 border border-chart-3/10">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Wallet className="h-3 w-3 text-chart-3" />
                      <span className="text-[11px] text-muted-foreground">{language === "zh" ? "国库" : "Treasury"}</span>
                    </div>
                    <div className="text-sm font-bold text-chart-3">{formatCurrency(treasuryBalance)}</div>
                  </div>
                  <div className="bg-background/60 dark:bg-background/40 rounded-lg p-2 border border-chart-3/10">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Shield className="h-3 w-3 text-primary" />
                      <span className="text-[11px] text-muted-foreground">SPP B18</span>
                    </div>
                    <div className="text-sm font-bold text-primary">{formatTokens(sppBalance)}</div>
                  </div>
                  <div className="bg-background/60 dark:bg-background/40 rounded-lg p-2 border border-chart-3/10">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Package className="h-3 w-3 text-chart-4" />
                      <span className="text-[11px] text-muted-foreground">{language === "zh" ? "交付合约" : "Vesting"}</span>
                    </div>
                    <div className="text-sm font-bold text-chart-4">{formatTokens(vestingBalance)}</div>
                  </div>
                  <div className="bg-background/60 dark:bg-background/40 rounded-lg p-2 border border-chart-3/10">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Gift className="h-3 w-3 text-chart-4" />
                      <span className="text-[11px] text-muted-foreground">{language === "zh" ? "奖金池" : "Bonus"}</span>
                    </div>
                    <div className="text-sm font-bold text-chart-4">{formatTokens(bonusPoolBalance)}</div>
                  </div>
                </div>
                {/* 销毁数据 */}
                <div className="bg-destructive/10 rounded-lg p-2 mt-1.5 flex items-center justify-between border border-destructive/20">
                  <div className="flex items-center gap-1">
                    <Flame className="h-3 w-3 text-destructive" />
                    <span className="text-[11px] text-muted-foreground">{language === "zh" ? "已销毁" : "Burned"}</span>
                  </div>
                  <div className="text-sm font-bold text-destructive">{formatTokens(totalBurned)}</div>
                </div>
              </div>

              {/* ======== 区块3: 我的投资 - 绿色主题 ======== */}
              <div className="rounded-xl p-2.5 mb-2 border border-chart-2/25 bg-gradient-to-br from-chart-2/10 to-chart-2/3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-chart-2/20 flex items-center justify-center">
                      <PieChart className="h-3.5 w-3.5 text-chart-2" />
                    </div>
                    <span className="text-[11px] font-bold text-chart-2 uppercase tracking-wider">
                      {language === "zh" ? "我的投资" : "My Investment"}
                    </span>
                  </div>
                  {ordersCount > 0 && (
                    <Badge variant="secondary" className="text-[11px] bg-chart-2/20 text-chart-2 border-chart-2/30">
                      {ordersCount} {language === "zh" ? "笔订单" : "orders"}
                    </Badge>
                  )}
                </div>
                <div className="bg-background/60 dark:bg-background/40 rounded-lg p-2.5 border border-chart-2/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-muted-foreground">{language === "zh" ? "累计投资" : "Total Invested"}</span>
                    <span className="text-sm font-bold text-chart-2">{formatCurrency(totalInvestment)}</span>
                  </div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-muted-foreground">{language === "zh" ? "已提现" : "Withdrawn"}</span>
                    <span className="text-sm font-bold">{formatCurrency(totalReleased)}</span>
                  </div>
                  {effectiveScheduledRelease > 0 && (
                    <div className="pt-1.5 border-t border-chart-2/10">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-muted-foreground">{language === "zh" ? "释放进度" : "Progress"}</span>
                        <span className="font-bold text-chart-2">{formatPercent(releaseProgress)}</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: 'linear-gradient(90deg, hsl(var(--chart-2)), hsl(155 85% 45%))' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${releaseProgress * 100}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* User Config Summary */}
              {userConfig && userConfig.stakingDays > 0 && (
                <div className="config-summary-premium">
                  <div className="config-badge">
                    <span className="config-badge-label">{language === "zh" ? "质押" : "Stake"}</span>
                    <span className="config-badge-value">{userConfig.stakingDays}{language === "zh" ? "天" : "d"}</span>
                  </div>
                  <div className="config-badge config-badge-success">
                    <span className="config-badge-label">{language === "zh" ? "日利率" : "Daily"}</span>
                    <span className="config-badge-value">{formatPercent(userConfig.stakingDailyRate)}</span>
                  </div>
                  <div className="config-badge">
                    <span className="config-badge-label">{language === "zh" ? "释放" : "Release"}</span>
                    <span className="config-badge-value">{userConfig.releaseDays}{language === "zh" ? "天" : "d"}</span>
                  </div>
                  <div className="config-badge config-badge-danger">
                    <span className="config-badge-label">{language === "zh" ? "税率" : "Tax"}</span>
                    <span className="config-badge-value">{formatPercent(userConfig.taxRate)}</span>
                  </div>
                </div>
              )}

              {/* Tap to Close Hint */}
              <motion.button
                className="metrics-close-btn"
                onClick={() => setIsExpanded(false)}
                whileTap={{ scale: 0.95 }}
              >
                <ChevronUp className="h-3.5 w-3.5" />
                <span>{language === "zh" ? "收起面板" : "Collapse Panel"}</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
