import { PageShell, StubBody } from "./page-shell";

export default function ReferralsPage() {
  return (
    <PageShell title="推荐管理" subtitle="Referrals · 上下级关系树，按地址追溯">
      <StubBody note="M2 will render a recursive tree from rune_referrers, lazy-load children on expand." />
    </PageShell>
  );
}
