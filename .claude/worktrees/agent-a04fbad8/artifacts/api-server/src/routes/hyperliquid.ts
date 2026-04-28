import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const HL_API = "https://api.hyperliquid.xyz/info";
const HYPE_COIN = "HYPE";

export const HL_VAULTS = [
  "0xc179e03922afe8fa9533d3f896338b9fb87ce0c8",
  "0xd6e56265890b76413d1d527eb9b75e334c0c5b42",
] as const;

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

export interface NormalizedVault {
  name: string;
  vaultAddress: string;
  description: string;
  leader: string;
  leaderFraction: number;
  leaderCommission: number;
  apr: number;
  allowDeposits: boolean;
  isClosed: boolean;
  followers: number;
  latestEquity: number;
  allTimePnl: number;
  weekPnl: number;
  dayPnl: number;
  monthPnl: number;
  equityHistory: Array<{ ts: number; value: number }>;
  pnlHistory: Array<{ ts: number; value: number }>;
  fetchedAt: number;
}

interface CacheEntry {
  data: NormalizedVault | null;
  fetchedAt: number;
  error: string | null;
}

const vaultCache = new Map<string, CacheEntry>();

async function hlPost<T = unknown>(body: object): Promise<T> {
  const res = await fetch(HL_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HyperLiquid API error ${res.status}`);
  return (await res.json()) as T;
}

function pickPortfolio(
  portfolio: unknown,
  key: "allTime" | "month" | "week" | "day",
) {
  if (!Array.isArray(portfolio)) return undefined;
  const found = portfolio.find(
    (entry) => Array.isArray(entry) && entry[0] === key,
  );
  return found?.[1] as
    | {
        accountValueHistory?: Array<[number, string]>;
        pnlHistory?: Array<[number, string]>;
      }
    | undefined;
}

function lastFloat(arr?: Array<[number, string]>) {
  const last = arr?.at(-1);
  return last ? parseFloat(last[1]) : 0;
}

async function fetchVaultData(address: string): Promise<NormalizedVault> {
  const data = await hlPost<{
    name?: string;
    vaultAddress?: string;
    description?: string;
    leader?: string;
    leaderFraction?: number;
    leaderCommission?: number;
    apr?: number;
    allowDeposits?: boolean;
    isClosed?: boolean;
    followers?: unknown[];
    portfolio?: unknown;
  }>({ type: "vaultDetails", vaultAddress: address });

  const allTime = pickPortfolio(data.portfolio, "allTime");
  const month = pickPortfolio(data.portfolio, "month");
  const week = pickPortfolio(data.portfolio, "week");
  const day = pickPortfolio(data.portfolio, "day");

  const equityHistory = (allTime?.accountValueHistory ?? [])
    .slice(-180)
    .map(([ts, val]) => ({ ts, value: parseFloat(val) }));

  const pnlHistory = (allTime?.pnlHistory ?? [])
    .slice(-180)
    .map(([ts, val]) => ({ ts, value: parseFloat(val) }));

  return {
    name: data.name ?? "Hyperliquid Vault",
    vaultAddress: data.vaultAddress ?? address,
    description: data.description ?? "",
    leader: data.leader ?? "",
    leaderFraction: data.leaderFraction ?? 0,
    leaderCommission: data.leaderCommission ?? 0,
    apr: data.apr ?? 0,
    allowDeposits: data.allowDeposits ?? false,
    isClosed: data.isClosed ?? false,
    followers: Array.isArray(data.followers) ? data.followers.length : 0,
    latestEquity: lastFloat(allTime?.accountValueHistory),
    allTimePnl: lastFloat(allTime?.pnlHistory),
    weekPnl: lastFloat(week?.pnlHistory),
    dayPnl: lastFloat(day?.pnlHistory),
    monthPnl: lastFloat(month?.pnlHistory),
    equityHistory,
    pnlHistory,
    fetchedAt: Date.now(),
  };
}

async function refreshVault(address: string): Promise<void> {
  try {
    const data = await fetchVaultData(address);
    vaultCache.set(address, {
      data,
      fetchedAt: Date.now(),
      error: null,
    });
    logger.info(
      { address, equity: data.latestEquity, apr: data.apr },
      "HL vault refreshed",
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const prev = vaultCache.get(address);
    vaultCache.set(address, {
      data: prev?.data ?? null,
      fetchedAt: prev?.fetchedAt ?? 0,
      error: msg,
    });
    logger.error({ address, err: msg }, "HL vault refresh failed");
  }
}

async function refreshAll(): Promise<void> {
  await Promise.all(HL_VAULTS.map((addr) => refreshVault(addr)));
}

let cronTimer: NodeJS.Timeout | null = null;

export function startHyperliquidCron(): void {
  if (cronTimer) return;
  // initial fetch (non-blocking)
  refreshAll().catch((err) => logger.error({ err }, "HL initial refresh"));
  cronTimer = setInterval(() => {
    refreshAll().catch((err) => logger.error({ err }, "HL cron refresh"));
  }, REFRESH_INTERVAL_MS);
  logger.info(
    { vaults: HL_VAULTS.length, intervalMs: REFRESH_INTERVAL_MS },
    "HL cron started",
  );
}

function normalizeAddress(addr: string): string {
  return addr.trim().toLowerCase();
}

async function getVault(address: string): Promise<CacheEntry> {
  const key = normalizeAddress(address);
  const cached = vaultCache.get(key);
  if (cached && cached.data) return cached;
  // cache miss → fetch on demand
  await refreshVault(key);
  return (
    vaultCache.get(key) ?? {
      data: null,
      fetchedAt: 0,
      error: "Vault not found",
    }
  );
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// List both tracked vaults with cache metadata
router.get("/hyperliquid/vaults", async (_req, res): Promise<void> => {
  const items = await Promise.all(
    HL_VAULTS.map(async (addr) => {
      const entry = await getVault(addr);
      return {
        address: addr,
        fetchedAt: entry.fetchedAt,
        error: entry.error,
        data: entry.data,
      };
    }),
  );
  res.json({
    vaults: items,
    refreshIntervalMs: REFRESH_INTERVAL_MS,
  });
});

// Specific vault by address
router.get("/hyperliquid/vault/:address", async (req, res): Promise<void> => {
  const addr = normalizeAddress(req.params.address);
  if (!HL_VAULTS.includes(addr as (typeof HL_VAULTS)[number])) {
    res.status(404).json({ error: "Unknown vault" });
    return;
  }
  const entry = await getVault(addr);
  if (!entry.data) {
    res.status(502).json({ error: entry.error ?? "Failed to fetch" });
    return;
  }
  res.json(entry.data);
});

// Backward-compat: default vault = first tracked vault, optional ?address=
router.get("/hyperliquid/vault", async (req, res): Promise<void> => {
  const addr = normalizeAddress(
    (req.query.address as string | undefined) ?? HL_VAULTS[0],
  );
  if (!HL_VAULTS.includes(addr as (typeof HL_VAULTS)[number])) {
    res.status(404).json({ error: "Unknown vault" });
    return;
  }
  const entry = await getVault(addr);
  if (!entry.data) {
    res.status(502).json({ error: entry.error ?? "Failed to fetch" });
    return;
  }
  res.json(entry.data);
});

// HYPE coin candles (unchanged)
router.get("/hyperliquid/candles", async (req, res): Promise<void> => {
  try {
    const interval = (req.query.interval as string) || "1d";
    const now = Date.now();
    const startMs = parseInt(
      (req.query.startTime as string) || String(now - 90 * 864e5),
    );
    const endMs = parseInt((req.query.endTime as string) || String(now));

    const candles = await hlPost<unknown>({
      type: "candleSnapshot",
      req: { coin: HYPE_COIN, interval, startTime: startMs, endTime: endMs },
    });

    const mapped = (Array.isArray(candles) ? candles : []).map(
      (c: {
        t: number;
        T: number;
        o: string;
        c: string;
        h: string;
        l: string;
        v: string;
        n: number;
      }) => ({
        ts: c.t,
        open: parseFloat(c.o),
        close: parseFloat(c.c),
        high: parseFloat(c.h),
        low: parseFloat(c.l),
        volume: parseFloat(c.v),
        trades: c.n,
      }),
    );

    res.json({ coin: HYPE_COIN, interval, candles: mapped });
  } catch (err) {
    logger.error({ err }, "HL candles error");
    res.status(502).json({ error: "Failed to fetch candle data" });
  }
});

export default router;
