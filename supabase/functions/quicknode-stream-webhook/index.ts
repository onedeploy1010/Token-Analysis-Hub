/**
 * QuickNode Streams → Supabase webhook receiver.
 *
 * QuickNode pushes a JSON array of log objects (filtered + projected by the
 * Stream's customize-payload script — see `runeapi 3/QuickNode-Streams-配置.md`).
 * This function:
 *   1. Verifies the HMAC signature in `x-qn-signature` against
 *      `QUICKNODE_WEBHOOK_SECRET` env var (set per Stream).
 *   2. Decodes EventAddReferrer / EventNodePresell topics + data with viem.
 *   3. UPSERTs into rune_referrers / rune_members / rune_purchases — same
 *      idempotency keys as the in-process indexer (chainId + txHash + logIndex)
 *      so this can run alongside the WSS subscriber without dupes.
 *
 * Both mainnet (project mefjuecwawmjfmeofnck) and testnet (tqexhkajljyecsacmyyy)
 * deploy this function with their own QUICKNODE_WEBHOOK_SECRET secret.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";
import { decodeEventLog, parseAbiItem } from "https://esm.sh/viem@2.21.40";

const eventAddReferrer = parseAbiItem(
  "event EventAddReferrer(address indexed user, address referrer)",
);
const eventNodePresell = parseAbiItem(
  "event EventNodePresell(address indexed user, address payToken, uint256 amount, uint256 time, uint256 num, uint256 nodeId)",
);

const TOPIC_REFERRER = "0x157b268685d829d4f87954a5cdff3fa1ff418e739340bfa3a2018f95702ab8ae";
const TOPIC_PRESELL  = "0xdd5bb7eb1e6147197d4e5df191bab7769c7da72136a330645918bbd80d4d4737";

interface IncomingLog {
  chainId: number;
  blockNumber: string | number;
  blockTimestamp: string | number;
  txHash: string;
  logIndex: string | number;
  address: string;
  topics: string[];
  data: string;
}

const lc = (s: string) => s.toLowerCase();

function asNum(v: string | number): number {
  if (typeof v === "number") return v;
  return v.startsWith("0x") ? parseInt(v, 16) : parseInt(v, 10);
}

function asDate(v: string | number): Date {
  // QuickNode block timestamp is a Unix-seconds hex string
  return new Date(asNum(v) * 1000);
}

/** Constant-time HMAC compare. */
function verifyHmac(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const computed = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (computed.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const secret = Deno.env.get("QUICKNODE_WEBHOOK_SECRET");
  if (!secret) {
    return new Response("server misconfigured: missing secret", { status: 500 });
  }

  const rawBody = await req.text();
  // QuickNode sends signature as `x-qn-signature` (hex sha256 HMAC of body).
  const sig = req.headers.get("x-qn-signature");
  if (!verifyHmac(rawBody, sig, secret)) {
    return new Response("invalid signature", { status: 401 });
  }

  let payload: IncomingLog[] | { data?: IncomingLog[] };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("invalid json", { status: 400 });
  }
  // Streams may wrap in `{ data: [...] }` if batching is on. Accept both.
  const logs: IncomingLog[] = Array.isArray(payload) ? payload : (payload.data ?? []);

  if (logs.length === 0) {
    return new Response("ok (no logs)", { status: 200 });
  }

  // Use service-role key so RLS doesn't block writes from the webhook.
  // Service role is auto-injected as `SUPABASE_SERVICE_ROLE_KEY` in Edge runtime.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const referrerRows: Record<string, unknown>[] = [];
  const memberRows:   Record<string, unknown>[] = [];
  const purchaseRows: Record<string, unknown>[] = [];

  let skipped = 0;
  for (const log of logs) {
    try {
      const topic0 = lc(log.topics?.[0] ?? "");
      const chainId = log.chainId;
      const blockNumber = asNum(log.blockNumber);
      const txHash = log.txHash;
      const logIndex = asNum(log.logIndex);
      const boundAt = asDate(log.blockTimestamp);

      if (topic0 === TOPIC_REFERRER) {
        const decoded = decodeEventLog({
          abi: [eventAddReferrer],
          data: log.data as `0x${string}`,
          topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
        });
        const user = lc(decoded.args.user);
        const referrer = lc(decoded.args.referrer);
        referrerRows.push({
          user, referrer, chain_id: chainId, block_number: blockNumber,
          tx_hash: txHash, log_index: logIndex, bound_at: boundAt.toISOString(),
        });
        memberRows.push({ user, chain_id: chainId, bound_at: boundAt.toISOString() });
      } else if (topic0 === TOPIC_PRESELL) {
        const decoded = decodeEventLog({
          abi: [eventNodePresell],
          data: log.data as `0x${string}`,
          topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
        });
        purchaseRows.push({
          user: lc(decoded.args.user),
          node_id: Number(decoded.args.nodeId),
          pay_token: lc(decoded.args.payToken),
          amount: String(decoded.args.amount),
          paid_at: new Date(Number(decoded.args.time) * 1000).toISOString(),
          chain_id: chainId,
          block_number: blockNumber,
          tx_hash: txHash,
          log_index: logIndex,
        });
      } else {
        skipped++;
      }
    } catch (err) {
      console.error("[qn-webhook] decode failed", err, log);
      skipped++;
    }
  }

  // Upsert via Supabase REST. `onConflict` matches the unique indexes
  // declared in the Drizzle schema so re-delivery from QuickNode is safe.
  const errors: string[] = [];

  if (referrerRows.length > 0) {
    const { error } = await supabase
      .from("rune_referrers")
      .upsert(referrerRows, { onConflict: "chain_id,tx_hash,log_index", ignoreDuplicates: true });
    if (error) errors.push(`rune_referrers: ${error.message}`);
  }
  if (memberRows.length > 0) {
    const { error } = await supabase
      .from("rune_members")
      .upsert(memberRows, { onConflict: "user,chain_id", ignoreDuplicates: true });
    if (error) errors.push(`rune_members: ${error.message}`);
  }
  if (purchaseRows.length > 0) {
    const { error } = await supabase
      .from("rune_purchases")
      .upsert(purchaseRows, { onConflict: "chain_id,tx_hash,log_index", ignoreDuplicates: true });
    if (error) errors.push(`rune_purchases: ${error.message}`);
  }

  if (errors.length > 0) {
    console.error("[qn-webhook] insert errors", errors);
    return new Response(JSON.stringify({ errors }), { status: 500, headers: { "content-type": "application/json" } });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      ingested: { referrers: referrerRows.length, members: memberRows.length, purchases: purchaseRows.length },
      skipped,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
});
