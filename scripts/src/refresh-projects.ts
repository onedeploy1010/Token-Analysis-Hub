/**
 * Refresh TVL/market_cap from DefiLlama for existing projects,
 * and insert 4 new quality DeFi protocols (Ethena, Morpho Blue, Jito, EigenLayer).
 *
 * Usage:
 *   DATABASE_URL=... tsx scripts/src/refresh-projects.ts --dry
 *   DATABASE_URL=... tsx scripts/src/refresh-projects.ts
 *
 * Notes:
 *   - APY is NOT refreshed here (protocol-specific, needs dedicated work).
 *   - Projects without a DefiLlama slug (RUNE, ATM, Olympus, Frax) are left untouched
 *     for TVL/market_cap — they either have deep-model data already or the slug is
 *     unreliable on DefiLlama (defunct / misnamed).
 */
import pg from "pg";

const DRY = process.argv.includes("--dry");

/** Map DB name → DefiLlama slug (null = skip refresh). */
const SLUG_MAP: Record<string, string | null> = {
  "RUNE Protocol": null, // thorchain slug returns 0; keep existing $312M
  "Uniswap": "uniswap",
  "Aave": "aave-v3",
  "Curve Finance": "curve-dex",
  "Lido": "lido",
  "GMX": "gmx",
  "Pendle": "pendle",
  "Rocket Pool": "rocket-pool",
  "Olympus DAO": null, // defunct on DefiLlama
  "Frax Finance": null, // slug fragmented across frax / frax-v3 / fraxlend
  "Liquity Protocol": "liquity-v1",
  "MakerDAO": "makerdao",
  "HyperLiquid HLP": "hyperliquid-hlp",
  "LEGEND ATM": null, // not on DefiLlama
};

type NewProject = {
  name: string; symbol: string; category: string; description: string;
  rating: number; risk_level: "low" | "medium" | "high"; apy: number;
  website: string; tags: string[]; is_recommended: boolean; trending: boolean;
  slug: string; // DefiLlama slug for fetching TVL/mcap
};

const NEW_PROJECTS: NewProject[] = [
  {
    name: "Ethena", symbol: "ENA", category: "Yield",
    description: "Synthetic dollar (USDe) protocol on Ethereum. Yield is generated via a delta-neutral basis trade: stETH long collateral hedged by short perpetual positions on CEXes. sUSDe captures the funding-rate + staking yield spread.",
    rating: 4.4, risk_level: "high", apy: 12.0,
    website: "https://ethena.fi",
    tags: ["Yield", "Stablecoin", "Synthetic Dollar", "Basis Trade", "DeFi"],
    is_recommended: true, trending: true, slug: "ethena",
  },
  {
    name: "Morpho Blue", symbol: "MORPHO", category: "Lending",
    description: "Trustless lending primitive with permissionless isolated markets. Each market has fixed parameters (LLTV, oracle, IRM) — immutable after deployment. Curators build vaults (MetaMorpho) that route deposits across markets.",
    rating: 4.5, risk_level: "medium", apy: 9.5,
    website: "https://morpho.org",
    tags: ["Lending", "Isolated Markets", "Immutable", "Ethereum", "Base"],
    is_recommended: true, trending: true, slug: "morpho-blue",
  },
  {
    name: "Jito", symbol: "JTO", category: "Staking",
    description: "MEV-powered liquid staking on Solana. JitoSOL captures staking yield plus MEV rewards from Jito-Solana validator client. Stake Pool distributes to ~150 validators. Also runs the Block Engine + Tip Distribution Program.",
    rating: 4.3, risk_level: "medium", apy: 7.5,
    website: "https://jito.network",
    tags: ["Staking", "Liquid Staking", "Solana", "MEV", "DeFi"],
    is_recommended: true, trending: true, slug: "jito",
  },
  {
    name: "EigenLayer", symbol: "EIGEN", category: "Staking",
    description: "Restaking protocol on Ethereum. ETH/LST holders opt in to slashing conditions for AVS (Actively Validated Services) and earn additional rewards. Pioneered the LRT (liquid restaking token) meta. Now expanded as EigenCloud.",
    rating: 4.2, risk_level: "high", apy: 5.0,
    website: "https://eigenlayer.xyz",
    tags: ["Staking", "Restaking", "LRT", "AVS", "Ethereum"],
    is_recommended: true, trending: true, slug: "eigenlayer",
  },
];

