import { useReadContract } from "thirdweb/react";
import { communityContract, COMMUNITY_ROOT } from "@/lib/thirdweb/contracts";

const ZERO = "0x0000000000000000000000000000000000000000";

/**
 * The caller's on-chain referrer. Three possible outcomes:
 *   - zero address → not bound yet; UI should prompt the user
 *   - COMMUNITY_ROOT (0x…0001) → top of the tree
 *   - any other 0x… → their upstream referrer
 */
export function useReferrerOf(address?: string) {
  const query = useReadContract({
    contract: communityContract,
    method: "function referrerOf(address) view returns (address)",
    params: [address ?? ZERO],
    queryOptions: { enabled: !!address },
  });

  const referrer = (query.data as string | undefined)?.toLowerCase();
  return {
    ...query,
    referrer,
    isBound: !!referrer && referrer !== ZERO.toLowerCase(),
    isRoot: !!referrer && referrer === COMMUNITY_ROOT.toLowerCase(),
  };
}
