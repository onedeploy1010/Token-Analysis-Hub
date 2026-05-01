import { useState, useEffect } from "react";
import { Loader2, Check, ExternalLink, ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import {
  getDistributorRecipients,
  isAuthorizedCaller,
  getProductCount,
  COREX_INVESTMENT_ADDRESS,
  FUND_DISTRIBUTOR_ADDRESS,
  COREX_WITHDRAWAL_ADDRESS,
  getWithdrawalAllowance,
  getFundingWallet,
  prepareApproveUSDTForWithdrawal,
  formatUSDT,
  getUSDTBalance,
} from "@/lib/contracts";
import { getProducts, DBProduct, adminAddLog, getFeeWalletAddress, setFeeWalletAddress } from "@/lib/api";
import { Input } from "@/components/ui/input";

function shortAddr(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

export default function ContractSetup() {
  const { toast } = useToast();
  const account = useActiveAccount();
  const { mutateAsync: sendTx } = useSendTransaction();

  const [recipients, setRecipients] = useState<any[]>([]);
  const [investAuthorized, setInvestAuthorized] = useState<boolean | null>(null);
  const [productCount, setProductCount] = useState<number>(0);
  const [loadingData, setLoadingData] = useState(true);
  const [dbProducts, setDbProducts] = useState<DBProduct[]>([]);

  // Withdrawal authorization state
  const [fundingWallet, setFundingWallet] = useState<string>("");
  const [withdrawalAllowance, setWithdrawalAllowance] = useState<bigint | null>(null);
  const [fundingWalletBalance, setFundingWalletBalance] = useState<bigint | null>(null);
  const [approving, setApproving] = useState(false);

  // Fee wallet state
  const [feeWallet, setFeeWallet] = useState<string>("");
  const [feeWalletInput, setFeeWalletInput] = useState<string>("");
  const [feeWalletBalance, setFeeWalletBalance] = useState<bigint | null>(null);
  const [savingFeeWallet, setSavingFeeWallet] = useState(false);

  useEffect(() => {
    loadContractData();
  }, []);

  const loadContractData = async () => {
    setLoadingData(true);
    try {
      const [recs, authStatus, pCount, products, fWallet, feeAddr] = await Promise.all([
        getDistributorRecipients().catch(() => []),
        isAuthorizedCaller(COREX_INVESTMENT_ADDRESS).catch(() => null),
        getProductCount().catch(() => 0),
        getProducts().catch(() => []),
        getFundingWallet().catch(() => ""),
        getFeeWalletAddress().catch(() => ""),
      ]);
      setRecipients(Array.isArray(recs) ? recs as any[] : []);
      setInvestAuthorized(authStatus);
      setProductCount(pCount);
      setDbProducts(products);
      setFundingWallet(fWallet);
      setFeeWallet(feeAddr);
      setFeeWalletInput(feeAddr);

      // Load allowance and balance for funding wallet
      if (fWallet && fWallet !== "0x0000000000000000000000000000000000000000") {
        const [allowance, balance] = await Promise.all([
          getWithdrawalAllowance(fWallet).catch(() => BigInt(0)),
          getUSDTBalance(fWallet).catch(() => BigInt(0)),
        ]);
        setWithdrawalAllowance(allowance);
        setFundingWalletBalance(balance);
      }

      // Load fee wallet balance
      if (feeAddr && feeAddr.length === 42) {
        const feeBal = await getUSDTBalance(feeAddr).catch(() => BigInt(0));
        setFeeWalletBalance(feeBal);
      }
    } catch {}
    setLoadingData(false);
  };

  const handleApproveWithdrawal = async () => {
    if (!account) {
      toast({ title: "请先连接钱包", variant: "destructive" });
      return;
    }
    setApproving(true);
    try {
      const tx = prepareApproveUSDTForWithdrawal(MAX_UINT256);
      await sendTx(tx);
      toast({ title: "授权成功", description: "提现钱包已授权新提现合约" });
      await adminAddLog("授权提现合约USDT", "withdrawal_contract", COREX_WITHDRAWAL_ADDRESS, {
        fundingWallet,
        connectedWallet: account.address,
      });
      // Refresh data
      if (fundingWallet) {
        const allowance = await getWithdrawalAllowance(fundingWallet).catch(() => BigInt(0));
        setWithdrawalAllowance(allowance);
      }
    } catch (err: any) {
      toast({ title: "授权失败", description: err.message, variant: "destructive" });
    } finally {
      setApproving(false);
    }
  };

  const isWithdrawalApproved = withdrawalAllowance !== null && withdrawalAllowance > BigInt(0);

  const StatusBadge = ({ ok, label }: { ok: boolean | null; label: string }) => {
    if (ok === null) return <Loader2 size={14} className="animate-spin text-muted-foreground" />;
    return (
      <span className="text-xs px-2 py-0.5 rounded" style={{
        background: ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
        color: ok ? "#22c55e" : "#ef4444",
      }}>
        {ok && <Check size={10} className="inline mr-1" />}{label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
          <h2 className="font-bold text-lg text-foreground">合约状态</h2>
        </div>
        <button onClick={loadContractData} disabled={loadingData} className="p-2 rounded-lg" style={{ color: "#C9A227" }}>
          <RefreshCw size={14} className={loadingData ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Contract Addresses */}
      <div className="rounded-xl p-4 space-y-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
        <div className="text-sm font-semibold text-foreground mb-2">合约地址</div>
        {[
          { label: "FundDistributor", addr: FUND_DISTRIBUTOR_ADDRESS },
          { label: "CoreXInvestment", addr: COREX_INVESTMENT_ADDRESS },
          { label: "CoreXWithdrawal", addr: COREX_WITHDRAWAL_ADDRESS },
        ].map(c => (
          <div key={c.label} className="flex items-center justify-between py-1.5">
            <span className="text-xs text-muted-foreground">{c.label}</span>
            <a
              href={`https://bscscan.com/address/${c.addr}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-mono"
              style={{ color: "#C9A227" }}
            >
              {shortAddr(c.addr)}
              <ExternalLink size={10} />
            </a>
          </div>
        ))}
      </div>

      {/* Fund Distribution */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">资金分配</div>
          {loadingData ? (
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          ) : (
            <StatusBadge ok={recipients.length > 0} label={recipients.length > 0 ? "已配置" : "未配置"} />
          )}
        </div>
        {recipients.length > 0 && (
          <div className="space-y-1.5">
            {recipients.map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs py-1.5" style={{ borderBottom: "1px solid rgba(201,162,39,0.08)" }}>
                <a
                  href={`https://bscscan.com/address/${r.wallet || r[0]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono flex items-center gap-1"
                  style={{ color: "#C9A227" }}
                >
                  {shortAddr(r.wallet || r[0])}
                  <ExternalLink size={9} />
                </a>
                <span className="font-semibold" style={{ color: "#E8C547" }}>{Number(r.percentage || r[1]) / 100}%</span>
                <span className="text-muted-foreground">{r.label || r[2]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Investment Products */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">投资产品</div>
          {loadingData ? (
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          ) : (
            <StatusBadge
              ok={productCount >= dbProducts.length}
              label={`${productCount}/${dbProducts.length} 已添加`}
            />
          )}
        </div>
        <div className="space-y-1.5">
          {dbProducts.map((p, i) => {
            const added = i < productCount;
            return (
              <div key={p.id} className="flex items-center justify-between text-xs py-1.5" style={{ borderBottom: "1px solid rgba(201,162,39,0.08)" }}>
                <div className="flex items-center gap-2">
                  {added ? (
                    <Check size={12} style={{ color: "#22c55e" }} />
                  ) : (
                    <div className="w-3 h-3 rounded-full" style={{ border: "1px solid rgba(255,255,255,0.15)" }} />
                  )}
                  <span className={added ? "text-foreground font-medium" : "text-muted-foreground"}>{p.nameEn}</span>
                  <span className="text-muted-foreground">({p.name})</span>
                </div>
                <span className="text-muted-foreground">{p.minAmount} USDT</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Authorization */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">合约授权</div>
          {loadingData ? (
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          ) : (
            <StatusBadge ok={investAuthorized === true} label={investAuthorized ? "已授权" : "未授权"} />
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          CoreXInvestment → FundDistributor distribute 授权状态
        </div>
      </div>

      {/* Fee Wallet */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">手续费钱包</div>
          {loadingData ? (
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          ) : (
            <StatusBadge ok={!!feeWallet && feeWallet.length === 42} label={feeWallet ? "已配置" : "未配置"} />
          )}
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={feeWalletInput}
              onChange={e => setFeeWalletInput(e.target.value.trim())}
              placeholder="0x... 手续费收款钱包地址"
              className="flex-1 text-xs font-mono"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)" }}
            />
            <Button
              size="sm"
              disabled={savingFeeWallet || feeWalletInput === feeWallet}
              style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
              onClick={async () => {
                if (!feeWalletInput || !feeWalletInput.startsWith("0x") || feeWalletInput.length !== 42) {
                  toast({ title: "请输入有效的钱包地址", variant: "destructive" });
                  return;
                }
                setSavingFeeWallet(true);
                try {
                  await setFeeWalletAddress(feeWalletInput);
                  setFeeWallet(feeWalletInput.toLowerCase());
                  const feeBal = await getUSDTBalance(feeWalletInput).catch(() => BigInt(0));
                  setFeeWalletBalance(feeBal);
                  await adminAddLog("设置手续费钱包", "system_settings", "fee_wallet_address", { address: feeWalletInput });
                  toast({ title: "保存成功" });
                } catch (err: any) {
                  toast({ title: "保存失败", description: err.message, variant: "destructive" });
                } finally {
                  setSavingFeeWallet(false);
                }
              }}
            >
              {savingFeeWallet ? <Loader2 size={14} className="animate-spin" /> : "保存"}
            </Button>
          </div>

          {feeWallet && feeWallet.length === 42 && (
            <>
              <div className="flex items-center justify-between text-xs py-1" style={{ borderBottom: "1px solid rgba(201,162,39,0.08)" }}>
                <span className="text-muted-foreground">钱包地址</span>
                <a
                  href={`https://bscscan.com/address/${feeWallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono flex items-center gap-1"
                  style={{ color: "#C9A227" }}
                >
                  {shortAddr(feeWallet)}
                  <ExternalLink size={9} />
                </a>
              </div>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-muted-foreground">USDT 余额</span>
                <span style={{ color: "#C9A227" }}>
                  {feeWalletBalance !== null ? `${formatUSDT(feeWalletBalance)} USDT` : "..."}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="text-[10px] text-muted-foreground/50">
          手续费钱包用于接收提现手续费，余额在提现管理页面显示
        </div>
      </div>

      {/* Withdrawal Wallet Authorization */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">提现钱包授权</div>
          {loadingData ? (
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          ) : (
            <StatusBadge ok={isWithdrawalApproved} label={isWithdrawalApproved ? "已授权" : "未授权"} />
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs py-1" style={{ borderBottom: "1px solid rgba(201,162,39,0.08)" }}>
            <span className="text-muted-foreground">提现合约</span>
            <a
              href={`https://bscscan.com/address/${COREX_WITHDRAWAL_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono flex items-center gap-1"
              style={{ color: "#C9A227" }}
            >
              {shortAddr(COREX_WITHDRAWAL_ADDRESS)}
              <ExternalLink size={9} />
            </a>
          </div>

          {fundingWallet && fundingWallet !== "0x0000000000000000000000000000000000000000" && (
            <>
              <div className="flex items-center justify-between text-xs py-1" style={{ borderBottom: "1px solid rgba(201,162,39,0.08)" }}>
                <span className="text-muted-foreground">提现钱包</span>
                <a
                  href={`https://bscscan.com/address/${fundingWallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono flex items-center gap-1"
                  style={{ color: "#C9A227" }}
                >
                  {shortAddr(fundingWallet)}
                  <ExternalLink size={9} />
                </a>
              </div>

              <div className="flex items-center justify-between text-xs py-1" style={{ borderBottom: "1px solid rgba(201,162,39,0.08)" }}>
                <span className="text-muted-foreground">钱包余额</span>
                <span style={{ color: "#C9A227" }}>
                  {fundingWalletBalance !== null ? `${formatUSDT(fundingWalletBalance)} USDT` : "..."}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1" style={{ borderBottom: "1px solid rgba(201,162,39,0.08)" }}>
                <span className="text-muted-foreground">授权额度</span>
                <span style={{ color: isWithdrawalApproved ? "#22c55e" : "#ef4444" }}>
                  {withdrawalAllowance !== null
                    ? withdrawalAllowance > BigInt("1000000000000000000000000000")
                      ? "无限"
                      : `${formatUSDT(withdrawalAllowance)} USDT`
                    : "..."}
                </span>
              </div>
            </>
          )}
        </div>

        {!isWithdrawalApproved && (
          <div className="rounded-lg p-3 space-y-2" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)" }}>
            <div className="text-xs text-muted-foreground">
              提现钱包需要授权新提现合约才能执行自动提现。请使用提现钱包连接后点击授权。
            </div>
            {account && (
              <div className="text-[10px] text-muted-foreground">
                当前钱包: <span className="font-mono" style={{ color: "#C9A227" }}>{shortAddr(account.address)}</span>
                {fundingWallet && account.address.toLowerCase() !== fundingWallet.toLowerCase() && (
                  <span style={{ color: "#ef4444" }}> (非提现钱包，请切换到 {shortAddr(fundingWallet)})</span>
                )}
              </div>
            )}
          </div>
        )}

        <Button
          className="w-full font-bold text-sm"
          style={{
            background: isWithdrawalApproved
              ? "rgba(34,197,94,0.1)"
              : "linear-gradient(135deg, #C9A227, #9A7A1A)",
            color: isWithdrawalApproved ? "#22c55e" : "#0c0a08",
            border: isWithdrawalApproved ? "1px solid rgba(34,197,94,0.3)" : "none",
          }}
          disabled={approving || isWithdrawalApproved}
          onClick={handleApproveWithdrawal}
        >
          {approving ? (
            <><Loader2 size={14} className="mr-2 animate-spin" />授权中...</>
          ) : isWithdrawalApproved ? (
            <><ShieldCheck size={14} className="mr-2" />已授权</>
          ) : (
            <><ShieldCheck size={14} className="mr-2" />授权提现钱包</>
          )}
        </Button>
      </div>
    </div>
  );
}
