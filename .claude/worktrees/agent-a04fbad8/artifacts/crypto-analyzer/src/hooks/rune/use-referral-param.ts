import { useSearch } from "wouter";
import { useMemo } from "react";

/**
 * Read a referral address from the current URL's `?ref=` query param.
 * We tolerate checksummed / mixed-case input and always return it
 * lowercased — the Community contract stores and compares lowercased.
 *
 * Returns `null` when the param is missing, malformed, or matches the
 * user's own address (self-referral attempts).
 */
export function useReferralParam(selfAddress?: string): string | null {
  const search = useSearch();
  return useMemo(() => {
    const params = new URLSearchParams(search);
    const raw = params.get("ref") ?? params.get("referrer");
    if (!raw) return null;
    if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return null;
    const normalized = raw.toLowerCase();
    if (selfAddress && selfAddress.toLowerCase() === normalized) return null;
    return normalized;
  }, [search, selfAddress]);
}

/** Build a shareable referral URL for `address`. Safe on SSR (returns empty). */
export function buildReferralUrl(address: string): string {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  return `${origin}/recruit?ref=${address}`;
}
