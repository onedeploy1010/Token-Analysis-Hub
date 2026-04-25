import type { RuneReferrer } from "@rune/db";
import { builder } from "../builder";

/**
 * A binding on the Community contract — "user chose referrer on block N".
 */
export const ReferrerType = builder.objectRef<RuneReferrer>("Referrer").implement({
  description: "One edge in the referral graph — a user and the referrer they chose.",
  fields: (t) => ({
    user:       t.field({ type: "Address",      resolve: (r) => r.user }),
    referrer:   t.field({ type: "Address",      resolve: (r) => r.referrer }),
    boundAt:    t.field({ type: "DateTime",     resolve: (r) => r.boundAt }),
    blockNumber:t.int({                        resolve: (r) => r.blockNumber }),
    txHash:     t.exposeString("txHash"),
    chainId:    t.exposeInt("chainId"),
  }),
});
