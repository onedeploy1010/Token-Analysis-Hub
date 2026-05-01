import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import {
  getAdminWithdrawals, updateWithdrawalStatus, triggerAutoWithdraw, adminAddLog,
  getAdminNotifications, markNotificationRead, markAllNotificationsRead,
  getFeeWalletAddress, exportWithdrawalsCSV,
} from "@/lib/api";
import { readContract } from "thirdweb";
import { useActiveAccount, useSendTransaction, ConnectButton } from "thirdweb/react";
import { client, bscChain, wallets } from "@/lib/thirdweb";
import { getWithdrawalContract, getUSDTContract, formatUSDT, prepareApproveUSDTForWithdrawal, getWithdrawalAllowance, getFundingWallet, COREX_WITHDRAWAL_ADDRESS } from "@/lib/contracts";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Check, X, Send, Loader2, ExternalLink, AlertTriangle, Wallet, RefreshCw, Bell, CheckCheck, ShieldCheck, Download, Calendar } from "lucide-react";
import { CopyableAddress, shortAddr } from "@/components/CopyableAddress";

const STATUS_TABS = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待审核" },
  { value: "approved", label: "已批准" },
  { value: "completed", label: "已完成" },
  { value: "rejected", label: "已拒绝" },
];

// Operator wallet address (derived from WITHDRAWAL_PRIVATE_KEY on server)
const OPERATOR_WALLET = "0x4E05c5c549E45b35e03f4b285633e8AB881Cd64d";

async function getContractBalance(): Promise<string> {
  try {
    const result = await readContract({
      contract: getWithdrawalContract(),
      method: "getContractBalance",
      params: [],
    });
    return formatUSDT(result as bigint);
  } catch {
    return "0.000000";
  }
}

async function getWalletBalance(): Promise<string> {
  try {
    const result = await readContract({
      contract: getUSDTContract(),
      method: "balanceOf",
      params: [OPERATOR_WALLET],
    });
    return formatUSDT(result as bigint);
  } catch {
    return "0.000000";
  }
}

async function getFeeWalletBalance(): Promise<{ address: string; balance: string }> {
  try {
    const addr = await getFeeWalletAddress();
    if (!addr || addr.length !== 42) return { address: "", balance: "0.000000" };
    const result = await readContract({
      contract: getUSDTContract(),
      method: "balanceOf",
      params: [addr],
    });
    return { address: addr, balance: formatUSDT(result as bigint) };
  } catch {
    return { address: "", balance: "0.000000" };
  }
}

