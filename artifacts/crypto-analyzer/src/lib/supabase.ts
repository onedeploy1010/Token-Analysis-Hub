import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client singleton.
 *
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from Vite's env. If
 * either is missing we export `null` instead of throwing at import time so
 * the rest of the app can still boot; UI should call `isSupabaseConfigured()`
 * before rendering admin features and fall back to a "not configured" screen.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export const isSupabaseConfigured = () => supabase !== null;

/** Name of the Supabase Storage bucket where language-specific material
 * packages are stored. Files live at `<lang>/<filename>` — e.g.
 * `zh/whitepaper-v2.pdf`, `vi/onboarding.zip`. */
export const MATERIALS_BUCKET = "materials";
