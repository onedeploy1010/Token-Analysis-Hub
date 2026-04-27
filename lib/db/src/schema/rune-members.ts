import { pgTable, text, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";

/**
 * One row per registered member — created on first `EventAddReferrer` for
 * the user. Distinct from `rune_referrers` (one row per binding event)
 * because (a) it makes "list all members" a single-table SELECT instead
 * of a SELECT DISTINCT, and (b) it surfaces the moment of registration
 * (`bound_at` from chain) separately from the moment we observed it
 * (`registered_at` from indexer write time) for ops/analytics.
 */
export const runeMembersTable = pgTable(
  "rune_members",
  {
    user: text("user").notNull(),       // 0x lowercase
    chainId: integer("chain_id").notNull(),
    boundAt: timestamp("bound_at", { withTimezone: true }).notNull(),
    registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.user, t.chainId] })],
);

export type RuneMember = typeof runeMembersTable.$inferSelect;
export type InsertRuneMember = typeof runeMembersTable.$inferInsert;
