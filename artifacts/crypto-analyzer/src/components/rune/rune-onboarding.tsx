import { useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { useLocation } from "wouter";
import { BindReferrerModal } from "./bind-referrer-modal";
import { PurchaseNodeModal } from "./purchase-node-modal";
import { useReferralParam } from "@/hooks/rune/use-referral-param";
import { useReferrerOf } from "@/hooks/rune/use-community";
import { useUserPurchase } from "@/hooks/rune/use-node-presell";

/**
 * Sole piece of onboarding glue. Mount once on /recruit. It:
 *  1. Reads `?ref=` from the URL.
 *  2. On wallet connect, reads referrerOf + getUserPurchaseData.
 *  3. If already purchased → redirect straight to /dashboard (no modals).
 *  4. Else if not bound → show BindReferrerModal (pre-filled from ?ref=).
 *  5. After bind, or if already bound → show PurchaseNodeModal.
 *  6. Purchase success → /dashboard. "Later" → /dashboard too.
 *
 * Each step is idempotent: we re-read the on-chain state after each
 * transaction so reloads mid-flow land the user in the correct step.
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
  // Tracks whether the user dismissed a step this session — don't re-open it
  // on every re-render. Cleared on disconnect.
  const [dismissed, setDismissed] = useState<Record<"bind" | "buy", boolean>>({ bind: false, buy: false });

  // Reset dismissals when the user disconnects or switches wallets.
  useEffect(() => { setDismissed({ bind: false, buy: false }); }, [address]);

  useEffect(() => {
    // Wait for account + on-chain reads before deciding what to show.
    if (!address || referrer === undefined || purchaseLoading) return;

    // 1. Already bought — skip modals, go straight to dashboard.
    if (hasPurchased) {
      navigate("/dashboard");
      return;
    }

    // 2. Need to bind first.
    if (!isBound && !dismissed.bind) {
      setBindOpen(true);
      setBuyOpen(false);
      return;
    }

    // 3. Bound but hasn't purchased — show the node picker.
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
          // Effect will flip buyOpen on next render.
        }}
      />
      <PurchaseNodeModal
        open={buyOpen}
        onClose={() => { setBuyOpen(false); setDismissed((d) => ({ ...d, buy: true })); }}
        onSkip={() => {
          setBuyOpen(false);
          setDismissed((d) => ({ ...d, buy: true }));
          navigate("/dashboard");
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
