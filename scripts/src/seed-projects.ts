/**
 * Seed the `projects` table with the 22-project snapshot the user provided.
 *
 * Usage:
 *   DATABASE_URL=... tsx scripts/src/seed-projects.ts --dry   # print, no write
 *   DATABASE_URL=... tsx scripts/src/seed-projects.ts         # write
 *
 * Safety:
 *   - Refuses to run if the table already has rows, unless --force is passed.
 *   - Preserves the explicit ids (1..22) and bumps the sequence afterwards.
 */
import pg from "pg";

type Row = {
  id: number;
  name: string;
  symbol: string;
  category: string;
  description: string;
  rating: number;
  risk_level: "low" | "medium" | "high";
  apy: number;
  tvl: string;
  market_cap: string;
  website: string | null;
  tags: string[];
  is_recommended: boolean;
  trending: boolean;
  archived: boolean;
  created_at: string;
};

const rows: Row[] = [
  { id: 1, name: "RUNE Protocol", symbol: "RUNE", category: "DEX", description: "A decentralized cross-chain liquidity protocol enabling native asset swaps without wrapping or pegging. RUNE is the settlement asset for all pools.", rating: 9.5, risk_level: "medium", apy: 170.82, tvl: "$312M", market_cap: "$1.54B", website: "https://thorchain.org", tags: ["DeFi", "DEX", "Cross-chain", "Layer1"], is_recommended: true, trending: true, archived: false, created_at: "2026-04-20T08:07:36.815Z" },
  { id: 2, name: "Uniswap", symbol: "UNI", category: "DEX", description: "The leading decentralized exchange on Ethereum. Uniswap v3 introduced concentrated liquidity, allowing LPs to provide liquidity within custom price ranges for higher capital efficiency.", rating: 4.5, risk_level: "low", apy: 12.4, tvl: "$5.8B", market_cap: "$6.2B", website: "https://uniswap.org", tags: ["DEX", "Ethereum", "AMM", "DeFi"], is_recommended: true, trending: false, archived: false, created_at: "2026-04-20T08:07:36.815Z" },
  { id: 3, name: "Aave", symbol: "AAVE", category: "Lending", description: "Decentralized non-custodial liquidity protocol where users can participate as suppliers or borrowers. Aave offers flash loans, stable and variable rate borrowing.", rating: 4.6, risk_level: "low", apy: 8.9, tvl: "$12.4B", market_cap: "$1.8B", website: "https://aave.com", tags: ["Lending", "DeFi", "Ethereum", "Multi-chain"], is_recommended: true, trending: false, archived: false, created_at: "2026-04-20T08:07:36.815Z" },
  { id: 4, name: "Curve Finance", symbol: "CRV", category: "DEX", description: "Decentralized exchange optimized for stablecoin and similar-asset trading using a specialized AMM formula. Curve's veCRV tokenomics incentivize long-term liquidity provision.", rating: 4.3, risk_level: "low", apy: 14.7, tvl: "$4.1B", market_cap: "$420M", website: "https://curve.fi", tags: ["DEX", "Stablecoins", "AMM", "DeFi"], is_recommended: true, trending: false, archived: false, created_at: "2026-04-20T08:07:36.815Z" },
  { id: 5, name: "Lido", symbol: "LDO", category: "Staking", description: "Liquid staking solution for ETH. Users stake ETH and receive stETH which accrues staking rewards while remaining usable in DeFi protocols.", rating: 4.4, risk_level: "low", apy: 4.2, tvl: "$19.8B", market_cap: "$2.1B", website: "https://lido.fi", tags: ["Staking", "Ethereum", "Liquid Staking", "DeFi"], is_recommended: true, trending: true, archived: false, created_at: "2026-04-20T08:07:36.815Z" },
  { id: 6, name: "GMX", symbol: "GMX", category: "Derivatives", description: "Decentralized perpetual exchange on Arbitrum and Avalanche. Offers up to 50x leverage with low fees and minimal price impact. GLP token earns 70% of protocol fees.", rating: 4.1, risk_level: "high", apy: 22.6, tvl: "$780M", market_cap: "$550M", website: "https://gmx.io", tags: ["Derivatives", "Perpetuals", "Arbitrum", "Avalanche"], is_recommended: true, trending: true, archived: false, created_at: "2026-04-20T08:07:36.815Z" },
  { id: 7, name: "Compound", symbol: "COMP", category: "Lending", description: "An algorithmic, autonomous interest rate protocol. Users supply assets to earn interest and borrow against their crypto collateral. One of the pioneer DeFi lending protocols.", rating: 3.9, risk_level: "low", apy: 6.8, tvl: "$2.8B", market_cap: "$380M", website: "https://compound.finance", tags: ["Lending", "DeFi", "Ethereum"], is_recommended: false, trending: false, archived: false, created_at: "2026-04-20T08:07:36.815Z" },
  { id: 8, name: "Pendle", symbol: "PENDLE", category: "Yield", description: "Protocol that tokenizes and trades future yield. Users can lock in fixed APY or speculate on yield rates via principal and yield tokens derived from yield-bearing assets.", rating: 4.2, risk_level: "high", apy: 35.4, tvl: "$430M", market_cap: "$290M", website: "https://pendle.finance", tags: ["Yield", "DeFi", "Ethereum", "Fixed Yield"], is_recommended: true, trending: true, archived: false, created_at: "2026-04-20T08:07:36.815Z" },
  { id: 9, name: "Convex Finance", symbol: "CVX", category: "Yield", description: "Built on top of Curve, Convex allows CRV stakers and Curve LPs to earn boosted rewards without locking CRV directly. Simplifies Curve's complex veCRV mechanics.", rating: 3.8, risk_level: "medium", apy: 16.2, tvl: "$2.3B", market_cap: "$180M", website: "https://convexfinance.com", tags: ["Yield", "Curve", "DeFi", "Ethereum"], is_recommended: false, trending: false, archived: false, created_at: "2026-04-20T08:07:36.815Z" },
  { id: 10, name: "Osmosis", symbol: "OSMO", category: "DEX", description: "Native DEX of the Cosmos ecosystem. Osmosis uses a superfluid staking model enabling LP positions to simultaneously provide liquidity and secure the network.", rating: 4, risk_level: "medium", apy: 28.5, tvl: "$145M", market_cap: "$210M", website: "https://osmosis.zone", tags: ["DEX", "Cosmos", "IBC", "Cross-chain"], is_recommended: false, trending: true, archived: false, created_at: "2026-04-20T08:07:36.815Z" },
  { id: 11, name: "Rocket Pool", symbol: "RPL", category: "Staking", description: "Decentralized Ethereum staking protocol. Node operators can stake 8 ETH (vs 32 ETH native) using RPL as collateral. rETH is the liquid staking token.", rating: 4.3, risk_level: "low", apy: 3.8, tvl: "$2.1B", market_cap: "$410M", website: "https://rocketpool.net", tags: ["Staking", "Ethereum", "Decentralized", "Liquid Staking"], is_recommended: true, trending: false, archived: false, created_at: "2026-04-20T08:07:36.815Z" },
  { id: 12, name: "dYdX", symbol: "DYDX", category: "Derivatives", description: "Leading decentralized derivatives exchange now running as its own Cosmos appchain. Offers perpetual contracts with deep liquidity and institutional-grade features.", rating: 4, risk_level: "high", apy: 19.8, tvl: "$620M", market_cap: "$520M", website: "https://dydx.exchange", tags: ["Derivatives", "Perpetuals", "Cosmos", "Layer1"], is_recommended: false, trending: false, archived: false, created_at: "2026-04-20T08:07:36.815Z" },
  { id: 13, name: "B18 Protocol", symbol: "B18", category: "Vault", description: "采用AAM自动做市与SPP护盘机制的铸造协议。质押/LP双池收益、V1-V10推荐网络、334协议税收机制、动态奖励体系。完整收益模拟器可用。", rating: 4.4, risk_level: "high", apy: 48, tvl: "$8.2M", market_cap: "$12M", website: null, tags: ["Vault", "Minting", "AAM", "SPP", "DeFi"], is_recommended: true, trending: true, archived: true, created_at: "2026-04-20T09:57:41.389Z" },
  { id: 14, name: "Olympus DAO", symbol: "OHM", category: "Vault", description: "Treasury-backed reserve currency protocol. Bonds accept assets at discount for OHM; stakers earn rebase from seigniorage. Floor price = treasury ÷ OHM supply. (3,3) game-theory optimum favors staking.", rating: 3.8, risk_level: "high", apy: 15.2, tvl: "$248M", market_cap: "$186M", website: "https://www.olympusdao.finance", tags: ["Vault", "Treasury", "Rebase", "DeFi", "Ethereum"], is_recommended: false, trending: false, archived: false, created_at: "2026-04-20T09:57:41.389Z" },
  { id: 15, name: "Frax Finance", symbol: "FXS", category: "Vault", description: "分数算法稳定币协议。Collateral Ratio (CR) 动态平衡USDC抵押与算法铸币。AMO策略产生的铸币收益归属FXS质押者。支持frxETH流动性质押与Fraxlend借贷。", rating: 4.1, risk_level: "medium", apy: 18.6, tvl: "$694M", market_cap: "$412M", website: "https://frax.finance", tags: ["Vault", "Stablecoin", "Algorithmic", "DeFi", "Ethereum"], is_recommended: true, trending: true, archived: false, created_at: "2026-04-20T09:57:41.389Z" },
  { id: 16, name: "Liquity Protocol", symbol: "LQTY", category: "Lending", description: "零利率ETH抵押稳定币 (LUSD)。稳定池吸收清算获得抵押品溢价；赎回机制通过套利维持锚定。无治理、无参数调整。稳定池年化收益随市场波动显著变化。", rating: 4.3, risk_level: "low", apy: 22.4, tvl: "$578M", market_cap: "$88M", website: "https://www.liquity.org", tags: ["Lending", "Stablecoin", "Stability Pool", "Ethereum", "DeFi"], is_recommended: false, trending: false, archived: false, created_at: "2026-04-20T09:57:41.389Z" },
  { id: 17, name: "Alchemix Finance", symbol: "ALCX", category: "Yield", description: "Self-repaying loans using vault yield. Borrow up to 50% of collateral as alUSD/alETH — the deposited yield gradually repays debt over time. No liquidations. Transmuter arbitrage enforces 1:1 peg.", rating: 4, risk_level: "medium", apy: 28.3, tvl: "$198M", market_cap: "$74M", website: "https://alchemix.fi", tags: ["Yield", "Self-Repaying", "Lending", "Ethereum", "DeFi"], is_recommended: false, trending: true, archived: false, created_at: "2026-04-20T09:57:41.389Z" },
  { id: 18, name: "MakerDAO", symbol: "MKR", category: "Lending", description: "DeFi始祖抵押债仓协议，铸造DAI稳定币。稳定费率流入盈余缓冲池后回购销毁MKR；DAI储蓄率(DSR)分配利息收益。EndGame升级引入SubDAO与SAGITTARIUS引擎。", rating: 4.5, risk_level: "low", apy: 7.8, tvl: "$8.1B", market_cap: "$1.8B", website: "https://makerdao.com", tags: ["Lending", "Stablecoin", "CDP", "Ethereum", "DeFi"], is_recommended: true, trending: false, archived: false, created_at: "2026-04-20T09:57:41.389Z" },
  { id: 19, name: "Tokemak", symbol: "TOKE", category: "Yield", description: "可持续DeFi流动性反应堆。TOKE持有者将流动性定向到各协议池，存款人赚取TOKE奖励。反应堆tokenomics通过TOKE治理分配全协议流动性，实现协议拥有的流动性。", rating: 3.6, risk_level: "high", apy: 24.1, tvl: "$82M", market_cap: "$45M", website: "https://www.tokemak.xyz", tags: ["Yield", "Liquidity", "Reactor", "Ethereum", "DeFi"], is_recommended: false, trending: false, archived: false, created_at: "2026-04-20T09:57:41.389Z" },
  { id: 20, name: "Reserve Protocol", symbol: "RSR", category: "Vault", description: "无许可超额抵押篮子稳定币协议。RSR质押者为RToken默认风险提供兜底保险，换取收益分成。任何人可部署定制化RToken，含自定义抵押品结构与治理参数。", rating: 3.9, risk_level: "medium", apy: 11.4, tvl: "$177M", market_cap: "$218M", website: "https://reserve.org", tags: ["Vault", "Stablecoin", "Basket", "Ethereum", "DeFi"], is_recommended: false, trending: true, archived: false, created_at: "2026-04-20T09:57:41.389Z" },
  { id: 21, name: "HyperLiquid HLP", symbol: "HYPE", category: "Vault", description: "机构级链上永续合约交易所，HLP金库通过做市、清算和平台手续费多重策略创造稳健收益。", rating: 9, risk_level: "medium", apy: 28.5, tvl: "$374M", market_cap: "$3.2B", website: "https://app.hyperliquid.xyz", tags: ["DEX", "永续合约", "做市策略", "金库"], is_recommended: true, trending: true, archived: false, created_at: "2026-04-20T13:03:24.760Z" },
  { id: 22, name: "LEGEND ATM", symbol: "ATM", category: "Vault", description: "全民做市商市值管理系统。每秒复利非整天结算，三档周期（1/15/30天），月化最高47.3%。LP组成50%U+50%ATM，静态收益65%+动态BUB30%。", rating: 8.5, risk_level: "high", apy: 47.3, tvl: "$80M", market_cap: "$120M", website: "https://legendatm.io", tags: ["做市商", "高收益", "ATM机制", "每秒复利", "Vault"], is_recommended: true, trending: true, archived: false, created_at: "2026-04-20T13:34:42.973Z" },
];

