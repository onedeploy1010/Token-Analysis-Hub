import { pgTable, text, integer, bigint, numeric, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

/**
 * One row per `EventNodePresell(user, payToken, amount, time, num, nodeId)`
 * emitted by the NodePresell contract. `amount` is stored as numeric so we
 * keep the full 18-decimal precision without rounding to float.
 */
export const runePurchasesTable = pgTable(
  "rune_purchases",
  {
    user: text("user").notNull(),            // buyer address, lowercase
    nodeId: integer("node_id").notNull(),    // 101 / 201 / 301 / 401 / 501
    payToken: text("pay_token").notNull(),   // USDT address, lowercase
    // 18-decimal amount — e.g. "50000000000000000000000" for 50,000 USDT.
    // Using numeric(78,0) — 78 digits is the ceiling for uint256.
    amount: numeric("amount", { precision: 78, scale: 0 }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),

    chainId: integer("chain_id").notNull(),
    blockNumber: bigint("block_number", { mode: "number" }).notNull(),
    txHash: text("tx_hash").notNull(),
    logIndex: integer("log_index").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Each wallet can only buy once on-chain, but we still key on (chain, tx, log)
    // for safe replayed-log upserts.
    uniqueIndex("rune_purchases_event_uq").on(t.chainId, t.txHash, t.logIndex),
    uniqueIndex("rune_purchases_user_chain_uq").on(t.user, t.chainId),
    index("rune_purchases_node_idx").on(t.nodeId, t.chainId),
  ],
);

export type RunePurchase = typeof runePurchasesTable.$inferSelect;
export type InsertRunePurchase = typeof runePurchasesTable.$inferInsert;
