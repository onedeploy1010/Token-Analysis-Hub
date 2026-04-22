import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { communityContract, COMMUNITY_ROOT } from "@/lib/thirdweb/contracts";
import { UserPlus, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-filled referrer address from the URL `?ref=`, if any. */
  initialReferrer?: string | null;
  /** Called after the addReferrer tx confirms — caller typically re-reads
   *  referrerOf and moves the user to the next step. */
  onBound: () => void;
}

/**
 * First-touch onboarding modal. Collects a referrer address (pre-fills
 * from `?ref=`) and submits `Community.addReferrer(referrer)`. The only
 * gas the user pays here is for this single tx.
 *
 * The contract enforces:
 *  - referrer ≠ self
 *  - user isn't already bound
 *  - referrer itself is bound (or is ROOT)
 *
 * We let those reverts surface as toast errors instead of pre-validating
 * the referrer on-chain; that keeps the UX snappy and mirrors what the
 * contract actually checks.
 */
export function BindReferrerModal({ open, onClose, initialReferrer, onBound }: Props) {
  const account = useActiveAccount();
  const [input, setInput] = useState<string>(initialReferrer ?? "");
  const [submitting, setSubmitting] = useState(false);
  const { mutateAsync: sendTx } = useSendTransaction();
  const { toast } = useToast();

  const normalized = input.trim().toLowerCase();
  const isValid = /^0x[0-9a-fA-F]{40}$/.test(normalized);
  const isSelf = account && normalized === account.address.toLowerCase();

  async function submit(refArg: string) {
    if (!account) return;
    setSubmitting(true);
    try {
      const tx = prepareContractCall({
        contract: communityContract,
        method: "function addReferrer(address)",
        params: [refArg as `0x${string}`],
      });
      await sendTx(tx);
      toast({ title: "Referrer bound", description: "Your referral relationship is now on-chain." });
      onBound();
    } catch (e: any) {
      toast({
        title: "Transaction failed",
        description: e?.message ?? "The contract rejected this binding. Check the referrer address and try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !submitting) onClose(); }}>
      <DialogContent className="bg-[#080f1e] border border-amber-700/30 max-w-md">
        <DialogHeader>
          <div className="inline-flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-amber-400" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400">Step 1 · Bind Referrer</span>
          </div>
          <DialogTitle className="text-xl font-bold">Connect your referral line</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            One small transaction locks your upstream referrer on-chain. This is a
            prerequisite to purchasing a node — the network needs to know which
            line you belong to before the presale accepts payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="ref-addr" className="text-xs text-muted-foreground">Referrer address</Label>
            <Input
              id="ref-addr"
              placeholder="0x…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={submitting}
              className="font-mono text-sm bg-background/60"
            />
            {initialReferrer && (
              <p className="text-[11px] text-amber-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" /> Pre-filled from invite link
              </p>
            )}
            {input && !isValid && (
              <p className="text-[11px] text-destructive flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" /> Not a valid EVM address
              </p>
            )}
            {isSelf && (
              <p className="text-[11px] text-destructive flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" /> You can't refer yourself
              </p>
            )}
          </div>

          <div className="rounded-lg border border-amber-700/30 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-200 leading-relaxed">
            Don't have a referrer? Use <span className="font-mono">ROOT</span> to join directly under the protocol.
            <Button
              variant="link"
              size="sm"
              className="h-auto py-0 ml-1 text-amber-300 text-[11px]"
              onClick={() => setInput(COMMUNITY_ROOT)}
              disabled={submitting}
            >
              Use ROOT
            </Button>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" onClick={onClose} disabled={submitting} className="flex-1">
              Later
            </Button>
            <Button
              className="flex-1 font-semibold"
              disabled={submitting || !isValid || !!isSelf}
              onClick={() => submit(normalized)}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign & Bind"}
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground/60 text-center">
            You pay only the BNB gas fee for this transaction. No USDT is transferred.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
