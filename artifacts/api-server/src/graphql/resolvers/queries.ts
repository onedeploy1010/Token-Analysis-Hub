import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, runePurchasesTable, runeReferrersTable } from "@rune/db";
import { builder } from "../builder";
import { ReferrerType } from "../types/referrer";
import { PurchaseType } from "../types/purchase";
import { PersonalStatsType, type PersonalStatsShape } from "../types/stats";
import { RewardType, type RewardShape } from "../types/reward";
import { runeChainConfig } from "../../rune/chain";
import { getDirectRateMap } from "../../rune/node-rates";

/** Resolve chainId from optional arg, default to the currently active chain. */
const resolveChain = (arg?: number | null) => arg ?? runeChainConfig.chainId;

/** PREVISION on the NodePresell contract — the denominator for directRate bps. */
const BPS_BASE = 10000n;

/** Commission paid out for a single purchase = payAmount × referrerRateBps / 10000.
 *
 *  Per the 2026-04-27 contract change, the rate is set by the *referrer's*
 *  owned-node tier, not the buyer's tier. This function takes the rate as
 *  a pre-resolved arg so the caller can decide which referrer to use:
 *    - rewards / directCommission: rate = the queried address's own rate
 *    - teamCommission: rate = each individual buyer's *immediate* referrer's rate
 *  If the relevant referrer has no node yet, rate is 0n and so is the commission.
 */
function commissionAt(amount: string | null, rateBps: bigint): bigint {
  if (!amount) return 0n;
  return (BigInt(amount) * rateBps) / BPS_BASE;
}

/** The directRate bps that applies to commissions paid TO `addr`, derived
 *  from `addr`'s own purchased-node tier. Returns 0n if `addr` hasn't
 *  bought a node — in that case the contract pays no commission either. */
async function getOwnedNodeRate(
  addr: string,
  chainId: number,
  rates: Map<number, bigint>,
): Promise<bigint> {
  const [own] = await db
    .select({ nodeId: runePurchasesTable.nodeId })
    .from(runePurchasesTable)
    .where(and(eq(runePurchasesTable.user, addr.toLowerCase()), eq(runePurchasesTable.chainId, chainId)))
    .limit(1);
  if (!own?.nodeId) return 0n;
  return rates.get(own.nodeId) ?? 0n;
}

/** Recursively collect all transitive downstream addresses for `root`.
 *  Uses a Postgres WITH RECURSIVE CTE — one round trip, no app-side BFS.
 *  Avoid the alias `user`: it's a Postgres reserved keyword and a bare
 *  `SELECT user` resolves to `CURRENT_USER`, not the CTE column. Rename
 *  to `addr` so the final SELECT reads unambiguously. */
async function collectDownstream(root: string, chainId: number): Promise<string[]> {
  const rows = await db.execute<{ addr: string }>(
    sql`
      WITH RECURSIVE team AS (
        SELECT ${runeReferrersTable.user} AS addr
        FROM   ${runeReferrersTable}
        WHERE  ${runeReferrersTable.referrer} = ${root.toLowerCase()}
          AND  ${runeReferrersTable.chainId} = ${chainId}
        UNION
        SELECT r."user" AS addr
        FROM   ${runeReferrersTable} r
        INNER JOIN team ON r.referrer = team.addr
        WHERE  r.chain_id = ${chainId}
      )
      SELECT addr FROM team
    `,
  );
  return (rows.rows ?? []).map((r) => r.addr);
}

