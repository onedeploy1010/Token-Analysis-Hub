/**
 * Staking & Release Panel
 * 质押释放面板 - 多队列释放模型
 *
 * 核心逻辑:
 * 1. 每日解锁 = (本金 + 利息) / 质押天数
 * 2. 每笔解锁进入独立释放队列，根据释放天数逐日释放
 * 3. 第N天收到的释放 = 所有活跃队列当天的释放之和
 * 4. 峰值释放 = min(质押天数, 释放天数) 个队列同时释放
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Coins,
  TrendingUp,
  Clock,
  HelpCircle,
  Plus,
  Calculator,
  Flame,
  Gift,
  Shield,
  Layers,
  ArrowRight,
  CalendarDays,
} from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { useSystemState, useConfigState, useSimulationActions, useReleasePreview } from '@/hooks/use-simulation';
import { formatCurrency, formatTokens, calculateStakingReturns } from '@/lib/tokenomics';
import { B18_DISTRIBUTION } from '@shared/schema';

export function StakingReleasePanel() {
  const { language } = useLanguage();
  const system = useSystemState();
  const config = useConfigState();
  const { addInvestment } = useSimulationActions();

  // 输入状态
  const [investmentUsdc, setInvestmentUsdc] = useState<number>(1000);
  const [stakingPeriodDays, setStakingPeriodDays] = useState<number>(90);
  const [releasePeriodDays, setReleasePeriodDays] = useState<number>(15);
  const [useCompound, setUseCompound] = useState<boolean>(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);

  // 获取当前选择的配置
  const stakingConfig = useMemo(() => {
    return config.stakingPeriods.find(p => p.days === stakingPeriodDays) || config.stakingPeriods[0];
  }, [config.stakingPeriods, stakingPeriodDays]);

  const releaseConfig = useMemo(() => {
    return config.staticReleaseTax.find(t => t.releaseDays === releasePeriodDays) || config.staticReleaseTax[0];
  }, [config.staticReleaseTax, releasePeriodDays]);

  // 使用释放预览 hook
  const releasePreview = useReleasePreview({
    investmentUsdc,
    stakingPeriodDays,
    releasePeriodDays,
    useCompound,
  });

  // 计算质押收益 (用于显示)
  const stakingResult = useMemo(() => {
    const tokensPurchased = investmentUsdc / system.tokenPrice;
    const result = calculateStakingReturns(
      tokensPurchased,
      system.tokenPrice,
      stakingPeriodDays,
      config.stakingPeriods,
      useCompound
    );
    return {
      tokensPurchased,
      ...result,
    };
  }, [investmentUsdc, system.tokenPrice, stakingPeriodDays, config.stakingPeriods, useCompound]);

  // 添加投资
  const handleAddInvestment = useCallback(() => {
    if (investmentUsdc <= 0) return;
    addInvestment({
      investmentUsdc,
      stakingPeriodDays,
      releasePeriodDays,
      useCompound,
    });
  }, [addInvestment, investmentUsdc, stakingPeriodDays, releasePeriodDays, useCompound]);

  return (
    <Card className="mobile-premium-card">
      <CardHeader className="pb-2 pt-3 px-3 sm:px-6 sm:pt-6">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="nav-gradient w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
              <Coins className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-base font-semibold gradient-text-premium">
                {language === 'zh' ? '质押与释放' : 'Staking & Release'}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setShowHelpDialog(true)}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 px-3 pb-3 sm:px-6 sm:pb-6">
        {/* 投资金额 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] flex items-center gap-1">
              <Coins className="h-3 w-3" />
              {language === 'zh' ? '投资金额 (USDC)' : 'Investment (USDC)'}
            </Label>
            <Badge variant="outline" className="text-[10px] h-5">
              {language === 'zh' ? '当前价格' : 'Price'}: ${system.tokenPrice.toFixed(2)}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              value={investmentUsdc}
              onChange={(e) => setInvestmentUsdc(Math.max(0, parseFloat(e.target.value) || 0))}
              className="font-mono"
              min={0}
            />
            <div className="flex gap-1">
              {[1000, 5000, 10000].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  className="h-9 px-2 text-xs"
                  onClick={() => setInvestmentUsdc(amount)}
                >
                  {amount >= 1000 ? `${amount / 1000}K` : amount}
                </Button>
              ))}
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground">
            = {formatTokens(stakingResult.tokensPurchased)} B18
          </div>
        </div>

        {/* 质押周期 */}
        <div className="space-y-1.5">
          <Label className="text-[11px] flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {language === 'zh' ? '质押周期' : 'Staking Period'}
          </Label>
          <div className="grid grid-cols-4 gap-1">
            {config.stakingPeriods.map((period) => (
              <Button
                key={period.days}
                variant={stakingPeriodDays === period.days ? 'default' : 'outline'}
                size="sm"
                className="h-14 flex-col gap-0.5"
                onClick={() => setStakingPeriodDays(period.days)}
              >
                <span className="text-sm font-semibold">{period.days}</span>
                <span className="text-[9px] opacity-80">
                  {(period.dailyRate * 100).toFixed(1)}%/{language === 'zh' ? '日' : 'd'}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* 释放周期 */}
        <div className="space-y-1.5">
          <Label className="text-[11px] flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {language === 'zh' ? '释放周期' : 'Release Period'}
          </Label>
          <div className="grid grid-cols-4 gap-1">
            {config.staticReleaseTax.map((tax) => (
              <Button
                key={tax.releaseDays}
                variant={releasePeriodDays === tax.releaseDays ? 'default' : 'outline'}
                size="sm"
                className="h-14 flex-col gap-0.5"
                onClick={() => setReleasePeriodDays(tax.releaseDays)}
              >
                <span className="text-sm font-semibold">{tax.releaseDays}</span>
                <span className="text-[9px] opacity-80">
                  {(tax.taxRate * 100).toFixed(0)}% {language === 'zh' ? '税' : 'tax'}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* 复利开关 */}
        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2.5">
          <div>
            <Label className="text-[11px] font-medium">
              {language === 'zh' ? '复利滚存' : 'Compound Mode'}
            </Label>
            <p className="text-[9px] text-muted-foreground">
              {language === 'zh' ? '释放金额累加到本金' : 'Released amount added to principal'}
            </p>
          </div>
          <Switch checked={useCompound} onCheckedChange={setUseCompound} />
        </div>

        <Separator />

        {/* 计算结果 */}
        {releasePreview && (
          <div className="space-y-2">
            <div className="text-[11px] font-medium flex items-center gap-1">
              <Calculator className="h-3 w-3" />
              {language === 'zh' ? '多队列释放预估' : 'Multi-Queue Release Estimate'}
            </div>

            {/* 质押收益 */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-muted-foreground">
                  {language === 'zh' ? '质押总收益' : 'Total Staking Return'} ({stakingPeriodDays}{language === 'zh' ? '天' : 'd'})
                </span>
                <Badge variant="secondary" className="text-[9px] h-4">
                  {useCompound ? (language === 'zh' ? '复利' : 'Compound') : (language === 'zh' ? '单利' : 'Simple')}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[9px] text-muted-foreground">{language === 'zh' ? '本金' : 'Principal'}</div>
                  <div className="font-mono text-xs">{formatCurrency(releasePreview.investment)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground">{language === 'zh' ? '利息' : 'Interest'}</div>
                  <div className="font-mono text-xs text-green-500">+{formatCurrency(releasePreview.totalInterest)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground">{language === 'zh' ? '合计' : 'Total'}</div>
                  <div className="font-mono text-xs font-semibold">{formatCurrency(releasePreview.totalValue)}</div>
                </div>
              </div>
            </div>

            {/* 多队列释放说明 */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {language === 'zh' ? '释放队列机制' : 'Release Queue System'}
                </span>
                <Badge variant="outline" className="text-[9px] h-4">
                  {releaseConfig.taxRate * 100}% {language === 'zh' ? '税' : 'tax'}
                </Badge>
              </div>

              <div className="space-y-2">
                {/* 每日解锁 */}
                <div className="flex items-center justify-between bg-orange-500/10 rounded p-1.5">
                  <div className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3 text-orange-500" />
                    <span className="text-[10px]">{language === 'zh' ? '每日解锁' : 'Daily Unlock'}</span>
                  </div>
                  <span className="font-mono text-xs text-orange-500">{formatCurrency(releasePreview.dailyUnlock)}</span>
                </div>

                {/* 解锁进入队列 */}
                <div className="flex items-center justify-center text-[10px] text-muted-foreground">
                  <ArrowRight className="h-3 w-3 mx-1" />
                  {language === 'zh' ? '进入' : 'enters'} {releasePeriodDays} {language === 'zh' ? '天释放队列' : 'day release queue'}
                </div>

                {/* 每队列每日释放 */}
                <div className="flex items-center justify-between bg-green-500/10 rounded p-1.5">
                  <span className="text-[10px]">{language === 'zh' ? '每队列每日释放' : 'Per-queue Daily'}</span>
                  <span className="font-mono text-xs">{formatCurrency(releasePreview.dailyReleasePerQueue)}</span>
                </div>

                {/* 最大并发队列 */}
                <div className="flex items-center justify-between bg-blue-500/10 rounded p-1.5">
                  <span className="text-[10px]">{language === 'zh' ? '最大并发队列' : 'Max Concurrent'}</span>
                  <span className="font-mono text-xs">{releasePreview.maxConcurrentQueues} {language === 'zh' ? '个' : ''}</span>
                </div>

                {/* 峰值日释放 */}
                <div className="flex items-center justify-between bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded p-1.5">
                  <span className="text-[10px] font-medium">{language === 'zh' ? '峰值日净释放' : 'Peak Daily Net'}</span>
                  <span className="font-mono text-xs font-bold text-green-500">{formatCurrency(releasePreview.peakDailyReleaseNet)}/d</span>
                </div>
              </div>
            </div>

            {/* 释放示例 */}
            <div className="bg-muted/30 rounded-lg p-2.5">
              <div className="text-[10px] text-muted-foreground mb-1.5">
                {language === 'zh' ? '释放示例 (前5天)' : 'Release Example (First 5 Days)'}
              </div>
              <div className="space-y-1">
                {[1, 2, 3, 4, 5].map((day) => {
                  const activeQueues = Math.min(day, releasePeriodDays, stakingPeriodDays);
                  const grossRelease = activeQueues * releasePreview.dailyReleasePerQueue;
                  const netRelease = grossRelease * (1 - releaseConfig.taxRate);
                  return (
                    <div key={day} className="flex items-center justify-between text-[9px]">
                      <span className="text-muted-foreground">
                        Day {day}: {activeQueues} {language === 'zh' ? '队列' : 'queues'}
                      </span>
                      <span className="font-mono text-green-500">+{formatCurrency(netRelease)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* B18 分配 */}
            <div className="bg-muted/50 rounded-lg p-2.5">
              <div className="text-[10px] text-muted-foreground mb-1.5">
                {language === 'zh' ? 'B18 代币分配 (每日)' : 'B18 Distribution (Daily)'}
              </div>
              <div className="grid grid-cols-4 gap-1 text-[9px] text-center">
                <div>
                  <div className="text-muted-foreground">{language === 'zh' ? '交付' : 'Delivery'}</div>
                  <div className="font-mono">{formatTokens(releasePreview.dailyUnlock / system.tokenPrice * B18_DISTRIBUTION.deliveryContract)}</div>
                  <Badge variant="outline" className="text-[8px] h-3 mt-0.5">50%</Badge>
                </div>
                <div>
                  <div className="text-muted-foreground flex items-center justify-center gap-0.5">
                    <Flame className="h-2.5 w-2.5 text-orange-500" />
                    {language === 'zh' ? '销毁' : 'Burn'}
                  </div>
                  <div className="font-mono text-orange-500">{formatTokens(releasePreview.dailyUnlock / system.tokenPrice * B18_DISTRIBUTION.burn)}</div>
                  <Badge variant="outline" className="text-[8px] h-3 mt-0.5">20%</Badge>
                </div>
                <div>
                  <div className="text-muted-foreground flex items-center justify-center gap-0.5">
                    <Gift className="h-2.5 w-2.5 text-purple-500" />
                    {language === 'zh' ? '奖励' : 'Bonus'}
                  </div>
                  <div className="font-mono">{formatTokens(releasePreview.dailyUnlock / system.tokenPrice * B18_DISTRIBUTION.bonusPool)}</div>
                  <Badge variant="outline" className="text-[8px] h-3 mt-0.5">20%</Badge>
                </div>
                <div>
                  <div className="text-muted-foreground flex items-center justify-center gap-0.5">
                    <Shield className="h-2.5 w-2.5 text-blue-500" />
                    SPP
                  </div>
                  <div className="font-mono">{formatTokens(releasePreview.dailyUnlock / system.tokenPrice * B18_DISTRIBUTION.spp)}</div>
                  <Badge variant="outline" className="text-[8px] h-3 mt-0.5">10%</Badge>
                </div>
              </div>
            </div>

            {/* 总结 */}
            <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-[9px] text-muted-foreground mb-0.5">
                    {language === 'zh' ? '总释放周期' : 'Total Period'}
                  </div>
                  <div className="font-mono text-lg font-bold">
                    {releasePreview.totalReleasePeriod} {language === 'zh' ? '天' : 'd'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-muted-foreground mb-0.5">
                    {language === 'zh' ? '预计总净收益' : 'Est. Total Net'}
                  </div>
                  <div className="font-mono text-lg font-bold text-green-500">
                    {formatCurrency(releasePreview.totalNetRelease)}
                  </div>
                </div>
              </div>
              <div className="text-center mt-2 text-[9px] text-muted-foreground">
                {language === 'zh' ? '总税费' : 'Total Tax'}: {formatCurrency(releasePreview.totalTax)} ({releasePreview.taxRate.toFixed(0)}%)
              </div>
            </div>
          </div>
        )}

        {/* 添加按钮 */}
        <Button
          className="w-full h-12"
          onClick={handleAddInvestment}
          disabled={investmentUsdc <= 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          {language === 'zh' ? '添加投资' : 'Add Investment'}
        </Button>
      </CardContent>

      {/* 帮助对话框 */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              {language === 'zh' ? '多队列释放说明' : 'Multi-Queue Release Guide'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="font-medium mb-1">
                {language === 'zh' ? '1. 每日解锁' : '1. Daily Unlock'}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {language === 'zh'
                  ? '质押期间，每天解锁金额 = (本金 + 利息) ÷ 质押天数。每笔解锁独立进入释放队列。'
                  : 'During staking, daily unlock = (Principal + Interest) ÷ Staking days. Each unlock enters its own release queue.'}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="font-medium mb-1">
                {language === 'zh' ? '2. 独立释放队列' : '2. Independent Queues'}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {language === 'zh'
                  ? '例: 第1天解锁$5进入15天队列，每天释放$5÷15。第2天解锁$5也进入新的15天队列。'
                  : 'E.g.: Day 1 unlocks $5 into a 15-day queue, releasing $5÷15 daily. Day 2 creates another queue.'}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="font-medium mb-1">
                {language === 'zh' ? '3. 累加释放' : '3. Cumulative Release'}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {language === 'zh'
                  ? '第2天收到: 第1笔的第2天 + 第2笔的第1天 = 2份释放。随着时间推移，活跃队列数增加，每日释放递增。'
                  : 'Day 2 receives: 1st unlock day 2 + 2nd unlock day 1 = 2 portions. Active queues increase over time.'}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="font-medium mb-1">
                {language === 'zh' ? '4. 峰值释放' : '4. Peak Release'}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {language === 'zh'
                  ? '最大并发队列数 = min(质押天数, 释放天数)。当所有队列同时活跃时达到峰值日释放。'
                  : 'Max concurrent queues = min(staking days, release days). Peak daily release when all queues are active.'}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="font-medium mb-1">
                {language === 'zh' ? '5. 复利模式' : '5. Compound Mode'}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {language === 'zh'
                  ? '复利模式下，每日释放的净收益会累加到本金，使后续利息和解锁金额动态增长。'
                  : 'In compound mode, daily net release is added to principal, causing interest and unlocks to grow dynamically.'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
