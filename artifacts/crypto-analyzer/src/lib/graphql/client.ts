import { GraphQLClient } from "graphql-request";

/**
 * Resolve the api-server origin. Order of precedence:
 *   1. VITE_API_BASE_URL env var (explicit — use for hybrid deploys,
 *      e.g. Cloudflare Pages frontend + Replit api-server).
 *   2. Same-origin relative path (when the frontend and api-server
 *      share a URL, the common Replit-side layout).
 */
const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export const GRAPHQL_ENDPOINT = `${apiBase}/api/graphql`;

/**
 * Shared GraphQL request client. Caller sites wrap in react-query so
 * retries / caching / invalidation stay consistent with the REST hooks.
 */
export const graphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT, {
  // Cross-origin requests need credentials: "omit" unless the user is
  // signed in as admin — the public team/stats queries don't require auth.
  credentials: "omit",
});
