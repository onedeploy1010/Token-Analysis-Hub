import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { useTranslation } from "react-i18next";
import { OverviewTab } from "@/pages/dashboard";
import { Server, Coins } from "lucide-react";
import { DashboardSubTabs } from "@dashboard/components/dashboard-sub-tabs";
import { NodeRewardsPanel } from "@dashboard/components/nodes/node-rewards-panel";

type Sub = "overview" | "rewards";

const TABS = [
  { key: "overview" as const, icon: Server, labelKey: "profile.nodeOverview", fallback: "Overview" },
  { key: "rewards" as const,  icon: Coins,  labelKey: "profile.nodeRewards.title",  fallback: "Rewards" },
];

/**
 * 节点中心 — RUNE OverviewTab (per-tier nodes + invite link) plus a
 * Rewards sub-tab driven by NodeRewardsPanel (per-wallet on-chain
 * `rune_purchases` aggregated into tier breakdown + projected daily
 * yield + cumulative deposit timeline).
 */
export default function ProfileNodes() {
  const account = useActiveAccount();
  const address = account?.address;
  const { t } = useTranslation();
  const [sub, setSub] = useState<Sub>("overview");

  if (!address) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
        {t("common.connectWallet", "请先连接钱包")}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">
      <div className="mb-4">
        <DashboardSubTabs tabs={TABS} active={sub} onChange={setSub} testIdPrefix="tab-nodes" />
      </div>
      {sub === "overview" ? <OverviewTab address={address} /> : <NodeRewardsPanel />}
    </div>
  );
}
