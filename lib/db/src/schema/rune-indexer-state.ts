import { pgTable, text, integer, bigint, timestamp } from "drizzle-orm/pg-core";
import { primaryKey } from "drizzle-orm/pg-core";

/**
 * Persists the last successfully-indexed block per (chainId, contract).
 * The indexer reads this on boot so we only scan from `lastBlock + 1`
 * forward, and writes back after each batch so a crash resumes where we
 * left off.
 */
export const runeIndexerStateTable = pgTable(
  "rune_indexer_state",
  {
    chainId: integer("chain_id").notNull(),
    contract: text("contract").notNull(), // "community" | "nodePresell"
    lastBlock: bigint("last_block", { mode: "number" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.chainId, t.contract] })],
);

export type RuneIndexerState = typeof runeIndexerStateTable.$inferSelect;
