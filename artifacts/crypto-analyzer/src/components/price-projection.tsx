import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Droplets, ArrowUpDown, Activity } from "lucide-react";
import { calculatePriceImpact, formatCurrency, formatPercent } from "@/lib/tokenomics";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface PriceProjectionProps {
  currentPrice: number;
  lpTokens: number;
  lpUsdt: number;
}

export function PriceProjection({
  currentPrice,
  lpTokens,
  lpUsdt,
}: PriceProjectionProps) {
  const [buyPressure, setBuyPressure] = useState<number>(10000);
  const [sellPressure, setSellPressure] = useState<number>(0);
  const [days, setDays] = useState<number>(30);
  const [dailyVolume, setDailyVolume] = useState<number>(50000);

  const priceImpact = useMemo(
    () =>
      calculatePriceImpact(
        currentPrice,
        lpTokens,
        lpUsdt,
        buyPressure,
        sellPressure
      ),
    [currentPrice, lpTokens, lpUsdt, buyPressure, sellPressure]
  );

  const projectionData = useMemo(() => {
    const data = [];
    let price = currentPrice;
    let tokens = lpTokens;
    let usdt = lpUsdt;
    const k = tokens * usdt;

    for (let day = 0; day <= days; day++) {
      data.push({
        day,
        price: price,
        bullish: price * (1 + 0.02 * day),
        bearish: price * (1 - 0.01 * day),
      });

      const netBuy = dailyVolume * 0.6;
      usdt += netBuy;
      tokens = k / usdt;
      price = usdt / tokens;
    }

    return data;
  }, [currentPrice, lpTokens, lpUsdt, days, dailyVolume]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          价格预测模型
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-chart-2" />
              买入压力 (USDC)
            </Label>
            <Input
              type="number"
              min={0}
              step={1000}
              value={buyPressure}
              onChange={(e) => setBuyPressure(Number(e.target.value))}
              className="font-mono"
              data-testid="input-buy-pressure"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-destructive" />
              卖出压力 (B18)
            </Label>
            <Input
              type="number"
              min={0}
              step={100}
              value={sellPressure}
              onChange={(e) => setSellPressure(Number(e.target.value))}
              className="font-mono"
              data-testid="input-sell-pressure"
            />
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Droplets className="h-3 w-3" />
              当前LP池
            </span>
            <span className="font-mono text-sm">
              {formatCurrency(lpUsdt)} + {lpTokens.toLocaleString()} B18
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">当前价格</span>
            <span className="font-mono">${currentPrice.toFixed(4)}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="font-medium flex items-center gap-1">
              <ArrowUpDown className="h-4 w-4" />
              预测价格
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-lg" data-testid="text-projected-price">
                ${priceImpact.newPrice.toFixed(4)}
              </span>
              <Badge
                variant={priceImpact.priceChange >= 0 ? "default" : "destructive"}
              >
                {priceImpact.priceChange >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {formatPercent(Math.abs(priceImpact.priceChange))}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>预测天数: {days}天</Label>
          </div>
          <Slider
            value={[days]}
            onValueChange={(v) => setDays(v[0])}
            min={7}
            max={180}
            step={1}
            data-testid="slider-days"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="daily-volume">日均交易量 (USDC)</Label>
          <Input
            id="daily-volume"
            type="number"
            min={0}
            step={10000}
            value={dailyVolume}
            onChange={(e) => setDailyVolume(Number(e.target.value))}
            className="font-mono"
            data-testid="input-daily-volume"
          />
        </div>

        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                label={{ value: "天", position: "insideBottomRight", offset: -5, fontSize: 10 }}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v.toFixed(2)}`}
                domain={["dataMin * 0.8", "dataMax * 1.2"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                formatter={(value: number, name: string) => [
                  `$${value.toFixed(4)}`,
                  name === "price"
                    ? "基准"
                    : name === "bullish"
                    ? "乐观"
                    : "悲观",
                ]}
                labelFormatter={(day) => `第 ${day} 天`}
              />
              <ReferenceLine
                y={currentPrice}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="bullish"
                stroke="hsl(var(--chart-2))"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="bearish"
                stroke="hsl(var(--chart-5))"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-chart-1" />
            <span className="text-muted-foreground">基准</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-chart-2" style={{ borderTop: "2px dashed" }} />
            <span className="text-muted-foreground">乐观</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-chart-5" style={{ borderTop: "2px dashed" }} />
            <span className="text-muted-foreground">悲观</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
