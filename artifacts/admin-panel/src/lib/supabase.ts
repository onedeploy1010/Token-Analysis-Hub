import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Single Supabase client for the RUNE admin panel. All reads/writes go
 * through this — admin-panel does NOT depend on `@rune/db` (Drizzle is
 * the schema-authority living in `lib/db/`, but runtime queries use the
 * Supabase JS SDK + Postgres functions / views).
 *
 * Env (loaded by Vite from artifacts/admin-panel/.env):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_PUBLISHABLE_KEY  (preferred new key format)
 *   VITE_SUPABASE_ANON_KEY         (fallback legacy JWT key)
 *
 * Auth model: admin login still goes through POST /api/admin/login (JWT
 * via api-server) for password hashing — see `contexts/admin-auth.tsx`.
 * Once we move admin login onto Supabase Auth this client will swap to
 * the user's session token; until then it uses the anon key and the
 * api-server JWT is forwarded to RPC calls that need admin gating.
 */
const url =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
const anonKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  "";

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[admin/supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY — admin reads will fail.",
  );
}

export const supabase: SupabaseClient = createClient(url, anonKey, {
  // Persist Supabase Auth session in localStorage so a hard refresh keeps
  // the admin signed in (matches the previous JWT-in-localStorage UX).
  // Auto-refresh handles 1-hour token expiry without forcing re-login.
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "rune-admin-supabase-auth",
    detectSessionInUrl: false,
  },
});

/** Resolve the active chainId from build-time env. Mainnet = 56, testnet = 97.
 *  Falls back to 56. Used by every admin query that filters rune_* tables. */
export const adminChainId: number = (() => {
  const k = (import.meta.env.VITE_RUNE_CHAIN as string | undefined)?.toLowerCase();
  return k === "bsc_testnet" || k === "testnet" ? 97 : 56;
})();

/** Lowercase a wallet address for DB lookups — RUNE rows key off lowercase. */
export const w = (a: string | undefined | null): string => (a ?? "").toLowerCase();

/** Format an 18-decimal numeric (USDT amount) to a fixed-precision USDT string.
 *  Tables store amount as numeric(78,0) so `raw` is a decimal string. */
export function fmtUsdt18(raw: string | number | null | undefined, decimals = 2): string {
  if (raw == null) return "0";
  const s = String(raw);
  if (s === "0") return "0";
  // Pad to at least 19 digits so "1" → "0.000000000000000001"
  const padded = s.padStart(19, "0");
  const whole = padded.slice(0, -18) || "0";
  const frac = padded.slice(-18, -18 + decimals).padEnd(decimals, "0");
  return decimals > 0 ? `${whole}.${frac}` : whole;
}
