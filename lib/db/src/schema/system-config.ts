import { pgTable, text, jsonb, timestamp, primaryKey } from "drizzle-orm/pg-core";

/**
 * Single source of truth for tunable protocol parameters that the spec
 * (`runeapi 3/.../RUNE+ 模型制度详细解析文档.md`) defines but the on-chain
 * contracts can't express directly: V-level thresholds, package terms,
 * withdrawal fee tiers, three-pool split, daily yield bands, etc.
 *
 * Why a flexible KV instead of one normalized table per domain:
 * - Spec evolves (new V-level, new package term, new pool); JSONB lets us
 *   add fields without migrations.
 * - Postgres functions (compute_v_level / compute_team_commission /
 *   compute_withdrawal_fee — added later) read these rows directly, so
 *   tweaking a parameter in admin updates every downstream calculation
 *   without redeploying api-server.
 * - Admin UI gets a generic JSON editor instead of N bespoke forms.
 *
 * Conventions:
 * - `namespace` groups related rows (`v_level`, `package`, `withdrawal_fee`,
 *   `pool_split`, `node_tier`, `token_supply`, `daily_yield`, `general`).
 * - `key` is stable within a namespace (`V1`..`V9`, `30d`/`90d`/..., `tier_1`/
 *   `tier_2`/..., etc.).
 * - `value` shape is documented per (namespace, key) in seed-system-config.ts.
 * - Always update `updated_at` + `updated_by` on edit so admin_audit_log
 *   can pin every parameter change to an actor.
 */
export const systemConfigTable = pgTable(
  "system_config",
  {
    namespace: text("namespace").notNull(),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    description: text("description"),
    updatedBy: text("updated_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.namespace, t.key] })],
);

export type SystemConfig = typeof systemConfigTable.$inferSelect;
export type InsertSystemConfig = typeof systemConfigTable.$inferInsert;
