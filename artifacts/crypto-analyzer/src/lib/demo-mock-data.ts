import type { PersonalStats, ReferrerRow, RewardRow } from "@/hooks/rune/use-team";
import type { NodeId } from "@/lib/thirdweb/contracts";

/** Realistic mock data shown in demo mode so the dashboard looks fully populated. */

export const DEMO_ADDRESS = "0xc8d0ab0b4e4d52a2f0ce920c43067973bee8f7ec";
export const DEMO_REFERRER = "0x0000000000000000000000000000000000000001"; // ROOT

/** Mock personal stats — varies by the simulated node tier. */
export function getMockPersonalStats(nodeId: NodeId): PersonalStats {
  const multiplier = nodeId === 101 ? 8 : nodeId === 201 ? 4 : nodeId === 301 ? 2 : nodeId === 401 ? 1.2 : 1;
  return {
    address: DEMO_ADDRESS,
    chainId: 56,
    directCount: Math.round(12 * multiplier),
    totalDownstreamCount: Math.round(58 * multiplier),
    directPurchaseCount: Math.round(9 * multiplier),
    directTotalInvested: String(BigInt(Math.round(28000 * multiplier)) * 10n ** 6n),
    totalDownstreamInvested: String(BigInt(Math.round(142000 * multiplier)) * 10n ** 6n),
    directCommission: String(BigInt(Math.round(4200 * multiplier)) * 10n ** 18n),
    teamCommission: String(BigInt(Math.round(18600 * multiplier)) * 10n ** 18n),
    directByTier: [
      { nodeId: 101, count: nodeId <= 101 ? 1 : 0 },
      { nodeId: 201, count: Math.round(1 * multiplier) },
      { nodeId: 301, count: Math.round(2 * multiplier) },
      { nodeId: 401, count: Math.round(3 * multiplier) },
      { nodeId: 501, count: Math.round(5 * multiplier) },
    ],
    teamByTier: [
      { nodeId: 101, count: nodeId <= 101 ? 2 : 0 },
      { nodeId: 201, count: Math.round(3 * multiplier) },
      { nodeId: 301, count: Math.round(7 * multiplier) },
      { nodeId: 401, count: Math.round(14 * multiplier) },
      { nodeId: 501, count: Math.round(32 * multiplier) },
    ],
    hasPurchased: true,
    ownedNodeId: nodeId,
  };
}

/** Mock team — a dozen wallets as direct downlines. */
export function getMockTeam(nodeId: NodeId): ReferrerRow[] {
  const count = nodeId === 101 ? 12 : nodeId === 201 ? 8 : nodeId === 301 ? 5 : nodeId === 401 ? 4 : 3;
  const demoWallets = [
    "0x3b4a9f2e8c1d6a5b7e0c4d2f9a3b8e1c5d7f0a2",
    "0xa1b2c3d4e5f6789012345678901234567890abcd",
    "0x9876543210fedcba9876543210fedcba98765432",
    "0xdeadbeefcafebabe12345678deadbeefcafebabe",
    "0x1111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222",
    "0x3333333333333333333333333333333333333333",
    "0x4444444444444444444444444444444444444444",
    "0x5555555555555555555555555555555555555555",
    "0x6666666666666666666666666666666666666666",
    "0x7777777777777777777777777777777777777777",
    "0x8888888888888888888888888888888888888888",
  ];
  return demoWallets.slice(0, count).map((addr, i) => ({
    user: addr,
    referrer: DEMO_ADDRESS,
    boundAt: new Date(Date.now() - (i + 1) * 3 * 24 * 60 * 60 * 1000).toISOString(),
    blockNumber: 47_200_000 + i * 1000,
    txHash: `0x${"a".repeat(63)}${i}`,
  }));
}

const TIER_PRICE_WEI: Record<NodeId, string> = {
  101: String(50000n * 10n ** 6n),
  201: String(10000n * 10n ** 6n),
  301: String(5000n * 10n ** 6n),
  401: String(2500n * 10n ** 6n),
  501: String(1000n * 10n ** 6n),
};

const DIRECT_RATE: Record<NodeId, number> = {
  101: 1500,
  201: 1200,
  301: 1000,
  401: 800,
  501: 500,
};

/** Mock rewards — commissions earned from direct referrals purchasing nodes. */
export function getMockRewards(nodeId: NodeId): RewardRow[] {
  const team = getMockTeam(nodeId);
  const tiers: NodeId[] = [501, 401, 301, 201, 101, 501, 401, 501, 301, 501, 401, 201];
  return team.map((member, i) => {
    const memberTier = tiers[i % tiers.length] as NodeId;
    const amount = BigInt(TIER_PRICE_WEI[memberTier]);
    const rate = DIRECT_RATE[memberTier];
    const commission = String(amount * BigInt(rate) / 10000n);
    return {
      downline: member.user,
      nodeId: memberTier,
      purchaseAmount: TIER_PRICE_WEI[memberTier],
      directRate: rate,
      commission,
      paidAt: member.boundAt,
      blockNumber: member.blockNumber + 5,
      txHash: `0x${"b".repeat(63)}${i}`,
      chainId: 56,
    };
  });
}
