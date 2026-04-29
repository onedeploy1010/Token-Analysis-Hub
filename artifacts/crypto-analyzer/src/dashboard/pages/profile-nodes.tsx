import { useActiveAccount } from "thirdweb/react";
import { OverviewTab } from "@/pages/dashboard";

/**
 * 节点 page — directly reuses RUNE dashboard's OverviewTab. Same data
 * sources (rune_purchases / rune_referrers / etc.), same amber theme,
 * same components — no separate UI to maintain. The original 1356-line
 * TAICLAW implementation lives in git history.
 */
export default function ProfileNodes() {
  const account = useActiveAccount();
  const address = account?.address;
  if (!address) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
        请先连接钱包
      </div>
    );
  }
  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-6xl">
      <OverviewTab address={address} />
    </div>
  );
}
