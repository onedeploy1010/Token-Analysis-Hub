import { getContract, type ThirdwebContract } from "thirdweb";
import { thirdwebClient } from "./client";
import { runeChain, runeChainKey } from "./chains";
import { getRuneAddresses } from "./addresses";
import { usdtAbi } from "./abis/usdt";
import { communityAbi } from "./abis/community";
import { nodePresellAbi } from "./abis/nodepresell";

const addr = getRuneAddresses(runeChainKey);

/**
 * Pre-built contract handles for the three RUNE contracts. Using the
 * `abi` option pins the typing — `useReadContract(prepareContractCall(…))`
 * downstream gets correct argument and return types for free.
 */
export const usdtContract: ThirdwebContract = getContract({
  client: thirdwebClient,
  chain: runeChain,
  address: addr.usdt,
  abi: usdtAbi as any,
});

export const communityContract: ThirdwebContract = getContract({
  client: thirdwebClient,
  chain: runeChain,
  address: addr.community,
  abi: communityAbi as any,
});

export const nodePresellContract: ThirdwebContract = getContract({
  client: thirdwebClient,
  chain: runeChain,
  address: addr.nodePresell,
  abi: nodePresellAbi as any,
});

/** ROOT referrer constant — a user whose referrer is this value is "at the top". */
export const COMMUNITY_ROOT = "0x0000000000000000000000000000000000000001" as const;

/** Node IDs from the spec — 101/201/301/401. */
export const NODE_IDS = [101, 201, 301, 401] as const;
export type NodeId = typeof NODE_IDS[number];

/** Human-friendly meta — backend also owns these labels, duplicated here
 *  only for UI (tier color + display name) not for business logic. */
export const NODE_META: Record<NodeId, { level: string; nameCn: string; nameEn: string; color: string }> = {
  101: { level: "guardian",  nameCn: "符主", nameEn: "GUARDIAN",  color: "text-amber-400"  },
  201: { level: "strategic", nameCn: "符魂", nameEn: "STRATEGIC", color: "text-purple-400" },
  301: { level: "builder",   nameCn: "符印", nameEn: "BUILDER",   color: "text-green-400"  },
  401: { level: "pioneer",   nameCn: "符胚", nameEn: "PIONEER",   color: "text-blue-400"   },
};
