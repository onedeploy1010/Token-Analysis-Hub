import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Coins, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { maxUint256 } from "thirdweb/utils";
import { nodePresellContract, usdtContract, NODE_META, type NodeId } from "@/lib/thirdweb/contracts";
import { readUsdtAllowance } from "@/hooks/rune/use-usdt";
import { useNodeConfigs } from "@/hooks/rune/use-node-presell";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called after the purchase tx confirms — caller typically redirects to /dashboard. */
  onPurchased: () => void;
  /** "Later" button — redirects to dashboard without buying. */
  onSkip: () => void;
}

const ALL_NODE_IDS: NodeId[] = [101, 201, 301, 401];

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

  const configArray = (configs as any) as undefined | { nodeId: bigint; payAmount: bigint; maxLimit: bigint; curNum: bigint }[];
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
      toast({ title: "Purchase complete", description: `You now hold a ${NODE_META[selected].nameEn} node.` });
      // Small delay so the user sees the "done" state before we navigate.
      setTimeout(onPurchased, 800);
    } catch (e: any) {
      setStep("select");
      toast({
        title: "Purchase failed",
        description: e?.message ?? "The wallet or contract rejected the transaction.",
        variant: "destructive",
      });
    }
  }

  const busy = step === "approving" || step === "buying";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <DialogContent className="bg-[#080f1e] border border-amber-700/30 max-w-xl">
        <DialogHeader>
          <div className="inline-flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Coins className="h-4 w-4 text-amber-400" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400">Step 2 · Buy Node</span>
          </div>
          <DialogTitle className="text-xl font-bold">Claim your node</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Pick a tier. We'll first approve USDT (once per wallet) then call
            <span className="font-mono ml-1 text-foreground">nodePresell(id)</span>.
            Each wallet can only purchase once — choose carefully.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
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
                className={`text-left rounded-xl border p-4 transition-all ${
                  isActive
                    ? "border-amber-500 bg-amber-500/5 shadow-[0_0_0_1px_hsl(38,90%,50%,0.4)]"
                    : "border-border/40 bg-card/40 hover:border-border/80"
                } ${soldOut ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <div className={`text-[10px] font-mono uppercase tracking-[0.2em] ${meta.color}`}>{meta.nameEn}</div>
                <div className="text-lg font-bold text-foreground mt-0.5">{meta.nameCn}</div>
                <div className="num text-xl num-gold mt-2">{priceLabel}</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {soldOut ? "Sold out" : cfg ? `${remaining} seats left` : "Loading…"}
                </div>
              </button>
            );
          })}
        </div>

        {/* Status strip */}
        {step === "approving" && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-700/30 bg-blue-950/20 px-3 py-2 text-xs text-blue-200">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Confirm USDT approval in your wallet…</span>
          </div>
        )}
        {step === "buying" && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-700/30 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Sending purchase transaction…</span>
          </div>
        )}
        {step === "done" && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-700/30 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Purchase confirmed — loading dashboard…</span>
          </div>
        )}
        {step === "select" && !selected && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
            <AlertCircle className="h-3 w-3" /> Select a tier to continue.
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={onSkip} disabled={busy} className="flex-1">
            Later
          </Button>
          <Button
            className="flex-1 font-semibold gap-2"
            disabled={!selected || busy || step === "done"}
            onClick={handleBuy}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                <ShieldCheck className="h-4 w-4" /> Approve & Buy <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
