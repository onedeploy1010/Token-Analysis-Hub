import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, runePurchasesTable, runeReferrersTable } from "@workspace/db";
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

/** Commission paid to the direct referrer for a purchase — payAmount × rates[nodeId] / 10000. */
function commissionOf(
  purchase: { amount: string | null; nodeId: number | null },
  rates: Map<number, bigint>,
): bigint {
  if (!purchase.amount || purchase.nodeId == null) return 0n;
  const rate = rates.get(purchase.nodeId) ?? 0n;
  return (BigInt(purchase.amount) * rate) / BPS_BASE;
}

/** Recursively collect all transitive downstream addresses for `root`.
 *  Uses a Postgres WITH RECURSIVE CTE — one round trip, no app-side BFS. */
async function collectDownstream(root: string, chainId: number): Promise<string[]> {
  const rows = await db.execute<{ user: string }>(
    sql`
      WITH RECURSIVE team AS (
        SELECT ${runeReferrersTable.user} AS user
        FROM   ${runeReferrersTable}
        WHERE  ${runeReferrersTable.referrer} = ${root.toLowerCase()}
          AND  ${runeReferrersTable.chainId} = ${chainId}
        UNION
        SELECT r.user
        FROM   ${runeReferrersTable} r
        INNER JOIN team ON r.referrer = team.user
        WHERE  r.chain_id = ${chainId}
      )
      SELECT user FROM team
    `,
  );
  return (rows.rows ?? []).map((r) => r.user);
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

      // 4. Purchases by direct downstream — pull nodeId too so we can
      //    compute the per-tier commission in JS.
      const directPurchaseRows = directUsers.length
        ? await db
            .select({ amount: runePurchasesTable.amount, nodeId: runePurchasesTable.nodeId })
            .from(runePurchasesTable)
            .where(and(eq(runePurchasesTable.chainId, chainId), inArray(runePurchasesTable.user, directUsers)))
        : [];

      // 5. Purchases by transitive downstream
      const totalPurchaseRows = allDownstream.length
        ? await db
            .select({ amount: runePurchasesTable.amount, nodeId: runePurchasesTable.nodeId })
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
      const sumCommissionStr = (rows: { amount: string | null; nodeId: number | null }[]) =>
        rows
          .reduce<bigint>((acc, r) => acc + commissionOf(r, rates), 0n)
          .toString();

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
        directCommission: sumCommissionStr(directPurchaseRows),
        // Gross commission volume across the whole transitive team — the
        // sum of what every direct-referrer in the subtree earned. Equal
        // to the commission a perfectly-flat (one-level) team would pay,
        // so on the contract's single-level model this is the team-wide
        // reward ceiling.
        teamCommission: sumCommissionStr(totalPurchaseRows),
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

      const rates = await getDirectRateMap();
      return rows.map((r) => {
        const rateBps = rates.get(r.nodeId) ?? 0n;
        const commission = (BigInt(r.amount ?? "0") * rateBps) / BPS_BASE;
        return {
          downline:       r.user,
          nodeId:         r.nodeId,
          purchaseAmount: String(r.amount ?? "0"),
          directRate:     Number(rateBps),
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
