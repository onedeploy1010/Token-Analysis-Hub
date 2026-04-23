import { bsc, bscTestnet } from "viem/chains";
import { createPublicClient, http, type PublicClient } from "viem";

/**
 * Per-chain RUNE contract deployments and the block the contracts first
 * shipped to. `startBlock` is used as the initial cursor if the DB has no
 * indexer state for that (chain, contract).
 *
 * Mainnet addresses are still TBD — the presale lives on BSC testnet for
 * now. Flip `RUNE_CHAIN=bsc` once the mainnet deployment happens.
 */
export interface RuneChainConfig {
  chainId: 56 | 97;
  rpcUrl: string;
  usdt: `0x${string}`;
  community: `0x${string}`;
  nodePresell: `0x${string}`;
  // Lowest block we ever need to scan from. Keep conservative — viem will
  // page through in chunks via maxBlockRange anyway.
  startBlock: { community: bigint; nodePresell: bigint };
  chain: typeof bsc | typeof bscTestnet;
}

const bscMainnetConfig: RuneChainConfig = {
  chainId: 56,
  rpcUrl: process.env.RUNE_RPC_URL_MAINNET ?? "https://bsc-dataseed.binance.org",
  usdt: "0x55d398326f99059fF775485246999027B3197955",
  community: (process.env.RUNE_COMMUNITY_MAINNET ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  nodePresell: (process.env.RUNE_NODE_PRESELL_MAINNET ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  startBlock: { community: 0n, nodePresell: 0n },
  chain: bsc,
};

const bscTestnetConfig: RuneChainConfig = {
  chainId: 97,
  // Binance's public RPC (`data-seed-prebsc-1-s1`) aggressively rate-limits
  // sustained eth_getLogs from server IPs (Railway/Fly/etc.), which wedges
  // the indexer. publicnode.com handles the workload cleanly; operators can
  // still point at a paid provider (Ankr/QuickNode) via RUNE_RPC_URL_TESTNET.
  rpcUrl: process.env.RUNE_RPC_URL_TESTNET ?? "https://bsc-testnet.publicnode.com",
  usdt: "0xa87cC1e59598CD0C33bBe38746a81279BFfea0B8",
  community: "0x42a06ac2208E9F8e25673BA0F6c44bc56fD2aa62",
  nodePresell: "0x6a30f26338742670637f47dfC04600B4d1eF1E9a",
  // Public BSC testnet RPCs (publicnode, binance) only retain ~50-100k
  // blocks of history. Anchor the cursor inside that retained window so
  // the indexer can actually make forward progress from a cold DB.
  // Events older than this (two observed bindings at blocks ~103.1M) must
  // be backfilled manually — see scripts/backfill-referrers.mjs. A paid
  // archive provider (Ankr / QuickNode) set via RUNE_RPC_URL_TESTNET is
  // the only way to re-index the full history on a fresh deploy.
  startBlock: { community: 103_250_000n, nodePresell: 103_250_000n },
  chain: bscTestnet,
};

function resolveRuneChain(): RuneChainConfig {
  const mode = (process.env.RUNE_CHAIN ?? "bsc_testnet").toLowerCase();
  if (mode === "bsc" || mode === "bsc_mainnet" || mode === "mainnet") return bscMainnetConfig;
  return bscTestnetConfig;
}

export const runeChainConfig = resolveRuneChain();

export const runePublicClient: PublicClient = createPublicClient({
  chain: runeChainConfig.chain,
  transport: http(runeChainConfig.rpcUrl),
});
