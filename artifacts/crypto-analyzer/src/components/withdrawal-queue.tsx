import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Wallet,
  ArrowRightLeft,
  Users,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { calculate334Status, formatCurrency, formatPercent } from "@/lib/tokenomics";
import { WithdrawalEntry } from "@shared/schema";

interface WithdrawalQueueProps {
  treasuryBalance: number;
  previousBalance: number;
  pendingWithdrawals: number;
  withdrawalQueue: WithdrawalEntry[];
  fundRatio: { treasury: number; staticRewards: number; dynamicRewards: number };
  onWithdraw?: (amount: number) => void;
}

export function WithdrawalQueue({
  treasuryBalance,
  previousBalance,
  pendingWithdrawals,
  withdrawalQueue,
  fundRatio,
  onWithdraw,
}: WithdrawalQueueProps) {
  const [withdrawAmount, setWithdrawAmount] = useState<number>(1000);

  const status = useMemo(
    () =>
      calculate334Status(
        treasuryBalance,
        previousBalance,
        pendingWithdrawals,
        fundRatio
      ),
    [treasuryBalance, previousBalance, pendingWithdrawals, fundRatio]
  );

  const queueProgress = treasuryBalance > 0
    ? Math.min((pendingWithdrawals / treasuryBalance) * 100, 100)
    : 100;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowRightLeft className="h-5 w-5" />
            334 内存合约
          </CardTitle>
          <Badge
            variant={status.isImbalanced ? "destructive" : "default"}
            className="gap-1"
          >
            {status.isImbalanced ? (
              <AlertCircle className="h-3 w-3" />
            ) : (
              <CheckCircle2 className="h-3 w-3" />
            )}
            {status.isImbalanced ? "不平衡" : "平衡"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
              <Wallet className="h-3 w-3" />
              国库
            </div>
            <div className="font-mono font-semibold text-sm" data-testid="text-treasury">
              {formatCurrency(treasuryBalance)}
            </div>
            <div className="flex items-center justify-center gap-1 mt-1">
              {status.balanceChange >= 0 ? (
                <TrendingUp className="h-3 w-3 text-chart-2" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span
                className={`text-xs ${
                  status.balanceChange >= 0 ? "text-chart-2" : "text-destructive"
                }`}
              >
                {formatPercent(status.balanceChangePercent / 100)}
              </span>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
              <Clock className="h-3 w-3" />
              待提现
            </div>
            <div className="font-mono font-semibold text-sm" data-testid="text-pending">
              {formatCurrency(pendingWithdrawals)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {withdrawalQueue.length} 笔
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
              <Users className="h-3 w-3" />
              可处理
            </div>
            <div className="font-mono font-semibold text-sm" data-testid="text-processable">
              {formatCurrency(status.processableAmount)}
            </div>
            {status.isImbalanced && (
              <div className="text-xs text-destructive mt-1">仅30%</div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">提现队列进度</span>
            <span className="font-mono">{queueProgress.toFixed(1)}%</span>
          </div>
          <Progress value={queueProgress} className="h-2" />
          {status.isImbalanced && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              提现将按照先后顺序逆向赎回
            </p>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-sm font-medium">资金分配比例</Label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
              <span className="text-muted-foreground">国库</span>
              <span className="font-mono">{formatPercent(fundRatio.treasury)}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
              <span className="text-muted-foreground">静态</span>
              <span className="font-mono">{formatPercent(fundRatio.staticRewards)}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
              <span className="text-muted-foreground">动态</span>
              <span className="font-mono">{formatPercent(fundRatio.dynamicRewards)}</span>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="withdraw-amount">模拟提现金额 (USDC)</Label>
          <div className="flex gap-2">
            <Input
              id="withdraw-amount"
              type="number"
              min={0}
              step={100}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(Number(e.target.value))}
              className="font-mono flex-1"
              data-testid="input-withdraw-amount"
            />
            <Button
              onClick={() => onWithdraw?.(withdrawAmount)}
              data-testid="button-withdraw"
            >
              提现
            </Button>
          </div>
        </div>

        {withdrawalQueue.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-sm font-medium">提现队列 (FIFO)</Label>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {withdrawalQueue.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                      data-testid={`withdrawal-entry-${index}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">#{entry.position}</span>
                        <span className="font-mono text-xs truncate max-w-20">
                          {entry.userId.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{formatCurrency(entry.amount)}</span>
                        <Badge
                          variant={
                            entry.status === "completed"
                              ? "default"
                              : entry.status === "processing"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {entry.status === "completed"
                            ? "完成"
                            : entry.status === "processing"
                            ? "处理中"
                            : "等待"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
