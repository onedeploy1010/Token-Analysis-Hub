import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Coins,
  Flame,
  BarChart3,
  Gift,
  Landmark,
  DollarSign,
  Percent,
  Search,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatTokens, formatPercent } from "@/lib/tokenomics";
import { useLanguage } from "@/contexts/language-context";
import { defaultSystemState } from "@shared/schema";

interface MetricsBarProps {
  tokenPrice: number;
  priceChange: number;
  circulatingSupply: number;
  treasuryBalance: number;
  sppBalance?: number;
  totalBurned: number;
  vestingBalance: number;
  bonusPoolBalance: number;
  lpPoolTokens: number;
  lpPoolUsdt: number;
  lpUsdtAdded: number;
  lpB18Added: number;
  lpB18FromDelivery: number;
  totalInvestment?: number;
  totalReleased?: number;
  totalScheduledRelease?: number;
  userConfig?: {
    stakingDays: number;
    stakingDailyRate: number;
    releaseDays: number;
    taxRate: number;
  } | null;
}

export function MetricsBar({
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
  userConfig = null,
}: MetricsBarProps) {
  const { language } = useLanguage();

  const effectiveScheduledRelease = Math.max(totalScheduledRelease, totalReleased);
  const releaseProgress = effectiveScheduledRelease > 0
    ? Math.min(1, totalReleased / effectiveScheduledRelease)
    : 0;

  return (
    <div className="w-full bg-background/85 backdrop-blur-xl border-b sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 py-2.5">
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-3 gap-2.5 lg:gap-4">
            {/* 1. 代币币价数据 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full h-16 lg:h-20 rounded-2xl border-chart-2/30 hover:border-chart-2/50 hover:bg-chart-2/5 px-2 flex flex-col items-center justify-center group transition-all duration-200 active:scale-[0.96] shadow-sm bg-gradient-to-b from-background to-muted/20">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-chart-2/15 flex items-center justify-center">
                      <Coins className="h-3 w-3 lg:h-4 lg:w-4 text-chart-2" />
                    </div>
                    <span className="text-[10px] lg:text-xs font-bold text-muted-foreground uppercase">{language === "zh" ? "币价" : "PRICE"}</span>
                  </div>
                  <span className="text-sm lg:text-xl font-black font-mono mt-0.5">${tokenPrice.toFixed(4)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 mobile-premium-card p-0 overflow-hidden border border-border shadow-2xl">
                <div className="nav-gradient p-3 text-white">
                  <DropdownMenuLabel className="text-[10px] font-bold uppercase text-white/90 p-0 m-0">{language === "zh" ? "代币与LP数据" : "Token & LP"}</DropdownMenuLabel>
                </div>
                <div className="p-3 space-y-2 bg-background">
                  <div className="flex justify-between items-center p-2 rounded-xl bg-muted/30 border border-border/50">
                    <span className="text-xs font-medium text-muted-foreground">{language === "zh" ? "发行价格" : "Base Price"}</span>
                    <span className="text-xs font-mono font-bold">${defaultSystemState.tokenPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-xl bg-muted/30 border border-border/50">
                    <span className="text-xs font-medium text-muted-foreground">USDC {language === "zh" ? "流动性" : "Liquidity"}</span>
                    <span className="text-xs font-mono font-bold text-chart-1">{formatCurrency(lpPoolUsdt)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-xl bg-muted/30 border border-border/50">
                    <span className="text-xs font-medium text-muted-foreground">B18 {language === "zh" ? "池余额" : "Pool"}</span>
                    <span className="text-xs font-mono font-bold text-chart-2">{formatTokens(lpPoolTokens)}</span>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 2. 投资数据 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full h-16 lg:h-20 rounded-2xl border-chart-4/30 hover:border-chart-4/50 hover:bg-chart-4/5 px-2 flex flex-col items-center justify-center group transition-all duration-200 active:scale-[0.96] shadow-sm bg-gradient-to-b from-background to-muted/20">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-chart-4/15 flex items-center justify-center">
                      <PieChart className="h-3 w-3 lg:h-4 lg:w-4 text-chart-4" />
                    </div>
                    <span className="text-[10px] lg:text-xs font-bold text-muted-foreground uppercase">{language === "zh" ? "我的" : "MY"}</span>
                  </div>
                  <span className="text-sm lg:text-xl font-black mt-0.5">{language === "zh" ? "投资" : "INVEST"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-72 mobile-premium-card p-0 overflow-hidden border border-border shadow-2xl">
                <div className="bg-chart-4 p-3 text-white">
                  <DropdownMenuLabel className="text-[10px] font-bold uppercase text-white/90 p-0 m-0">{language === "zh" ? "个人投资与配置" : "Investment & Config"}</DropdownMenuLabel>
                </div>
                <div className="p-3 space-y-3 bg-background">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-xl bg-muted/30 border border-border/50 text-center">
                      <div className="text-[9px] font-bold text-muted-foreground uppercase mb-1">{language === "zh" ? "累计投资" : "Invested"}</div>
                      <div className="text-xs font-mono font-bold text-chart-4">{formatCurrency(totalInvestment)}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-muted/30 border border-border/50 text-center">
                      <div className="text-[9px] font-bold text-muted-foreground uppercase mb-1">{language === "zh" ? "累计提现" : "Withdrawn"}</div>
                      <div className="text-xs font-mono font-bold text-chart-2">{formatCurrency(totalReleased)}</div>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-chart-4/5 border border-chart-4/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-chart-4 uppercase tracking-wider">{language === "zh" ? "质押配置" : "Staking Config"}</span>
                      <Badge variant="outline" className="text-[9px] font-bold border-chart-4/30 text-chart-4 h-4 px-1">{userConfig?.stakingDays || 0} {language === "zh" ? "天" : "Days"}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-muted-foreground">{language === "zh" ? "预期日利率" : "Daily Rate"}</span>
                      <span className="text-xs font-mono font-bold">{formatPercent(userConfig?.stakingDailyRate || 0)}</span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-chart-2/5 border border-chart-2/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-chart-2 uppercase tracking-wider">{language === "zh" ? "释放配置" : "Release Config"}</span>
                      <Badge variant="outline" className="text-[9px] font-bold border-chart-2/30 text-chart-2 h-4 px-1">{userConfig?.releaseDays || 0} {language === "zh" ? "天" : "Days"}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-muted-foreground">{language === "zh" ? "释放税率" : "Tax Rate"}</span>
                      <span className="text-xs font-mono font-bold text-destructive">{formatPercent(userConfig?.taxRate || 0)}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 px-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{language === "zh" ? "释放进度" : "Release Progress"}</span>
                      <span className="text-xs font-mono font-bold">{formatPercent(releaseProgress)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-chart-4 transition-all duration-500" style={{ width: `${releaseProgress * 100}%` }} />
                    </div>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 3. 系统数据 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full h-16 lg:h-20 rounded-2xl border-chart-1/30 hover:border-chart-1/50 hover:bg-chart-1/5 px-2 flex flex-col items-center justify-center group transition-all duration-200 active:scale-[0.96] shadow-sm bg-gradient-to-b from-background to-muted/20">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-chart-1/15 flex items-center justify-center">
                      <Activity className="h-3 w-3 lg:h-4 lg:w-4 text-chart-1" />
                    </div>
                    <span className="text-[10px] lg:text-xs font-bold text-muted-foreground uppercase">{language === "zh" ? "系统" : "SYS"}</span>
                  </div>
                  <span className="text-sm lg:text-xl font-black mt-0.5">{language === "zh" ? "详情" : "DETAILS"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 mobile-premium-card p-0 overflow-hidden border border-border shadow-2xl">
                <div className="bg-chart-1 p-3 text-white">
                  <DropdownMenuLabel className="text-[10px] font-bold uppercase text-white/90 p-0 m-0">{language === "zh" ? "全局资金状态" : "Global Reserves"}</DropdownMenuLabel>
                </div>
                <div className="p-3 space-y-2 bg-background">
                  <div className="flex justify-between items-center p-2 rounded-xl bg-muted/30 border border-border/50">
                    <span className="text-xs font-medium text-muted-foreground">{language === "zh" ? "国库储备" : "Treasury"}</span>
                    <span className="text-xs font-mono font-bold text-chart-1">{formatCurrency(treasuryBalance)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-xl bg-muted/30 border border-border/50">
                    <span className="text-xs font-medium text-muted-foreground">{language === "zh" ? "SPP回购池" : "SPP Pool"}</span>
                    <span className="text-xs font-mono font-bold text-chart-3">{formatCurrency(sppBalance)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-xl bg-muted/30 border border-border/50">
                    <span className="text-xs font-medium text-muted-foreground">{language === "zh" ? "待交付" : "Vesting"}</span>
                    <span className="text-xs font-mono font-bold text-chart-5">{formatTokens(vestingBalance)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-xl bg-destructive/5 border border-destructive/20 mt-1">
                    <span className="text-xs font-bold text-destructive">{language === "zh" ? "累计销毁" : "Total Burned"}</span>
                    <span className="text-xs font-mono font-bold text-destructive">{formatTokens(totalBurned)}</span>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

