import { useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { useLocation } from "wouter";
import { BindReferrerModal } from "./bind-referrer-modal";
import { PurchaseNodeModal } from "./purchase-node-modal";
import { useReferralParam } from "@/hooks/rune/use-referral-param";
import { useReferrerOf } from "@/hooks/rune/use-community";
import { useUserPurchase } from "@/hooks/rune/use-node-presell";
import { onOpenPurchase } from "@/lib/rune/purchase-signal";

/**
 * Sole piece of onboarding glue. Mounted once in App.tsx.
 *
 * Flow (per user 2026-04-23):
 *   1. Wallet connects → read `referrerOf` and `getUserPurchaseData`.
 *   2. Not bound → pop BindReferrerModal (pre-filled from `?ref=` if any).
 *      The contract enforces bind-before-purchase, so this step must
 *      land before the purchase step even if the user arrived without
 *      an invite link.
 *   3. Bound + not purchased → pop PurchaseNodeModal. User may close it
 *      ("Later"), in which case they STAY on /recruit — dashboard is
 *      not accessible yet. The modal can be re-opened from:
 *        - each tier card's "Buy Now" button, or
 *        - the header nav "Dashboard" item (which is gated on
 *          hasPurchased and falls through to this signal when blocked).
 *   4. Already purchased → navigate straight to /dashboard.
 *
 * Each decision re-checks on-chain state after every tx so reloads
 * mid-flow land the user on the correct step.
 */
export function RuneOnboarding() {
  const account = useActiveAccount();
  const address = account?.address;
  const [, navigate] = useLocation();

  const refFromUrl = useReferralParam(address);
  const { referrer, isBound, refetch: refetchReferrer } = useReferrerOf(address);
  const { hasPurchased, isLoading: purchaseLoading, refetch: refetchPurchase } = useUserPurchase(address);

  const [bindOpen, setBindOpen] = useState(false);
  const [buyOpen, setBuyOpen]   = useState(false);
  // Per-session dismissal so dismissing a modal doesn't cause a re-open
  // loop. Cleared on disconnect; re-opened explicitly via the signal.
  const [dismissed, setDismissed] = useState<Record<"bind" | "buy", boolean>>({ bind: false, buy: false });

  useEffect(() => { setDismissed({ bind: false, buy: false }); }, [address]);

  // Re-open signal from outside (card clicks, nav clicks).
  useEffect(() => onOpenPurchase(() => {
    setDismissed((d) => ({ ...d, buy: false }));
    setBuyOpen(true);
  }), []);

  useEffect(() => {
    if (!address || referrer === undefined || purchaseLoading) return;

    // Already bought — skip modals, go straight to dashboard.
    if (hasPurchased) {
      navigate("/dashboard");
      return;
    }

    // Contract requires bind before purchase. Force the bind step first.
    if (!isBound && !dismissed.bind) {
      setBindOpen(true);
      setBuyOpen(false);
      return;
    }

    // Bound but hasn't purchased — show the node picker.
    if (isBound && !dismissed.buy) {
      setBindOpen(false);
      setBuyOpen(true);
      return;
    }
  }, [address, referrer, isBound, hasPurchased, purchaseLoading, dismissed, navigate]);

  return (
    <>
      <BindReferrerModal
        open={bindOpen}
        initialReferrer={refFromUrl}
        onClose={() => { setBindOpen(false); setDismissed((d) => ({ ...d, bind: true })); }}
        onBound={async () => {
          setBindOpen(false);
          await refetchReferrer();
          // Effect will flip buyOpen on the next render once isBound flips true.
        }}
      />
      <PurchaseNodeModal
        open={buyOpen}
        onClose={() => { setBuyOpen(false); setDismissed((d) => ({ ...d, buy: true })); }}
        onSkip={() => {
          // "Later" keeps the user on /recruit — dashboard requires a purchase.
          setBuyOpen(false);
          setDismissed((d) => ({ ...d, buy: true }));
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
