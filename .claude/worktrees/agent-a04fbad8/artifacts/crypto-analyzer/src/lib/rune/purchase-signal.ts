/**
 * Module-level emitter the RuneOnboarding glue subscribes to. Lets the
 * recruit cards AND the "仪表盘" nav link re-open the Purchase modal
 * without having to hoist modal state into a provider.
 *
 * Fired whenever a place in the UI wants the user to confirm or
 * re-confirm a node purchase — e.g. clicking "立即购买" on a tier card
 * after dismissing the modal, or clicking "Dashboard" while still
 * unpurchased (since dashboard access is gated on hasPurchased).
 */
type Listener = () => void;

const listeners = new Set<Listener>();

export function emitOpenPurchase(): void {
  listeners.forEach((l) => l());
}

export function onOpenPurchase(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
