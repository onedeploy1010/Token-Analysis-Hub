import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Settings,
  RotateCcw,
  Save,
  Percent,
  Clock,
  Users,
  Wallet,
  Coins,
} from "lucide-react";
import {
  StakingPeriod,
  StaticReleaseTax,
  DynamicReleaseTax,
  RewardTier,
  defaultStakingPeriods,
  defaultStaticReleaseTax,
  defaultDynamicReleaseTax,
  defaultRewardTiers,
} from "@shared/schema";
import { formatPercent } from "@/lib/tokenomics";

interface ParametersPanelProps {
  tokenPrice: number;
  slippage: number;
  treasuryBalance: number;
  stakingPeriods: StakingPeriod[];
  staticReleaseTax: StaticReleaseTax[];
  dynamicReleaseTax: DynamicReleaseTax[];
  rewardTiers: RewardTier[];
  onUpdate: (params: {
    tokenPrice?: number;
    slippage?: number;
    treasuryBalance?: number;
    stakingPeriods?: StakingPeriod[];
    staticReleaseTax?: StaticReleaseTax[];
    dynamicReleaseTax?: DynamicReleaseTax[];
    rewardTiers?: RewardTier[];
  }) => void;
  onReset: () => void;
}

export function ParametersPanel({
  tokenPrice,
  slippage,
  treasuryBalance,
  stakingPeriods,
  staticReleaseTax,
  dynamicReleaseTax,
  rewardTiers,
  onUpdate,
  onReset,
}: ParametersPanelProps) {
  const [localPrice, setLocalPrice] = useState(tokenPrice);
  const [localSlippage, setLocalSlippage] = useState(slippage * 100);
  const [localTreasury, setLocalTreasury] = useState(treasuryBalance);

  const handleSave = () => {
    onUpdate({
      tokenPrice: localPrice,
      slippage: localSlippage / 100,
      treasuryBalance: localTreasury,
    });
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            参数设置
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            data-testid="button-reset"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            重置
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="token-price" className="flex items-center gap-1">
              <Coins className="h-3 w-3" />
              B18 价格 (USDC)
            </Label>
            <Input
              id="token-price"
              type="number"
              min={0}
              step={0.01}
              value={localPrice}
              onChange={(e) => setLocalPrice(Number(e.target.value))}
              className="font-mono"
              data-testid="input-token-price"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slippage" className="flex items-center gap-1">
              <Percent className="h-3 w-3" />
              滑点 (%)
            </Label>
            <Input
              id="slippage"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={localSlippage}
              onChange={(e) => setLocalSlippage(Number(e.target.value))}
              className="font-mono"
              data-testid="input-slippage"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="treasury" className="flex items-center gap-1">
              <Wallet className="h-3 w-3" />
              国库余额 (USDC)
            </Label>
            <Input
              id="treasury"
              type="number"
              min={0}
              step={10000}
              value={localTreasury}
              onChange={(e) => setLocalTreasury(Number(e.target.value))}
              className="font-mono"
              data-testid="input-treasury"
            />
          </div>

          <Button onClick={handleSave} className="w-full" data-testid="button-save">
            <Save className="h-4 w-4 mr-1" />
            应用设置
          </Button>
        </div>

        <Separator />

        <Tabs defaultValue="staking">
          <TabsList className="w-full">
            <TabsTrigger value="staking" className="flex-1 text-xs">
              质押
            </TabsTrigger>
            <TabsTrigger value="release" className="flex-1 text-xs">
              释放
            </TabsTrigger>
            <TabsTrigger value="tiers" className="flex-1 text-xs">
              等级
            </TabsTrigger>
          </TabsList>

          <TabsContent value="staking" className="mt-3">
            <ScrollArea className="h-56">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  质押周期利率
                </Label>
                {stakingPeriods.map((period, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs"
                  >
                    <span>{period.days}天</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        日化 {formatPercent(period.dailyRate)}
                      </span>
                      <span className="font-mono">
                        总 {formatPercent(period.totalReturn)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="release" className="mt-3">
            <ScrollArea className="h-48">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">静态收益税率</Label>
                  {staticReleaseTax.map((tax, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs"
                    >
                      <span>
                        {tax.releaseDays === 1 ? "24小时" : `${tax.releaseDays}天`}
                      </span>
                      <span className="font-mono text-destructive">
                        {formatPercent(tax.taxRate)}
                      </span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-xs">动态收益税率</Label>
                  {dynamicReleaseTax.map((tax, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs"
                    >
                      <span>{tax.releaseDays}天</span>
                      <span className="font-mono text-destructive">
                        {formatPercent(tax.taxRate)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="tiers" className="mt-3">
            <ScrollArea className="h-48">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  会员等级要求
                </Label>
                {rewardTiers.map((tier, index) => (
                  <div
                    key={index}
                    className="p-2 bg-muted/30 rounded text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-medium">
                      <span>{tier.tier}</span>
                      <span className="text-chart-2">{tier.bonusPool}%奖金</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>质押 ${tier.stakingRequired.toLocaleString()}</span>
                      <span>小区 {tier.teamPerformance}万U</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
