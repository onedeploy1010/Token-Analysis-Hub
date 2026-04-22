import { bsc, bscTestnet } from "thirdweb/chains";
import type { Chain } from "thirdweb/chains";

export type RuneChainKey = "bsc_mainnet" | "bsc_testnet";

/**
 * Pick the active chain from VITE_RUNE_CHAIN. Defaults to BSC testnet since
 * that's where the presale is live during development.
 */
export function resolveRuneChainKey(): RuneChainKey {
  const v = (import.meta.env.VITE_RUNE_CHAIN as string | undefined)?.toLowerCase() ?? "bsc_testnet";
  return v === "bsc" || v === "bsc_mainnet" || v === "mainnet" ? "bsc_mainnet" : "bsc_testnet";
}

export const runeChainKey: RuneChainKey = resolveRuneChainKey();

export const runeChain: Chain = runeChainKey === "bsc_mainnet" ? bsc : bscTestnet;

/** Both BSC chains in a stable order for the ConnectButton `chains` prop. */
export const supportedChains: Chain[] = [bsc, bscTestnet];
