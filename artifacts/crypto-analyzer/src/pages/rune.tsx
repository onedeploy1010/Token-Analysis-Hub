import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetRuneOverview,
  useCalculateRuneReturns,
  RuneCalculatorInputNodeLevel,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  ArrowLeft,
  BarChart2,
  Coins,
  Flame,
  TrendingUp,
  Layers,
  BadgeCheck,
  ChevronRight,
} from "lucide-react";
import { Link } from "wouter";

const NODE_COLORS: Record<string, string> = {
  pioneer: "hsl(217,80%,58%)",
  builder: "hsl(142,70%,45%)",
  guardian: "hsl(38,92%,50%)",
  strategic: "hsl(280,70%,60%)",
};

const NODE_BG: Record<string, string> = {
  pioneer: "from-blue-950/60 to-blue-900/20 border-blue-800/40",
  builder: "from-green-950/60 to-green-900/20 border-green-800/40",
  guardian: "from-amber-950/60 to-amber-900/20 border-amber-800/40",
  strategic: "from-purple-950/60 to-purple-900/20 border-purple-800/40",
};

const NODE_ACTIVE_RING: Record<string, string> = {
  pioneer: "ring-blue-500/60",
  builder: "ring-green-500/60",
  guardian: "ring-amber-500/60",
  strategic: "ring-purple-500/60",
};

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function Rune() {
  const { data: overview, isLoading } = useGetRuneOverview();

  const [nodeLevel, setNodeLevel] = useState<RuneCalculatorInputNodeLevel>(
    RuneCalculatorInputNodeLevel.pioneer
  );
  const [seats, setSeats] = useState(1);
  const [durationDays, setDurationDays] = useState(180);
  const [priceStageIndex, setPriceStageIndex] = useState(3);

  const calcMutation = useCalculateRuneReturns();

  const selectedNode = overview?.nodes?.find((n) => n.level === nodeLevel);
  const selectedStagePreview = overview?.priceStages?.[priceStageIndex];

  const handleCalculate = () => {
    calcMutation.mutate({
      data: { nodeLevel, seats, durationDays, priceStageIndex },
    });
  };

  const maxSeats = selectedNode?.seats ?? 10;

  return (
    <div className="container mx-auto px-4 py-8 space-y-10">
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>返回项目库 Back to Projects</span>
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="border-b border-border/50 pb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20 shadow-[0_0_18px_hsl(217,80%,58%,0.18)]">
            <Coins className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-baseline gap-3">
              RUNE Protocol
              <span className="text-xl font-normal text-muted-foreground">
                节点收益分析报告
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Node Yield Analysis · 双TOKEN通缩经济模型 · 四级节点产品
            </p>
          </div>
        </div>
      </motion.div>

      {/* Token Info Row */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
        </div>
      ) : (overview?.motherToken && overview?.subToken) ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {/* Mother Token */}
          <div className="col-span-2 p-5 rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 to-transparent shadow-[0_0_20px_hsl(217,80%,58%,0.08)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase tracking-widest text-primary font-semibold">
                母TOKEN · Mother Token
              </span>
              <Flame className="h-4 w-4 text-primary opacity-70" />
            </div>
            <p className="text-4xl font-bold tracking-tight mb-1">
              {overview.motherToken.symbol}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
              <span>
                开盘价{" "}
                <span className="font-mono text-foreground font-medium">
                  ${overview.motherToken.launchPrice}
                </span>
              </span>
              <span>
                发行量{" "}
                <span className="font-mono text-foreground font-medium">
                  {(overview.motherToken.totalSupply / 1e8).toFixed(1)}亿枚
                </span>
              </span>
              <span>
                日燃烧{" "}
                <span className="font-mono text-foreground font-medium">
                  {(overview.motherToken.dailyBurnRate * 100).toFixed(1)}%
                </span>
              </span>
              <span>
                24M目标{" "}
                <span className="font-mono text-green-400 font-medium">
                  ${overview.motherToken.targetPriceLow}~$
                  {overview.motherToken.targetPriceHigh}
                </span>
              </span>
            </div>
          </div>

          {/* Sub Token */}
          <div className="col-span-2 p-5 rounded-xl border border-orange-800/30 bg-gradient-to-br from-orange-950/40 to-transparent">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase tracking-widest text-orange-400 font-semibold">
                子TOKEN · Sub Token
              </span>
              <TrendingUp className="h-4 w-4 text-orange-400 opacity-70" />
            </div>
            <p className="text-4xl font-bold tracking-tight mb-1 text-orange-300">
              {overview.subToken.symbol}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
              <span>
                初始价{" "}
                <span className="font-mono text-foreground font-medium">
                  ${overview.subToken.launchPrice}
                </span>
              </span>
              <span>
                发行量{" "}
                <span className="font-mono text-foreground font-medium">
                  {(overview.subToken.totalSupply / 1e6).toFixed(1)}百万枚
                </span>
              </span>
              <span>
                日燃烧{" "}
                <span className="font-mono text-foreground font-medium">
                  {(overview.subToken.dailyBurnRate * 100).toFixed(1)}%
                </span>
              </span>
              <span>
                24M目标{" "}
                <span className="font-mono text-green-400 font-medium">
                  ${overview.subToken.targetPriceLow}~$
                  {overview.subToken.targetPriceHigh}
                </span>
              </span>
            </div>
          </div>
        </motion.div>
      ) : null}

      {/* Price Stage Progression */}
      {(overview?.priceStages?.length) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            价格阶段路线图 · Price Stage Roadmap
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {(overview.priceStages ?? []).map((stage, i) => (
              <div
                key={i}
                className={`relative p-3 rounded-xl border transition-all cursor-pointer ${
                  priceStageIndex === i
                    ? "border-primary bg-primary/10 shadow-[0_0_15px_hsl(217,80%,58%,0.2)]"
                    : "border-border/50 bg-card/50 hover:border-border"
                }`}
                onClick={() => setPriceStageIndex(i)}
              >
                {priceStageIndex === i && (
                  <div className="absolute top-2 right-2">
                    <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground font-medium tracking-wide mb-1">
                  {stage.labelCn}
                </p>
                <p className="font-mono text-sm font-bold text-foreground">
                  ${stage.motherPrice}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  子 ${stage.subPrice}
                </p>
                {stage.multiplier > 1 && (
                  <span className="mt-1 inline-block text-[10px] bg-green-900/40 text-green-400 px-1.5 py-0.5 rounded font-mono">
                    {stage.multiplier}×
                  </span>
                )}
                <p className="text-[9px] text-muted-foreground mt-1 leading-tight opacity-70">
                  {stage.trigger}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Main Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: Node Selection + Inputs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Node Tier Cards */}
          {(overview?.nodes?.length) && (
            <div>
              <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Coins className="h-4 w-4 text-primary" />
                选择节点等级 · Select Node Tier
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {(overview.nodes ?? []).map((node) => {
                  const isActive = nodeLevel === node.level;
                  const color = NODE_COLORS[node.level];
                  return (
                    <button
                      key={node.level}
                      onClick={() => {
                        setNodeLevel(
                          node.level as RuneCalculatorInputNodeLevel
                        );
                        setSeats(1);
                        calcMutation.reset();
                      }}
                      className={`text-left p-4 rounded-xl border bg-gradient-to-br transition-all ${
                        NODE_BG[node.level]
                      } ${isActive ? `ring-2 ${NODE_ACTIVE_RING[node.level]}` : ""}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="text-[10px] uppercase tracking-widest font-bold"
                          style={{ color }}
                        >
                          {node.nameCn}
                        </span>
                        {isActive && (
                          <BadgeCheck
                            className="h-3.5 w-3.5"
                            style={{ color }}
                          />
                        )}
                      </div>
                      <p className="font-semibold text-sm text-foreground">
                        {node.nameEn}
                      </p>
                      <p className="font-mono text-xl font-bold mt-1">
                        ${node.investment.toLocaleString()}
                      </p>
                      <div className="mt-2 pt-2 border-t border-white/10 space-y-0.5">
                        <p className="text-[10px] text-muted-foreground">
                          私募价{" "}
                          <span className="font-mono text-foreground">
                            ${node.privatePrice}
                          </span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          日USDT{" "}
                          <span
                            className="font-mono font-semibold"
                            style={{ color }}
                          >
                            ${node.dailyUsdt}
                          </span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          剩余席位{" "}
                          <span className="font-mono text-foreground">
                            {node.seats}
                          </span>
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seats + Duration */}
          <Card className="bg-card/80 backdrop-blur border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary" />
                <span>模拟参数 · Simulation Parameters</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-muted-foreground text-sm">
                    席位数量 <span className="text-xs opacity-60">Seats</span>
                  </Label>
                  <span className="font-mono text-sm font-bold text-primary">
                    {seats} 席
                  </span>
                </div>
                <Slider
                  value={[seats]}
                  min={1}
                  max={Math.min(maxSeats, 20)}
                  step={1}
                  onValueChange={(v) => {
                    setSeats(v[0]);
                    calcMutation.reset();
                  }}
                  className="py-2"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>1席</span>
                  <span>
                    投入{" "}
                    <span className="font-mono text-foreground font-semibold">
                      $
                      {selectedNode
                        ? (selectedNode.investment * seats).toLocaleString()
                        : "—"}
                    </span>{" "}
                    USDT
                  </span>
                  <span>{Math.min(maxSeats, 20)}席</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-muted-foreground text-sm">
                    持仓周期 <span className="text-xs opacity-60">Duration</span>
                  </Label>
                  <span className="font-mono text-sm font-bold">
                    {durationDays} 天
                  </span>
                </div>
                <Slider
                  value={[durationDays]}
                  min={30}
                  max={720}
                  step={30}
                  onValueChange={(v) => {
                    setDurationDays(v[0]);
                    calcMutation.reset();
                  }}
                  className="py-2"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>1个月</span>
                  <span className="font-mono text-foreground">
                    ≈{Math.round(durationDays / 30)}个月
                  </span>
                  <span>24个月</span>
                </div>
              </div>

              {/* Selected stage preview */}
              {selectedStagePreview && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    当前目标阶段 · Target Stage
                  </p>
                  <p className="font-semibold text-sm text-foreground">
                    {selectedStagePreview.labelCn}
                  </p>
                  <div className="flex gap-4 text-xs text-muted-foreground font-mono">
                    <span>
                      母TOKEN{" "}
                      <span className="text-primary font-semibold">
                        ${selectedStagePreview.motherPrice}
                      </span>
                    </span>
                    <span>
                      子TOKEN{" "}
                      <span className="text-orange-400 font-semibold">
                        ${selectedStagePreview.subPrice}
                      </span>
                    </span>
                    {selectedStagePreview.multiplier > 1 && (
                      <span className="text-green-400 font-semibold">
                        {selectedStagePreview.multiplier}×
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground opacity-70">
                    {selectedStagePreview.trigger}
                  </p>
                </div>
              )}

              <Button
                className="w-full font-semibold shadow-[0_0_18px_hsl(217,80%,58%,0.25)]"
                onClick={handleCalculate}
                disabled={calcMutation.isPending}
              >
                {calcMutation.isPending
                  ? "计算中..."
                  : "开始模拟 Run Simulation"}
                {!calcMutation.isPending && (
                  <ChevronRight className="h-4 w-4 ml-1" />
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            {calcMutation.data ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {/* Top KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="col-span-2 md:col-span-3 p-5 rounded-xl border border-green-700/40 bg-gradient-to-br from-green-950/50 to-transparent shadow-[0_0_24px_hsl(142,70%,45%,0.1)]">
                    <p className="text-[11px] text-green-400 uppercase tracking-widest font-semibold mb-1">
                      总资产 Total Assets
                    </p>
                    <div className="flex items-end gap-4 flex-wrap">
                      <p className="text-4xl font-bold font-mono text-green-300">
                        ${fmt(calcMutation.data.totalAssets)}
                      </p>
                      <div className="mb-1 flex gap-3 flex-wrap">
                        <span className="text-sm bg-green-900/50 text-green-300 border border-green-700/40 px-2.5 py-0.5 rounded-full font-mono font-semibold">
                          ROI {fmt(calcMutation.data.roi)}%
                        </span>
                        <span className="text-sm bg-blue-900/50 text-blue-300 border border-blue-700/40 px-2.5 py-0.5 rounded-full font-mono font-semibold">
                          {fmt(calcMutation.data.roiMultiplier)}× 本金
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      基于{" "}
                      {
                        overview?.priceStages[priceStageIndex]?.labelCn
                      } 价格阶段预测
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-border/50 bg-card/60">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                      母TOKEN市值
                    </p>
                    <p className="font-mono text-lg font-bold text-foreground">
                      ${fmt(calcMutation.data.motherTokenValue)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {calcMutation.data.motherTokens.toLocaleString()} 枚
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-orange-800/30 bg-orange-950/20">
                    <p className="text-[10px] text-orange-400 uppercase tracking-wider mb-1">
                      子TOKEN空投价值
                    </p>
                    <p className="font-mono text-lg font-bold text-orange-300">
                      ${fmt(calcMutation.data.airdropTokenValue)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {calcMutation.data.airdropTokens.toLocaleString()} 枚
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-border/50 bg-card/60">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                      USDT累计收益
                    </p>
                    <p className="font-mono text-lg font-bold text-foreground">
                      ${fmt(calcMutation.data.totalUsdtIncome)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      ${fmt(calcMutation.data.dailyUsdt)}/天 ×{" "}
                      {calcMutation.data.durationDays}天
                    </p>
                  </div>
                </div>

                {/* Breakdown Table */}
                <Card className="bg-card/80 backdrop-blur border-border shadow-sm overflow-hidden">
                  <div className="bg-muted/20 border-b border-border/50 px-5 py-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-primary" />
                      明细拆解 · Full Breakdown
                    </h3>
                  </div>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <tbody>
                        {calcMutation.data.breakdown.map((item, i) => (
                          <tr
                            key={i}
                            className={`border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors ${
                              i === calcMutation.data!.breakdown.length - 1 ||
                              i === calcMutation.data!.breakdown.length - 2
                                ? "bg-primary/3"
                                : ""
                            }`}
                          >
                            <td className="py-2.5 px-5 text-muted-foreground">
                              {item.label}
                              {item.labelCn && (
                                <span className="ml-2 text-[10px] opacity-50">
                                  {item.labelCn}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-5 text-right font-mono font-medium text-foreground">
                              {item.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="bg-card/80 backdrop-blur border-border shadow-sm h-full min-h-[400px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground p-12 flex flex-col items-center gap-5">
                    <div className="w-20 h-20 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center">
                      <BarChart2 className="h-9 w-9 opacity-20" />
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium text-foreground/60">
                        选择节点等级和参数，点击开始模拟
                      </p>
                      <p className="text-sm opacity-60">
                        Select a node tier and parameters, then run simulation
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-left mt-2 w-full max-w-sm">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">第一步</p>
                        <p className="text-xs font-medium mt-0.5">选择节点</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">第二步</p>
                        <p className="text-xs font-medium mt-0.5">设定参数</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">第三步</p>
                        <p className="text-xs font-medium mt-0.5">查看收益</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Node Comparison Table */}
          {(overview?.nodes?.length) && (
            <Card className="bg-card/80 backdrop-blur border-border shadow-sm overflow-hidden">
              <div className="bg-muted/20 border-b border-border/50 px-5 py-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  节点参数总表 · Node Parameters
                </h3>
              </div>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs min-w-[560px]">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/10">
                      <th className="text-left py-2.5 px-4 text-muted-foreground font-medium">
                        节点
                      </th>
                      <th className="text-right py-2.5 px-4 text-muted-foreground font-medium">
                        投资额
                      </th>
                      <th className="text-right py-2.5 px-4 text-muted-foreground font-medium">
                        私募价
                      </th>
                      <th className="text-right py-2.5 px-4 text-muted-foreground font-medium">
                        母TOKEN
                      </th>
                      <th className="text-right py-2.5 px-4 text-muted-foreground font-medium">
                        子TOKEN空投
                      </th>
                      <th className="text-right py-2.5 px-4 text-muted-foreground font-medium">
                        日USDT
                      </th>
                      <th className="text-right py-2.5 px-4 text-muted-foreground font-medium">
                        席位
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(overview.nodes ?? []).map((node) => {
                      const color = NODE_COLORS[node.level];
                      const isActive = nodeLevel === node.level;
                      return (
                        <tr
                          key={node.level}
                          onClick={() => {
                            setNodeLevel(
                              node.level as RuneCalculatorInputNodeLevel
                            );
                            setSeats(1);
                            calcMutation.reset();
                          }}
                          className={`border-b border-border/30 last:border-0 cursor-pointer transition-colors ${
                            isActive ? "bg-primary/5" : "hover:bg-muted/10"
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2 w-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span className="font-medium" style={{ color }}>
                                {node.nameCn}
                              </span>
                              <span className="text-muted-foreground text-[10px]">
                                {node.nameEn}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold">
                            ${node.investment.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            ${node.privatePrice}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {node.motherTokensPerSeat.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {node.airdropPerSeat.toLocaleString()}
                          </td>
                          <td
                            className="py-3 px-4 text-right font-mono font-semibold"
                            style={{ color }}
                          >
                            ${node.dailyUsdt}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                            {node.seats}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
