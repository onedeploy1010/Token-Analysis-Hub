import { builder } from "../builder";

/**
 * One direct-commission payout earned by a referrer when one of their
 * direct downlines bought a node. Assembled from (rune_purchases ⋈
 * rune_referrers) + the live directRate map — no backing table row.
 */
export interface RewardShape {
  downline: string;       // the wallet that purchased (and whose upstream is the viewer)
  nodeId: number;         // 101 / 201 / 301 / 401
  purchaseAmount: string; // raw payAmount, 18-decimal string
  directRate: number;     // bps out of 10000 (e.g. 1500 = 15%)
  commission: string;     // purchaseAmount × directRate / 10000, 18-decimal string
  paidAt: Date;
  blockNumber: number;
  txHash: string;
  chainId: number;
}

export const RewardType = builder.objectRef<RewardShape>("Reward").implement({
  description: "A single direct-commission payout the viewer earned as the upstream referrer of a purchasing downline.",
  fields: (t) => ({
    downline:       t.field({ type: "Address",      resolve: (r) => r.downline }),
    nodeId:         t.exposeInt("nodeId", { description: "101=符主, 201=符魂, 301=符印, 401=符胚" }),
    purchaseAmount: t.field({ type: "BigIntString", resolve: (r) => r.purchaseAmount, description: "Gross USDT the downline paid, 18-decimal string." }),
    directRate:     t.exposeInt("directRate",       { description: "Referrer commission rate in basis points (10000 = 100%)." }),
    commission:     t.field({ type: "BigIntString", resolve: (r) => r.commission, description: "USDT received by the referrer on-chain for this purchase, 18-decimal string." }),
    paidAt:         t.field({ type: "DateTime",     resolve: (r) => r.paidAt }),
    blockNumber:    t.int({                         resolve: (r) => r.blockNumber }),
    txHash:         t.exposeString("txHash"),
    chainId:        t.exposeInt("chainId"),
  }),
});
