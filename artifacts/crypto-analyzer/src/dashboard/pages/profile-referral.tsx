import { useActiveAccount } from "thirdweb/react";
import { TeamTab } from "@/pages/dashboard";

/**
 * 推广中心 page — directly reuses RUNE dashboard's TeamTab. Pulls
 * downline tree from rune_referrers and renders the focused-wallet
 * drill-down already wired into mainnet.
 */
export default function ProfileReferral() {
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
      <TeamTab address={address} />
    </div>
  );
}
