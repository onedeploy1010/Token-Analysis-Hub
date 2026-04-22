import { useReadContract } from "thirdweb/react";
import { nodePresellContract, NODE_IDS } from "@/lib/thirdweb/contracts";

/** Raw node config shape returned by NodePresell.getNodeConfigs. */
export interface NodeConfig {
  nodeId: bigint;
  payToken: string;
  payAmount: bigint;
  maxLimit: bigint;
  curNum: bigint;
}

/**
 * Read the 4 node configs in one call. Returns an array aligned with
 * NODE_IDS [101, 201, 301, 401].
 */
export function useNodeConfigs() {
  const q = useReadContract({
    contract: nodePresellContract,
    method:
      "function getNodeConfigs(uint256[]) view returns ((uint256 nodeId, address payToken, uint256 payAmount, uint256 maxLimit, uint256 curNum)[])",
    params: [NODE_IDS.map((n) => BigInt(n))],
  });
  return q;
}

/**
 * Read the connected user's purchase record. amount === 0 means they
 * haven't bought anything yet.
 */
export function useUserPurchase(address?: string) {
  const q = useReadContract({
    contract: nodePresellContract,
    method:
      "function getUserPurchaseData(address) view returns (address payToken, uint256 amount, uint256 payTime, uint256 nodeId)",
    params: [address ?? "0x0000000000000000000000000000000000000000"],
    queryOptions: { enabled: !!address },
  });

  const tuple = q.data as readonly [string, bigint, bigint, bigint] | undefined;
  return {
    ...q,
    hasPurchased: !!tuple && tuple[1] > 0n,
    payToken: tuple?.[0],
    amount: tuple?.[1],
    payTime: tuple?.[2],
    nodeId: tuple ? Number(tuple[3]) : undefined,
  };
}
