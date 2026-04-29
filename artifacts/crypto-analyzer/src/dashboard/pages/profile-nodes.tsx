import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { useTranslation } from "react-i18next";
import { OverviewTab, RewardsTab } from "@/pages/dashboard";
import { Server, Gift } from "lucide-react";
import { DashboardSubTabs } from "@dashboard/components/dashboard-sub-tabs";
import { PageEnter } from "@dashboard/components/page-enter";

type Sub = "overview" | "rewards";

const TABS = [
  { key: "overview" as const, icon: Server, labelKey: "profile.nodeOverview",       fallback: "Overview" },
  { key: "rewards" as const,  icon: Gift,   labelKey: "profile.nodeRewards.title",  fallback: "Rewards" },
];

/**
 * 节点中心 — Overview (RUNE OverviewTab) + Rewards. RUNE nodes pay no
 * daily yield; the only earning is the on-chain direct-referral
 * commission, which is exactly what RewardsTab already surfaces on the
 * referral page. Same data, same component — just exposed here too so
 * "node rewards" reads as the same thing in both places.
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
    <PageEnter>
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">
        <div className="mb-4">
          <DashboardSubTabs tabs={TABS} active={sub} onChange={setSub} testIdPrefix="tab-nodes" />
        </div>
        {sub === "overview" ? <OverviewTab address={address} /> : <RewardsTab address={address} />}
      </div>
    </PageEnter>
  );
}
