import { PageShell, StubBody } from "./page-shell";

export default function ContractsPage() {
  return (
    <PageShell
      title="合约管理"
      subtitle="Contracts · 链上合约状态 + system_config 参数 + 规范-合约差距高亮"
    >
      <StubBody note="M3 will read Community/NodePresell live (owner/paused/configs), edit system_config rows, and surface spec-vs-contract gaps from 规范-合约对照差距.md." />
    </PageShell>
  );
}
