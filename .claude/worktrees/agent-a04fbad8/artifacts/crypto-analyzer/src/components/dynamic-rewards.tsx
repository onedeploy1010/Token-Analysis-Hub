import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Award, TrendingUp, Layers, Droplets, Gift, Plus, Trash2, Calculator, AlertTriangle, Coins, HelpCircle, DollarSign, Flame } from "lucide-react";
import { DynamicRewardsHelpDialog } from "./help-dialogs";
import { useLanguage } from "@/contexts/language-context";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import {
  calculateFullDynamicReward,
  getTierQualifyingRange,
  formatCurrency,
  formatPercent,
  formatTokens,
} from "@/lib/tokenomics";
import { defaultRewardTiers, defaultDynamicReleaseTax, defaultSystemState, RewardTier, DynamicReleaseTax } from "@shared/schema";

interface DynamicCalculation {
  dynamicReward1: number;
  dynamicReward2: number;
}

interface LayerPerformance {
  id: number;
  performance: number;
}

interface DynamicRewardsProps {
  tokenPrice?: number;
  rewardTiers?: RewardTier[];
  dynamicReleaseTax?: DynamicReleaseTax[];
  bonusPoolB18?: number;
  onCalculationChange?: (calc: DynamicCalculation) => void;
}

export function DynamicRewards({
  tokenPrice = defaultSystemState.tokenPrice,
  rewardTiers = defaultRewardTiers,
  dynamicReleaseTax = defaultDynamicReleaseTax,
  bonusPoolB18 = 0,
  onCalculationChange,
}: DynamicRewardsProps) {
  const { t, language } = useLanguage();
  const { isDesktop } = useBreakpoint();
  const [activeTab, setActiveTab] = useState<string>("tier");
  
  const [selectedTier, setSelectedTier] = useState<string>("V3");
  const [releaseDays, setReleaseDays] = useState<number>(180);
  const [customPerformance, setCustomPerformance] = useState<number | null>(null);
  
  const [showTierDialog, setShowTierDialog] = useState(false);
  const [showLayerDialog, setShowLayerDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  
  const tierRange = useMemo(() => 
    getTierQualifyingRange(selectedTier, rewardTiers),
    [selectedTier, rewardTiers]
  );
  
  useEffect(() => {
    setCustomPerformance(tierRange.min);
  }, [selectedTier, tierRange.min]);

  const [layers, setLayers] = useState<LayerPerformance[]>([
    { id: 1, performance: 10 },
    { id: 2, performance: 9.8 },
    { id: 3, performance: 9.6 },
    { id: 4, performance: 9.4 },
    { id: 5, performance: 9.2 },
  ]);
  const [networkPerformance, setNetworkPerformance] = useState<number>(100);

  const reward1Result = useMemo(() => {
    const result = calculateFullDynamicReward(
      selectedTier,
      tokenPrice,
      releaseDays,
      false,
      1,
      rewardTiers,
      dynamicReleaseTax,
      customPerformance ?? undefined
    );
    return result;
  }, [selectedTier, tokenPrice, releaseDays, rewardTiers, dynamicReleaseTax, customPerformance]);

  const totalPerformance = useMemo(() => 
    layers.reduce((sum, l) => sum + l.performance, 0), 
    [layers]
  );
  
  const totalPerformanceUsdt = totalPerformance * 10000;
  const networkPerformanceUsdt = networkPerformance * 10000;
  const performanceRatio = totalPerformance / networkPerformance;

  const layerResults = useMemo(() => {
    return layers.map((layer, index) => {
      const layerNumber = index + 1;
      const layerPercent = Math.max(0, 100 - (layerNumber - 1) * 2) / 100;
      const layerPerformanceRatio = layer.performance / networkPerformance;
      const layerRewardB18 = layerPerformanceRatio * layerPercent * bonusPoolB18;
      return {
        layerNumber,
        layerPercent,
        layerPerformanceRatio,
        layerRewardB18,
        performance: layer.performance,
      };
    });
  }, [layers, networkPerformance, bonusPoolB18]);

  const performanceRewardB18Raw = useMemo(() => 
    layerResults.reduce((sum, l) => sum + l.layerRewardB18, 0),
    [layerResults]
  );
  
  const performanceRewardB18 = Math.min(performanceRewardB18Raw, bonusPoolB18);
  const performanceReward = performanceRewardB18 * tokenPrice;

  useEffect(() => {
    if (onCalculationChange) {
      onCalculationChange({
        dynamicReward1: reward1Result.netPayout,
        dynamicReward2: performanceReward,
      });
    }
  }, [reward1Result, performanceReward, onCalculationChange]);

  const addLayer = () => {
    if (layers.length >= 50) return;
    const newId = Math.max(...layers.map(l => l.id), 0) + 1;
    const lastPerf = layers.length > 0 ? layers[layers.length - 1].performance : 10;
    const newPerf = Math.max(0, lastPerf - 0.2);
    setLayers([...layers, { id: newId, performance: newPerf }]);
  };

  const removeLayer = (id: number) => {
    if (layers.length <= 1) return;
    setLayers(layers.filter(l => l.id !== id));
  };

  const updateLayerPerformance = (id: number, performance: number) => {
    setLayers(layers.map(l => l.id === id ? { ...l, performance } : l));
  };

  // 桌面端渲染 - 左大右小布局
  if (isDesktop) {
    return (
      <>
      <div className="h-full flex gap-4">
        {/* 左区域（大）：奖励计算 */}
        <div className="flex-[3] bg-card rounded-2xl border shadow-lg p-6 flex flex-col min-h-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="nav-gradient w-14 h-14 rounded-xl flex items-center justify-center">
              <Award className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{t("rewards.title")}</h2>
              <p className="text-sm text-muted-foreground">{language === "zh" ? "动态奖励计算器" : "Dynamic Rewards Calculator"}</p>
            </div>
            <Button variant="outline" size="icon" className="ml-auto h-12 w-12" onClick={() => setShowHelpDialog(true)}>
              <HelpCircle className="h-6 w-6" />
            </Button>
          </div>

          {/* 奖金池信息 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-muted/40 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-sm mb-2">
                <TrendingUp className="h-4 w-4" />
                {language === "zh" ? "当前价格" : "Price"}
              </div>
              <div className="font-mono font-bold text-2xl">{formatCurrency(tokenPrice)}</div>
            </div>
            <div className="bg-muted/40 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-sm mb-2">
                <Coins className="h-4 w-4" />
                {language === "zh" ? "奖金池B18" : "Pool B18"}
              </div>
              <div className="font-mono font-bold text-2xl">{formatTokens(bonusPoolB18)}</div>
            </div>
            <div className="bg-muted/40 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-sm mb-2">
                <DollarSign className="h-4 w-4" />
                {language === "zh" ? "池价值" : "Value"}
              </div>
              <div className="font-mono font-bold text-2xl">{formatCurrency(bonusPoolB18 * tokenPrice)}</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex-1 bg-muted/20 rounded-xl p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 h-12 mb-4">
                <TabsTrigger value="tier" className="gap-2 text-base"><Users className="h-5 w-5" />{t("rewards.tierTab")}</TabsTrigger>
                <TabsTrigger value="layer" className="gap-2 text-base"><Layers className="h-5 w-5" />{t("rewards.layerTab")}</TabsTrigger>
              </TabsList>

              <TabsContent value="tier" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-base">{t("rewards.memberTier")}</Label>
                    <Select value={selectedTier} onValueChange={setSelectedTier}>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {rewardTiers.map((tier, index) => {
                          const nextTier = rewardTiers[index + 1];
                          const formatPerf = (val: number) => language === "zh" ? `${val}万` : `${val * 10}k`;
                          const rangeText = nextTier ? `${formatPerf(tier.teamPerformance)}-${formatPerf(nextTier.teamPerformance)}` : `${formatPerf(tier.teamPerformance)}+`;
                          return <SelectItem key={tier.tier} value={tier.tier}>{tier.tier} <span className="text-muted-foreground text-sm ml-1">{rangeText}</span></SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base">{language === "zh" ? "释放周期" : "Period"}</Label>
                    <Select value={String(releaseDays)} onValueChange={(v) => setReleaseDays(Number(v))}>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dynamicReleaseTax.map((tax) => (
                          <SelectItem key={tax.releaseDays} value={String(tax.releaseDays)}>{tax.releaseDays}{language === "zh" ? "天" : "d"} ({formatPercent(tax.taxRate)})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">{language === "zh" ? "小区业绩" : "Team Performance"}</Label>
                    <span className="font-bold text-lg">{customPerformance?.toFixed(1) ?? tierRange.min} {language === "zh" ? "万U" : "0K"}</span>
                  </div>
                  <Slider value={[customPerformance ?? tierRange.min]} onValueChange={([val]) => setCustomPerformance(val)} min={tierRange.min} max={tierRange.max ?? tierRange.min * 2} step={0.1} className="w-full py-2" />
                </div>
              </TabsContent>

              <TabsContent value="layer" className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">{language === "zh" ? "业绩层级" : "Layers"}</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-sm">{layers.length}/50</Badge>
                    <Button size="sm" variant="outline" onClick={addLayer} disabled={layers.length >= 50}><Plus className="h-4 w-4 mr-1" />{language === "zh" ? "添加" : "Add"}</Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-base">{language === "zh" ? "全网业绩" : "Network"} ({language === "zh" ? "万" : "10K"})</Label>
                    <Input type="number" min={1} value={networkPerformance} onChange={(e) => setNetworkPerformance(Math.max(1, Number(e.target.value)))} className="h-12 text-lg font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base">{language === "zh" ? "奖金池" : "Pool"}</Label>
                    <div className="h-12 bg-muted/50 rounded-md font-mono text-lg flex items-center px-3">{formatTokens(bonusPoolB18)} B18</div>
                  </div>
                </div>
                <ScrollArea className="h-[160px]">
                  <div className="space-y-2 pr-2">
                    {layers.map((layer, index) => {
                      const result = layerResults[index];
                      return (
                        <div key={layer.id} className="flex items-center gap-3 bg-muted/30 rounded-lg p-2">
                          <Badge variant="outline" className="shrink-0 w-10 justify-center">L{result.layerNumber}</Badge>
                          <Input type="number" min={0} step={0.1} value={layer.performance} onChange={(e) => updateLayerPerformance(layer.id, Number(e.target.value))} className="font-mono flex-1 h-10" />
                          <div className="font-mono text-sm shrink-0 w-24 text-right text-chart-2">+{formatTokens(result.layerRewardB18)} B18</div>
                          <Button size="icon" variant="ghost" onClick={() => removeLayer(layer.id)} disabled={layers.length <= 1} className="h-8 w-8 shrink-0"><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* 右区域（小）：预览 + 操作 */}
        <div className="flex-[2] flex flex-col gap-4 min-h-0">
          {/* 右上：奖励预览 */}
          <div className="flex-1 bg-card rounded-2xl border shadow-lg p-4 flex flex-col min-h-0 overflow-hidden">
            <Label className="text-base font-semibold mb-3">{language === "zh" ? "奖励预览" : "Reward Preview"}</Label>

            {activeTab === "tier" ? (
              <div className="flex-1 space-y-3">
                <div className="bg-chart-2/10 rounded-xl p-4 text-center">
                  <div className="text-sm text-muted-foreground mb-1">{language === "zh" ? "日奖励" : "Daily"}</div>
                  <div className="font-bold text-3xl text-chart-2">{formatTokens(reward1Result.netRewardB18 || 0)} B18</div>
                  <div className="text-sm text-muted-foreground">≈ {formatCurrency(reward1Result.netPayout)}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/40 rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">{language === "zh" ? "月奖励" : "Monthly"}</div>
                    <div className="text-lg font-bold text-chart-2">{formatTokens((reward1Result.netRewardB18 || 0) * 30)}</div>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">{language === "zh" ? "年奖励" : "Yearly"}</div>
                    <div className="text-lg font-bold text-chart-2">{formatTokens((reward1Result.netRewardB18 || 0) * 360)}</div>
                  </div>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground">{selectedTier} · {customPerformance?.toFixed(1) ?? tierRange.min}{language === "zh" ? "万U业绩" : "0K"}</div>
                </div>
              </div>
            ) : (
              <div className="flex-1 space-y-3">
                <div className="bg-chart-2/10 rounded-xl p-4 text-center">
                  <div className="text-sm text-muted-foreground mb-1">{language === "zh" ? "总奖励" : "Total"}</div>
                  <div className="font-bold text-3xl text-chart-2">{formatTokens(performanceRewardB18)} B18</div>
                  <div className="text-sm text-muted-foreground">{formatCurrency(performanceReward)}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-muted/40 rounded-lg p-2 text-center">
                    <div className="text-xs text-muted-foreground">{language === "zh" ? "层数" : "Layers"}</div>
                    <div className="text-lg font-bold">{layers.length}</div>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-2 text-center">
                    <div className="text-xs text-muted-foreground">{language === "zh" ? "总业绩" : "Total"}</div>
                    <div className="text-lg font-bold">{totalPerformance.toFixed(1)}</div>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-2 text-center">
                    <div className="text-xs text-muted-foreground">{language === "zh" ? "占比" : "Ratio"}</div>
                    <div className="text-lg font-bold">{formatPercent(performanceRatio)}</div>
                  </div>
                </div>
                {performanceRewardB18Raw > bonusPoolB18 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-center text-sm text-amber-600">
                    {language === "zh" ? "已限制于奖金池上限" : "Capped at pool limit"}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 右下：操作按钮 */}
          <div className="bg-card rounded-2xl border shadow-lg p-4 shrink-0">
            <Button className="w-full h-14 text-lg font-bold" onClick={() => activeTab === "tier" ? setShowTierDialog(true) : setShowLayerDialog(true)}>
              <Calculator className="h-5 w-5 mr-2" />
              {activeTab === "tier" ? (language === "zh" ? "计算等级奖励" : "Calculate Tier") : (language === "zh" ? "计算层级奖励" : "Calculate Layer")}
            </Button>
          </div>
        </div>
      </div>

      {/* 共用弹窗 */}
      <Dialog open={showTierDialog} onOpenChange={setShowTierDialog}>
        <DialogContent className="max-w-md lg:max-w-2xl p-6">
          <DialogHeader className="pb-3">
            <DialogTitle className="flex items-center gap-2 text-xl"><Users className="h-5 w-5 text-chart-2" />{language === "zh" ? "等级奖励" : "Tier Reward"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-chart-2/10 rounded-xl p-4 text-center">
              <div className="text-sm text-muted-foreground">{language === "zh" ? "日奖励" : "Daily"}</div>
              <div className="font-bold text-3xl text-chart-2">{formatTokens(reward1Result.netRewardB18 || 0)} B18</div>
              <div className="text-base text-muted-foreground">≈ {formatCurrency(reward1Result.netPayout)}</div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/40 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">{language === "zh" ? "日" : "Day"}</div>
                <div className="text-lg font-bold text-chart-2">{formatCurrency(reward1Result.netPayout)}</div>
              </div>
              <div className="bg-muted/40 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">{language === "zh" ? "月" : "Month"}</div>
                <div className="text-lg font-bold text-chart-2">{formatCurrency(reward1Result.netPayout * 30)}</div>
              </div>
              <div className="bg-muted/40 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">{language === "zh" ? "年" : "Year"}</div>
                <div className="text-lg font-bold text-chart-2">{formatCurrency(reward1Result.netPayout * 360)}</div>
              </div>
            </div>
            <Button className="w-full h-12" onClick={() => setShowTierDialog(false)}>{language === "zh" ? "确认" : "Confirm"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLayerDialog} onOpenChange={setShowLayerDialog}>
        <DialogContent className="max-w-md lg:max-w-2xl p-6">
          <DialogHeader className="pb-3">
            <DialogTitle className="flex items-center gap-2 text-xl"><Layers className="h-5 w-5 text-chart-1" />{language === "zh" ? "层级奖励" : "Layer Reward"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-chart-2/10 rounded-xl p-4 text-center">
              <div className="text-sm text-muted-foreground">{language === "zh" ? "总奖励" : "Total"}</div>
              <div className="font-bold text-3xl text-chart-2">{formatTokens(performanceRewardB18)} B18</div>
              <div className="text-base text-muted-foreground">{formatCurrency(performanceReward)}</div>
            </div>
            <ScrollArea className="h-[150px]">
              <div className="space-y-1 pr-2">
                {layerResults.map((result) => (
                  <div key={result.layerNumber} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2">
                    <Badge variant="outline">L{result.layerNumber}</Badge>
                    <span className="text-muted-foreground">{result.performance}{language === "zh" ? "万" : "0K"}</span>
                    <span className="text-muted-foreground">x{formatPercent(result.layerPercent)}</span>
                    <span className="text-chart-2 font-bold">+{formatTokens(result.layerRewardB18)}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Button className="w-full h-12" onClick={() => setShowLayerDialog(false)}>{language === "zh" ? "确认" : "Confirm"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <DynamicRewardsHelpDialog open={showHelpDialog} onOpenChange={setShowHelpDialog} language={language} />
      </>
    );
  }

  // 移动端渲染
  return (
    <Card className="mobile-premium-card max-w-md mx-auto lg:max-w-2xl">
      <CardHeader className="pb-3 pt-4 px-4 lg:px-6 lg:pt-6 text-center">
        <CardTitle className="flex flex-col items-center gap-3">
          <div className="nav-gradient w-14 h-14 rounded-xl flex items-center justify-center shrink-0">
            <Award className="h-7 w-7 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text-premium">{t("rewards.title")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted/50 rounded-md p-2 text-center">
            <div className="flex items-center justify-center gap-0.5 text-muted-foreground text-[10px] mb-0.5">
              <TrendingUp className="h-2.5 w-2.5" />
              {language === "zh" ? "价格" : "Price"}
            </div>
            <div className="font-mono font-semibold text-sm">{formatCurrency(tokenPrice)}</div>
          </div>
          <div className="bg-muted/50 rounded-md p-2 text-center">
            <div className="flex items-center justify-center gap-0.5 text-muted-foreground text-[10px] mb-0.5">
              <Coins className="h-2.5 w-2.5" />
              {language === "zh" ? "奖金池" : "Pool"}
            </div>
            <div className="font-mono font-semibold text-sm">{formatTokens(bonusPoolB18)}</div>
          </div>
          <div className="bg-muted/50 rounded-md p-2 text-center">
            <div className="flex items-center justify-center gap-0.5 text-muted-foreground text-[10px] mb-0.5">
              <DollarSign className="h-2.5 w-2.5" />
              {language === "zh" ? "价值" : "Value"}
            </div>
            <div className="font-mono font-semibold text-sm">{formatCurrency(bonusPoolB18 * tokenPrice)}</div>
          </div>
        </div>

        <div className="gradient-card p-3 space-y-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 h-10">
            <TabsTrigger value="tier" className="gap-1.5 text-sm" data-testid="tab-tier">
              <Users className="h-4 w-4" />
              {t("rewards.tierTab")}
            </TabsTrigger>
            <TabsTrigger value="layer" className="gap-1.5 text-sm" data-testid="tab-layer">
              <Layers className="h-4 w-4" />
              {t("rewards.layerTab")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tier" className="space-y-2 mt-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-sm">{t("rewards.memberTier")}</Label>
                <Select value={selectedTier} onValueChange={setSelectedTier}>
                  <SelectTrigger data-testid="select-tier" className="h-8 text-xs">
                    <SelectValue placeholder={language === "zh" ? "选择" : "Select"} />
                  </SelectTrigger>
                  <SelectContent>
                    {rewardTiers.map((tier, index) => {
                      const nextTier = rewardTiers[index + 1];
                      const formatPerf = (val: number) => language === "zh" ? `${val}万` : `${val * 10}k`;
                      const rangeText = nextTier
                        ? `${formatPerf(tier.teamPerformance)}-${formatPerf(nextTier.teamPerformance)}`
                        : `${formatPerf(tier.teamPerformance)}+`;
                      return (
                        <SelectItem key={tier.tier} value={tier.tier}>
                          <span>{tier.tier}</span>
                          <span className="text-muted-foreground text-[10px] ml-1">{rangeText}</span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">{language === "zh" ? "释放周期" : "Period"}</Label>
                <Select value={String(releaseDays)} onValueChange={(v) => setReleaseDays(Number(v))}>
                  <SelectTrigger data-testid="select-release-days" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dynamicReleaseTax.map((tax) => (
                      <SelectItem key={tax.releaseDays} value={String(tax.releaseDays)}>
                        {tax.releaseDays}{language === "zh" ? "天" : "d"} ({formatPercent(tax.taxRate)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <Label>{language === "zh" ? "小区业绩" : "Team"}</Label>
                <span className="font-semibold">{customPerformance?.toFixed(1) ?? tierRange.min} {language === "zh" ? "万U" : "0K"}</span>
              </div>
              <Slider value={[customPerformance ?? tierRange.min]} onValueChange={([val]) => setCustomPerformance(val)} min={tierRange.min} max={tierRange.max ?? tierRange.min * 2} step={0.1} className="w-full" data-testid="slider-performance" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{tierRange.min}{language === "zh" ? "万" : `0k`}</span>
                <span>{tierRange.max ? `${tierRange.max}${language === "zh" ? "万" : "0k"}` : `${tierRange.min * 2}${language === "zh" ? "万+" : "0k+"}`}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1 h-10" onClick={() => setShowTierDialog(true)} data-testid="button-calc-tier">
                <Calculator className="h-4 w-4 mr-1.5" />
                <span className="text-sm font-semibold">{language === "zh" ? "计算等级奖励" : "Calculate"}</span>
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => setShowHelpDialog(true)}
                data-testid="button-help-rewards-tier"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="layer" className="space-y-2 mt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs">
                <Calculator className="h-3.5 w-3.5 text-chart-1" />
                <span className="font-medium">{language === "zh" ? "业绩奖励" : "Layer Reward"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px] px-1 h-5">{layers.length}/50</Badge>
                <Button size="icon" variant="outline" onClick={addLayer} disabled={layers.length >= 50} data-testid="button-add-layer" className="h-6 w-6">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-sm">{language === "zh" ? "全网业绩" : "Network"} ({language === "zh" ? "万" : "10K"})</Label>
                <Input type="number" min={1} value={networkPerformance} onChange={(e) => setNetworkPerformance(Math.max(1, Number(e.target.value)))} className="h-8 text-sm font-mono" data-testid="input-network-performance" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">{language === "zh" ? "奖金池" : "Pool"}</Label>
                <div className="h-8 bg-muted/50 rounded-md font-mono text-xs flex items-center px-2">{formatTokens(bonusPoolB18)}</div>
              </div>
            </div>

            <ScrollArea className="h-[120px]">
              <div className="space-y-1.5 pr-2">
                {layers.map((layer, index) => {
                  const result = layerResults[index];
                  return (
                    <div key={layer.id} className="flex items-center gap-1.5 bg-muted/30 rounded p-1.5">
                      <Badge variant="outline" className="shrink-0 w-7 justify-center text-[10px] px-0.5 h-5">L{result.layerNumber}</Badge>
                      <Input type="number" min={0} step={0.1} value={layer.performance} onChange={(e) => updateLayerPerformance(layer.id, Number(e.target.value))} className="font-mono flex-1 text-xs h-7" data-testid={`input-layer-${result.layerNumber}`} />
                      <div className="font-mono text-[10px] shrink-0 w-12 text-right text-chart-2">+{formatTokens(result.layerRewardB18)}</div>
                      <Button size="icon" variant="ghost" onClick={() => removeLayer(layer.id)} disabled={layers.length <= 1} className="h-6 w-6 shrink-0" data-testid={`button-remove-layer-${result.layerNumber}`}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {totalPerformance > networkPerformance && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded p-1.5 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                <p className="text-[10px] text-amber-600 dark:text-amber-400">{language === "zh" ? "层级业绩超过全网" : "Exceeds network"}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button className="flex-1 h-10" onClick={() => setShowLayerDialog(true)} data-testid="button-calc-layer">
                <Calculator className="h-4 w-4 mr-1.5" />
                <span className="text-sm font-semibold">{language === "zh" ? "计算层级奖励" : "Calculate"}</span>
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => setShowHelpDialog(true)}
                data-testid="button-help-rewards-layer"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showTierDialog} onOpenChange={setShowTierDialog}>
        <DialogContent className="max-w-sm p-3">
          <DialogHeader className="pb-1">
            <DialogTitle className="flex items-center gap-1.5 text-base">
              <Users className="h-4 w-4 text-chart-2" />
              {language === "zh" ? "等级奖励" : "Tier Reward"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <div className="bg-chart-2/10 rounded-md p-2 text-center">
              <div className="text-[10px] text-muted-foreground">{language === "zh" ? "国库日支付" : "Daily"}</div>
              <div className="font-bold text-xl text-chart-2" data-testid="text-reward1">{formatTokens(reward1Result.netRewardB18 || 0)} B18</div>
              <div className="text-xs text-muted-foreground">≈ {formatCurrency(reward1Result.netPayout)}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{selectedTier} · {customPerformance?.toFixed(1) ?? tierRange.min}{language === "zh" ? "万U" : "0K"}</div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-muted/50 rounded-md p-1.5 text-center">
                <div className="text-[10px] text-muted-foreground">{language === "zh" ? "日" : "Day"}</div>
                <div className="text-sm font-semibold text-chart-2">{formatTokens(reward1Result.netRewardB18 || 0)}</div>
                <div className="text-[9px] text-muted-foreground">{formatCurrency(reward1Result.netPayout)}</div>
              </div>
              <div className="bg-muted/50 rounded-md p-1.5 text-center">
                <div className="text-[10px] text-muted-foreground">{language === "zh" ? "月" : "Mon"}</div>
                <div className="text-sm font-semibold text-chart-2">{formatTokens((reward1Result.netRewardB18 || 0) * 30)}</div>
                <div className="text-[9px] text-muted-foreground">{formatCurrency(reward1Result.netPayout * 30)}</div>
              </div>
              <div className="bg-muted/50 rounded-md p-1.5 text-center">
                <div className="text-[10px] text-muted-foreground">{language === "zh" ? "年" : "Year"}</div>
                <div className="text-sm font-semibold text-chart-2">{formatTokens((reward1Result.netRewardB18 || 0) * 360)}</div>
                <div className="text-[9px] text-muted-foreground">{formatCurrency(reward1Result.netPayout * 360)}</div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-md p-2 space-y-1 text-[10px]">
              <div className="flex justify-between"><span className="text-muted-foreground">{language === "zh" ? "业绩B18" : "Perf"}</span><span className="font-semibold">{formatTokens(reward1Result.communityB18 || 0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{language === "zh" ? "奖励比例" : "Rate"}</span><span className="font-semibold">1.2%</span></div>
              <div className="flex justify-between font-medium pt-0.5 border-t border-border/50"><span>{language === "zh" ? "日奖励" : "Daily"}</span><span className="font-semibold">{formatTokens(reward1Result.netRewardB18 || 0)} B18</span></div>
            </div>

            <div className="bg-chart-2/5 rounded-md p-2 text-center text-[10px] text-muted-foreground">
              {language === "zh" ? "等级奖励由国库直接支付，无税收" : "Tier rewards paid directly from treasury, no tax"}
            </div>

            <Button size="sm" className="w-full" onClick={() => setShowTierDialog(false)} data-testid="button-confirm-tier">{language === "zh" ? "确认" : "Confirm"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLayerDialog} onOpenChange={setShowLayerDialog}>
        <DialogContent className="max-w-sm p-3">
          <DialogHeader className="pb-1">
            <DialogTitle className="flex items-center gap-1.5 text-base">
              <Layers className="h-4 w-4 text-chart-1" />
              {language === "zh" ? "层级奖励" : "Layer Reward"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-2">
            <div className="bg-chart-2/10 rounded-md p-2 text-center">
              <div className="text-[10px] text-muted-foreground">{language === "zh" ? "总奖励" : "Total"}</div>
              <div className="font-bold text-xl text-chart-2" data-testid="text-layer-total">{formatTokens(performanceRewardB18)} B18</div>
              <div className="text-xs text-muted-foreground">{formatCurrency(performanceReward)}</div>
              {performanceRewardB18Raw > bonusPoolB18 && <p className="text-[10px] text-amber-500">{language === "zh" ? "已限制于奖金池" : "Capped"}</p>}
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-muted/50 rounded-md p-1.5 text-center">
                <div className="text-[10px] text-muted-foreground">{language === "zh" ? "层数" : "Layers"}</div>
                <div className="text-sm font-semibold">{layers.length}</div>
              </div>
              <div className="bg-muted/50 rounded-md p-1.5 text-center">
                <div className="text-[10px] text-muted-foreground">{language === "zh" ? "总业绩" : "Total"}</div>
                <div className="text-sm font-semibold">{totalPerformance.toFixed(1)}</div>
              </div>
              <div className="bg-muted/50 rounded-md p-1.5 text-center">
                <div className="text-[10px] text-muted-foreground">{language === "zh" ? "占比" : "Ratio"}</div>
                <div className="text-sm font-semibold">{formatPercent(performanceRatio)}</div>
              </div>
            </div>

            <ScrollArea className="h-[100px]">
              <div className="space-y-0.5 pr-2">
                {layerResults.map((result) => (
                  <div key={result.layerNumber} className="flex items-center justify-between text-[10px] bg-muted/30 rounded px-1.5 py-0.5">
                    <Badge variant="outline" className="text-[8px] px-0.5 h-4">L{result.layerNumber}</Badge>
                    <span className="text-muted-foreground">{result.performance}</span>
                    <span className="text-muted-foreground">x{formatPercent(result.layerPercent)}</span>
                    <span className="text-chart-2 font-medium">+{formatTokens(result.layerRewardB18)}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <p className="text-[9px] text-muted-foreground text-center">{language === "zh" ? "(层业绩÷全网) × 层比例 × 奖金池" : "(layer÷net) × layer% × pool"}</p>

            <Button size="sm" className="w-full" onClick={() => setShowLayerDialog(false)} data-testid="button-confirm-layer">{language === "zh" ? "确认" : "Confirm"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <DynamicRewardsHelpDialog
        open={showHelpDialog}
        onOpenChange={setShowHelpDialog}
        language={language}
      />
      </CardContent>
    </Card>
  );
}
