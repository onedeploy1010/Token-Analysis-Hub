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
 *  only for UI (tier color + display name) not for business logic.
 *  `priceUsdt` mirrors the on-chain payAmount in whole USDT — used for
 *  tree badges that show "held tier + price" at a glance. If the
 *  contract ever re-tunes prices the source of truth is
 *  `NodePresell.getNodeConfigs`, so treat this as a display shortcut.
 *
 *  `rgb` is the Tailwind-400 shade of each tier expressed as a raw
 *  "r, g, b" triple so CSS custom properties can mix it into shadows
 *  and glows without string parsing (`rgba(var(--tier-rgb), 0.3)`).
 *  Keep it in sync with `color` — they're both pointing at the same
 *  tailwind shade, just expressed differently. */
// Member spec ranks 符主 at the top (L4 · 50k U · 15% direct) and 符魂
// second (L3 · 10k U · 10% direct). On-chain the nodeId → price/directRate
// mapping is fixed (101 = 50k/15%, 201 = 10k/10%), so 101 stays the apex
// slot (English "STRATEGIC" + purple accent) with Chinese label 符主, and
// 201 is the second tier ("GUARDIAN" + amber) labelled 符魂.
export const NODE_META: Record<NodeId, { level: string; nameCn: string; nameEn: string; color: string; rgb: string; priceUsdt: number }> = {
  101: { level: "strategic", nameCn: "符主", nameEn: "STRATEGIC", color: "text-purple-400", rgb: "192, 132, 252", priceUsdt: 50000 },
  201: { level: "guardian",  nameCn: "符魂", nameEn: "GUARDIAN",  color: "text-amber-400",  rgb: "251, 191, 36",  priceUsdt: 10000 },
  301: { level: "builder",   nameCn: "符印", nameEn: "BUILDER",   color: "text-green-400",  rgb: "52, 211, 153",  priceUsdt:  5000 },
  401: { level: "pioneer",   nameCn: "符胚", nameEn: "PIONEER",   color: "text-blue-400",   rgb: "96, 165, 250",  priceUsdt:  2500 },
};
