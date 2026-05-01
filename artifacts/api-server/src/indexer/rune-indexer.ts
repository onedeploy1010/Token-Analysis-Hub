import { db, runeReferrersTable, runePurchasesTable, runeMembersTable } from "@rune/db";
import { logger } from "../lib/logger";
import { runeChainConfig, runePublicClient, runeWssClient } from "../rune/chain";
import { eventAddReferrer, eventNodePresell } from "../rune/abis";
import { getCursor, setCursor, type RuneContract } from "./cursor";
import type { Log } from "viem";

/**
 * Indexer hybrid model (revised 2026-05-01):
 *   1. **Cold-start backfill** via http `getLogs` — pages from the persisted
 *      cursor to chain head in chunks of MAX_BLOCK_RANGE.
 *   2. **Real-time tail** via WSS `watchEvent` — events arrive within a block
 *      of confirmation, no polling cadence.
 *   3. **Safety-net catch-up** via http poll every SAFETY_POLL_MS — picks up
 *      anything the WSS missed (transient socket disconnect, reconnect gap).
 *
 * Why hybrid: WSS subscriptions are great when the socket is healthy but
 * silently miss events across reconnects; http catch-up makes the system
 * self-healing without making the operator babysit the socket.
 */
const MAX_BLOCK_RANGE = 2_000n;
/** Safety buffer — ignore the last N blocks so a reorg can't ingest a log
 *  that gets dropped. BSC fast-finality means 3 is plenty. */
const CONFIRMATIONS = 3n;
/** Catch-up poll cadence. Long enough that we're not paying RPC cost
 *  during normal WSS operation, short enough that a stalled subscription
 *  becomes visible within minutes. */
const SAFETY_POLL_MS = 5 * 60_000;

const lc = (a: string) => a.toLowerCase();

/** Insert a batch of EventAddReferrer logs into rune_referrers + rune_members.
 *  Idempotent on the (chain_id, tx_hash, log_index) unique key — safe to call
 *  with logs the WSS subscription already delivered, with logs from the
 *  catch-up poll, and with logs from a manual backfill, in any order. */
async function ingestReferrerLogs(logs: ReadonlyArray<Log<bigint, number, false, typeof eventAddReferrer>>) {
  if (logs.length === 0) return;

  const uniqueBlocks = Array.from(new Set(logs.map((l) => l.blockNumber!)));
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
      txHash: l.transactionHash!,
      logIndex: l.logIndex!,
      boundAt: blockMap.get(l.blockNumber!)!,
    }));
  if (rows.length === 0) return;

  await db
    .insert(runeReferrersTable)
    .values(rows)
    .onConflictDoNothing({ target: [runeReferrersTable.chainId, runeReferrersTable.txHash, runeReferrersTable.logIndex] });

  await db
    .insert(runeMembersTable)
    .values(rows.map((r) => ({ user: r.user, chainId: r.chainId, boundAt: r.boundAt })))
    .onConflictDoNothing({ target: [runeMembersTable.user, runeMembersTable.chainId] });

  logger.info({ count: rows.length, source: "ingest" }, "[rune-indexer] AddReferrer batch");
}

/** Insert a batch of EventNodePresell logs into rune_purchases. Same
 *  idempotency story as ingestReferrerLogs. */
async function ingestPresellLogs(logs: ReadonlyArray<Log<bigint, number, false, typeof eventNodePresell>>) {
  if (logs.length === 0) return;

  const rows = logs
    .filter((l) => l.args.user && l.args.amount != null && l.args.nodeId != null)
    .map((l) => ({
      user: lc(l.args.user as string),
      nodeId: Number(l.args.nodeId as bigint),
      payToken: lc(l.args.payToken as string),
      amount: String(l.args.amount as bigint),
      paidAt: new Date(Number(l.args.time as bigint) * 1000),
      chainId: runeChainConfig.chainId,
      blockNumber: Number(l.blockNumber),
      txHash: l.transactionHash!,
      logIndex: l.logIndex!,
    }));
  if (rows.length === 0) return;

  await db
    .insert(runePurchasesTable)
    .values(rows)
    .onConflictDoNothing({ target: [runePurchasesTable.chainId, runePurchasesTable.txHash, runePurchasesTable.logIndex] });

  logger.info({ count: rows.length, source: "ingest" }, "[rune-indexer] NodePresell batch");
}

/** Cold-start / safety-net catch-up — pulls historical logs in chunks
 *  via http and persists the cursor after each successful chunk so a crash
 *  can resume mid-scan. */
