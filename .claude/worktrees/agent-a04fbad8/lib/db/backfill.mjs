/**
 * One-shot backfill for EventAddReferrer rows that pre-date the indexer's
 * scan window. Pulls tx receipts + block headers from an RPC that still
 * has them (bscscan-testnet mirror, Binance full nodes, etc.) and upserts
 * into rune_referrers via the same unique constraint the indexer uses,
 * so rerunning is idempotent.
 */
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
const RPC = process.env.BACKFILL_RPC ?? "https://data-seed-prebsc-1-s1.binance.org:8545";
const CHAIN_ID = 97;
const COMMUNITY = "0x42a06ac2208e9f8e25673ba0f6c44bc56fd2aa62";

if (!DATABASE_URL) throw new Error("DATABASE_URL missing");

// Two known historical bindings the user wants preserved.
const TX_HASHES = [
  "0x4579c40d3969fd8fe70397bf137cd845978a7d124f1b9935318b04ead64a295f",
  "0x2eff1d5b0ee7ede6aa0ca2ee76f1ebdc01fd85ea276e58c277ac829e944773fc",
];

const EVENT_TOPIC = "0x157b268685d829d4f87954a5cdff3fa1ff418e739340bfa3a2018f95702ab8ae";

async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
  });
  const j = await res.json();
  if (j.error) throw new Error(`${method}: ${j.error.message}`);
  return j.result;
}

function topicToAddress(t) {
  // topics are 32-byte padded; address is the last 20 bytes.
  return "0x" + t.slice(-40).toLowerCase();
}

function dataToAddress(d) {
  return "0x" + d.slice(-40).toLowerCase();
}

const rows = [];
for (const txHash of TX_HASHES) {
  const rcpt = await rpc("eth_getTransactionReceipt", [txHash]);
  if (!rcpt) throw new Error(`receipt not found: ${txHash}`);
  if (rcpt.status !== "0x1") throw new Error(`tx reverted: ${txHash}`);

  const block = await rpc("eth_getBlockByNumber", [rcpt.blockNumber, false]);
  const boundAt = new Date(parseInt(block.timestamp, 16) * 1000);

  for (const log of rcpt.logs) {
    if (log.address.toLowerCase() !== COMMUNITY) continue;
    if (log.topics[0] !== EVENT_TOPIC) continue;

    rows.push({
      user:        topicToAddress(log.topics[1]),
      referrer:    dataToAddress(log.data),
      chainId:     CHAIN_ID,
      blockNumber: parseInt(log.blockNumber, 16),
      txHash:      log.transactionHash,
      logIndex:    parseInt(log.logIndex, 16),
      boundAt,
    });
  }
}

console.log("extracted rows from chain:");
console.table(rows.map((r) => ({ ...r, boundAt: r.boundAt.toISOString() })));

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

// `user` is a reserved keyword in Postgres — must be double-quoted.
const sql = `
  INSERT INTO rune_referrers
    ("user", referrer, chain_id, block_number, tx_hash, log_index, bound_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  ON CONFLICT (chain_id, tx_hash, log_index) DO NOTHING
`;

let inserted = 0;
for (const r of rows) {
  const res = await client.query(sql, [r.user, r.referrer, r.chainId, r.blockNumber, r.txHash, r.logIndex, r.boundAt]);
  inserted += res.rowCount;
}

await client.end();
console.log(`\ndone. inserted ${inserted} / ${rows.length} rows (rest were already present).`);
