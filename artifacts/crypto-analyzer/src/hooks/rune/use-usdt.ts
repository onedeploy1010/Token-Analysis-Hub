import { useReadContract } from "thirdweb/react";
import { readContract } from "thirdweb";
import { usdtContract, nodePresellContract } from "@/lib/thirdweb/contracts";
import { useDemoStore } from "@/lib/demo-store";

/** Read USDT balance for `address`. Returns bigint (18 decimals). */
export function useUsdtBalance(address?: string) {
  const { isDemoMode, demoNodeId } = useDemoStore.getState();
  const q = useReadContract({
    contract: usdtContract,
    method: "function balanceOf(address) view returns (uint256)",
    params: [address ?? "0x0000000000000000000000000000000000000000"],
    queryOptions: { enabled: !!address && !isDemoMode },
  });
  if (isDemoMode && demoNodeId) {
    const BALANCES: Record<number, bigint> = {
      101: 128500n * 10n ** 18n,
      201: 43200n  * 10n ** 18n,
      301: 18750n  * 10n ** 18n,
      401: 8400n   * 10n ** 18n,
      501: 3200n   * 10n ** 18n,
    };
    return { ...q, data: BALANCES[demoNodeId] ?? 3200n * 10n ** 18n };
  }
  return q;
}

/** Read USDT allowance the wallet has granted to NodePresell. */
export function useUsdtAllowance(owner?: string) {
  return useReadContract({
    contract: usdtContract,
    method: "function allowance(address,address) view returns (uint256)",
    params: [owner ?? "0x0000000000000000000000000000000000000000", nodePresellContract.address],
    queryOptions: { enabled: !!owner },
  });
}

/** Imperative read — use inside mutation flows where you need a fresh
 *  allowance after an approve tx confirms. */
export async function readUsdtAllowance(owner: string) {
  return readContract({
    contract: usdtContract,
    method: "function allowance(address,address) view returns (uint256)",
    params: [owner, nodePresellContract.address],
  });
}
