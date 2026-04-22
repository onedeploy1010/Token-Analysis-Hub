import { useQuery } from "@tanstack/react-query";
import { gql } from "graphql-request";
import { graphqlClient } from "@/lib/graphql/client";

// ── GraphQL shapes (mirror the server-side Pothos types) ────────────────────
export interface ReferrerRow {
  user: string;
  referrer: string;
  boundAt: string;
  blockNumber: number;
  txHash: string;
}

export interface PurchaseRow {
  user: string;
  nodeId: number;
  amount: string;
  paidAt: string;
  txHash: string;
}

export interface PersonalStats {
  address: string;
  chainId: number;
  directCount: number;
  totalDownstreamCount: number;
  directPurchaseCount: number;
  directTotalInvested: string;
  totalDownstreamInvested: string;
  hasPurchased: boolean;
  ownedNodeId: number | null;
}

// ── Queries ─────────────────────────────────────────────────────────────────

const TEAM_QUERY = gql`
  query Team($address: Address!, $limit: Int, $offset: Int) {
    team(address: $address, limit: $limit, offset: $offset) {
      user
      referrer
      boundAt
      blockNumber
      txHash
    }
  }
`;

const PERSONAL_STATS_QUERY = gql`
  query PersonalStats($address: Address!) {
    personalStats(address: $address) {
      address
      chainId
      directCount
      totalDownstreamCount
      directPurchaseCount
      directTotalInvested
      totalDownstreamInvested
      hasPurchased
      ownedNodeId
    }
  }
`;

const PURCHASES_QUERY = gql`
  query UserPurchases($user: Address!) {
    purchases(user: $user, limit: 50) {
      user
      nodeId
      amount
      paidAt
      txHash
    }
  }
`;

// ── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Shared react-query options for the GraphQL hooks below.
 *
 * The indexer endpoint lives on the api-server; if the server hasn't been
 * redeployed with the GraphQL/indexer code yet, every query 404s. Default
 * react-query behaviour would then retry each call 3× with backoff on
 * every render / focus / reconnect — fills the console with `POST …
 * /api/graphql 404` and pins the network tab.
 *
 * Gate with `retry: false` so a single 404 is enough to surface an empty
 * state, and extend the stale window so navigating between tabs doesn't
 * hammer the endpoint.
 */
const graphqlQueryOpts = {
  retry: false as const,
  staleTime: 60_000,
  refetchOnWindowFocus: false,
};

/**
 * Direct downstream of an address (one hop). Use for the Team tab's top
 * level — recursion is handled by rendering children recursively.
 */
export function useTeam(address: string | undefined, opts?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["rune", "team", address, opts?.limit, opts?.offset],
    enabled: !!address,
    ...graphqlQueryOpts,
    queryFn: async () => {
      const data = await graphqlClient.request<{ team: ReferrerRow[] }>(TEAM_QUERY, {
        address,
        limit: opts?.limit ?? 100,
        offset: opts?.offset ?? 0,
      });
      return data.team;
    },
  });
}

/** Aggregate stats for the Overview card. */
export function usePersonalStats(address: string | undefined) {
  return useQuery({
    queryKey: ["rune", "personalStats", address],
    enabled: !!address,
    ...graphqlQueryOpts,
    queryFn: async () => {
      const data = await graphqlClient.request<{ personalStats: PersonalStats }>(
        PERSONAL_STATS_QUERY,
        { address },
      );
      return data.personalStats;
    },
  });
}

/** User's on-chain purchase history (single row since each wallet can buy once). */
export function useUserPurchases(address: string | undefined) {
  return useQuery({
    queryKey: ["rune", "purchases", address],
    enabled: !!address,
    ...graphqlQueryOpts,
    queryFn: async () => {
      const data = await graphqlClient.request<{ purchases: PurchaseRow[] }>(PURCHASES_QUERY, {
        user: address,
      });
      return data.purchases;
    },
  });
}
