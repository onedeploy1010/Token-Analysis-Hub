import { PageShell, StubBody } from "./page-shell";

export default function DashboardPage() {
  return (
    <PageShell title="仪表盘" subtitle="Overview · 总会员 · 总订单 · 总入金 · 当日新增 · 索引器状态">
      <StubBody note="M2 will compose StatsCard grids from rune_members / rune_purchases counts and surface indexer health on top." />
    </PageShell>
  );
}
