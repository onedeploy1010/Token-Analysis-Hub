import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Single Supabase client for the TAICLAW dashboard pages. All reads/writes
 * go through this — no api-server hop. Wallet identity is enforced via RLS
 * (jwt claim `wallet`) once the thirdweb→Supabase JWT bridge is wired in;
 * for now anon key + explicit `wallet_address` filters in WHERE clauses.
 *
 * Env (loaded by Vite):
 *   - VITE_SUPABASE_URL
 *   - VITE_SUPABASE_PUBLISHABLE_KEY  (preferred new key format)
 *   - VITE_SUPABASE_ANON_KEY         (fallback legacy JWT key)
 */
const url =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
const anonKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  "";

if (!url || !anonKey) {
  // Fail loud in dev — silent misconfig leads to confusing 401s later.
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase-client] Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY — dashboard reads will fail.",
  );
}

export const supabase: SupabaseClient = createClient(url, anonKey, {
  auth: { persistSession: false },
});

/** Lowercase a wallet address for DB lookups. RUNE tables key off
 *  lowercased EVM hex everywhere (see `rune_purchases.user`). */
export const w = (addr: string | undefined | null): string =>
  (addr ?? "").toLowerCase();

/**
 * Wrapper around `supabase.functions.invoke` — routes a frontend call to a
 * Supabase Edge Function. Used as the replacement for the old TAICLAW
 * `apiPost("/api/...")` and `proxyFetch(url)` paths now that we run no
 * api-server. Throws on transport or non-2xx errors so callers can catch.
 */
export async function invokeFn<T = unknown>(name: string, body?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) throw error;
  return data as T;
}