function BalancePanel() {
  const { data: contractBal, isLoading: loadingContract, refetch: refetchContract } = useQuery({
    queryKey: ["/api/contract-balance"],
    queryFn: getContractBalance,
    refetchInterval: 30000,
  });
  const { data: walletBal, isLoading: loadingWallet, refetch: refetchWallet } = useQuery({
    queryKey: ["/api/wallet-balance"],
    queryFn: getWalletBalance,
    refetchInterval: 30000,
  });
  const { data: feeData, isLoading: loadingFee, refetch: refetchFee } = useQuery({
    queryKey: ["/api/fee-wallet-balance"],
    queryFn: getFeeWalletBalance,
    refetchInterval: 30000,
  });

  const contractNum = parseFloat(contractBal || "0");
  const walletNum = parseFloat(walletBal || "0");
  const feeNum = parseFloat(feeData?.balance || "0");
  const feeAddr = feeData?.address || "";
  const totalAvailable = contractNum + walletNum;
  const isLow = totalAvailable < 100;

  return (
    <div className="rounded-xl p-4 space-y-3" style={{
      background: "linear-gradient(145deg, #1a1510, #110e0a)",
      border: isLow ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(201,162,39,0.15)",
    }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet size={16} style={{ color: "#C9A227" }} />
          <span className="text-sm font-bold text-foreground">提现资金概览</span>
        </div>
        <button
          className="p-1.5 rounded-lg transition-all"
          style={{ background: "rgba(201,162,39,0.08)" }}
          onClick={() => { refetchContract(); refetchWallet(); refetchFee(); }}
        >
          <RefreshCw size={13} style={{ color: "#C9A227" }} />
        </button>
      </div>

      <div className={`grid gap-3 ${feeAddr ? "grid-cols-4" : "grid-cols-3"}`}>
        <div className="text-center p-2 rounded-lg" style={{ background: "rgba(201,162,39,0.06)" }}>
          <div className="text-[10px] text-muted-foreground mb-1">提现合约余额</div>
          <div className="text-sm font-bold" style={{ color: "#C9A227" }}>
            {loadingContract ? "..." : `${contractNum.toFixed(2)} U`}
          </div>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ background: "rgba(201,162,39,0.06)" }}>
          <div className="text-[10px] text-muted-foreground mb-1">提现钱包余额</div>
          <div className="text-sm font-bold" style={{ color: "#3b82f6" }}>
            {loadingWallet ? "..." : `${walletNum.toFixed(2)} U`}
          </div>
        </div>
        {feeAddr && (
          <div className="text-center p-2 rounded-lg" style={{ background: "rgba(245,158,11,0.06)" }}>
            <div className="text-[10px] text-muted-foreground mb-1">手续费钱包</div>
            <div className="text-sm font-bold" style={{ color: "#f59e0b" }}>
              {loadingFee ? "..." : `${feeNum.toFixed(2)} U`}
            </div>
          </div>
        )}
        <div className="text-center p-2 rounded-lg" style={{ background: "rgba(201,162,39,0.06)" }}>
          <div className="text-[10px] text-muted-foreground mb-1">总可用</div>
          <div className="text-sm font-bold" style={{ color: isLow ? "#ef4444" : "#22c55e" }}>
            {(loadingContract || loadingWallet) ? "..." : `${totalAvailable.toFixed(2)} U`}
          </div>
        </div>
      </div>

      {isLow && (
        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertTriangle size={14} style={{ color: "#ef4444" }} />
          <span className="text-xs" style={{ color: "#ef4444" }}>
            资金不足！请及时向提现钱包充值 USDT，系统将自动转入提现合约
          </span>
        </div>
      )}

      <div className="text-[10px] text-muted-foreground">
        提现钱包: <CopyableAddress address={OPERATOR_WALLET} className="text-muted-foreground inline" />
      </div>
      {feeAddr && (
        <div className="text-[10px] text-muted-foreground">
          手续费钱包: <CopyableAddress address={feeAddr} className="text-muted-foreground inline" />
        </div>
      )}
      <div className="text-[10px] text-muted-foreground/50">
        合约余额不足时，系统自动从提现钱包转入合约；钱包余额也不足则暂停提现并通知管理员
      </div>
    </div>
  );
}

