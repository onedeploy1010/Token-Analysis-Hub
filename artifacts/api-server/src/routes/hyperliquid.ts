import { Router, type IRouter } from "express";

const router: IRouter = Router();

const HL_API = "https://api.hyperliquid.xyz/info";
const VAULT_ADDRESS = "0xdfc24b077bc1425ad1dea75bcb6f8158e10df303";
const HYPE_COIN = "HYPE";

async function hlPost(body: object) {
  const res = await fetch(HL_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HyperLiquid API error ${res.status}`);
  return res.json();
}

router.get("/hyperliquid/vault", async (_req, res): Promise<void> => {
  try {
    const data = await hlPost({ type: "vaultDetails", vaultAddress: VAULT_ADDRESS });

    const allTime = data.portfolio?.find(([p]: [string, unknown]) => p === "allTime")?.[1];
    const month   = data.portfolio?.find(([p]: [string, unknown]) => p === "month")?.[1];
    const week    = data.portfolio?.find(([p]: [string, unknown]) => p === "week")?.[1];
    const day     = data.portfolio?.find(([p]: [string, unknown]) => p === "day")?.[1];

    const latestEquity = allTime?.accountValueHistory?.at(-1)?.[1]
      ? parseFloat(allTime.accountValueHistory.at(-1)[1])
      : 0;

    const allTimePnl = allTime?.pnlHistory?.at(-1)?.[1]
      ? parseFloat(allTime.pnlHistory.at(-1)[1])
      : 0;

    const weekPnl = week?.pnlHistory?.at(-1)?.[1]
      ? parseFloat(week.pnlHistory.at(-1)[1])
      : 0;

    const dayPnl = day?.pnlHistory?.at(-1)?.[1]
      ? parseFloat(day.pnlHistory.at(-1)[1])
      : 0;

    const monthPnl = month?.pnlHistory?.at(-1)?.[1]
      ? parseFloat(month.pnlHistory.at(-1)[1])
      : 0;

    const equityHistory = (allTime?.accountValueHistory ?? [])
      .slice(-60)
      .map(([ts, val]: [number, string]) => ({
        ts,
        value: parseFloat(val),
      }));

    const pnlHistory = (allTime?.pnlHistory ?? [])
      .slice(-60)
      .map(([ts, val]: [number, string]) => ({
        ts,
        value: parseFloat(val),
      }));

    res.json({
      name: data.name ?? "Hyperliquidity Provider (HLP)",
      vaultAddress: data.vaultAddress ?? VAULT_ADDRESS,
      description: data.description ?? "",
      leader: data.leader ?? "",
      leaderFraction: data.leaderFraction ?? 0,
      leaderCommission: data.leaderCommission ?? 0,
      apr: data.apr ?? 0,
      allowDeposits: data.allowDeposits ?? false,
      isClosed: data.isClosed ?? false,
      followers: (data.followers ?? []).length,
      latestEquity,
      allTimePnl,
      weekPnl,
      dayPnl,
      monthPnl,
      equityHistory,
      pnlHistory,
    });
  } catch (err) {
    console.error("HyperLiquid vault error:", err);
    res.status(502).json({ error: "Failed to fetch vault data" });
  }
});

router.get("/hyperliquid/candles", async (req, res): Promise<void> => {
  try {
    const interval = (req.query.interval as string) || "1d";
    const now      = Date.now();
    const startMs  = parseInt((req.query.startTime as string) || String(now - 90 * 864e5));
    const endMs    = parseInt((req.query.endTime   as string) || String(now));

    const candles = await hlPost({
      type: "candleSnapshot",
      req: { coin: HYPE_COIN, interval, startTime: startMs, endTime: endMs },
    });

    const mapped = (Array.isArray(candles) ? candles : []).map((c: {
      t: number; T: number; o: string; c: string; h: string; l: string; v: string; n: number;
    }) => ({
      ts:     c.t,
      open:   parseFloat(c.o),
      close:  parseFloat(c.c),
      high:   parseFloat(c.h),
      low:    parseFloat(c.l),
      volume: parseFloat(c.v),
      trades: c.n,
    }));

    res.json({ coin: HYPE_COIN, interval, candles: mapped });
  } catch (err) {
    console.error("HyperLiquid candles error:", err);
    res.status(502).json({ error: "Failed to fetch candle data" });
  }
});

export default router;
