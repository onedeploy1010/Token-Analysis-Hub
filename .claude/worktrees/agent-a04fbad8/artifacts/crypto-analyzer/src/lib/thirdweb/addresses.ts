import type { RuneChainKey } from "./chains";

/**
 * Per-chain RUNE deployment map. Testnet numbers come from the public
 * docs; mainnet is env-driven so we can swap the addresses in without
 * a redeploy once the contracts ship.
 */
export interface RuneAddresses {
  usdt: `0x${string}`;
  community: `0x${string}`;
  nodePresell: `0x${string}`;
}

const zero = "0x0000000000000000000000000000000000000000" as const;

const testnet: RuneAddresses = {
  usdt:        "0xa87cC1e59598CD0C33bBe38746a81279BFfea0B8",
  community:   "0x42a06ac2208E9F8e25673BA0F6c44bc56fD2aa62",
  nodePresell: "0x6a30f26338742670637f47dfC04600B4d1eF1E9a",
};

const mainnet: RuneAddresses = {
  usdt:        "0x55d398326f99059fF775485246999027B3197955",
  community:   ((import.meta.env.VITE_RUNE_COMMUNITY_MAINNET as string | undefined) ?? zero) as `0x${string}`,
  nodePresell: ((import.meta.env.VITE_RUNE_NODE_PRESELL_MAINNET as string | undefined) ?? zero) as `0x${string}`,
};

export function getRuneAddresses(chainKey: RuneChainKey): RuneAddresses {
  return chainKey === "bsc_mainnet" ? mainnet : testnet;
}
