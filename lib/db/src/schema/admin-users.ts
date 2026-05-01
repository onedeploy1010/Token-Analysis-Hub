import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";

/**
 * Admin user with role + per-action permissions.
 *
 * - `role`        — coarse bucket: 'superadmin' | 'admin' | 'support'.
 *                   Used for sidebar branding and bulk gating; fine-grained
 *                   gates use `permissions`.
 * - `permissions` — explicit allowlist of dotted action keys, e.g.
 *                   ['members.read', 'members.write', 'contracts.read',
 *                   'contracts.write', 'rewards.read', 'system.write'].
 *                   Empty array = no extra permissions beyond role baseline.
 *                   Superadmin bypasses this list (sees / writes everything).
 *
 * Server (`requireAdmin` + new `requirePermission`) validates against
 * permissions; client (`useAdminAuth.hasPermission(key)`) gates UI.
 */
export const adminUsersTable = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"),
  permissions: jsonb("permissions").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
