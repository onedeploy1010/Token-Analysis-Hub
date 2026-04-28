import { useQuery } from "@tanstack/react-query";

// Resolve API origin from build env so cross-origin deploys (Cloudflare
// Pages frontend → Railway api-server) work. Falls back to same-origin
// "/api" for local dev where the api-server is on the same host.
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const BASE = `${API_ORIGIN}/api`;

export const HL_TRACKED_VAULTS = [
  "0xc179e03922afe8fa9533d3f896338b9fb87ce0c8",
  "0xd6e56265890b76413d1d527eb9b75e334c0c5b42",
] as const;

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
  fetchedAt?: number;
}

export interface HLVaultsResponse {
  refreshIntervalMs: number;
  vaults: Array<{
    address: string;
    fetchedAt: number;
    error: string | null;
    data: HLVaultData | null;
  }>;
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

export function useHLVault(address?: string) {
  const target = address ?? HL_TRACKED_VAULTS[0];
  return useQuery<HLVaultData>({
    queryKey: ["hl-vault", target],
    queryFn: () =>
      fetchJson<HLVaultData>(`${BASE}/hyperliquid/vault/${target}`),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

export function useHLVaults() {
  return useQuery<HLVaultsResponse>({
    queryKey: ["hl-vaults"],
    queryFn: () => fetchJson<HLVaultsResponse>(`${BASE}/hyperliquid/vaults`),
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
