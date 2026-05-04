import type { Env } from "./types";
import { runTick } from "./tick";

/**
 * RUNE AI bot worker entry. Two ways in:
 *
 *   • scheduled() — Cron Trigger fires every minute (see wrangler.toml).
 *   • fetch()      — manual `curl /tick` for ad-hoc runs / staging.
 *
 * Both call into runTick(); HTTP returns the result as JSON for debugging.
 */
export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      runTick(env, "cron")
        .then((r) => console.log("[tick]", JSON.stringify(r)))
        .catch((err) => console.error("[tick failed]", err)),
    );
  },

  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, chain: env.RUNE_CHAIN });
    }
    if (url.pathname === "/tick") {
      try {
        const result = await runTick(env, "http");
        return Response.json(result);
      } catch (err) {
        return Response.json(
          { ok: false, error: (err as Error).message ?? String(err) },
          { status: 500 },
        );
      }
    }
    return new Response("rune-ai-bot — POST /tick to run on demand", { status: 200 });
  },
};
