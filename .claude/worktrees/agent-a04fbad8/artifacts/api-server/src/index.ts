import app from "./app";
import { logger } from "./lib/logger";
import { seedAdminUser } from "./lib/seedAdmin.js";
import { startHyperliquidCron } from "./routes/hyperliquid.js";
import { startRuneIndexer } from "./indexer/rune-indexer.js";
import { getDirectRateMap } from "./rune/node-rates.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  await seedAdminUser();
  startHyperliquidCron();
  startRuneIndexer();
  // Warm the directRate cache so the first personalStats query doesn't
  // pay the RPC round-trip. Swallow errors — the resolver falls back to
  // the doc defaults if this ever fails.
  void getDirectRateMap().catch(() => {});
});
