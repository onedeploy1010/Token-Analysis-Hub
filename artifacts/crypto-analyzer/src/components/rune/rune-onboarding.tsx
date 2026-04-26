import { useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { useLocation } from "wouter";
import { BindReferrerModal } from "./bind-referrer-modal";
import { PurchaseNodeModal } from "./purchase-node-modal";
import { useReferralParam } from "@/hooks/rune/use-referral-param";
import { useReferrerOf } from "@/hooks/rune/use-community";
import { useUserPurchase } from "@/hooks/rune/use-node-presell";
import { onOpenPurchase } from "@/lib/rune/purchase-signal";
import { useDemoStore } from "@/lib/demo-store";

/**
 * Sole piece of onboarding glue. Mounted once in App.tsx.
 *
 * Flow (per user 2026-04-26):
 *   1. Wallet connects → read `referrerOf` and `getUserPurchaseData`.
 *   2. Not bound → BindReferrerModal stays open until the bind tx
 *      confirms. Connecting the wallet *is* registering as a member,
 *      and member registration requires a referrer — there is no
 *      "Later" escape hatch, no close button, no outside-click
 *      dismissal. Pre-fills the input from `?ref=` if present.
 *   3. Bound + not purchased → pop PurchaseNodeModal. User may close
 *      it ("Later"), in which case they STAY on /recruit — dashboard
 *      is not accessible yet. The modal can be re-opened from:
 *        - each tier card's "Buy Now" button, or
 *        - the header nav "Dashboard" item.
 *   4. Already purchased → navigate straight to /dashboard.
 *
 * Each decision re-checks on-chain state after every tx so reloads
 * mid-flow land the user on the correct step.
 */
export function RuneOnboarding() {
  const account = useActiveAccount();
  const { isDemoMode } = useDemoStore();
  const address = account?.address;
  const [, navigate] = useLocation();

  const refFromUrl = useReferralParam(address);
  const { referrer, isBound, refetch: refetchReferrer } = useReferrerOf(address);
  const { hasPurchased, isLoading: purchaseLoading, refetch: refetchPurchase } = useUserPurchase(address);

  const [bindOpen, setBindOpen] = useState(false);
  const [buyOpen, setBuyOpen]   = useState(false);
  // Buy modal is dismissable per session; bind modal is not (it only
  // closes once the on-chain tx confirms). Cleared on disconnect.
  const [buyDismissed, setBuyDismissed] = useState(false);

  useEffect(() => { setBuyDismissed(false); }, [address]);

  // Re-open signal from outside (card clicks, nav clicks).
  useEffect(() => onOpenPurchase(() => {
    if (isDemoMode) return;
    setBuyDismissed(false);
    setBuyOpen(true);
  }), [isDemoMode]);

  useEffect(() => {
    // Demo mode bypasses all onboarding gates — the /demo page handles entry.
    if (isDemoMode) return;
    if (!address || referrer === undefined || purchaseLoading) return;

    // Already bought — skip modals, go straight to dashboard.
    if (hasPurchased) {
      navigate("/dashboard");
      return;
    }

    // Bind is mandatory: connecting a wallet equals registering a
    // member account, which requires a referrer. The modal stays open
    // until the bind tx confirms — no dismissal path.
    if (!isBound) {
      setBindOpen(true);
      setBuyOpen(false);
      return;
    }

    // Bound but hasn't purchased — show the node picker.
    if (isBound && !buyDismissed) {
      setBindOpen(false);
      setBuyOpen(true);
      return;
    }
  }, [address, referrer, isBound, hasPurchased, purchaseLoading, buyDismissed, navigate]);

  return (
    <>
      <BindReferrerModal
        open={bindOpen}
        initialReferrer={refFromUrl}
        // No-op: the modal can only close after a successful bind tx.
        onClose={() => { /* mandatory step */ }}
        onBound={async () => {
          setBindOpen(false);
          await refetchReferrer();
          // Effect will flip buyOpen on the next render once isBound flips true.
        }}
      />
      <PurchaseNodeModal
        open={buyOpen}
        onClose={() => { setBuyOpen(false); setBuyDismissed(true); }}
        onSkip={() => {
          // "Later" keeps the user on /recruit — dashboard requires a purchase.
          setBuyOpen(false);
          setBuyDismissed(true);
        }}
        onPurchased={async () => {
          setBuyOpen(false);
          await refetchPurchase();
          navigate("/dashboard");
        }}
      />
    </>
  );
}
