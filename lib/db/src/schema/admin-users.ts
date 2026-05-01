import { pgTable, serial, text, timestamp, jsonb, uuid, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Admin user — profile + role + per-action permissions, joined to a
 * Supabase Auth user via `user_id`.
 *
 * - `userId`      — FK to `auth.users.id`. Authentication (password compare,
 *                   session, JWT) is fully delegated to Supabase Auth; this
 *                   table only adds role + permissions metadata.
 * - `role`        — coarse bucket: 'superadmin' | 'admin' | 'support'.
 * - `permissions` — explicit allowlist of dotted action keys, e.g.
 *                   ['members.read', 'members.write', 'contracts.write', ...].
 *                   Superadmin bypasses this list.
 * - `username` / `passwordHash` — DEPRECATED, kept nullable for the legacy
 *                   `/api/admin/login` fallback; safe to drop after the
 *                   Supabase-Auth login path proves stable in production.
 *
 * Auth chain: client `supabase.auth.signInWithPassword()` →
 *             session JWT (Supabase-issued) →
 *             RLS reads `auth.uid()` to scope queries to this row.
 */
export const adminUsersTable = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id"),                     // FK to auth.users(id) — added in migration; nullable until backfilled
  username: text("username"),                  // legacy, see deprecation note above
  passwordHash: text("password_hash"),         // legacy
  role: text("role").notNull().default("admin"),
  permissions: jsonb("permissions").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("admin_users_user_id_uq").on(t.userId),
  uniqueIndex("admin_users_username_uq").on(t.username),
]);

export type AdminUser = typeof adminUsersTable.$inferSelect;
export type InsertAdminUser = typeof adminUsersTable.$inferInsert;

export type AdminRole = "superadmin" | "admin" | "support";

/** Catalogue of all valid permission keys used across the admin UI. Server
 *  routes assert against these strings; UI nav items reference them too.
 *  Keep in sync with `components/admin-layout.tsx` NAV permission column. */
export const ADMIN_PERMISSIONS = [
  "members.read",     "members.write",
  "referrals.read",
  "orders.read",
  "nodes.read",       "nodes.write",
  "rewards.read",
  "contracts.read",   "contracts.write",
  "system.read",      "system.write",
  "resources.read",   "resources.write",
  "admins.read",      "admins.write",
] as const;

export type AdminPermission = typeof ADMIN_PERMISSIONS[number];
