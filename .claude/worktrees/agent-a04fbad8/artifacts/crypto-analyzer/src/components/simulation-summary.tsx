/**
 * Simulation Summary Component
 * 模拟器摘要组件 - 支持多释放队列显示
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Coins,
  Calendar,
  ChevronRight,
  Play,
  RotateCcw,
  Layers,
  ArrowDownToLine,
} from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import {
  useSystemState,
  useTimeState,
  useInvestmentStats,
  useTokenStats,
  usePoolStats,
  useSimulationActions,
  useActiveInvestments,
  useTotalDailyRelease,
  useReleaseProgress,
  useActiveReleaseQueues,
  useTodayRelease,
} from '@/hooks/use-simulation';
import { ExportButtons } from './export-panel';
import { formatCurrency, formatTokens, formatPercent } from '@/lib/tokenomics';

export function SimulationSummary() {
  const { language } = useLanguage();
  const system = useSystemState();
  const time = useTimeState();
  const investmentStats = useInvestmentStats();
  const tokenStats = useTokenStats();
  const poolStats = usePoolStats();
  const activeInvestments = useActiveInvestments();
  const activeReleaseQueues = useActiveReleaseQueues();
  const totalDailyRelease = useTotalDailyRelease();
  const releaseProgress = useReleaseProgress();
  const todayRelease = useTodayRelease();
  const { advanceDay, advanceDays, resetAll } = useSimulationActions();

  const priceChangeColor = tokenStats.priceChange >= 0 ? 'text-green-500' : 'text-red-500';
  const PriceIcon = tokenStats.priceChange >= 0 ? TrendingUp : TrendingDown;

  // 计算 ROI
  const roi = useMemo(() => {
    if (investmentStats.totalInvestment <= 0) return 0;
    return ((investmentStats.totalReleased - investmentStats.totalInvestment) / investmentStats.totalInvestment) * 100;
  }, [investmentStats.totalInvestment, investmentStats.totalReleased]);

  return (
    <Card className="mobile-premium-card">
      <CardHeader className="pb-2 pt-3 px-3 sm:px-6 sm:pt-6">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="nav-gradient w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-base font-semibold gradient-text-premium">
                {language === 'zh' ? '模拟总览' : 'Simulation Summary'}
              </span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            Day {time.currentDay}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3 sm:px-6 sm:pb-6">
        {/* 时间控制 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2"
              onClick={() => advanceDay()}
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              +1
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2"
              onClick={() => advanceDays(7)}
            >
              +7
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2"
              onClick={() => advanceDays(30)}
            >
              +30
            </Button>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2"
              onClick={() => resetAll()}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* 价格和每日释放 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/50 rounded-lg p-2.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
              <Coins className="h-2.5 w-2.5" />
              {language === 'zh' ? '代币价格' : 'Token Price'}
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-lg">
                {formatCurrency(tokenStats.tokenPrice)}
              </span>
              <div className={`flex items-center gap-0.5 ${priceChangeColor}`}>
                <PriceIcon className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">
                  {formatPercent(tokenStats.priceChange)}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
              <Calendar className="h-2.5 w-2.5" />
              {language === 'zh' ? '每日净释放' : 'Daily Net Release'}
            </div>
            <div className="font-mono font-bold text-lg text-green-500">
              +{formatCurrency(totalDailyRelease)}
            </div>
          </div>
        </div>

        {/* 多队列释放统计 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-500/10 rounded-lg p-2.5">
            <div className="flex items-center gap-1 text-[10px] text-blue-400 mb-1">
              <Layers className="h-2.5 w-2.5" />
              {language === 'zh' ? '活跃释放队列' : 'Active Queues'}
            </div>
            <div className="font-mono font-bold text-lg text-blue-500">
              {activeReleaseQueues.length}
            </div>
          </div>
          <div className="bg-orange-500/10 rounded-lg p-2.5">
            <div className="flex items-center gap-1 text-[10px] text-orange-400 mb-1">
              <ArrowDownToLine className="h-2.5 w-2.5" />
              {language === 'zh' ? '今日解锁' : "Today's Unlock"}
            </div>
            <div className="font-mono font-bold text-lg text-orange-500">
              {todayRelease ? formatCurrency(todayRelease.totalUnlockAmount) : '$0'}
            </div>
          </div>
        </div>

        {/* 释放进度 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              {language === 'zh' ? '总释放进度' : 'Total Release Progress'}
            </span>
            <span className="font-mono font-medium">
              {(releaseProgress * 100).toFixed(1)}%
            </span>
          </div>
          <Progress value={releaseProgress * 100} className="h-2" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{formatCurrency(investmentStats.totalReleased)} {language === 'zh' ? '已释放' : 'released'}</span>
            <span>{formatCurrency(investmentStats.totalScheduledRelease)} {language === 'zh' ? '计划' : 'total'}</span>
          </div>
        </div>

        <Separator className="my-2" />

        {/* 投资汇总 */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground mb-0.5">
              {language === 'zh' ? '总投资' : 'Invested'}
            </div>
            <div className="font-mono font-semibold text-sm">
              {formatCurrency(investmentStats.totalInvestment)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground mb-0.5">
              {language === 'zh' ? '已解锁' : 'Unlocked'}
            </div>
            <div className="font-mono font-semibold text-sm text-orange-500">
              {formatCurrency(investmentStats.totalUnlocked)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground mb-0.5">
              {language === 'zh' ? '已释放' : 'Released'}
            </div>
            <div className="font-mono font-semibold text-sm text-green-500">
              {formatCurrency(investmentStats.totalReleased)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground mb-0.5">
              ROI
            </div>
            <div className={`font-mono font-semibold text-sm ${roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
            </div>
          </div>
        </div>

        <Separator className="my-2" />

        {/* 活跃投资列表 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium">
              {language === 'zh' ? '质押中投资' : 'Active Staking'}
            </span>
            <Badge variant="secondary" className="text-[10px] h-5">
              {investmentStats.activeCount}/{investmentStats.totalCount}
            </Badge>
          </div>
          {activeInvestments.length === 0 ? (
            <div className="text-center py-4 text-[11px] text-muted-foreground">
              {language === 'zh' ? '暂无活跃投资，请在第1步添加投资' : 'No active investments. Add one in Step 1.'}
            </div>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {activeInvestments.slice(0, 5).map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between bg-muted/30 rounded p-1.5 text-[10px]"
                >
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[8px] px-1 h-4">
                      {inv.stakingPeriodDays}d
                    </Badge>
                    <span className="font-mono">{formatCurrency(inv.investmentUsdc)}</span>
                    {inv.useCompound && (
                      <Badge variant="secondary" className="text-[8px] px-1 h-4 bg-purple-500/20 text-purple-400">
                        {language === 'zh' ? '复利' : 'Compound'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">
                      {inv.unlockedDays}/{inv.stakingPeriodDays}
                    </span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-mono text-orange-500">
                      +{formatCurrency(inv.dailyUnlockAmount)}/d
                    </span>
                  </div>
                </div>
              ))}
              {activeInvestments.length > 5 && (
                <div className="text-center text-[10px] text-muted-foreground">
                  +{activeInvestments.length - 5} {language === 'zh' ? '更多' : 'more'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 活跃释放队列 */}
        {activeReleaseQueues.length > 0 && (
          <>
            <Separator className="my-2" />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium">
                  {language === 'zh' ? '释放队列' : 'Release Queues'}
                </span>
                <Badge variant="secondary" className="text-[10px] h-5 bg-blue-500/20 text-blue-400">
                  {activeReleaseQueues.length} {language === 'zh' ? '活跃' : 'active'}
                </Badge>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {activeReleaseQueues.slice(0, 4).map((queue) => (
                  <div
                    key={queue.id}
                    className="flex items-center justify-between bg-blue-500/10 rounded p-1.5 text-[10px]"
                  >
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[8px] px-1 h-4">
                        D{queue.unlockDay}
                      </Badge>
                      <span className="font-mono">{formatCurrency(queue.unlockAmount)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">
                        {queue.releasedDays}/{queue.releasePeriodDays}
                      </span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono text-green-500">
                        +{formatCurrency(queue.dailyReleaseAmount * (1 - queue.taxRate))}/d
                      </span>
                    </div>
                  </div>
                ))}
                {activeReleaseQueues.length > 4 && (
                  <div className="text-center text-[10px] text-muted-foreground">
                    +{activeReleaseQueues.length - 4} {language === 'zh' ? '更多队列' : 'more queues'}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <Separator className="my-2" />

        {/* 资金池状态 */}
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-muted/30 rounded p-1.5">
            <div className="text-[9px] text-muted-foreground">{language === 'zh' ? '国库' : 'Treasury'}</div>
            <div className="font-mono text-[10px] font-semibold">{formatCurrency(poolStats.treasuryBalance)}</div>
          </div>
          <div className="bg-muted/30 rounded p-1.5">
            <div className="text-[9px] text-muted-foreground">LP USDC</div>
            <div className="font-mono text-[10px] font-semibold">{formatCurrency(poolStats.lpPoolUsdt)}</div>
          </div>
          <div className="bg-muted/30 rounded p-1.5">
            <div className="text-[9px] text-muted-foreground">{language === 'zh' ? '奖励池' : 'Bonus'}</div>
            <div className="font-mono text-[10px] font-semibold">{formatTokens(poolStats.bonusPoolBalance)}</div>
          </div>
          <div className="bg-muted/30 rounded p-1.5">
            <div className="text-[9px] text-muted-foreground">{language === 'zh' ? '销毁' : 'Burned'}</div>
            <div className="font-mono text-[10px] font-semibold text-orange-500">{formatTokens(tokenStats.totalBurned)}</div>
          </div>
        </div>

        {/* 今日释放详情 */}
        {todayRelease && todayRelease.netReleaseUsdc > 0 && (
          <>
            <Separator className="my-2" />
            <div className="bg-green-500/10 rounded-lg p-2">
              <div className="text-[10px] text-green-400 mb-1">
                {language === 'zh' ? `第${todayRelease.day}天释放详情` : `Day ${todayRelease.day} Release Details`}
              </div>
              <div className="grid grid-cols-3 gap-2 text-[9px]">
                <div>
                  <div className="text-muted-foreground">{language === 'zh' ? '毛释放' : 'Gross'}</div>
                  <div className="font-mono text-green-400">{formatCurrency(todayRelease.grossReleaseUsdc)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{language === 'zh' ? '税收' : 'Tax'}</div>
                  <div className="font-mono text-red-400">-{formatCurrency(todayRelease.taxUsdc)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{language === 'zh' ? '净释放' : 'Net'}</div>
                  <div className="font-mono text-green-500 font-semibold">{formatCurrency(todayRelease.netReleaseUsdc)}</div>
                </div>
              </div>
              {todayRelease.compoundAmount > 0 && (
                <div className="mt-1 text-[9px] text-purple-400">
                  {language === 'zh' ? '复利回流' : 'Compound'}: +{formatCurrency(todayRelease.compoundAmount)}
                </div>
              )}
            </div>
          </>
        )}

        {/* 导出按钮 */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[10px] text-muted-foreground">
            {language === 'zh' ? '导出数据' : 'Export Data'}
          </span>
          <ExportButtons />
        </div>
      </CardContent>
    </Card>
  );
}
