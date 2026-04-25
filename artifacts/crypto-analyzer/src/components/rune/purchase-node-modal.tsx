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
      <DialogContent className="bg-[#080f1e] border border-amber-700/30 max-w-xl max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <div className="inline-flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Coins className="h-4 w-4 text-amber-400" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400">{t("mr.buy.step")}</span>
          </div>
          <DialogTitle className="text-xl font-bold">{t("mr.buy.title")}</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {t("mr.buy.desc")}
          </DialogDescription>
        </DialogHeader>

        {/* 5-tier grid — 2 cols on phones (compact rows) so we don't
            push the CTA off-screen, expands to 3 cols on sm+. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
          {ALL_NODE_IDS.map((id) => {
            const meta = NODE_META[id];
            const cfg = configArray?.find((c) => Number(c.nodeId) === id);
            const priceLabel = cfg ? `$${fmt18(cfg.payAmount)} USDT` : "—";
            const soldOut = cfg && cfg.curNum >= cfg.maxLimit;
            const remaining = cfg ? Number(cfg.maxLimit - cfg.curNum) : 0;
            const isActive = selected === id;

            return (
              <button
                key={id}
                type="button"
                disabled={busy || soldOut}
                onClick={() => setSelected(id)}
                className={`text-left rounded-xl border p-2.5 transition-all ${
                  isActive
                    ? "border-amber-500 bg-amber-500/5 shadow-[0_0_0_1px_hsl(38,90%,50%,0.4)]"
                    : "border-border/40 bg-card/40 hover:border-border/80"
                } ${soldOut ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <div className={`text-[9px] font-mono uppercase tracking-[0.18em] ${meta.color}`}>{meta.nameEn}</div>
                <div className="text-sm font-bold text-foreground mt-0.5 leading-tight">{meta.nameCn}</div>
                <div className="num text-sm num-gold mt-1.5 leading-tight">{priceLabel}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {soldOut ? t("mr.buy.soldOut") : cfg ? `${remaining} ${t("mr.buy.seatsLeft")}` : t("mr.buy.loadingCfg")}
                </div>
              </button>
            );
          })}
        </div>

        {/* Status strip */}
        {step === "approving" && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-700/30 bg-blue-950/20 px-3 py-2 text-xs text-blue-200">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{t("mr.buy.approving")}</span>
          </div>
        )}
        {step === "buying" && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-700/30 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{t("mr.buy.sending")}</span>
          </div>
        )}
        {step === "done" && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-700/30 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{t("mr.buy.confirmed")}</span>
          </div>
        )}
        {step === "select" && !selected && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
            <AlertCircle className="h-3 w-3" /> {t("mr.buy.selectHint")}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={onSkip} disabled={busy} className="flex-1">
            {t("mr.buy.later")}
          </Button>
          <Button
            className="flex-1 font-semibold gap-2"
            disabled={!selected || busy || step === "done"}
            onClick={handleBuy}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                <ShieldCheck className="h-4 w-4" /> {t("mr.buy.approveBuy")} <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
