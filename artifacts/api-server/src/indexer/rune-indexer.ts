import { db, runeReferrersTable, runePurchasesTable } from "@rune/db";
import { logger } from "../lib/logger";
import { runeChainConfig, runePublicClient } from "../rune/chain";
import { eventAddReferrer, eventNodePresell } from "../rune/abis";
import { getCursor, setCursor, type RuneContract } from "./cursor";

/** Tunables — polling cadence and batch size. BSC public RPCs cap
 * `eth_getLogs` at ~5000 blocks per call, so we stay well under. */
const POLL_INTERVAL_MS = 15_000;
const MAX_BLOCK_RANGE = 2_000n;
/** Safety buffer — ignore the last N blocks so we don't ingest a block
 * that reorgs out. BSC is fast-finality so 3 is enough for our use case. */
const CONFIRMATIONS = 3n;

/** Lowercase an address for consistent keys. */
const lc = (a: string) => a.toLowerCase();

async function ingestAddReferrer(toBlock: bigint, fromBlock: bigint) {
  const logs = await runePublicClient.getLogs({
    address: runeChainConfig.community,
    event: eventAddReferrer,
    fromBlock,
    toBlock,
  });

  if (logs.length === 0) return;

  // Fetch block timestamps in parallel — viem caches per-call so this is
  // cheap even for 100 logs across a handful of blocks.
  const uniqueBlocks = Array.from(new Set(logs.map((l) => l.blockNumber)));
  const blockMap = new Map<bigint, Date>();
  await Promise.all(
    uniqueBlocks.map(async (bn) => {
      const b = await runePublicClient.getBlock({ blockNumber: bn });
      blockMap.set(bn, new Date(Number(b.timestamp) * 1000));
    }),
  );

  const rows = logs
    .filter((l) => l.args.user && l.args.referrer)
    .map((l) => ({
      user: lc(l.args.user as string),
      referrer: lc(l.args.referrer as string),
      chainId: runeChainConfig.chainId,
      blockNumber: Number(l.blockNumber),
      txHash: l.transactionHash,
      logIndex: l.logIndex,
      boundAt: blockMap.get(l.blockNumber)!,
    }));

  if (rows.length === 0) return;

  await db
    .insert(runeReferrersTable)
    .values(rows)
    .onConflictDoNothing({ target: [runeReferrersTable.chainId, runeReferrersTable.txHash, runeReferrersTable.logIndex] });

  logger.info({ count: rows.length, from: String(fromBlock), to: String(toBlock) }, "[rune-indexer] AddReferrer batch");
}

async function ingestNodePresell(toBlock: bigint, fromBlock: bigint) {
  const logs = await runePublicClient.getLogs({
    address: runeChainConfig.nodePresell,
    event: eventNodePresell,
    fromBlock,
    toBlock,
  });
  if (logs.length === 0) return;

  const rows = logs
    .filter((l) => l.args.user && l.args.amount != null && l.args.nodeId != null)
    .map((l) => ({
      user: lc(l.args.user as string),
      nodeId: Number(l.args.nodeId as bigint),
      payToken: lc(l.args.payToken as string),
      // Keep full 18-decimal precision as a decimal string in a numeric column.
      amount: String(l.args.amount as bigint),
      paidAt: new Date(Number(l.args.time as bigint) * 1000),
      chainId: runeChainConfig.chainId,
      blockNumber: Number(l.blockNumber),
      txHash: l.transactionHash,
      logIndex: l.logIndex,
    }));

  if (rows.length === 0) return;

  await db
    .insert(runePurchasesTable)
    .values(rows)
    .onConflictDoNothing({ target: [runePurchasesTable.chainId, runePurchasesTable.txHash, runePurchasesTable.logIndex] });

  logger.info({ count: rows.length, from: String(fromBlock), to: String(toBlock) }, "[rune-indexer] NodePresell batch");
}

async function scanContract(contract: RuneContract, head: bigint) {
  const startDefault = runeChainConfig.startBlock[contract];
  const persisted = await getCursor(runeChainConfig.chainId, contract);
  // The configured startBlock is a floor: if we bump it forward (e.g. after
  // new contracts deploy and we want to skip ancient empty history), a
  // stale cursor stored from an earlier run shouldn't drag the scan back
  // into those empty blocks. Take the MAX of the two.
  let cursor = persisted !== null && persisted > startDefault ? persisted : startDefault;

  // Cap the scan at `head - CONFIRMATIONS` so we don't ingest unconfirmed blocks.
  const safeHead = head > CONFIRMATIONS ? head - CONFIRMATIONS : 0n;
  if (cursor >= safeHead) return;

  while (cursor < safeHead) {
    const nextTo = cursor + MAX_BLOCK_RANGE > safeHead ? safeHead : cursor + MAX_BLOCK_RANGE;
    const fromBlock = cursor === 0n ? 0n : cursor + 1n;
    try {
      if (contract === "community") {
        await ingestAddReferrer(nextTo, fromBlock);
      } else {
        await ingestNodePresell(nextTo, fromBlock);
      }
      await setCursor(runeChainConfig.chainId, contract, nextTo);
      cursor = nextTo;
    } catch (err) {
      logger.error({ err, contract, from: String(fromBlock), to: String(nextTo) }, "[rune-indexer] scan batch failed");
      // Back off and retry on the next tick rather than spinning.
      return;
    }
  }
}

/**
 * Spawn the RUNE indexer loop. Runs in the same process as the API so
 * operational surface stays minimal — matches the `startHyperliquidCron`
 * pattern already in use.
 *
 * Safe to call unconditionally: if any RUNE address is the zero address
 * (e.g. mainnet contracts not yet deployed) we log and bail.
 */
export function startRuneIndexer() {
  const { community, nodePresell, chainId } = runeChainConfig;
  const zero = "0x0000000000000000000000000000000000000000";
  if (community.toLowerCase() === zero || nodePresell.toLowerCase() === zero) {
    logger.warn({ chainId, community, nodePresell }, "[rune-indexer] contract address not configured — skipping");
    return;
  }

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const head = await runePublicClient.getBlockNumber();
      await scanContract("community", head);
      await scanContract("nodePresell", head);
    } catch (err) {
      logger.error({ err }, "[rune-indexer] tick failed");
    } finally {
      running = false;
    }
  };

  // Kick an initial sync immediately, then schedule.
  void tick();
  setInterval(tick, POLL_INTERVAL_MS);
  logger.info({ chainId, intervalMs: POLL_INTERVAL_MS }, "[rune-indexer] started");
}
