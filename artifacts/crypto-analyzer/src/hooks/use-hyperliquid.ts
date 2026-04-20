import { useQuery } from "@tanstack/react-query";

const BASE = "/api";

export interface HLVaultData {
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
}

export interface HLCandle {
  ts: number;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  trades: number;
}

export interface HLCandleData {
  coin: string;
  interval: string;
  candles: HLCandle[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export function useHLVault() {
  return useQuery<HLVaultData>({
    queryKey: ["hl-vault"],
    queryFn: () => fetchJson<HLVaultData>(`${BASE}/hyperliquid/vault`),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

export function useHLCandles(interval = "1d") {
  const now = Date.now();
  const startTime = now - 90 * 864e5;
  return useQuery<HLCandleData>({
    queryKey: ["hl-candles", interval],
    queryFn: () =>
      fetchJson<HLCandleData>(
        `${BASE}/hyperliquid/candles?interval=${interval}&startTime=${startTime}&endTime=${now}`,
      ),
    staleTime: 60_000,
    refetchInterval: 300_000,
  });
}
