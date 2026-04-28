import { useReadContract } from "thirdweb/react";
import { readContract } from "thirdweb";
import { usdtContract, nodePresellContract } from "@/lib/thirdweb/contracts";

/** Read USDT balance for `address`. Returns bigint (18 decimals). */
export function useUsdtBalance(address?: string) {
  return useReadContract({
    contract: usdtContract,
    method: "function balanceOf(address) view returns (uint256)",
    params: [address ?? "0x0000000000000000000000000000000000000000"],
    queryOptions: { enabled: !!address },
  });
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
