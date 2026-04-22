import { pgTable, text, integer, bigint, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

/**
 * One row per `EventAddReferrer(user, referrer)` emitted by the Community
 * contract. Addresses are stored lowercase so `eq` lookups are cheap and
 * deterministic — never compare against checksummed hex.
 */
export const runeReferrersTable = pgTable(
  "rune_referrers",
  {
    // EVM lowercase addresses (0x… 42 chars). Using text keeps us agnostic
    // of the DB driver's bytea handling.
    user: text("user").notNull(),
    referrer: text("referrer").notNull(),

    chainId: integer("chain_id").notNull(),
    blockNumber: bigint("block_number", { mode: "number" }).notNull(),
    txHash: text("tx_hash").notNull(),
    logIndex: integer("log_index").notNull(),
    boundAt: timestamp("bound_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // A user can only have one referrer on-chain per chain — this enforces idempotency
    // of re-indexing replayed logs as well.
    uniqueIndex("rune_referrers_user_chain_uq").on(t.user, t.chainId),
    // Downstream lookups (`give me everyone referrer=X`) are the hot path.
    index("rune_referrers_referrer_idx").on(t.referrer, t.chainId),
    // For idempotent upserts keyed on the event itself.
    uniqueIndex("rune_referrers_event_uq").on(t.chainId, t.txHash, t.logIndex),
  ],
);

export type RuneReferrer = typeof runeReferrersTable.$inferSelect;
export type InsertRuneReferrer = typeof runeReferrersTable.$inferInsert;
