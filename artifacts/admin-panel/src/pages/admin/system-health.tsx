import { PageShell, StubBody } from "./page-shell";

export default function SystemHealthPage() {
  return (
    <PageShell
      title="环境检查"
      subtitle="System Health · indexer 滞后 / RPC 健康 / DB 容量 / Telegram 告警"
    >
      <StubBody note="M4 will live-poll rune_indexer_state lag, RPC head time, Supabase row counts, and let admins configure Telegram bot alert thresholds (read from system_config indexer.lag*Seconds)." />
    </PageShell>
  );
}
