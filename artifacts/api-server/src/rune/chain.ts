import { bsc, bscTestnet } from "viem/chains";
import { createPublicClient, http, webSocket, type PublicClient } from "viem";

/**
 * Per-chain RUNE contract deployments and the block the contracts first
 * shipped to. `startBlock` is used as the initial cursor if the DB has no
 * indexer state for that (chain, contract).
 *
 * Mainnet addresses come from the runeapi 3 integration doc — Community
 * and NodePresell are deployed on BSC mainnet (chainId 56). Env overrides
 * remain available for staging swaps without a redeploy.
 */
export interface RuneChainConfig {
  chainId: 56 | 97;
  rpcUrl: string;
  /** WebSocket endpoint for real-time event subscriptions (eth_subscribe).
   *  Indexer uses this for live tail; http rpcUrl handles cold-start
   *  backfill + reconnect catch-up. */
  wssUrl: string;
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
  // wss:// endpoint for the WebSocket-backed subscription path. Public BSC
  // ws endpoints stay open under sustained load; if it drops, the indexer
  // falls back to a 5-min http catch-up poll until the socket reconnects.
  wssUrl: process.env.RUNE_WSS_URL_MAINNET ?? "wss://bsc-rpc.publicnode.com",
  usdt: "0x55d398326f99059fF775485246999027B3197955",
  community: (process.env.RUNE_COMMUNITY_MAINNET ?? "0xe6f1d4B5ea4B5a025e1E45C9E3d83F31201B6C9c") as `0x${string}`,
  nodePresell: (process.env.RUNE_NODE_PRESELL_MAINNET ?? "0xF32747E7c120BB6333Ac83F25192c089e8d9b62E") as `0x${string}`,
  // Anchored to each contract's actual deploy block on BSC mainnet — verified
  // by binary-searching `eth_getCode` against an archive RPC. Avoids scanning
  // ~94M empty blocks from genesis on a cold-start indexer.
  startBlock: { community: 94_392_255n, nodePresell: 94_392_402n },
  chain: bsc,
};

const bscTestnetConfig: RuneChainConfig = {
  chainId: 97,
  // Binance's public RPC (`data-seed-prebsc-1-s1`) aggressively rate-limits
  // sustained eth_getLogs from server IPs (Railway/Fly/etc.), which wedges
  // the indexer. publicnode.com handles the workload cleanly; operators can
  // still point at a paid provider (Ankr/QuickNode) via RUNE_RPC_URL_TESTNET.
  rpcUrl: process.env.RUNE_RPC_URL_TESTNET ?? "https://bsc-testnet.publicnode.com",
  wssUrl: process.env.RUNE_WSS_URL_TESTNET ?? "wss://bsc-testnet-rpc.publicnode.com",
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
  // Mainnet contracts are live (see runeapi 3/对接文档.md), so default to
  // BSC mainnet. Set RUNE_CHAIN=bsc_testnet to force the testnet config.
  const mode = (process.env.RUNE_CHAIN ?? "bsc_mainnet").toLowerCase();
  if (mode === "bsc_testnet" || mode === "testnet") return bscTestnetConfig;
  return bscMainnetConfig;
}

export const runeChainConfig = resolveRuneChain();

export const runePublicClient: PublicClient = createPublicClient({
  chain: runeChainConfig.chain,
  transport: http(runeChainConfig.rpcUrl),
});

/**
 * WSS-backed client for `watchEvent` subscriptions. Kept separate from the
 * http client because viem's `watchEvent` will silently fall back to
 * `getLogs` polling on an http transport — defeating the whole point of
 * switching off polling. Use this client for the real-time tail.
 */
export const runeWssClient: PublicClient = createPublicClient({
  chain: runeChainConfig.chain,
  transport: webSocket(runeChainConfig.wssUrl, {
    // Keep the connection warm; the public BSC ws nodes are sticky but a
    // few minutes of silence can trip a load balancer somewhere upstream.
    keepAlive: true,
    reconnect: true,
  }),
});
