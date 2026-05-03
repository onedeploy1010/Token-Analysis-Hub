import { useMemberDetail } from "./context";
import { MemberDetailModal } from "./modal";

/**
 * Renders the global member-detail modal exactly once at app root. Reads
 * the active address from `<MemberDetailProvider>` context. Mounted as a
 * sibling of the provider's children so the provider doesn't have to
 * import the modal (avoids circular imports between context.tsx and
 * modal.tsx).
 */
export function MemberDetailHost() {
  const { addr, close } = useMemberDetail();
  if (!addr) return null;
  return <MemberDetailModal address={addr} onClose={close} />;
}
