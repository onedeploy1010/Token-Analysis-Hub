import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Coins, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { maxUint256 } from "thirdweb/utils";
import { nodePresellContract, usdtContract, NODE_META, NODE_IDS, type NodeId } from "@/lib/thirdweb/contracts";
import { readUsdtAllowance } from "@/hooks/rune/use-usdt";
import { useNodeConfigs } from "@/hooks/rune/use-node-presell";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called after the purchase tx confirms — caller typically redirects to /dashboard. */
  onPurchased: () => void;
  /** "Later" button — redirects to dashboard without buying. */
  onSkip: () => void;
}

const ALL_NODE_IDS: readonly NodeId[] = NODE_IDS;

/** Format a bigint with 18 decimals as "50,000". */
function fmt18(raw: bigint, decimals = 0): string {
  const base = 10n ** 18n;
  const whole = raw / base;
  if (decimals === 0) return whole.toLocaleString("en-US");
  const frac = raw % base;
  const fracStr = frac.toString().padStart(18, "0").slice(0, decimals).replace(/0+$/, "");
  return fracStr ? `${whole.toLocaleString("en-US")}.${fracStr}` : whole.toLocaleString("en-US");
}

type Step = "select" | "approving" | "buying" | "done";

/**
 * The main presale modal. User picks a tier, we run the
 * approve → nodePresell dance, then notify the parent which typically
 * redirects to /dashboard.
 */
