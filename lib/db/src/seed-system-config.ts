import { db, systemConfigTable, type InsertSystemConfig } from "./index";
import { sql } from "drizzle-orm";

/**
 * Seed RUNE+ protocol parameters from the spec doc:
 *   `runeapi 3/RUNE+ 模型制度详细解析文档.md`
 *
 * Idempotent: ON CONFLICT DO UPDATE re-syncs values + descriptions but keeps
 * `updated_by` so manual admin edits aren't silently overwritten on rerun
 * (an admin override is detectable by `updated_by != 'seed'`).
 *
 * Run: `pnpm -C lib/db tsx src/seed-system-config.ts`
 */

type Row = Omit<InsertSystemConfig, "updatedAt"> & { value: unknown };

const rows: Row[] = [
  // ── V-level referral ladder ────────────────────────────────────────────
  // Source: spec §5 V级小区业绩制 table
  // value: { personalMinUsdt, teamMinUsdt, refsMin, commissionPct, levelBonusPct, sedimentBonusPct, daoVote }
  ...[
    ["V1", 1000,    20_000,    2,  4, 0,  0,    false],
    ["V2", 1000,    50_000,    3,  8, 0,  0,    false],
    ["V3", 1000,    300_000,   5,  12, 1, 0,    false],
    ["V4", 2000,    1_000_000, 7,  16, 1, 0,    false],
    ["V5", 3000,    3_000_000, 10, 20, 1, 0,    false],
    ["V6", 4000,    7_000_000, 13, 23, 1, 0.5,  false],
    ["V7", 5000,    20_000_000,15, 25, 1, 0.5,  false],
    ["V8", 10_000,  50_000_000,15, 27, 1, 5,    false],
    ["V9", 20_000,  90_000_000,15, 29, 1, 9,    true],
  ].map(([key, p, t, r, c, lb, sb, dao]) => ({
    namespace: "v_level",
    key: key as string,
    value: { personalMinUsdt: p, teamMinUsdt: t, refsMin: r, commissionPct: c, levelBonusPct: lb, sedimentBonusPct: sb, daoVote: dao },
    description: `V-level ${key} qualification + commission`,
    updatedBy: "seed",
  })),

  // ── Wealth packages (理财套餐) ─────────────────────────────────────────
  // Source: spec §3 表
  // value: { dailyMinPct, dailyMaxPct, bonusPct, singleMaxUsdt, addrMaxCount, dailyGlobalCapUsdt | null }
  {
    namespace: "package", key: "30d",
    value: { days: 30, dailyMinPct: 0.3, dailyMaxPct: 0.5, bonusPct: 0, singleMaxUsdt: 1000, addrMaxCount: 5, dailyGlobalCapUsdt: 200_000 },
    description: "30-day package",
    updatedBy: "seed",
  },
  {
    namespace: "package", key: "90d",
    value: { days: 90, dailyMinPct: 0.5, dailyMaxPct: 0.7, bonusPct: 0, singleMaxUsdt: 1000, addrMaxCount: 5, dailyGlobalCapUsdt: 300_000 },
    description: "90-day package",
    updatedBy: "seed",
  },
  {
    namespace: "package", key: "180d",
    value: { days: 180, dailyMinPct: 0.5, dailyMaxPct: 0.9, bonusPct: 10, singleMaxUsdt: 1000, addrMaxCount: 5, dailyGlobalCapUsdt: null },
    description: "180-day package (+10% bonus)",
    updatedBy: "seed",
  },
  {
    namespace: "package", key: "360d",
    value: { days: 360, dailyMinPct: 0.5, dailyMaxPct: 0.9, bonusPct: 20, singleMaxUsdt: 1000, addrMaxCount: 5, dailyGlobalCapUsdt: null },
    description: "360-day package (+20% bonus)",
    updatedBy: "seed",
  },
  {
    namespace: "package", key: "540d",
    value: { days: 540, dailyMinPct: 0.5, dailyMaxPct: 0.9, bonusPct: 30, singleMaxUsdt: 1000, addrMaxCount: 5, dailyGlobalCapUsdt: null },
    description: "540-day package (+30% bonus)",
    updatedBy: "seed",
  },

  // ── Withdrawal fee tiers (提现手续费阶梯) ──────────────────────────────
  // Source: spec §4.3
  // value: { maxLockDays, feePct } — first tier matched wins, ordered by maxLockDays asc
  ...[
    ["tier_0",  0,    35],
    ["tier_7",  7,    25],
    ["tier_15", 15,   15],
    ["tier_30", 30,   5],
    ["tier_45", 999,  1],
  ].map(([key, days, pct]) => ({
    namespace: "withdrawal_fee",
    key: key as string,
    value: { maxLockDays: days, feePct: pct },
    description: `Within ${days} days lock`,
    updatedBy: "seed",
  })),

  // ── Three-pool deposit split (TLP / QEP / TRP) ─────────────────────────
  // Source: spec §2
  { namespace: "pool_split", key: "TLP", value: { pct: 35, label: "Trading Liquidity Pool", purpose: "Half injects USDT, half buys mother token to pool" }, description: "Trading Liquidity Pool", updatedBy: "seed" },
  { namespace: "pool_split", key: "QEP", value: { pct: 45, label: "Quant Execution Pool", purpose: "AI quant trading, expected 25–35% monthly" }, description: "Quant Execution Pool", updatedBy: "seed" },
  { namespace: "pool_split", key: "TRP", value: { pct: 20, label: "Treasury Reserve Pool", purpose: "Safety net + price defense + redemption guarantee" }, description: "Treasury Reserve Pool", updatedBy: "seed" },

  // ── Daily yield split (静态/动态) ──────────────────────────────────────
  // Source: spec §4.1
  { namespace: "daily_yield", key: "static", value: { pct: 65, payoutToken: "USDT", note: "Direct USDT to wallet" }, description: "Static daily yield", updatedBy: "seed" },
  { namespace: "daily_yield", key: "dynamic", value: { pct: 35, payoutToken: "EMBER", note: "Auto-buy sub-token into pool, drives sub-token price" }, description: "Dynamic daily yield", updatedBy: "seed" },

  // ── Token supply (mother / child) ──────────────────────────────────────
  // Source: spec §1
  {
    namespace: "token_supply", key: "RUNE",
    value: {
      role: "mother", totalSupply: 210_000_000, finalSupply: 21_000_000, deflationPct: 90,
      allocations: {
        tradingPool: 100_000_000, contracts: 30_000_000, nodeAirdrop: 10_000_000, initialBurn: 70_000_000,
      },
    },
    description: "Mother token RUNE",
    updatedBy: "seed",
  },
  {
    namespace: "token_supply", key: "EMBER",
    value: {
      role: "child", totalSupply: 13_100_000, finalSupply: 1_310_000, deflationPct: 90,
      poolFloor: 13_100_000, launchUsdtFloor: 5_000_000, launchUsdtCeiling: 20_000_000,
      forecastCycleMonths: [18, 24], forecastMultiple: [80, 120],
    },
    description: "Sub-token 符火 EMBER",
    updatedBy: "seed",
  },

  // ── Node tiers (mirrors on-chain NodePresell, kept here for cross-ref) ─
  // Source: contract NODE_META + 节点招募计划.md
  // Note: directRate (5–15%) is the contract reality; spec §5 states a flat
  //       5% — this discrepancy is documented in
  //       runeapi 3/规范-合约对照差距.md and surfaced in admin Contracts page.
  ...[
    ["tier_101", 101, "FOUNDER",  "符主", 50_000, 15, "联创节点"],
    ["tier_201", 201, "SUPER",    "符魂", 10_000, 12, "超级节点"],
    ["tier_301", 301, "ADVANCED", "符印",  5_000, 10, "高级节点"],
    ["tier_401", 401, "MID",      "符源",  2_500,  8, "中级节点"],
    ["tier_501", 501, "INITIAL",  "符胚",  1_000,  5, "初级节点"],
  ].map(([key, nodeId, level, nameCn, price, directRatePct, nameDescription]) => ({
    namespace: "node_tier",
    key: key as string,
    value: { nodeId, level, nameCn, priceUsdt: price, directRatePct, description: nameDescription },
    description: `${nameCn} (${level}) ${price.toLocaleString()} USDT`,
    updatedBy: "seed",
  })),

  // ── Settlement / general ───────────────────────────────────────────────
  // Source: spec §4.2
  { namespace: "general", key: "settlementTime", value: { utcOffset: 0, hour: 0 }, description: "Daily settlement time (UTC)", updatedBy: "seed" },
  { namespace: "general", key: "settlementMotherBuy", value: { motherTokens: 0.15 }, description: "Per-settlement mother-token auto-buy", updatedBy: "seed" },
  { namespace: "general", key: "subTokenSlippage", value: { slippagePermille: 999.5 }, description: "Sub-token sell slippage / tax (per mille)", updatedBy: "seed" },
  { namespace: "general", key: "queueBonus", value: { bonusPct: 0.1, refundable: true }, description: "Queue compensation when daily cap exceeded", updatedBy: "seed" },
  { namespace: "general", key: "directRate", value: { specPct: 5, contractVaries: [5, 8, 10, 12, 15], note: "Spec says fixed 5%; on-chain NodePresell enforces tier-based 5–15% via directRate. Reconcile before V-level launch." }, description: "Direct referral rate (spec vs contract)", updatedBy: "seed" },

  // ── Indexer / ops ──────────────────────────────────────────────────────
  { namespace: "indexer", key: "lagWarnSeconds",   value: { seconds: 60 },  description: "Indexer block lag warn threshold", updatedBy: "seed" },
  { namespace: "indexer", key: "lagAlertSeconds",  value: { seconds: 300 }, description: "Indexer block lag alert threshold (Telegram bot)", updatedBy: "seed" },
];

async function main() {
  const ts = new Date();
  for (const r of rows) {
    await db
      .insert(systemConfigTable)
      .values({ ...r, updatedAt: ts } as InsertSystemConfig)
      .onConflictDoUpdate({
        target: [systemConfigTable.namespace, systemConfigTable.key],
        // Re-sync seed values + description but DON'T clobber `updated_by`
        // when an admin has touched the row (updated_by != 'seed').
        set: {
          value: sql`excluded.value`,
          description: sql`excluded.description`,
          updatedAt: sql`excluded.updated_at`,
          updatedBy: sql`CASE WHEN ${systemConfigTable.updatedBy} = 'seed' THEN excluded.updated_by ELSE ${systemConfigTable.updatedBy} END`,
        },
      });
  }
  // eslint-disable-next-line no-console
  console.log(`[seed-system-config] upserted ${rows.length} rows`);
  process.exit(0);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