builder.queryFields((t) => ({
  // ─────────────────────────────────────────────────────────────────────
  // team: direct downstream of an address (one hop)
  // ─────────────────────────────────────────────────────────────────────
  team: t.field({
    type: [ReferrerType],
    args: {
      address: t.arg({ type: "Address", required: true }),
      chainId: t.arg.int({ required: false }),
      limit:   t.arg.int({ required: false, defaultValue: 100 }),
      offset:  t.arg.int({ required: false, defaultValue: 0 }),
    },
    description: "Wallets that directly referrer→user this address.",
    resolve: async (_root, args) => {
      const chainId = resolveChain(args.chainId);
      const rows = await db
        .select()
        .from(runeReferrersTable)
        .where(
          and(
            eq(runeReferrersTable.referrer, args.address.toLowerCase()),
            eq(runeReferrersTable.chainId, chainId),
          ),
        )
        .orderBy(desc(runeReferrersTable.boundAt))
        .limit(Math.min(args.limit ?? 100, 500))
        .offset(args.offset ?? 0);
      return rows;
    },
  }),

  // ─────────────────────────────────────────────────────────────────────
  // referrerOf: a single user's upstream referrer record (if any)
  // ─────────────────────────────────────────────────────────────────────
  referrerOf: t.field({
    type: ReferrerType,
    nullable: true,
    args: {
      address: t.arg({ type: "Address", required: true }),
      chainId: t.arg.int({ required: false }),
    },
    resolve: async (_root, args) => {
      const chainId = resolveChain(args.chainId);
      const [row] = await db
        .select()
        .from(runeReferrersTable)
        .where(
          and(
            eq(runeReferrersTable.user, args.address.toLowerCase()),
            eq(runeReferrersTable.chainId, chainId),
          ),
        )
        .limit(1);
      return row ?? null;
    },
  }),

  // ─────────────────────────────────────────────────────────────────────
  // purchases: recent purchases, optionally scoped to a user or node
  // ─────────────────────────────────────────────────────────────────────
  purchases: t.field({
    type: [PurchaseType],
    args: {
      user:    t.arg({ type: "Address", required: false }),
      nodeId:  t.arg.int({ required: false }),
      chainId: t.arg.int({ required: false }),
      limit:   t.arg.int({ required: false, defaultValue: 50 }),
      offset:  t.arg.int({ required: false, defaultValue: 0 }),
    },
    resolve: async (_root, args) => {
      const chainId = resolveChain(args.chainId);
      const filters = [eq(runePurchasesTable.chainId, chainId)];
      if (args.user)   filters.push(eq(runePurchasesTable.user, args.user.toLowerCase()));
      if (args.nodeId) filters.push(eq(runePurchasesTable.nodeId, args.nodeId));
      const rows = await db
        .select()
        .from(runePurchasesTable)
        .where(and(...filters))
        .orderBy(desc(runePurchasesTable.paidAt))
        .limit(Math.min(args.limit ?? 50, 200))
        .offset(args.offset ?? 0);
      return rows;
    },
  }),

  // ─────────────────────────────────────────────────────────────────────
  // personalStats: everything the recruit page needs in one shot
  // ─────────────────────────────────────────────────────────────────────
  personalStats: t.field({
    type: PersonalStatsType,
    args: {
      address: t.arg({ type: "Address", required: true }),
      chainId: t.arg.int({ required: false }),
    },
    resolve: async (_root, args): Promise<PersonalStatsShape> => {
      const chainId = resolveChain(args.chainId);
      const addr = args.address.toLowerCase();

      // 1. Direct downstream count
      const [{ c: directCount } = { c: 0 }] = await db.execute<{ c: number }>(
        sql`SELECT count(*)::int AS c FROM ${runeReferrersTable}
            WHERE ${runeReferrersTable.referrer} = ${addr}
              AND ${runeReferrersTable.chainId} = ${chainId}`,
      ).then((r) => (r.rows as { c: number }[]) ?? []);

      // 2. Transitive downstream addresses
      const allDownstream = await collectDownstream(addr, chainId);

      // 3. Direct downstream users (for purchase aggregation)
      const directRows = await db
        .select({ user: runeReferrersTable.user })
        .from(runeReferrersTable)
        .where(and(eq(runeReferrersTable.referrer, addr), eq(runeReferrersTable.chainId, chainId)));
      const directUsers = directRows.map((r) => r.user);

      // 4. Purchases by direct downstream — keep nodeId for the per-tier
      //    histogram below, even though commissions no longer depend on it.
      const directPurchaseRows = directUsers.length
        ? await db
            .select({ user: runePurchasesTable.user, amount: runePurchasesTable.amount, nodeId: runePurchasesTable.nodeId })
            .from(runePurchasesTable)
            .where(and(eq(runePurchasesTable.chainId, chainId), inArray(runePurchasesTable.user, directUsers)))
        : [];

      // 5. Purchases by transitive downstream — `user` lets us join back
      //    to the buyer's immediate referrer for teamCommission's per-row
      //    rate lookup (post 2026-04-27 contract change).
      const totalPurchaseRows = allDownstream.length
        ? await db
            .select({ user: runePurchasesTable.user, amount: runePurchasesTable.amount, nodeId: runePurchasesTable.nodeId })
            .from(runePurchasesTable)
            .where(and(eq(runePurchasesTable.chainId, chainId), inArray(runePurchasesTable.user, allDownstream)))
        : [];

      const sumBigIntStr = (rows: { amount: string | null }[]) =>
        rows
          .reduce<bigint>((acc, r) => acc + BigInt(r.amount ?? "0"), 0n)
          .toString();

      // Fetch the live directRate map (cached for 10 min). One chain read
      // amortised across every personalStats query in the window.
      const rates = await getDirectRateMap();

      // Commission rate for *this* user as a referrer = their own tier's bps.
      // Used for directCommission; every direct downline's referrer is `addr`,
      // so a single rate applies to the whole sum.
      const ownRate = await getOwnedNodeRate(addr, chainId, rates);

      // For teamCommission we need the rate of each buyer's *immediate*
      // referrer — those vary across the subtree. Two extra queries:
      //   (a) buyer → referrer  (rune_referrers, restricted to the subtree)
      //   (b) referrer → ownedNodeId  (rune_purchases, restricted to those referrers)
      const transitiveBondRows = allDownstream.length
        ? await db
            .select({ user: runeReferrersTable.user, referrer: runeReferrersTable.referrer })
            .from(runeReferrersTable)
            .where(and(eq(runeReferrersTable.chainId, chainId), inArray(runeReferrersTable.user, allDownstream)))
        : [];
      const buyerToReferrer = new Map(transitiveBondRows.map((r) => [r.user, r.referrer]));
      const uniqueReferrers = Array.from(new Set(transitiveBondRows.map((r) => r.referrer)));
      const refOwnRows = uniqueReferrers.length
        ? await db
            .select({ user: runePurchasesTable.user, nodeId: runePurchasesTable.nodeId })
            .from(runePurchasesTable)
            .where(and(eq(runePurchasesTable.chainId, chainId), inArray(runePurchasesTable.user, uniqueReferrers)))
        : [];
      const referrerToNodeId = new Map(refOwnRows.map((r) => [r.user, r.nodeId]));
      const teamCommissionTotal = totalPurchaseRows.reduce<bigint>((acc, r) => {
        const refOf = buyerToReferrer.get(r.user);
        const refNode = refOf ? referrerToNodeId.get(refOf) : undefined;
        const rate = refNode != null ? (rates.get(refNode) ?? 0n) : 0n;
        return acc + commissionAt(r.amount, rate);
      }, 0n);

      // Per-tier histograms for the dashboard composition chart.
      // Filter out any row that somehow lacks a nodeId — shouldn't happen
      // against a clean indexer, but cheap to guard.
      const histogram = (rows: { nodeId: number | null }[]) => {
        const m = new Map<number, number>();
        for (const r of rows) {
          if (r.nodeId == null) continue;
          m.set(r.nodeId, (m.get(r.nodeId) ?? 0) + 1);
        }
        return Array.from(m.entries())
          .sort(([a], [b]) => a - b)
          .map(([nodeId, count]) => ({ nodeId, count }));
      };

      // 6. User's own purchase
      const [ownPurchase] = await db
        .select({ nodeId: runePurchasesTable.nodeId })
        .from(runePurchasesTable)
        .where(and(eq(runePurchasesTable.user, addr), eq(runePurchasesTable.chainId, chainId)))
        .limit(1);

      return {
        address: addr,
        chainId,
        directCount: directCount ?? 0,
        totalDownstreamCount: allDownstream.length,
        directPurchaseCount: directPurchaseRows.length,
        directTotalInvested: sumBigIntStr(directPurchaseRows),
        totalDownstreamInvested: sumBigIntStr(totalPurchaseRows),
        // Commission this user earned on-chain from direct downlines' buys.
        // Rate = this user's own tier's bps (post 2026-04-27 contract change).
        directCommission: directPurchaseRows
          .reduce<bigint>((acc, r) => acc + commissionAt(r.amount, ownRate), 0n)
          .toString(),
        // Gross commission volume across the whole transitive team — sum
        // of what each *immediate* referrer in the subtree earned, where
        // each commission is computed at that referrer's own tier rate.
        teamCommission: teamCommissionTotal.toString(),
        directByTier: histogram(directPurchaseRows),
        teamByTier: histogram(totalPurchaseRows),
        hasPurchased: !!ownPurchase,
        ownedNodeId: ownPurchase?.nodeId ?? null,
      };
    },
  }),

  // ─────────────────────────────────────────────────────────────────────
  // rewards: per-payout detail for the dashboard Rewards tab. Each row
  // is a single direct-downline purchase that earned this address a
  // commission. On-chain the commission goes straight from buyer to
  // referrer via USDT.safeTransferFrom — so the "rewards" list is the
  // same as the direct downlines' purchase list, with the per-row
  // commission computed from nodeId × live directRate bps.
  // ─────────────────────────────────────────────────────────────────────
  rewards: t.field({
    type: [RewardType],
    args: {
      address: t.arg({ type: "Address", required: true }),
      chainId: t.arg.int({ required: false }),
      limit:   t.arg.int({ required: false, defaultValue: 100 }),
      offset:  t.arg.int({ required: false, defaultValue: 0 }),
    },
    description: "On-chain direct-commission payouts earned by this address as a direct referrer.",
    resolve: async (_root, args): Promise<RewardShape[]> => {
      const chainId = resolveChain(args.chainId);
      const addr = args.address.toLowerCase();
      const rows = await db
        .select({
          user:        runePurchasesTable.user,
          nodeId:      runePurchasesTable.nodeId,
          amount:      runePurchasesTable.amount,
          paidAt:      runePurchasesTable.paidAt,
          blockNumber: runePurchasesTable.blockNumber,
          txHash:      runePurchasesTable.txHash,
        })
        .from(runePurchasesTable)
        .innerJoin(
          runeReferrersTable,
          and(
            eq(runeReferrersTable.user, runePurchasesTable.user),
            eq(runeReferrersTable.chainId, runePurchasesTable.chainId),
          ),
        )
        .where(
          and(
            eq(runeReferrersTable.referrer, addr),
            eq(runePurchasesTable.chainId, chainId),
          ),
        )
        .orderBy(desc(runePurchasesTable.paidAt))
        .limit(Math.min(args.limit ?? 100, 500))
        .offset(args.offset ?? 0);

      // All rows here are direct downlines of `addr`, so the commission
      // rate is `addr`'s own tier rate — resolved once, applied uniformly.
      // (Post 2026-04-27 contract change: rate = referrer's tier, not buyer's.)
      const rates = await getDirectRateMap();
      const referrerRate = await getOwnedNodeRate(addr, chainId, rates);
      return rows.map((r) => {
        const commission = commissionAt(r.amount, referrerRate);
        return {
          downline:       r.user,
          nodeId:         r.nodeId,
          purchaseAmount: String(r.amount ?? "0"),
          directRate:     Number(referrerRate),
          commission:     commission.toString(),
          paidAt:         r.paidAt,
          blockNumber:    r.blockNumber,
          txHash:         r.txHash,
          chainId,
        };
      });
    },
  }),
}));