export function PurchaseNodeModal({ open, onClose, onPurchased, onSkip }: Props) {
  const { t } = useLanguage();
  const account = useActiveAccount();
  const [selected, setSelected] = useState<NodeId | null>(null);
  const [step, setStep] = useState<Step>("select");
  const { data: configs } = useNodeConfigs();
  const { mutateAsync: sendTx } = useSendTransaction();
  const { toast } = useToast();

  // Reset internal state each time the dialog is re-opened.
  useEffect(() => {
    if (open) {
      setSelected(null);
      setStep("select");
    }
  }, [open]);

  const configArray = (configs as any) as undefined | { nodeId: bigint; payAmount: bigint; maxLimit: bigint; curNum: bigint; directRate: bigint }[];
  const selectedConfig = selected && configArray
    ? configArray.find((c) => Number(c.nodeId) === selected)
    : undefined;

  async function handleBuy() {
    if (!account || !selected || !selectedConfig) return;
    try {
      // 1. Check allowance; approve unlimited if short.
      setStep("approving");
      const allowance = await readUsdtAllowance(account.address);
      if (allowance < selectedConfig.payAmount) {
        const approveTx = prepareContractCall({
          contract: usdtContract,
          method: "function approve(address,uint256)",
          params: [nodePresellContract.address as `0x${string}`, maxUint256],
        });
        await sendTx(approveTx);
      }

      // 2. Purchase.
      setStep("buying");
      const buyTx = prepareContractCall({
        contract: nodePresellContract,
        method: "function nodePresell(uint256)",
        params: [BigInt(selected)],
      });
      await sendTx(buyTx);

      setStep("done");
      toast({ title: t("mr.buy.toastDone"), description: t("mr.buy.toastDoneDesc").replace("{node}", NODE_META[selected].nameEn) });
      // Small delay so the user sees the "done" state before we navigate.
      setTimeout(onPurchased, 800);
    } catch (e: any) {
      setStep("select");
      toast({
        title: t("mr.buy.toastFail"),
        description: e?.message ?? t("mr.buy.toastFailDesc"),
        variant: "destructive",
      });
    }
  }

  const busy = step === "approving" || step === "buying";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <DialogContent className="bg-[#080f1e] border border-amber-700/30 max-w-md max-h-[88dvh] overflow-y-auto p-4 gap-3">
        <DialogHeader className="space-y-1.5">
          {/* Step badge + title on one line so the header stays compact. */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Coins className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300 truncate">
              {t("mr.buy.step")}
            </span>
          </div>
          <DialogTitle className="text-base font-bold leading-tight">
            {t("mr.buy.title")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-[11px] leading-snug">
            {t("mr.buy.desc")}
          </DialogDescription>
          <p className="text-[10px] leading-snug text-amber-300/70 font-medium">
            {t("mr.buy.descHint")}
          </p>
        </DialogHeader>

        {/* Vertical tier list — entry tier (1,000 U) on top, apex
            (50,000 U) on bottom. One column always so the five rows
            stack predictably on phones; row height kept tight. */}
        <div className="flex flex-col gap-1.5">
          {[...ALL_NODE_IDS].sort((a, b) => b - a).map((id) => {
            const meta = NODE_META[id];
            const cfg = configArray?.find((c) => Number(c.nodeId) === id);
            const priceLabel = cfg ? fmt18(cfg.payAmount) : "—";
            const soldOut = cfg && cfg.curNum >= cfg.maxLimit;
            const remaining = cfg ? Number(cfg.maxLimit - cfg.curNum) : 0;
            const directPct = cfg ? Number(cfg.directRate) / 100 : null;
            const isActive = selected === id;

            return (
              <button
                key={id}
                type="button"
                disabled={busy || soldOut}
                onClick={() => setSelected(id)}
                className={`group relative flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-all text-left overflow-hidden ${
                  isActive
                    ? "border-amber-500 bg-amber-500/[0.06] shadow-[0_0_0_1px_hsl(38,90%,50%,0.45)]"
                    : "border-border/40 bg-card/40 hover:border-border/80"
                } ${soldOut ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                {/* Tier-color spine on the left edge */}
                <span
                  className="absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{ backgroundColor: `rgb(${meta.rgb})`, opacity: isActive ? 1 : 0.55 }}
                  aria-hidden
                />

                {/* Symbol tile */}
                <span
                  className="ml-0.5 h-8 w-8 rounded-md shrink-0 flex items-center justify-center font-bold text-sm"
                  style={{
                    backgroundColor: `rgba(${meta.rgb}, 0.14)`,
                    color: `rgb(${meta.rgb})`,
                    border: `1px solid rgba(${meta.rgb}, 0.32)`,
                  }}
                >
                  {meta.nameCn.charAt(meta.nameCn.length - 1)}
                </span>

                {/* Center — tier name + meta line (seats / direct rate) */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[13px] font-bold text-foreground truncate">{meta.nameCn}</span>
                    <span className={`text-[9px] font-mono uppercase tracking-[0.16em] ${meta.color} truncate`}>
                      {meta.nameEn}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground/85 truncate leading-tight">
                    {soldOut ? (
                      t("mr.buy.soldOut")
                    ) : cfg ? (
                      <>
                        <span>{remaining} {t("mr.buy.seatsLeft")}</span>
                        {directPct !== null && (
                          <>
                            <span className="opacity-40 mx-1">·</span>
                            <span className="text-amber-300/85">{directPct}%</span>
                          </>
                        )}
                      </>
                    ) : (
                      t("mr.buy.loadingCfg")
                    )}
                  </div>
                </div>

                {/* Right — price */}
                <div className="text-right shrink-0 leading-none">
                  <div className="text-sm font-bold tabular-nums text-amber-300">
                    {priceLabel}
                  </div>
                  <div className="text-[8px] text-muted-foreground/70 mt-0.5 font-mono uppercase tracking-[0.18em]">
                    USDT
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Status strip — only takes vertical space while a tx is pending */}
        {step === "approving" && (
          <div className="flex items-center gap-2 rounded-md border border-blue-700/30 bg-blue-950/20 px-2.5 py-1.5 text-[11px] text-blue-200">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{t("mr.buy.approving")}</span>
          </div>
        )}
        {step === "buying" && (
          <div className="flex items-center gap-2 rounded-md border border-amber-700/30 bg-amber-950/20 px-2.5 py-1.5 text-[11px] text-amber-200">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{t("mr.buy.sending")}</span>
          </div>
        )}
        {step === "done" && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-700/30 bg-emerald-950/20 px-2.5 py-1.5 text-[11px] text-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            <span>{t("mr.buy.confirmed")}</span>
          </div>
        )}
        {step === "select" && !selected && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
            <AlertCircle className="h-3 w-3" /> {t("mr.buy.selectHint")}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" onClick={onSkip} disabled={busy} className="flex-1 h-9 text-sm">
            {t("mr.buy.later")}
          </Button>
          <Button
            className="flex-1 font-semibold gap-1.5 h-9 text-sm"
            disabled={!selected || busy || step === "done"}
            onClick={handleBuy}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
              <>
                <ShieldCheck className="h-3.5 w-3.5" /> {t("mr.buy.approveBuy")} <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
