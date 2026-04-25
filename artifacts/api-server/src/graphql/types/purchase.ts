import type { RunePurchase } from "@rune/db";
import { builder } from "../builder";

/**
 * One on-chain purchase of a presale node.
 */
export const PurchaseType = builder.objectRef<RunePurchase>("Purchase").implement({
  description: "A recorded NodePresell purchase event.",
  fields: (t) => ({
    user:        t.field({ type: "Address",      resolve: (r) => r.user }),
    nodeId:      t.exposeInt("nodeId", { description: "101=符主, 201=符魂, 301=符印, 401=符胚, 501=初级" }),
    payToken:    t.field({ type: "Address",      resolve: (r) => r.payToken }),
    amount:      t.field({ type: "BigIntString", resolve: (r) => String(r.amount) }),
    paidAt:      t.field({ type: "DateTime",     resolve: (r) => r.paidAt }),
    blockNumber: t.int({                         resolve: (r) => r.blockNumber }),
    txHash:      t.exposeString("txHash"),
    chainId:     t.exposeInt("chainId"),
  }),
});
