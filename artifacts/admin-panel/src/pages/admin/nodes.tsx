import { PageShell, StubBody } from "./page-shell";

export default function NodesPage() {
  return (
    <PageShell title="节点管理" subtitle="Nodes · 5 档节点的售出量、余位与链上配置">
      <StubBody note="M2 will aggregate rune_purchases by nodeId and pull live NodePresell.getNodeConfigs()." />
    </PageShell>
  );
}
