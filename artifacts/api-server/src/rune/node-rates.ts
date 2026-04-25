import { runeChainConfig, runePublicClient } from "./chain";
import { fnGetNodeConfigs } from "./abis";
import { logger } from "../lib/logger";

/**
 * Lightweight read-through cache of the on-chain `directRate` bps for
 * each node tier. Read from `NodePresell.getNodeConfigs([101, 201, 301,
 * 401, 501])` on demand and re-read whenever the cache ages past TTL so
 * commission stats stay accurate if the project re-tunes rates.
 *
 * Everything here is a best-effort helper — if the RPC is down we
 * serve the last-good cache, and on cold failure we fall back to the
 * rates from the integration doc so the stats resolver always returns
 * *something* rather than 0.
 */

/** Node IDs the contract ships with. Mirrors frontend `NODE_IDS`. */
const NODE_IDS = [101n, 201n, 301n, 401n, 501n] as const;

/** Cache TTL — 10 min is plenty; directRate changes only on contract
 *  re-deploy or a governance call, not per-block. */
const TTL_MS = 10 * 60 * 1000;

/** Document-provided defaults (101=15% / 201=12% / 301=10% / 401=8% /
 *  501=5%, see runeapi 3 doc §4.1). Used only if the first-ever chain
 *  read fails. */
const FALLBACK: ReadonlyMap<number, bigint> = new Map([
  [101, 1500n],
  [201, 1200n],
  [301, 1000n],
  [401,  800n],
  [501,  500n],
]);

let cache: Map<number, bigint> | null = null;
let cacheAt = 0;
/** In-flight refresh promise — de-dupes parallel callers. */
let refreshing: Promise<Map<number, bigint>> | null = null;

async function refresh(): Promise<Map<number, bigint>> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const result = await runePublicClient.readContract({
        address: runeChainConfig.nodePresell,
        abi: [fnGetNodeConfigs],
        functionName: "getNodeConfigs",
        args: [NODE_IDS],
      });
      const next = new Map<number, bigint>();
      for (const cfg of result as readonly { nodeId: bigint; directRate: bigint }[]) {
        next.set(Number(cfg.nodeId), cfg.directRate);
      }
      cache = next;
      cacheAt = Date.now();
      logger.info({ rates: Object.fromEntries([...next].map(([k, v]) => [k, String(v)])) }, "[rune] directRate cache refreshed");
      return next;
    } catch (err) {
      if (cache) {
        logger.warn({ err }, "[rune] directRate refresh failed — serving stale cache");
        return cache;
      }
      logger.error({ err }, "[rune] directRate cold read failed — using fallback defaults");
      return new Map(FALLBACK);
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/**
 * Returns the directRate (bps) map for the five tiers. Cheap after the
 * first call — the hot path reads the cached map directly.
 */
export async function getDirectRateMap(): Promise<Map<number, bigint>> {
  if (cache && Date.now() - cacheAt < TTL_MS) return cache;
  return refresh();
}