const DRY = process.argv.includes("--dry");
const FORCE = process.argv.includes("--force");

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  const { rows: existing } = await pool.query<{ count: string }>(
    "SELECT count(*)::text FROM public.projects"
  );
  const current = parseInt(existing[0].count, 10);
  console.log(`[seed] current row count: ${current}`);

  if (current > 0 && !FORCE) {
    console.error(`[seed] refusing to seed — table has ${current} rows. Pass --force to proceed.`);
    await pool.end();
    process.exit(1);
  }

  if (DRY) {
    console.log("[seed] DRY RUN — showing first 3 rows, would insert:", rows.length);
    for (const r of rows.slice(0, 3)) console.log(JSON.stringify(r));
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const r of rows) {
      await client.query(
        `INSERT INTO public.projects
          (id, name, symbol, category, description, rating, risk_level, apy, tvl, market_cap, website, tags, is_recommended, trending, archived, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO UPDATE SET
           name=EXCLUDED.name, symbol=EXCLUDED.symbol, category=EXCLUDED.category,
           description=EXCLUDED.description, rating=EXCLUDED.rating, risk_level=EXCLUDED.risk_level,
           apy=EXCLUDED.apy, tvl=EXCLUDED.tvl, market_cap=EXCLUDED.market_cap, website=EXCLUDED.website,
           tags=EXCLUDED.tags, is_recommended=EXCLUDED.is_recommended, trending=EXCLUDED.trending,
           archived=EXCLUDED.archived, created_at=EXCLUDED.created_at`,
        [r.id, r.name, r.symbol, r.category, r.description, r.rating, r.risk_level, r.apy, r.tvl, r.market_cap, r.website, r.tags, r.is_recommended, r.trending, r.archived, r.created_at]
      );
    }
    await client.query(
      "SELECT setval('public.projects_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.projects))"
    );
    await client.query("COMMIT");
    console.log(`[seed] inserted/updated ${rows.length} projects; sequence reset.`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
