import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PieChart, Flame, FileText, Gift, Coins, HelpCircle, BookOpen, Shield } from "lucide-react";
import { formatTokens, formatPercent } from "@/lib/tokenomics";
import { defaultTokenDistribution } from "@shared/schema";
import { useLanguage } from "@/contexts/language-context";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface TokenDistributionProps {
  circulatingSupply: number;
  vestingBalance: number;
  burnedTokens: number;
  bonusPoolTokens: number;
  lpPoolTokens: number;
  lastWithdrawalTokens?: number;
}

export function TokenDistribution({
  circulatingSupply,
  vestingBalance,
  burnedTokens,
  bonusPoolTokens,
  lpPoolTokens,
  lastWithdrawalTokens = 0,
}: TokenDistributionProps) {
  const { language } = useLanguage();
  const { isDesktop } = useBreakpoint();
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const supplyData = useMemo(
    () => [
      { name: language === "zh" ? "流通中" : "Circulation", value: circulatingSupply, color: "hsl(var(--chart-1))" },
      { name: language === "zh" ? "交付合约" : "Delivery", value: vestingBalance, color: "hsl(var(--chart-2))" },
      { name: language === "zh" ? "LP池" : "LP Pool", value: lpPoolTokens, color: "hsl(var(--chart-3))" },
      { name: language === "zh" ? "奖金池" : "Bonus Pool", value: bonusPoolTokens, color: "hsl(var(--chart-4))" },
      { name: language === "zh" ? "已销毁" : "Burned", value: burnedTokens, color: "hsl(var(--chart-5))" },
    ],
    [circulatingSupply, vestingBalance, lpPoolTokens, bonusPoolTokens, burnedTokens, language]
  );

  const totalSupply = supplyData.reduce((sum, d) => sum + d.value, 0);

  // 提现代币分配比例 (使用统一配置 50/20/20/10)
  const distributionItems = [
    {
      label: language === "zh" ? "交付合约" : "Delivery",
      value: lastWithdrawalTokens * defaultTokenDistribution.deliveryContract,
      percent: defaultTokenDistribution.deliveryContract,
      icon: FileText,
      color: "text-chart-2",
    },
    {
      label: language === "zh" ? "销毁" : "Burn",
      value: lastWithdrawalTokens * defaultTokenDistribution.burn,
      percent: defaultTokenDistribution.burn,
      icon: Flame,
      color: "text-chart-5",
    },
    {
      label: language === "zh" ? "奖金池" : "Bonus",
      value: lastWithdrawalTokens * defaultTokenDistribution.bonusPool,
      percent: defaultTokenDistribution.bonusPool,
      icon: Gift,
      color: "text-chart-4",
    },
    {
      label: language === "zh" ? "SPP" : "SPP",
      value: lastWithdrawalTokens * defaultTokenDistribution.spp,
      percent: defaultTokenDistribution.spp,
      icon: Shield,
      color: "text-chart-1",
    },
  ];

  // 桌面端渲染 - 左控制右数据
  if (isDesktop) {
    return (
      <>
      <div className="h-full flex gap-4">
        {/* 左区域：Header + 提现分配规则 */}
        <div className="flex-[2] flex flex-col gap-4 min-h-0">
          {/* 左上：Header */}
          <div className="bg-card rounded-2xl border shadow-lg p-6 flex-1 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="nav-gradient w-14 h-14 rounded-xl flex items-center justify-center">
                <PieChart className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{language === "zh" ? "代币分配" : "Token Distribution"}</h2>
                <p className="text-sm text-muted-foreground">{language === "zh" ? "系统代币流向追踪" : "Token flow tracking"}</p>
              </div>
              <Button variant="outline" size="icon" className="ml-auto h-12 w-12" onClick={() => setShowHelpDialog(true)}>
                <HelpCircle className="h-6 w-6" />
              </Button>
            </div>

            {/* 提现分配规则 */}
            <div className="flex items-center gap-2 mb-4">
              <Coins className="h-5 w-5 text-chart-4" />
              <span className="text-base font-semibold">{language === "zh" ? "提现代币分配规则" : "Withdrawal Distribution Rules"}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 flex-1">
              {distributionItems.map((item, index) => (
                <div
                  key={index}
                  className="bg-muted/40 rounded-xl p-4 text-center flex flex-col items-center justify-center"
                >
                  <div className={`w-12 h-12 mb-3 rounded-xl flex items-center justify-center ${
                    index === 0 ? 'bg-chart-2/15' : index === 1 ? 'bg-chart-5/15' : index === 2 ? 'bg-chart-4/15' : 'bg-chart-1/15'
                  }`}>
                    <item.icon className={`h-6 w-6 ${item.color}`} />
                  </div>
                  <div className="text-sm text-muted-foreground mb-1">{item.label}</div>
                  <div className="text-2xl font-bold">{formatPercent(item.percent)}</div>
                  {lastWithdrawalTokens > 0 && (
                    <div className="text-xs text-muted-foreground mt-2">{formatTokens(item.value)} B18</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右区域：饼图 + 代币分布详情 */}
        <div className="flex-[3] bg-card rounded-2xl border shadow-lg p-6 flex flex-col min-h-0 overflow-hidden">
          {/* 饼图 - 增大高度 */}
          <div className="flex-1 min-h-[280px] mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={supplyData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {supplyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    fontSize: "12px",
                    padding: "10px 14px"
                  }}
                  formatter={(value: number) => [`${formatTokens(value)} B18`, ""]}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </div>

          {/* 代币分布详情 - 响应式横向排列 */}
          <div className="bg-muted/20 rounded-xl p-4 shrink-0 overflow-hidden">
            <Label className="text-base font-semibold mb-3 block">{language === "zh" ? "代币分布详情" : "Token Distribution"}</Label>
            <div className="grid grid-cols-3 xl:grid-cols-5 gap-2">
              {supplyData.map((item, index) => (
                <div
                  key={index}
                  className="bg-background/60 rounded-xl p-2 xl:p-3 text-center min-w-0"
                >
                  <div className="w-3 h-3 xl:w-4 xl:h-4 rounded-full mx-auto mb-1.5 xl:mb-2" style={{ backgroundColor: item.color }} />
                  <div className="text-[10px] xl:text-xs text-muted-foreground truncate mb-0.5 xl:mb-1">{item.name}</div>
                  <div className="font-bold text-sm xl:text-base font-mono truncate">{formatTokens(item.value)}</div>
                  <div className="text-[10px] xl:text-xs text-muted-foreground">{formatPercent(item.value / totalSupply)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-md lg:max-w-2xl p-6" aria-describedby="distribution-help-description">
          <DialogHeader className="pb-3">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="nav-gradient w-10 h-10 rounded-lg flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              {language === "zh" ? "代币分配说明" : "Token Distribution Guide"}
            </DialogTitle>
            <DialogDescription id="distribution-help-description" className="sr-only">
              {language === "zh" ? "了解代币供应和分配规则" : "Learn about token supply and distribution rules"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-chart-2/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-chart-2" />
                <span className="font-semibold">{language === "zh" ? "代币供应" : "Token Supply"}</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>• {language === "zh" ? "流通中: 用户持有的代币" : "Circulation: tokens held by users"}</div>
                <div>• {language === "zh" ? "交付合约: 待释放的代币" : "Delivery: tokens pending release"}</div>
                <div>• {language === "zh" ? "LP池: 流动性池中的代币" : "LP Pool: tokens in liquidity pool"}</div>
              </div>
            </div>

            <div className="bg-chart-1/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="h-5 w-5 text-chart-1" />
                <span className="font-semibold">{language === "zh" ? "奖金与销毁" : "Bonus & Burn"}</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>• {language === "zh" ? "奖金池: 用于动态奖励分配" : "Bonus Pool: for dynamic reward distribution"}</div>
                <div>• {language === "zh" ? "已销毁: 永久移除流通的代币" : "Burned: permanently removed from supply"}</div>
              </div>
            </div>

            <div className="bg-chart-4/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="h-5 w-5 text-chart-4" />
                <span className="font-semibold">{language === "zh" ? "提现分配" : "Withdrawal Rules"}</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>• {language === "zh" ? "50%代币回归交付合约" : "50% tokens return to delivery contract"}</div>
                <div>• {language === "zh" ? "20%代币永久销毁" : "20% tokens permanently burned"}</div>
                <div>• {language === "zh" ? "20%代币进入奖金池" : "20% tokens enter bonus pool"}</div>
                <div>• {language === "zh" ? "10%代币进入SPP" : "10% tokens enter SPP"}</div>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full h-12"
              onClick={() => setShowHelpDialog(false)}
            >
              {language === "zh" ? "我知道了" : "Got it"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </>
    );
  }

  // 移动端渲染
  return (
    <>
    <Card className="mobile-premium-card">
      <CardHeader className="pb-2 pt-4 px-4 sm:px-6 sm:pt-6">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="nav-gradient w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0">
              <PieChart className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-base sm:text-lg font-bold gradient-text-premium">{language === "zh" ? "代币分配" : "Token Distribution"}</span>
              <div className="text-[10px] sm:text-xs text-muted-foreground">{language === "zh" ? "系统代币流向追踪" : "Token flow tracking"}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl shrink-0"
            onClick={() => setShowHelpDialog(true)}
            data-testid="button-help-distribution"
          >
            <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
        {/* 饼图 - 移动端优化 */}
        <div className="h-44 sm:h-52">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPie>
              <Pie
                data={supplyData}
                cx="50%"
                cy="45%"
                innerRadius={window.innerWidth < 640 ? 30 : 40}
                outerRadius={window.innerWidth < 640 ? 55 : 70}
                paddingAngle={2}
                dataKey="value"
              >
                {supplyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  fontSize: "11px",
                  padding: "8px 12px"
                }}
                formatter={(value: number) => [`${formatTokens(value)} B18`, ""]}
              />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }}
              />
            </RechartsPie>
          </ResponsiveContainer>
        </div>

        {/* 代币分布详情 - 移动端网格布局 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {supplyData.map((item, index) => (
            <div
              key={index}
              className="bg-muted/30 rounded-xl p-2.5 sm:p-3 border border-border/50 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate">{item.name}</span>
              </div>
              <div className="font-bold text-sm sm:text-base font-mono">{formatTokens(item.value)}</div>
              <div className="text-[10px] text-muted-foreground">{formatPercent(item.value / totalSupply)}</div>
            </div>
          ))}
        </div>

        <Separator className="my-2" />

        {/* 提现分配规则 - 移动端优化 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-chart-4/15 rounded-lg flex items-center justify-center">
              <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-chart-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold">{language === "zh" ? "提现代币分配" : "Withdrawal Distribution"}</div>
              <div className="text-[10px] text-muted-foreground">{language === "zh" ? "国库支付USDC，代币按比例分配" : "Treasury pays USDC, tokens distributed"}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {distributionItems.map((item, index) => (
              <div
                key={index}
                className="bg-muted/40 rounded-xl p-2 sm:p-2.5 text-center border border-border/30"
              >
                <div className={`w-6 h-6 sm:w-7 sm:h-7 mx-auto mb-1 rounded-lg flex items-center justify-center ${
                  index === 0 ? 'bg-chart-2/15' : index === 1 ? 'bg-chart-5/15' : 'bg-chart-4/15'
                }`}>
                  <item.icon className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${item.color}`} />
                </div>
                <div className="text-[9px] sm:text-[10px] text-muted-foreground mb-0.5 truncate">{item.label}</div>
                <div className="text-xs sm:text-sm font-bold">{formatPercent(item.percent)}</div>
                {lastWithdrawalTokens > 0 && (
                  <div className="text-[9px] text-muted-foreground mt-0.5">{formatTokens(item.value)}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>

    <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
      <DialogContent className="max-w-sm p-4" aria-describedby="distribution-help-description">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="nav-gradient w-8 h-8 rounded-lg flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            {language === "zh" ? "代币分配说明" : "Token Distribution Guide"}
          </DialogTitle>
          <DialogDescription id="distribution-help-description" className="sr-only">
            {language === "zh" ? "了解代币供应和分配规则" : "Learn about token supply and distribution rules"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          <div className="bg-chart-2/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-chart-2" />
              <span className="font-semibold text-sm">{language === "zh" ? "代币供应" : "Token Supply"}</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• {language === "zh" ? "流通中: 用户持有的代币" : "Circulation: tokens held by users"}</div>
              <div>• {language === "zh" ? "交付合约: 待释放的代币" : "Delivery: tokens pending release"}</div>
              <div>• {language === "zh" ? "LP池: 流动性池中的代币" : "LP Pool: tokens in liquidity pool"}</div>
            </div>
          </div>

          <div className="bg-chart-1/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-4 w-4 text-chart-1" />
              <span className="font-semibold text-sm">{language === "zh" ? "奖金与销毁" : "Bonus & Burn"}</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• {language === "zh" ? "奖金池: 用于动态奖励分配" : "Bonus Pool: for dynamic reward distribution"}</div>
              <div>• {language === "zh" ? "已销毁: 永久移除流通的代币" : "Burned: permanently removed from supply"}</div>
            </div>
          </div>

          <div className="bg-chart-4/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="h-4 w-4 text-chart-4" />
              <span className="font-semibold text-sm">{language === "zh" ? "提现分配" : "Withdrawal Rules"}</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• {language === "zh" ? "60%代币回归交付合约" : "60% tokens return to delivery contract"}</div>
              <div>• {language === "zh" ? "20%代币永久销毁" : "20% tokens permanently burned"}</div>
              <div>• {language === "zh" ? "20%代币进入奖金池" : "20% tokens enter bonus pool"}</div>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setShowHelpDialog(false)}
          >
            {language === "zh" ? "我知道了" : "Got it"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
