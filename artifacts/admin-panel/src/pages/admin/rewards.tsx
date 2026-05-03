import { useEffect, useMemo, useState } from "react";
import { PageShell } from "./page-shell";
import { StatsCard } from "@/components/stats-card";
import { MobileDataCard } from "@/components/mobile-card";
import { supabase, adminChainId, fmtUsdt18 } from "@/lib/supabase";
import { AddressButton } from "@/components/member-detail";
import { TagChipsForAddress } from "@/components/tags/tag-chip";
import { TagFilter, useTagAddressFilter } from "@/components/tags/tag-filter";
import {
  Loader2, Gift, Coins, Users, Search, Trophy, Network, Megaphone,
  Wallet,
} from "lucide-react";

/**
 * 奖励管理 — 5 tabs covering every reward channel in the spec
 * (RUNE_全面技术说明文档.md):
 *   • 节点直推 (USDT)         — live; rune_purchases × node_tiers.directRate
 *   • 质押直推 (EMBER 等值)   — placeholder; staking contract not yet on-chain
 *   • V 级团队 (USDT/EMBER)   — placeholder; renders V1-V9 rules from
 *                                system_config.v_level_rules so admins can
 *                                see the qualification ladder while waiting
 *                                for compute_v_level() Postgres function
 *   • 布道 (晋级凭据)         — live; direct + recursive team headcount per
 *                                referrer (used for V-level qualification)
 *   • 持仓拨出 (EMBER 等值)   — placeholder; veRUNE-weighted snapshot reward
 */

type Tab = "node-direct" | "stake-direct" | "v-team" | "evangelist" | "holding";

const ROOT = "0x0000000000000000000000000000000000000001";

const TIERS: Record<number, { name: string; price: number; rate: number; color: string }> = {
  101: { name: "联创·符主",  price: 50_000, rate: 15, color: "#c084fc" },
  201: { name: "超级·符魂",  price: 10_000, rate: 12, color: "#fbbf24" },
  301: { name: "高级·符印",  price:  5_000, rate: 10, color: "#34d399" },
  401: { name: "中级·符源",  price:  2_500, rate:  8, color: "#60a5fa" },
  501: { name: "初级·符胚",  price:  1_000, rate:  5, color: "#cbd5e1" },
};

interface PurchaseRow { user: string; nodeId: number; amountRaw: string; paidAt: string; txHash: string; }
interface ReferrerStat {
  referrer: string;
  buyersCount: number;
  totalInflowUsdtRaw: bigint;
  totalDirectRewardRaw: bigint;
  lastPaidAt: string | null;
}

export default function RewardsPage() {
  const [tab, setTab] = useState<Tab>("node-direct");
  const [purchases, setPurchases] = useState<PurchaseRow[] | null>(null);
  const [referrerOf, setReferrerOf] = useState<Map<string, string> | null>(null);
  const [vRules, setVRules] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [p, r, vr] = await Promise.all([
          supabase
            .from("rune_purchases")
            .select("user, node_id, amount::text, paid_at, tx_hash")
            .eq("chain_id", adminChainId)
            .order("paid_at", { ascending: false })
            .limit(5000),
          supabase
            .from("rune_referrers")
            .select("user, referrer")
            .eq("chain_id", adminChainId),
          supabase
            .from("system_config")
            .select("value")
            .eq("namespace", "rune")
            .eq("key", "v_level_rules")
            .maybeSingle(),
        ]);
        if (p.error) throw new Error(p.error.message);
        if (r.error) throw new Error(r.error.message);
        setPurchases((p.data ?? []).map((row: any) => ({
          user: row.user, nodeId: row.node_id, amountRaw: row.amount,
          paidAt: row.paid_at, txHash: row.tx_hash,
        })));
        const refMap = new Map<string, string>();
        for (const row of r.data ?? []) refMap.set((row as any).user, (row as any).referrer);
        setReferrerOf(refMap);
        const vv = vr.data?.value;
        setVRules(Array.isArray(vv) ? vv : []);
      } catch (e: any) {
        setError(e?.message ?? "加载失败");
      }
    })();
  }, []);

  const isLoading = !purchases || !referrerOf;

  return (
    <PageShell
      title="奖励管理"
      subtitle={`Rewards · chain ${adminChainId} · 节点 USDT + 质押 EMBER 双货币`}
    >
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          {error}
        </div>
      )}

      <Tabs tab={tab} onChange={setTab} />

      <div className="mt-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> 加载中…
          </div>
        ) : (
          <>
            {tab === "node-direct"  && <NodeDirectTab purchases={purchases!} referrerOf={referrerOf!} />}
            {tab === "stake-direct" && <StakeDirectTab />}
            {tab === "v-team"       && <VTeamTab rules={vRules ?? []} />}
            {tab === "evangelist"   && <EvangelistTab referrerOf={referrerOf!} />}
            {tab === "holding"      && <HoldingTab />}
          </>
        )}
      </div>
    </PageShell>
  );
}