async function scanContract(contract: RuneContract, head: bigint) {
  const startDefault = runeChainConfig.startBlock[contract];
  const persisted = await getCursor(runeChainConfig.chainId, contract);
  let cursor = persisted !== null && persisted > startDefault ? persisted : startDefault;

  const safeHead = head > CONFIRMATIONS ? head - CONFIRMATIONS : 0n;
  if (cursor >= safeHead) return;

  while (cursor < safeHead) {
    const nextTo = cursor + MAX_BLOCK_RANGE > safeHead ? safeHead : cursor + MAX_BLOCK_RANGE;
    const fromBlock = cursor === 0n ? 0n : cursor + 1n;
    try {
      if (contract === "community") {
        const logs = await runePublicClient.getLogs({
          address: runeChainConfig.community,
          event: eventAddReferrer,
          fromBlock,
          toBlock: nextTo,
        });
        await ingestReferrerLogs(logs as any);
      } else {
        const logs = await runePublicClient.getLogs({
          address: runeChainConfig.nodePresell,
          event: eventNodePresell,
          fromBlock,
          toBlock: nextTo,
        });
        await ingestPresellLogs(logs as any);
      }
      await setCursor(runeChainConfig.chainId, contract, nextTo);
      cursor = nextTo;
    } catch (err) {
      logger.error({ err, contract, from: String(fromBlock), to: String(nextTo) }, "[rune-indexer] scan batch failed");
      return; // Back off; the next safety-net tick will retry.
    }
  }
}

/** Open the live WSS subscriptions. Returns the two unwatch functions so
 *  the caller can shut down cleanly on SIGTERM. Errors inside the watcher
 *  are logged and the watcher rebuilt — viem's `webSocket` transport with
 *  `reconnect: true` already handles socket drops, but we wrap once more
 *  here to surface anything that escapes that. */
function startSubscriptions(): () => void {
  const unwatchers: Array<() => void> = [];

  const subscribe = () => {
    try {
      unwatchers.push(
        runeWssClient.watchEvent({
          address: runeChainConfig.community,
          event: eventAddReferrer,
          onLogs: (logs) => {
            ingestReferrerLogs(logs as any).catch((err) =>
              logger.error({ err }, "[rune-indexer] WSS AddReferrer ingest failed"),
            );
          },
          onError: (err) => {
            logger.warn({ err }, "[rune-indexer] WSS AddReferrer subscription error — reconnecting");
            // viem's webSocket transport reconnects internally; the next
            // watchEvent emission will resume. The safety-net poll catches
            // any gap.
          },
        }),
      );

      unwatchers.push(
        runeWssClient.watchEvent({
          address: runeChainConfig.nodePresell,
          event: eventNodePresell,
          onLogs: (logs) => {
            ingestPresellLogs(logs as any).catch((err) =>
              logger.error({ err }, "[rune-indexer] WSS NodePresell ingest failed"),
            );
          },
          onError: (err) => {
            logger.warn({ err }, "[rune-indexer] WSS NodePresell subscription error — reconnecting");
          },
        }),
      );

      logger.info({ chainId: runeChainConfig.chainId, wss: runeChainConfig.wssUrl }, "[rune-indexer] WSS subscriptions live");
    } catch (err) {
      logger.error({ err }, "[rune-indexer] failed to open WSS subscriptions — falling back to safety-net poll only");
    }
  };

  subscribe();
  return () => unwatchers.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
}

/** Spawn the RUNE indexer. Cold-start http backfill → open WSS tail → run
 *  a 5-min safety-net poll. Safe to call once from app boot. */
export function startRuneIndexer(): void {
  const { community, nodePresell, chainId } = runeChainConfig;
  const zero = "0x0000000000000000000000000000000000000000";
  if (community.toLowerCase() === zero || nodePresell.toLowerCase() === zero) {
    logger.warn({ chainId, community, nodePresell }, "[rune-indexer] contract address not configured — skipping");
    return;
  }

  // 1. Initial backfill (blocks the WSS subscription so we don't double-
  //    insert across the boundary — once cursor catches up, WSS takes over).
  void (async () => {
    try {
      const head = await runePublicClient.getBlockNumber();
      await scanContract("community", head);
      await scanContract("nodePresell", head);
      logger.info({ chainId, head: String(head) }, "[rune-indexer] cold-start backfill complete");
    } catch (err) {
      logger.error({ err }, "[rune-indexer] cold-start backfill failed");
    } finally {
      // 2. Open WSS tail regardless — even if backfill failed, we want
      //    real-time events flowing while the operator investigates.
      startSubscriptions();
    }
  })();

  // 3. Safety-net poll — closes any gap WSS might leave on reconnect.
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const head = await runePublicClient.getBlockNumber();
      await scanContract("community", head);
      await scanContract("nodePresell", head);
    } catch (err) {
      logger.error({ err }, "[rune-indexer] safety-net poll failed");
    } finally {
      running = false;
    }
  };
  setInterval(tick, SAFETY_POLL_MS);

  logger.info({ chainId, safetyPollMs: SAFETY_POLL_MS }, "[rune-indexer] started (WSS + safety-net poll)");
}