function AuthorizationPanel() {
  const account = useActiveAccount();
  const { toast } = useToast();
  const { mutateAsync: sendTx } = useSendTransaction();
  const [approving, setApproving] = useState(false);

  const connectedAddr = account?.address || "";

  // Fetch the funding wallet address from the contract (this is the wallet that pullFunds() pulls from)
  const { data: fundingWallet, isLoading: loadingFunding } = useQuery({
    queryKey: ["/api/funding-wallet"],
    queryFn: getFundingWallet,
    refetchInterval: 30000,
  });

  const fundingAddr = fundingWallet || "";
  const isZeroAddr = !fundingAddr || fundingAddr === "0x0000000000000000000000000000000000000000";

  // Check allowance of the FUNDING wallet (not the connected wallet) — this is what pullFunds() actually uses
  const { data: fundingAllowance, refetch: refetchFundingAllowance } = useQuery({
    queryKey: ["/api/withdrawal-allowance-funding", fundingAddr],
    queryFn: () => fundingAddr && !isZeroAddr ? getWithdrawalAllowance(fundingAddr) : Promise.resolve(BigInt(0)),
    enabled: !!fundingAddr && !isZeroAddr,
    refetchInterval: 15000,
  });

  const fundingAllowanceNum = fundingAllowance ? parseFloat(formatUSDT(fundingAllowance as bigint)) : 0;
  const isFundingAuthorized = fundingAllowanceNum > 1000000;

  // Check if connected wallet matches the funding wallet
  const isCorrectWallet = connectedAddr && fundingAddr
    ? connectedAddr.toLowerCase() === fundingAddr.toLowerCase()
    : false;

  // Already authorized — hide the entire panel
  if (isFundingAuthorized) return null;

  const handleApprove = async () => {
    if (!account) {
      toast({ title: "请先连接提现钱包", variant: "destructive" });
      return;
    }
    if (!isCorrectWallet) {
      toast({ title: "钱包地址不匹配", description: `请连接合约指定的提现钱包: ${shortAddr(fundingAddr)}`, variant: "destructive" });
      return;
    }
    setApproving(true);
    try {
      const tx = prepareApproveUSDTForWithdrawal(BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"));
      await sendTx(tx);
      await refetchFundingAllowance();
      await adminAddLog("授权提现合约USDT", "withdrawal_contract", COREX_WITHDRAWAL_ADDRESS, { wallet: connectedAddr });
      toast({ title: "授权成功", description: "提现合约已获得 USDT 无限授权，系统可自动从此钱包拉取资金" });
    } catch (err: any) {
      toast({ title: "授权失败", description: err.message, variant: "destructive" });
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="rounded-xl p-4 space-y-3" style={{
      background: "linear-gradient(145deg, #1a1510, #110e0a)",
      border: isFundingAuthorized ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(234,179,8,0.2)",
    }}>
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} style={{ color: isFundingAuthorized ? "#22c55e" : "#eab308" }} />
        <span className="text-sm font-bold text-foreground">提现钱包授权</span>
      </div>

      {/* Funding wallet info */}
      <div className="p-2 rounded-lg space-y-1" style={{ background: "rgba(201,162,39,0.06)" }}>
        <div className="text-[10px] text-muted-foreground">合约指定提现钱包</div>
        {loadingFunding ? (
          <span className="text-xs text-muted-foreground">加载中...</span>
        ) : isZeroAddr ? (
          <span className="text-xs" style={{ color: "#ef4444" }}>未设置</span>
        ) : (
          <CopyableAddress address={fundingAddr} className="text-xs text-foreground" />
        )}
      </div>

      {isZeroAddr && !loadingFunding && (
        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertTriangle size={12} style={{ color: "#ef4444" }} />
          <span className="text-[11px]" style={{ color: "#ef4444" }}>
            合约未设置提现钱包地址，请先通过合约 setFundingWallet 设置
          </span>
        </div>
      )}

      {!isZeroAddr && !connectedAddr && (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground p-2 rounded-lg" style={{ background: "rgba(234,179,8,0.06)" }}>
            请使用上方显示的提现钱包地址连接 MetaMask，点击「授权」签名一次即可永久生效。
          </div>
          <ConnectButton
            client={client}
            chain={bscChain}
            wallets={wallets}
            connectModal={{ size: "compact", showThirdwebBranding: false }}
            connectButton={{
              label: "连接提现钱包",
              style: {
                width: "100%",
                background: "linear-gradient(135deg, #C9A227, #9A7A1A)",
                color: "#0c0a08",
                fontWeight: "700",
                fontSize: "14px",
                padding: "10px 18px",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
              },
            }}
            detailsButton={{
              style: {
                width: "100%",
                background: "rgba(201,162,39,0.12)",
                border: "1px solid rgba(201,162,39,0.35)",
                color: "#C9A227",
                fontWeight: "600",
                fontSize: "13px",
                padding: "8px 14px",
                borderRadius: "10px",
              },
            }}
            theme="dark"
          />
        </div>
      )}

      {!isZeroAddr && connectedAddr && (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg" style={{ background: "rgba(201,162,39,0.06)" }}>
            <div>
              <div className="text-[10px] text-muted-foreground">已连接钱包</div>
              <CopyableAddress address={connectedAddr} className="text-xs text-foreground" />
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground">匹配</div>
              <span className="text-xs font-bold" style={{ color: isCorrectWallet ? "#22c55e" : "#ef4444" }}>
                {isCorrectWallet ? "匹配" : "不匹配"}
              </span>
            </div>
          </div>

          {!isCorrectWallet && (
            <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertTriangle size={12} style={{ color: "#ef4444" }} />
              <span className="text-[11px]" style={{ color: "#ef4444" }}>
                当前钱包与合约指定的提现钱包不一致，请切换到正确的钱包
              </span>
            </div>
          )}

          {isCorrectWallet && (
            <Button
              className="w-full font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
              disabled={approving}
              onClick={handleApprove}
            >
              {approving ? (
                <><Loader2 size={14} className="mr-1.5 animate-spin" /> 授权中...</>
              ) : (
                <><ShieldCheck size={14} className="mr-1.5" /> 授权提现合约使用 USDT</>
              )}
            </Button>
          )}

          <div className="text-[10px] text-muted-foreground/50">
            点击授权后，系统在合约余额不足时自动从此钱包拉取 USDT（无需私钥）
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationPanel() {
  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/admin/notifications"],
    queryFn: () => getAdminNotifications(10),
    refetchInterval: 15000,
  });

  const unread = notifications.filter((n: any) => !n.is_read);
  if (unread.length === 0) return null;

  const handleMarkRead = async (id: number) => {
    await markNotificationRead(id);
    queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={14} style={{ color: "#eab308" }} />
          <span className="text-xs font-bold" style={{ color: "#eab308" }}>系统通知 ({unread.length})</span>
        </div>
        <button
          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded"
          style={{ color: "#C9A227", background: "rgba(201,162,39,0.08)" }}
          onClick={handleMarkAllRead}
        >
          <CheckCheck size={12} /> 全部已读
        </button>
      </div>
      {unread.map((n: any) => (
        <div key={n.id} className="rounded-lg p-3 space-y-1" style={{
          background: n.type === "insufficient_funds" ? "rgba(239,68,68,0.08)" : "rgba(234,179,8,0.08)",
          border: `1px solid ${n.type === "insufficient_funds" ? "rgba(239,68,68,0.2)" : "rgba(234,179,8,0.2)"}`,
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={12} style={{ color: n.type === "insufficient_funds" ? "#ef4444" : "#eab308" }} />
              <span className="text-xs font-bold" style={{ color: n.type === "insufficient_funds" ? "#ef4444" : "#eab308" }}>
                {n.title}
              </span>
            </div>
            <button
              className="text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => handleMarkRead(n.id)}
            >
              已读
            </button>
          </div>
          <p className="text-[11px] text-foreground/60 leading-relaxed">{n.message}</p>
          <div className="text-[10px] text-muted-foreground/50">{new Date(n.created_at).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

function WithdrawalCard({ w, onApprove, onReject }: { w: any; onApprove: () => void; onReject: () => void }) {
  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: "待审核", color: "#eab308", bg: "rgba(234,179,8,0.1)" },
    approved: { label: "已批准", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
    completed: { label: "已完成", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
    rejected: { label: "已拒绝", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  };
  const st = statusMap[w.status] || statusMap.pending;

  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">#{w.id}</span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: st.bg, color: st.color }}>
            {st.label}
          </span>
        </div>
        {w.status === "pending" && (
          <div className="flex items-center gap-2">
            <button
              data-testid={`button-approve-${w.id}`}
              className="p-2 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", minWidth: "36px", minHeight: "36px" }}
              onClick={onApprove}
            >
              <Check size={16} />
            </button>
            <button
              data-testid={`button-reject-${w.id}`}
              className="p-2 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", minWidth: "36px", minHeight: "36px" }}
              onClick={onReject}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
      <CopyableAddress address={w.walletAddress} className="text-muted-foreground" />
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">金额</div>
          <div className="text-xs font-bold">{parseFloat(w.amount).toFixed(2)}U</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">手续费</div>
          <div className="text-xs font-semibold text-muted-foreground">{parseFloat(w.fee).toFixed(2)}U</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">实际</div>
          <div className="text-xs font-bold" style={{ color: "#C9A227" }}>{parseFloat(w.actualAmount).toFixed(2)}U</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">时间</div>
          <div className="text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleDateString()}</div>
        </div>
      </div>
      {(w.txHash || w.batchId || w.processedAt) && (
        <div className="space-y-1 pt-1 border-t" style={{ borderColor: "rgba(201,162,39,0.1)" }}>
          {w.txHash && (
            <a
              href={`https://bscscan.com/tx/${w.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs"
              style={{ color: "#C9A227" }}
            >
              <ExternalLink size={10} />
              <span>TX: {shortAddr(w.txHash)}</span>
            </a>
          )}
          {w.batchId && (
            <div className="text-[10px] text-muted-foreground">
              批次: {shortAddr(w.batchId)}
            </div>
          )}
          {w.processedAt && (
            <div className="text-[10px] text-muted-foreground">
              上链时间: {new Date(w.processedAt).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminWithdrawals() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const { toast } = useToast();

  const qk = ["/api/admin/withdrawals", `?page=${page}&limit=20&status=${status}&from=${appliedFrom}&to=${appliedTo}`];
  const { data, isLoading } = useQuery({
    queryKey: qk,
    queryFn: () => getAdminWithdrawals(page, 20, status, {
      dateFrom: appliedFrom || undefined,
      dateTo: appliedTo || undefined,
    }),
  });

  const applyPresetRange = (days: number) => {
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
    setDateFrom(start); setDateTo(end);
    setAppliedFrom(start); setAppliedTo(end);
    setPage(1);
  };
  const clearRange = () => {
    setDateFrom(""); setDateTo("");
    setAppliedFrom(""); setAppliedTo("");
    setPage(1);
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await updateWithdrawalStatus(id, status);
      await adminAddLog(status === "approved" ? "批准提现" : "拒绝提现", "withdrawal", id.toString());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast({ title: "操作成功" });
    },
    onError: (err: any) => toast({ title: "操作失败", description: err.message, variant: "destructive" }),
  });

  const handleBatchWithdraw = async () => {
    setBatchProcessing(true);
    try {
      const result = await triggerAutoWithdraw();

      if (!result.success) {
        toast({ title: "批量提现失败", description: result.message, variant: "destructive" });
        // Refresh balances and notifications
        queryClient.invalidateQueries({ queryKey: ["/api/contract-balance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/wallet-balance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
        return;
      }

      if (result.processed === 0) {
        toast({ title: "没有待处理的提现", variant: "destructive" });
        return;
      }

      await adminAddLog("批量提现上链", "withdrawal_batch", result.batchId, {
        count: result.processed,
        txHash: result.txHash,
        totalAmount: result.totalAmount,
        autoFunded: result.autoFunded,
        fundTxHash: result.fundTxHash,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contract-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-balance"] });

      const desc = result.autoFunded
        ? `${result.processed} 笔已上链 (已自动从钱包充值合约) TX: ${result.txHash?.slice(0, 10)}...`
        : `${result.processed} 笔提现已上链 TX: ${result.txHash?.slice(0, 10)}...`;

      toast({ title: "批量提现成功", description: desc });
    } catch (err: any) {
      toast({ title: "批量提现失败", description: err.message, variant: "destructive" });
    } finally {
      setBatchProcessing(false);
    }
  };

  const d = data as any;
  const totalPages = d ? Math.ceil(d.total / d.limit) : 1;

  return (
    <div className="space-y-4">
      {/* Balance overview */}
      <BalancePanel />

      {/* Authorization */}
      <AuthorizationPanel />

      {/* System notifications */}
      <NotificationPanel />

      {/* Withdrawal Stats */}
      {d?.stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-3 text-center" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
            <div className="text-[10px] text-muted-foreground mb-1">已审核金额</div>
            <div className="text-lg font-black" style={{ color: "#22c55e" }}>{d.stats.completedTotal.toFixed(2)} U</div>
            <div className="text-[10px] text-muted-foreground">{d.stats.completedCount} 笔 | 手续费 {d.stats.completedFees.toFixed(2)} U</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
            <div className="text-[10px] text-muted-foreground mb-1">待审核金额</div>
            <div className="text-lg font-black" style={{ color: "#f59e0b" }}>{d.stats.pendingTotal.toFixed(2)} U</div>
            <div className="text-[10px] text-muted-foreground">{d.stats.pendingCount} 笔</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
            <div className="text-[10px] text-muted-foreground mb-1">总计</div>
            <div className="text-lg font-black" style={{ color: "#C9A227" }}>{(d.stats.completedTotal + d.stats.pendingTotal).toFixed(2)} U</div>
            <div className="text-[10px] text-muted-foreground">{d.stats.completedCount + d.stats.pendingCount} 笔</div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
          <h2 className="font-bold text-lg text-foreground">提现管理</h2>
          <span className="text-xs text-muted-foreground ml-2">共 {d?.total || 0} 条</span>
        </div>
        <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={exporting}
          style={{ border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227", minHeight: "36px" }}
          onClick={async () => { setExporting(true); try { await exportWithdrawalsCSV(status); } finally { setExporting(false); } }}>
          <Download size={14} className="mr-1" /> {exporting ? "导出中..." : "导出CSV"}
        </Button>
        <Button
          data-testid="button-batch-withdraw"
          size="sm"
          disabled={batchProcessing}
          style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08", minHeight: "36px" }}
          onClick={handleBatchWithdraw}
        >
          {batchProcessing ? (
            <><Loader2 size={14} className="mr-1.5 animate-spin" /> 处理中...</>
          ) : (
            <><Send size={14} className="mr-1.5" /> 批量上链提现</>
          )}
        </Button>
        </div>
      </div>

      {/* Date range filter */}
      <div className="rounded-xl p-3 space-y-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
        <div className="flex items-center gap-2">
          <Calendar size={13} style={{ color: "#C9A227" }} />
          <span className="text-xs font-bold text-foreground">日期区间筛选</span>
          {(appliedFrom || appliedTo) && (
            <span className="text-[10px] text-muted-foreground ml-auto">
              {appliedFrom || "…"} ~ {appliedTo || "…"}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="text-xs rounded-lg px-2.5 py-2 flex-1 min-w-[120px]"
            style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.2)", color: "#C9A227", colorScheme: "dark" }} />
          <span className="text-xs text-muted-foreground">至</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="text-xs rounded-lg px-2.5 py-2 flex-1 min-w-[120px]"
            style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.2)", color: "#C9A227", colorScheme: "dark" }} />
          <Button size="sm" onClick={() => { setAppliedFrom(dateFrom); setAppliedTo(dateTo); setPage(1); }}
            style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08", minHeight: "36px" }}>
            应用
          </Button>
          {(appliedFrom || appliedTo) && (
            <Button size="sm" variant="outline" onClick={clearRange}
              style={{ border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", minHeight: "36px" }}>
              清除
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: "近 7 天", fn: () => applyPresetRange(7) },
            { label: "近 14 天", fn: () => applyPresetRange(14) },
            { label: "近 30 天", fn: () => applyPresetRange(30) },
            { label: "近 90 天", fn: () => applyPresetRange(90) },
          ].map(p => (
            <button key={p.label} onClick={p.fn}
              className="text-[10px] px-2 py-1 rounded-full"
              style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.2)", color: "#C9A227" }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            data-testid={`tab-withdrawal-${tab.value}`}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              background: status === tab.value ? "rgba(201,162,39,0.15)" : "rgba(255,255,255,0.03)",
              color: status === tab.value ? "#C9A227" : "rgba(255,255,255,0.5)",
              border: status === tab.value ? "1px solid rgba(201,162,39,0.3)" : "1px solid rgba(255,255,255,0.06)",
              minHeight: "36px",
            }}
            onClick={() => { setStatus(tab.value); setPage(1); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-10">加载中...</div>
      ) : (
        <div className="space-y-2">
          {(d?.withdrawals || []).map((w: any) => (
            <WithdrawalCard
              key={w.id}
              w={w}
              onApprove={() => updateMutation.mutate({ id: w.id, status: "approved" })}
              onReject={() => updateMutation.mutate({ id: w.id, status: "rejected" })}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">第 {page}/{totalPages} 页</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-xs" style={{ minHeight: "36px" }}>
            <ChevronLeft size={14} /> 上一页
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="text-xs" style={{ minHeight: "36px" }}>
            下一页 <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
