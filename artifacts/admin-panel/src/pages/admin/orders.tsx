import { PageShell, StubBody } from "./page-shell";

export default function OrdersPage() {
  return (
    <PageShell title="订单管理" subtitle="Orders · 节点购买订单（链上事件即真实唯一来源）">
      <StubBody note="M2 will paginate rune_purchases with filters: nodeId, date range, address." />
    </PageShell>
  );
}
