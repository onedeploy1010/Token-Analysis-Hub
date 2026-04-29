import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { useTranslation } from "react-i18next";
import { TeamTab, RewardsTab } from "@/pages/dashboard";
import { Users, Gift } from "lucide-react";
import { DashboardSubTabs } from "@dashboard/components/dashboard-sub-tabs";
import { PageEnter } from "@dashboard/components/page-enter";

type Sub = "team" | "rewards";

const TABS = [
  { key: "team" as const,    icon: Users, labelKey: "profile.referralOverview", fallback: "Overview" },
  { key: "rewards" as const, icon: Gift,  labelKey: "profile.referralRewards",  fallback: "Rewards" },
];

/**
 * 推广中心 — TeamTab (downline tree) + RewardsTab (commission list/chart)
 * stitched into one page with the shared `DashboardSubTabs` pill row so
 * the in-page tab style matches Vault and Nodes exactly.
 */
export default function ProfileReferral() {
  const account = useActiveAccount();
  const address = account?.address;
  const { t } = useTranslation();
  const [sub, setSub] = useState<Sub>("team");

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
          <DashboardSubTabs tabs={TABS} active={sub} onChange={setSub} testIdPrefix="tab-referral" />
        </div>
        {sub === "team" ? <TeamTab address={address} /> : <RewardsTab address={address} />}
      </div>
    </PageEnter>
  );
}