function formatUsd(n: number | null | undefined): string | null {
  if (n == null || !isFinite(n) || n <= 0) return null;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

async function fetchLlama(slug: string): Promise<{ tvl: number | null; mcap: number | null } | null> {
  try {
    const r = await fetch(`https://api.llama.fi/protocol/${slug}`);
    if (!r.ok) return null;
    const j: any = await r.json();
    const tvlArr = Array.isArray(j.tvl) ? j.tvl : [];
    const latestTvl = tvlArr.length ? tvlArr[tvlArr.length - 1]?.totalLiquidityUSD : null;
    return { tvl: typeof latestTvl === "number" ? latestTvl : null, mcap: typeof j.mcap === "number" ? j.mcap : null };
  } catch (e: any) {
    console.error(`  [llama] ${slug} fetch failed:`, e.message);
    return null;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  // Fetch all DefiLlama slugs in parallel (existing + new)
  const allSlugs = new Set<string>();
  for (const s of Object.values(SLUG_MAP)) if (s) allSlugs.add(s);
  for (const p of NEW_PROJECTS) allSlugs.add(p.slug);
  console.log(`[refresh] fetching ${allSlugs.size} DefiLlama protocols…`);

  const dataBySlug = new Map<string, { tvl: number | null; mcap: number | null }>();
  const entries = [...allSlugs];
  const results = await Promise.all(entries.map((s) => fetchLlama(s)));
  for (let i = 0; i < entries.length; i++) {
    const d = results[i];
    if (d) dataBySlug.set(entries[i], d);
  }

  // Plan updates for existing projects
  const existing = await pool.query<{ id: number; name: string; tvl: string; market_cap: string }>(
    "SELECT id, name, tvl, market_cap FROM public.projects WHERE archived = false"
  );
  const updates: { id: number; name: string; before: string; after: string; tvlAfter: string; mcapAfter: string | null }[] = [];
  for (const row of existing.rows) {
    const slug = SLUG_MAP[row.name];
    if (!slug) continue;
    const d = dataBySlug.get(slug);
    if (!d) continue;
    const tvlStr = formatUsd(d.tvl);
    const mcapStr = formatUsd(d.mcap);
    if (!tvlStr) continue;
    updates.push({
      id: row.id, name: row.name,
      before: `TVL ${row.tvl} / MC ${row.market_cap}`,
      after: `TVL ${tvlStr} / MC ${mcapStr ?? "(keep)"}`,
      tvlAfter: tvlStr,
      mcapAfter: mcapStr,
    });
  }

  // Plan inserts for new
  const existingNames = new Set(existing.rows.map((r) => r.name));
  const inserts: (NewProject & { tvl: string; market_cap: string })[] = [];
  for (const p of NEW_PROJECTS) {
    if (existingNames.has(p.name)) { console.log(`[refresh] ${p.name} already exists, will skip insert.`); continue; }
    const d = dataBySlug.get(p.slug);
    const tvlStr = formatUsd(d?.tvl ?? null) ?? "$0";
    const mcapStr = formatUsd(d?.mcap ?? null) ?? "$0";
    inserts.push({ ...p, tvl: tvlStr, market_cap: mcapStr });
  }

  console.log(`\n[refresh] UPDATE plan (${updates.length}):`);
  for (const u of updates) console.log(`  #${u.id.toString().padStart(2)} ${u.name.padEnd(20)}  ${u.before}  →  ${u.after}`);
  console.log(`\n[refresh] INSERT plan (${inserts.length}):`);
  for (const i of inserts) console.log(`  + ${i.name.padEnd(14)} ${i.symbol.padEnd(8)} TVL ${i.tvl.padStart(8)}  MC ${i.market_cap.padStart(8)}  APY ${i.apy}%`);

  if (DRY) { console.log("\n[refresh] DRY — no writes."); await pool.end(); return; }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const u of updates) {
      if (u.mcapAfter) {
        await client.query("UPDATE public.projects SET tvl=$1, market_cap=$2 WHERE id=$3", [u.tvlAfter, u.mcapAfter, u.id]);
      } else {
        await client.query("UPDATE public.projects SET tvl=$1 WHERE id=$2", [u.tvlAfter, u.id]);
      }
    }
    for (const p of inserts) {
      await client.query(
        `INSERT INTO public.projects
          (name, symbol, category, description, rating, risk_level, apy, tvl, market_cap, website, tags, is_recommended, trending, archived)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,false)`,
        [p.name, p.symbol, p.category, p.description, p.rating, p.risk_level, p.apy, p.tvl, p.market_cap, p.website, p.tags, p.is_recommended, p.trending]
      );
    }
    await client.query("COMMIT");
    console.log(`\n[refresh] applied: ${updates.length} updates, ${inserts.length} inserts.`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
