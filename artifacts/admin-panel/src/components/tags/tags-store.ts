import { useEffect, useState } from "react";
import { supabase, adminChainId } from "@/lib/supabase";

/**
 * In-memory store for tag catalogue + assignments. Multiple components
 * (modal, pages, filters) need the same data, so we cache it once and
 * notify subscribers on mutation. No external state library —
 * `useSyncExternalStore`-lite via a simple subscriber set.
 */

export interface Tag {
  id: number;
  name: string;
  color: string;
  description: string | null;
}

export interface Assignment {
  id: number;
  tagId: number;
  userAddress: string;
  note: string | null;
  createdAt: string;
}

/**
 * Stale-while-revalidate: synchronously hydrate from localStorage on first
 * read so chips appear before the network round-trip finishes. Background
 * `reloadTags()` then validates and updates. Cache is keyed per chain so
 * mainnet/testnet bundles don't poison each other.
 */
const CACHE_KEY = `rune-admin-tags-cache-v1-${adminChainId}`;

function readCache(): { tags: Tag[]; assignments: Assignment[] } | null {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(CACHE_KEY) : null;
    if (!raw) return null;
    const j = JSON.parse(raw);
    if (!Array.isArray(j.tags) || !Array.isArray(j.assignments)) return null;
    return { tags: j.tags, assignments: j.assignments };
  } catch { return null; }
}

function writeCache(tags: Tag[], assignments: Assignment[]): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ tags, assignments }));
    }
  } catch { /* quota / private mode — no-op */ }
}

const _hydrated = readCache();
let _tags: Tag[] | null = _hydrated?.tags ?? null;
let _assignments: Assignment[] | null = _hydrated?.assignments ?? null;
let _error: string | null = null;
const _subs = new Set<() => void>();

function notify() { for (const s of _subs) s(); }

export async function reloadTags(): Promise<void> {
  try {
    const [t, a] = await Promise.all([
      supabase
        .from("admin_member_tags")
        .select("id, name, color, description")
        .order("id"),
      supabase
        .from("admin_member_tag_assignments")
        .select("id, tag_id, user_address, note, created_at")
        .eq("chain_id", adminChainId),
    ]);
    if (t.error) throw new Error(t.error.message);
    if (a.error) throw new Error(a.error.message);
    _tags = (t.data ?? []).map((r: any) => ({
      id: r.id, name: r.name, color: r.color, description: r.description,
    }));
    _assignments = (a.data ?? []).map((r: any) => ({
      id: r.id,
      tagId: r.tag_id,
      userAddress: (r.user_address as string).toLowerCase(),
      note: r.note,
      createdAt: r.created_at,
    }));
    _error = null;
    writeCache(_tags, _assignments);
  } catch (e: any) {
    _error = e?.message ?? "标签加载失败";
  } finally {
    notify();
  }
}

/** Tracks whether the current session has completed a real network fetch.
 *  Hydrating from localStorage doesn't count — we always revalidate at
 *  least once after page load, even if the cache made the UI feel instant. */
let _sessionFetched = false;

export function useTagsStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const cb = () => setTick((n) => n + 1);
    _subs.add(cb);
    if (!_sessionFetched) {
      _sessionFetched = true;
      void reloadTags();
    }
    return () => { _subs.delete(cb); };
  }, []);
  return { tags: _tags, assignments: _assignments, error: _error, reload: reloadTags };
}

export function tagsForAddress(address: string, all: Assignment[] | null, catalog: Tag[] | null): Array<Tag & { assignmentId: number; note: string | null }> {
  if (!all || !catalog) return [];
  const lc = address.toLowerCase();
  const byId = new Map(catalog.map((t) => [t.id, t]));
  const out: Array<Tag & { assignmentId: number; note: string | null }> = [];
  for (const a of all) {
    if (a.userAddress !== lc) continue;
    const t = byId.get(a.tagId);
    if (!t) continue;
    out.push({ ...t, assignmentId: a.id, note: a.note });
  }
  return out;
}

export async function assignTag(tagId: number, userAddress: string, note?: string | null): Promise<void> {
  const lc = userAddress.toLowerCase();
  const { error } = await supabase.from("admin_member_tag_assignments").upsert(
    { tag_id: tagId, chain_id: adminChainId, user_address: lc, note: note ?? null },
    { onConflict: "tag_id,chain_id,user_address" },
  );
  if (error) throw new Error(error.message);
  await reloadTags();
}

export async function unassignTag(assignmentId: number): Promise<void> {
  const { error } = await supabase
    .from("admin_member_tag_assignments")
    .delete()
    .eq("id", assignmentId);
  if (error) throw new Error(error.message);
  await reloadTags();
}

export async function updateAssignmentNote(assignmentId: number, note: string | null): Promise<void> {
  const { error } = await supabase
    .from("admin_member_tag_assignments")
    .update({ note: note ?? null })
    .eq("id", assignmentId);
  if (error) throw new Error(error.message);
  await reloadTags();
}

export async function createTag(input: { name: string; color: string; description?: string | null }): Promise<void> {
  const { error } = await supabase
    .from("admin_member_tags")
    .insert({ name: input.name, color: input.color, description: input.description ?? null });
  if (error) throw new Error(error.message);
  await reloadTags();
}

export async function updateTag(id: number, input: { name?: string; color?: string; description?: string | null }): Promise<void> {
  const { error } = await supabase
    .from("admin_member_tags")
    .update(input)
    .eq("id", id);
  if (error) throw new Error(error.message);
  await reloadTags();
}

export async function deleteTag(id: number): Promise<void> {
  const { error } = await supabase.from("admin_member_tags").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await reloadTags();
}

/** Returns the set of lowercase addresses that carry the given tagId. */
export function addressesWithTag(tagId: number, assignments: Assignment[] | null): Set<string> {
  const out = new Set<string>();
  if (!assignments) return out;
  for (const a of assignments) if (a.tagId === tagId) out.add(a.userAddress);
  return out;
}
