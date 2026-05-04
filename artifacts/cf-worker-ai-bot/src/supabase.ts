import type { Env } from "./types";

/**
 * Minimal Supabase REST client — the official @supabase/supabase-js works
 * in Workers but inflates the bundle by ~80KB. We only need raw inserts +
 * a handful of selects + RPC, which the PostgREST surface handles directly.
 *
 * Service-role key (set as a secret) bypasses RLS so the worker can write
 * freely; the public anon key is used by the frontend for read-only access.
 */

function rest(env: Env, path: string): string {
  return `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`;
}

function headers(env: Env): HeadersInit {
  return {
    "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };
}

export async function insertRows<T>(env: Env, table: string, rows: T[]): Promise<unknown[]> {
  if (rows.length === 0) return [];
  const r = await fetch(rest(env, table), {
    method: "POST",
    headers: headers(env),
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`insert ${table} → ${r.status} ${await r.text()}`);
  return r.json() as Promise<unknown[]>;
}

export async function updateRow(env: Env, table: string, id: number, patch: Record<string, unknown>): Promise<void> {
  const r = await fetch(`${rest(env, table)}?id=eq.${id}`, {
    method: "PATCH",
    headers: headers(env),
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(`update ${table} ${id} → ${r.status} ${await r.text()}`);
}

export async function selectRows<T>(env: Env, query: string): Promise<T[]> {
  const r = await fetch(rest(env, query), { headers: headers(env) });
  if (!r.ok) throw new Error(`select ${query} → ${r.status} ${await r.text()}`);
  return r.json() as Promise<T[]>;
}

/** Postgres function call — used for pgvector RAG retrieval. */
export async function rpc<T>(env: Env, fn: string, args: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: headers(env),
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`rpc ${fn} → ${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
}
