import { PageShell, StubBody } from "./page-shell";

export default function MembersPage() {
  return (
    <PageShell title="会员管理" subtitle="Members · 链上注册会员，含个人持仓与备注">
      <StubBody note="M2 will list rune_members ⨝ rune_purchases via Supabase, with member-note edit." />
    </PageShell>
  );
}