function Tabs({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const items: Array<{ key: Tab; label: string; icon: typeof Gift; coin: "USDT" | "EMBER" | "—"; live: boolean }> = [
    { key: "node-direct",  label: "节点直推",  icon: Coins,     coin: "USDT",  live: true  },
    { key: "stake-direct", label: "质押直推",  icon: Gift,      coin: "EMBER", live: false },
    { key: "v-team",       label: "V 级团队", icon: Network,   coin: "EMBER", live: false },
    { key: "evangelist",   label: "布道",      icon: Megaphone, coin: "—",     live: true  },
    { key: "holding",      label: "持仓拨出",  icon: Wallet,    coin: "EMBER", live: false },
  ];
  return (
    <div className="flex gap-1 overflow-x-auto rounded-lg border border-border/60 bg-card/40 p-1">
      {items.map((it) => {
        const active = tab === it.key;
        const Icon = it.icon;
        return (
          <button
            key={it.key}
            onClick={() => onChange(it.key)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{it.label}</span>
            {it.coin !== "—" && (
              <span className={`ml-1 text-[9px] px-1 rounded font-bold ${
                it.coin === "USDT" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-300"
              }`}>{it.coin}</span>
            )}
            {!it.live && <span className="ml-1 text-[9px] px-1 rounded font-bold bg-muted/30 text-muted-foreground">TBD</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ───────── 节点直推 ───────── */

function NodeDirectTab({
  purchases, referrerOf,
}: { purchases: PurchaseRow[]; referrerOf: Map<string, string> }) {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<number[]>([]);
  const tagPredicate = useTagAddressFilter(tagFilter);

  const stats = useMemo<ReferrerStat[]>(() => {
    const acc = new Map<string, ReferrerStat>();
    for (const p of purchases) {
      const ref = referrerOf.get(p.user);
      if (!ref || ref === ROOT) continue;
      const ratePct = TIERS[p.nodeId]?.rate ?? 0;
      const amountRaw = BigInt(p.amountRaw);
      const rewardRaw = (amountRaw * BigInt(ratePct * 100)) / 10_000n;
      const cur = acc.get(ref) ?? {
        referrer: ref, buyersCount: 0, totalInflowUsdtRaw: 0n, totalDirectRewardRaw: 0n, lastPaidAt: null,
      };
      cur.buyersCount += 1;
      cur.totalInflowUsdtRaw += amountRaw;
      cur.totalDirectRewardRaw += rewardRaw;
      if (!cur.lastPaidAt || p.paidAt > cur.lastPaidAt) cur.lastPaidAt = p.paidAt;
      acc.set(ref, cur);
    }
    return Array.from(acc.values()).sort((a, b) =>
      a.totalDirectRewardRaw > b.totalDirectRewardRaw ? -1 : a.totalDirectRewardRaw < b.totalDirectRewardRaw ? 1 : 0,
    );
  }, [purchases, referrerOf]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stats.filter((s) =>
      (!q || s.referrer.toLowerCase().includes(q)) && tagPredicate(s.referrer),
    );
  }, [stats, search, tagPredicate]);

  const totalInflow = filtered.reduce((acc, s) => acc + s.totalInflowUsdtRaw, 0n);
  const totalReward = filtered.reduce((acc, s) => acc + s.totalDirectRewardRaw, 0n);

  return (
    <>
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-foreground">5 档节点直推比例</h3>
          <span className="ml-auto text-[11px] text-muted-foreground">
            来源 system_config.node_tiers · USDT 直发
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          {Object.entries(TIERS).map(([id, m]) => (
            <div key={id} className="rounded-lg border border-border/40 bg-card/30 px-3 py-2">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-xs" style={{ color: m.color }}>{id}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">{m.price.toLocaleString()} U</span>
              </div>
              <div className="text-[10px] text-muted-foreground truncate">{m.name}</div>
              <div className="mt-1 text-base font-bold tabular-nums" style={{ color: m.color }}>{m.rate}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <StatsCard title="累计推广入金 USDT" value={fmtUsdt18(totalInflow.toString(), 0)} subtitle="筛选后" icon={Coins} color="#60a5fa" />
        <StatsCard title="累计直推奖励 USDT" value={fmtUsdt18(totalReward.toString(), 2)} subtitle={`${pctOf(totalReward, totalInflow)}% of inflow`} icon={Gift} color="#fbbf24" />
        <StatsCard title="推荐人数" value={filtered.length} subtitle="发出过奖励的地址" icon={Users} color="#34d399" />
      </div>

      <div className="flex items-center gap-2 mb-3 max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="搜推荐人地址 0x… "
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="mb-4">
        <TagFilter selected={tagFilter} onChange={setTagFilter} />
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto rounded-2xl border border-border/60 bg-card/40">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">推荐人 + 标签</th>
              <th className="text-right px-4 py-3">直推数</th>
              <th className="text-right px-4 py-3">推广入金 USDT</th>
              <th className="text-right px-4 py-3">奖励 USDT</th>
              <th className="text-left px-4 py-3">最后入金</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map((s) => (
              <tr key={s.referrer} className="border-t border-border/40 hover:bg-muted/20 align-top">
                <td className="px-4 py-2.5 space-y-1">
                  <AddressButton addr={s.referrer} />
                  <TagChipsForAddress address={s.referrer} compact />
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{s.buyersCount}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{fmtUsdt18(s.totalInflowUsdtRaw.toString(), 0)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-amber-300 font-semibold whitespace-nowrap">
                  {fmtUsdt18(s.totalDirectRewardRaw.toString(), 2)}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {s.lastPaidAt ? new Date(s.lastPaidAt).toLocaleString("sv") : "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">暂无奖励记录</td></tr>
            )}
          </tbody>
        </table>
        {filtered.length > 200 && (
          <p className="px-4 py-2 text-[11px] text-muted-foreground text-center border-t border-border/40">
            仅显示前 200 名 · 共 {filtered.length}
          </p>
        )}
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {filtered.slice(0, 50).map((s) => (
          <MobileDataCard
            key={s.referrer}
            header={
              <div className="flex flex-col gap-1.5">
                <AddressButton addr={s.referrer} />
                <TagChipsForAddress address={s.referrer} compact />
              </div>
            }
            fields={[
              { label: "直推数", value: String(s.buyersCount) },
              { label: "推广入金", value: `${fmtUsdt18(s.totalInflowUsdtRaw.toString(), 0)} U` },
              { label: "奖励", value: <span className="text-amber-300 font-semibold">{fmtUsdt18(s.totalDirectRewardRaw.toString(), 2)} U</span> },
              { label: "最后入金", value: s.lastPaidAt ? new Date(s.lastPaidAt).toLocaleDateString("sv") : "—" },
            ]}
          />
        ))}
      </div>
    </>
  );
}

/* ───────── 质押直推 ───────── */

function StakeDirectTab() {
  return (
    <Placeholder
      icon={Gift}
      title="质押直推 · EMBER"
      desc="每笔质押入金 → 上级 5% EMBER 等值奖励 + V3 起 1% 平级奖励 + V 级团队差 4–29% + V6/V8/V9 沉淀分红。质押合约尚未上链，落地后此处自动出明细。"
      footer={[
        "结算货币: 等值 EMBER（USDT 价值 → 链上买入 EMBER 注入用户）",
        "数据源: rune_stake_orders（与「订单管理」共享） + system_config.staking_settlement_rule",
      ]}
    />
  );
}

/* ───────── V 级团队 ───────── */

function VTeamTab({ rules }: { rules: any[] }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-amber-300 text-xs leading-relaxed">
        ⏳ V 级动态计算需 Postgres 函数 <code className="bg-black/30 px-1 rounded">compute_v_level()</code>
        + <code className="bg-black/30 px-1 rounded">compute_team_commission()</code> 落地后才能 dry-run。当前展示
        system_config.v_level_rules 中的晋级阈值 + 奖励比例，以便管理员对账。
      </div>

      {rules.length === 0 ? (
        <Placeholder icon={Network} title="V 级规则未配置" desc="system_config.v_level_rules 为空。" footer={[]} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/40">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">等级</th>
                <th className="text-right px-4 py-3">个人入金 USDT</th>
                <th className="text-right px-4 py-3">小区业绩 USDT</th>
                <th className="text-right px-4 py-3">团队人数</th>
                <th className="text-right px-4 py-3">团队奖 %</th>
                <th className="text-left px-4 py-3">附加权益</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r: any, i: number) => (
                <tr key={i} className="border-t border-border/40">
                  <td className="px-4 py-2.5 font-semibold text-amber-300 whitespace-nowrap">{r.level ?? r.name ?? `V${i + 1}`}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.personalUsdt?.toLocaleString?.() ?? r.personal ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.communityUsdt?.toLocaleString?.() ?? r.community ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.teamMembers ?? r.members ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-emerald-400 font-semibold">{r.teamRewardPct ?? r.rewardPct ?? "—"}{r.teamRewardPct != null || r.rewardPct != null ? "%" : ""}</td>
                  <td className="px-4 py-2.5 text-[11px] text-muted-foreground">
                    {r.note ?? r.description ?? r.benefits ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-xl border border-border/40 bg-card/30 p-3 text-[11px] text-muted-foreground leading-relaxed">
        <p className="font-semibold text-foreground mb-1">小区业绩定义（doc 五·2）</p>
        团队总业绩 − 最大组织线业绩 = 小区业绩。直推收益 5%、V3+ 平级 1%、V6 享 V8/V9 沉淀加权、V8/V9 享同级沉淀 5–9% + DAO 治理权。
      </div>
    </div>
  );
}

/* ───────── 布道 ───────── */

function EvangelistTab({ referrerOf }: { referrerOf: Map<string, string> }) {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<number[]>([]);
  const tagPredicate = useTagAddressFilter(tagFilter);

  // Build referrer → direct downlines, then recursively walk to count team
  // size. Iterative BFS so we don't blow stack on long chains.
  const stats = useMemo(() => {
    const directOf = new Map<string, string[]>();
    for (const [user, ref] of referrerOf) {
      if (ref === ROOT) continue;
      const arr = directOf.get(ref) ?? [];
      arr.push(user);
      directOf.set(ref, arr);
    }
    const out: Array<{ referrer: string; direct: number; team: number }> = [];
    for (const ref of directOf.keys()) {
      const directs = directOf.get(ref) ?? [];
      // BFS team count
      const seen = new Set<string>([ref]);
      const queue: string[] = [...directs];
      let team = 0;
      while (queue.length) {
        const cur = queue.shift()!;
        if (seen.has(cur)) continue;
        seen.add(cur); team += 1;
        const next = directOf.get(cur) ?? [];
        for (const n of next) if (!seen.has(n)) queue.push(n);
      }
      out.push({ referrer: ref, direct: directs.length, team });
    }
    return out.sort((a, b) => b.team - a.team || b.direct - a.direct);
  }, [referrerOf]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stats.filter((s) =>
      (!q || s.referrer.toLowerCase().includes(q)) && tagPredicate(s.referrer),
    );
  }, [stats, search, tagPredicate]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="搜推荐人地址 …"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <TagFilter selected={tagFilter} onChange={setTagFilter} />

      <div className="hidden lg:block overflow-x-auto rounded-2xl border border-border/60 bg-card/40">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">推荐人 + 标签</th>
              <th className="text-right px-4 py-3">直推人数</th>
              <th className="text-right px-4 py-3">团队人数（递归）</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map((s) => (
              <tr key={s.referrer} className="border-t border-border/40 hover:bg-muted/20 align-top">
                <td className="px-4 py-2.5 space-y-1">
                  <AddressButton addr={s.referrer} />
                  <TagChipsForAddress address={s.referrer} compact />
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{s.direct}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-amber-300 font-semibold">{s.team}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-12 text-center text-muted-foreground">暂无推荐数据</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden space-y-3">
        {filtered.slice(0, 50).map((s) => (
          <MobileDataCard
            key={s.referrer}
            header={
              <div className="flex flex-col gap-1.5">
                <AddressButton addr={s.referrer} />
                <TagChipsForAddress address={s.referrer} compact />
              </div>
            }
            fields={[
              { label: "直推", value: String(s.direct) },
              { label: "团队（递归）", value: <span className="text-amber-300 font-semibold">{s.team}</span> },
            ]}
          />
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-border/60 bg-card/20 p-3 text-[11px] text-muted-foreground leading-relaxed">
        布道数据用于 V 级晋升判定（直推 + 团队规模阈值见 system_config.v_level_eligibility_rules）。
      </div>
    </div>
  );
}

/* ───────── 持仓拨出 ───────── */

function HoldingTab() {
  return (
    <Placeholder
      icon={Wallet}
      title="持仓拨出 · EMBER"
      desc="按 veRUNE 加权快照（本金 × 35% × 锁定天数 ÷ 540）的月度拨出奖励，等值 EMBER 注入用户。需要持仓快照器 + 月度结算合约落地后才能出明细。"
      footer={[
        "公式: veRUNE = 本金 × 35% × (锁定天数 / 540)",
        "数据源: 持仓快照表 + system_config.v_level_rules.holdingPayout（待补）",
      ]}
    />
  );
}

/* ───────── shared ───────── */

function Placeholder({
  icon: Icon, title, desc, footer,
}: { icon: typeof Gift; title: string; desc: string; footer: string[] }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-card/20 px-6 py-10">
      <div className="flex items-center gap-2 justify-center mb-2">
        <Icon className="h-5 w-5 text-amber-400" />
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <p className="text-[12px] text-muted-foreground text-center max-w-xl mx-auto leading-relaxed">{desc}</p>
      {footer.length > 0 && (
        <ul className="mt-4 space-y-1 max-w-xl mx-auto">
          {footer.map((f, i) => (
            <li key={i} className="text-[11px] text-muted-foreground/80">• {f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function pctOf(n: bigint, d: bigint): string {
  if (d === 0n) return "0";
  return (Number((n * 10_000n) / d) / 100).toFixed(2);
}
