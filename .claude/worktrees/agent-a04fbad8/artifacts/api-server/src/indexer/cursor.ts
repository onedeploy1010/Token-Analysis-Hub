import { and, eq } from "drizzle-orm";
import { db, runeIndexerStateTable } from "@workspace/db";

export type RuneContract = "community" | "nodePresell";

/** Fetch the last successfully indexed block for `(chainId, contract)` */
export async function getCursor(chainId: number, contract: RuneContract): Promise<bigint | null> {
  const [row] = await db
    .select({ lastBlock: runeIndexerStateTable.lastBlock })
    .from(runeIndexerStateTable)
    .where(
      and(
        eq(runeIndexerStateTable.chainId, chainId),
        eq(runeIndexerStateTable.contract, contract),
      ),
    )
    .limit(1);
  return row ? BigInt(row.lastBlock) : null;
}

/** Upsert the cursor to `block`. */
export async function setCursor(
  chainId: number,
  contract: RuneContract,
  block: bigint,
): Promise<void> {
  await db
    .insert(runeIndexerStateTable)
    .values({ chainId, contract, lastBlock: Number(block), updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [runeIndexerStateTable.chainId, runeIndexerStateTable.contract],
      set: { lastBlock: Number(block), updatedAt: new Date() },
    });
}
