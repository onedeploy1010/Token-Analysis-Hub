import { defineChain, type Chain } from "thirdweb/chains";

export type RuneChainKey = "bsc_mainnet" | "bsc_testnet";

/**
 * Pick the active chain from VITE_RUNE_CHAIN. On the `testnet` branch the
 * default is BSC testnet so a build with no env override deploys testnet
 * contracts — keeps branch identity and built artifact identity aligned.
 * Set VITE_RUNE_CHAIN=bsc_mainnet to override (e.g. local mainnet QA).
 */
export function resolveRuneChainKey(): RuneChainKey {
  const v = (import.meta.env.VITE_RUNE_CHAIN as string | undefined)?.toLowerCase() ?? "bsc_testnet";
  return v === "bsc_mainnet" || v === "mainnet" ? "bsc_mainnet" : "bsc_testnet";
}

/**
 * Explicit chain definitions with reliable public RPCs. Using `defineChain`
 * from thirdweb lets us override the default RPC — the stock thirdweb/chains
 * exports route through thirdweb's own RPC infrastructure, which on BSC
 * testnet lags real block production enough that `waitForReceipt` routinely
 * times out after 100 blocks even when the tx has long since confirmed.
 *
 * publicnode.com and nodereal.io are both free, rate-limit-generous, and
 * track the chain head near real-time for BSC.
 */
export const bscMainnet: Chain = defineChain({
  id: 56,
  name: "BNB Smart Chain",
  rpc: "https://bsc-dataseed.binance.org",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  blockExplorers: [{ name: "BscScan", url: "https://bscscan.com", apiUrl: "https://api.bscscan.com/api" }],
});

export const bscTestnetReliable: Chain = defineChain({
  id: 97,
  name: "BNB Smart Chain Testnet",
  rpc: "https://bsc-testnet.publicnode.com",
  nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
  blockExplorers: [{ name: "BscScan", url: "https://testnet.bscscan.com", apiUrl: "https://api-testnet.bscscan.com/api" }],
  testnet: true,
});

export const runeChainKey: RuneChainKey = resolveRuneChainKey();

export const runeChain: Chain = runeChainKey === "bsc_mainnet" ? bscMainnet : bscTestnetReliable;

/** Both BSC chains in a stable order for the ConnectButton `chains` prop. */
export const supportedChains: Chain[] = [bscMainnet, bscTestnetReliable];
