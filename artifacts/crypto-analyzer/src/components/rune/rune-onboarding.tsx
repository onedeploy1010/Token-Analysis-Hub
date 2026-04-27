import { useEffect, useState } from "react";
import { useActiveAccount, useActiveWallet, useDisconnect } from "thirdweb/react";
import { useLocation } from "wouter";
import { BindReferrerModal } from "./bind-referrer-modal";
import { PurchaseNodeModal } from "./purchase-node-modal";
import { useReferralParam } from "@/hooks/rune/use-referral-param";
import { useReferrerOf } from "@/hooks/rune/use-community";
import { useUserPurchase } from "@/hooks/rune/use-node-presell";
import { onOpenPurchase } from "@/lib/rune/purchase-signal";
import { useDemoStore } from "@/lib/demo-store";
import type { NodeId } from "@/lib/thirdweb/contracts";

/**
 * Sole piece of onboarding glue. Mounted once in App.tsx.
 *
 * Flow (per user 2026-04-27):
 *   1. Wallet connects → read `referrerOf` and `getUserPurchaseData`.
 *   2. Not bound → BindReferrerModal opens. The user can either bind
 *      (success → step 3) or close the modal (X / Escape / outside-click
 *      → wallet disconnects → UI returns to the unauthenticated state).
 *      Pre-fills the input from `?ref=` if present.
 *   3. Bound + not purchased → pop PurchaseNodeModal. User may close
 *      it ("Later") and STAY on /recruit. They may also click the
 *      "Dashboard" nav to enter the dashboard manually, where they see
 *      a restricted view (referral link only + periodic purchase nag).
 *   4. Already purchased → navigate straight to /dashboard.
 *
 * Each decision re-checks on-chain state after every tx so reloads
 * mid-flow land the user on the correct step.
 */
export function RuneOnboarding() {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const { isDemoMode } = useDemoStore();
  const address = account?.address;
  const [, navigate] = useLocation();

  const refFromUrl = useReferralParam(address);
  const { referrer, isBound, refetch: refetchReferrer } = useReferrerOf(address);
  const { hasPurchased, isLoading: purchaseLoading, refetch: refetchPurchase } = useUserPurchase(address);

  const [bindOpen, setBindOpen] = useState(false);
  const [buyOpen, setBuyOpen]   = useState(false);
  const [preSelectedNodeId, setPreSelectedNodeId] = useState<NodeId | undefined>();
  // Both modals are dismissable per session. The dismissed flags prevent
  // the effect below from snapping a modal back open during the brief
  // window between `setOpen(false)` and the wallet/contract state update
  // propagating to `address` / `isBound`. Without them, a Radix Dialog
  // open→close→open micro-cycle leaves the page with a lingering body
  // `pointer-events: none` that requires a refresh to clear.
  const [bindDismissed, setBindDismissed] = useState(false);
  const [buyDismissed, setBuyDismissed] = useState(false);

  useEffect(() => {
    setBindDismissed(false);
    setBuyDismissed(false);
  }, [address]);

  // Re-open signal from outside (card clicks, nav clicks).
  // Optionally carries a specific nodeId to pre-select in the modal.
  useEffect(() => onOpenPurchase((nodeId) => {
    if (isDemoMode) return;
    setPreSelectedNodeId(nodeId);
    setBuyDismissed(false);
    setBuyOpen(true);
  }), [isDemoMode]);

  useEffect(() => {
    // Demo mode bypasses all onboarding gates — the /demo page handles entry.
    if (isDemoMode) return;
    if (!address || referrer === undefined || purchaseLoading) return;

    // Not bound — must bind before anything else. Modal is dismissable
    // (close = disconnect wallet); `bindDismissed` keeps this branch from
    // re-opening it during the disconnect's propagation window.
    if (!isBound && !bindDismissed) {
      setBindOpen(true);
      setBuyOpen(false);
      return;
    }

    // Already bought — skip modals, go straight to dashboard.
    if (hasPurchased) {
      navigate("/dashboard");
      return;
    }

    // Bound but not yet purchased — pop the node picker. Closing it
    // ("Later") leaves the user on /recruit; they can still click the
    // Dashboard nav to enter the dashboard's restricted view.
    if (!buyDismissed) {
      setBindOpen(false);
      setBuyOpen(true);
      return;
    }
  }, [address, referrer, isBound, bindDismissed, hasPurchased, purchaseLoading, buyDismissed, navigate]);

  return (
    <>
      <BindReferrerModal
        open={bindOpen}
        initialReferrer={refFromUrl}
        // Closing without binding rolls the wallet back to disconnected —
        // there's nothing useful a connected-but-unbound wallet can do here.
        onClose={() => {
          setBindDismissed(true);
          setBindOpen(false);
          if (wallet) disconnect(wallet);
        }}
        onBound={async () => {
          setBindOpen(false);
          await refetchReferrer();
          // Effect will flip buyOpen on the next render once isBound flips true.
        }}
      />
      <PurchaseNodeModal
        open={buyOpen}
        initialNodeId={preSelectedNodeId}
        onClose={() => { setBuyOpen(false); setBuyDismissed(true); setPreSelectedNodeId(undefined); }}
        onSkip={() => {
          setBuyOpen(false);
          setBuyDismissed(true);
          setPreSelectedNodeId(undefined);
        }}
        onPurchased={async () => {
          setBuyOpen(false);
          setPreSelectedNodeId(undefined);
          await refetchPurchase();
          navigate("/dashboard");
        }}
      />
    </>
  );
}
