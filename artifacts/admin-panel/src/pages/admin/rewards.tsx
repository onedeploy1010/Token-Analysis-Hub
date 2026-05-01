import { PageShell, StubBody } from "./page-shell";

export default function RewardsPage() {
  return (
    <PageShell title="奖励管理" subtitle="Rewards · 直推返佣明细 + V 级团队 dry-run">
      <StubBody note="M3 will derive direct commission per purchase + run compute_v_level / compute_team_commission Postgres functions for V-level dry-run." />
    </PageShell>
  );
}
