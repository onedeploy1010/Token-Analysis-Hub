import { useEffect, useMemo, useState } from "react";
import { getAddress } from "viem";
import {
  X, Loader2, ExternalLink, Wallet, Server, Coins, Gift,
  GitBranch, ArrowDownToLine, Tag as TagIcon, Activity,
} from "lucide-react";
import { supabase, adminChainId, fmtUsdt18 } from "@/lib/supabase";
import { useMemberDetail } from "./context";
import { CopyButton } from "./copy-button";
import { TagPickerInline, TagChipsForAddress } from "@/components/tags/tag-chip";

/**
 * Universal member-detail modal. Lazy-loads everything we know about a
 * single wallet: bind state, upline, downlines, own purchase, downline
 * purchases (= "earned as referrer" bucket).
 *
 * Tabs:
 *   • 概览     — bind / upline / downlines / aggregate
 *   • 节点购买 — own rune_purchases row (full tx hash + copy)
 *   • 质押订单 — placeholder; future rune_stake_orders
 *   • 奖励     — 节点直推 USDT (computed) + 质押直推 EMBER (placeholder)
 *   • 提现     — placeholder; future rune_withdrawals
 *
 * Addresses anywhere in the body are clickable — calling `open()` swaps
 * the modal to the new address without remounting (the provider holds
 * one address; effect re-fetches when it changes).
 */

interface Props { address: string; onClose: () => void; }
type Tab = "overview" | "nodes" | "staking" | "rewards" | "withdrawals";

const ROOT = "0x0000000000000000000000000000000000000001";
const EXPLORER = adminChainId === 56 ? "https://bscscan.com" : "https://testnet.bscscan.com";

const TIER_META: Record<number, { name: string; price: number; rate: number; color: string }> = {
  101: { name: "联创·符主",  price: 50_000, rate: 15, color: "#c084fc" },
  201: { name: "超级·符魂",  price: 10_000, rate: 12, color: "#fbbf24" },
  301: { name: "高级·符印",  price:  5_000, rate: 10, color: "#34d399" },
  401: { name: "中级·符源",  price:  2_500, rate:  8, color: "#60a5fa" },
  501: { name: "初级·符胚",  price:  1_000, rate:  5, color: "#cbd5e1" },
};

interface Snapshot {
  member: { boundAt: string | null; registeredAt: string | null } | null;
  upline: string | null;
  downlines: Array<{ user: string; boundAt: string }>;
  ownNode: { nodeId: number; amountRaw: string; paidAt: string; txHash: string } | null;
  referrerPurchases: Array<{ user: string; nodeId: number; amountRaw: string; paidAt: string; txHash: string }>;
}

/** Tiny module-level cache so re-opening the same address (or jumping
 *  back to it via the upline/downline links) is instant. 30s TTL is enough
 *  to feel snappy without serving stale data after a real on-chain event. */
const SNAP_TTL_MS = 30_000;
const _snapCache = new Map<string, { at: number; snap: Snapshot }>();

export function MemberDetailModal({ address, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const addr = address.toLowerCase();
  // Seed from cache so a re-open feels instant; stale entries get
  // overwritten by the effect below.
  const cached = _snapCache.get(addr);
  const fresh = cached && Date.now() - cached.at < SNAP_TTL_MS;
  const [snap, setSnap] = useState<Snapshot | null>(cached?.snap ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!fresh) setSnap(null);
    setError(null);
    if (fresh) return; // cache hit within TTL — no fetch needed
    (async () => {
      try {
        const [m, p, refUp, refDown, refPurchasesUsers] = await Promise.all([
          supabase.from("rune_members")
            .select("bound_at, registered_at")
            .eq("chain_id", adminChainId).eq("user", addr).maybeSingle(),
          supabase.from("rune_purchases")
            .select("node_id, amount::text, paid_at, tx_hash")
            .eq("chain_id", adminChainId).eq("user", addr).maybeSingle(),
          supabase.from("rune_referrers")
            .select("referrer")
            .eq("chain_id", adminChainId).eq("user", addr).maybeSingle(),
          supabase.from("rune_referrers")
            .select("user, bound_at")
            .eq("chain_id", adminChainId).eq("referrer", addr)
            .order("bound_at", { ascending: false }),
          supabase.from("rune_referrers")
            .select("user")
            .eq("chain_id", adminChainId).eq("referrer", addr),
        ]);
        if (!active) return;
        if (m.error && m.error.code !== "PGRST116") throw new Error(m.error.message);
        if (p.error && p.error.code !== "PGRST116") throw new Error(p.error.message);
        if (refUp.error && refUp.error.code !== "PGRST116") throw new Error(refUp.error.message);
        if (refDown.error) throw new Error(refDown.error.message);
        if (refPurchasesUsers.error) throw new Error(refPurchasesUsers.error.message);

        const downlineUsers = (refPurchasesUsers.data ?? []).map((r: any) => r.user as string);
        let refPurchases: Snapshot["referrerPurchases"] = [];
        if (downlineUsers.length > 0) {
          const { data: pp, error: ppe } = await supabase
            .from("rune_purchases")
            .select("user, node_id, amount::text, paid_at, tx_hash")
            .eq("chain_id", adminChainId)
            .in("user", downlineUsers);
          if (ppe) throw new Error(ppe.message);
          refPurchases = (pp ?? []).map((r: any) => ({
            user: r.user, nodeId: r.node_id, amountRaw: r.amount, paidAt: r.paid_at, txHash: r.tx_hash,
          }));
        }

        if (!active) return;
        const next: Snapshot = {
          member: m.data ? { boundAt: (m.data as any).bound_at, registeredAt: (m.data as any).registered_at } : null,
          upline: refUp.data ? (refUp.data as any).referrer : null,
          downlines: (refDown.data ?? []).map((r: any) => ({ user: r.user, boundAt: r.bound_at })),
          ownNode: p.data
            ? { nodeId: (p.data as any).node_id, amountRaw: (p.data as any).amount, paidAt: (p.data as any).paid_at, txHash: (p.data as any).tx_hash }
            : null,
          referrerPurchases: refPurchases,
        };
        _snapCache.set(addr, { at: Date.now(), snap: next });
        setSnap(next);
      } catch (e: any) {
        if (active) setError(e?.message ?? "加载失败");
      }
    })();
    return () => { active = false; };
  }, [addr]);

  const directRefRewardRaw = useMemo(() => {
    if (!snap) return 0n;
    let total = 0n;
    for (const p of snap.referrerPurchases) {
      const rate = TIER_META[p.nodeId]?.rate ?? 0;
      total += (BigInt(p.amountRaw) * BigInt(rate * 100)) / 10_000n;
    }
    return total;
  }, [snap]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="fixed right-0 top-0 h-full w-full max-w-2xl bg-background border-l border-border overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader address={addr} onClose={onClose} />

        {error && (
          <div className="mx-5 mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Render chrome (tags + tab strip) immediately so the modal feels
            responsive even before the data round-trip lands. The tab body
            shows an inline spinner until `snap` populates. */}
        <TagsBlock address={addr} />
        <Tabs tab={tab} onChange={setTab} />
        <div className="px-5 py-4">
          {!snap ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center text-xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> 加载会员数据…
            </div>
          ) : (
            <>
              {tab === "overview"   && <OverviewTab snap={snap} address={addr} directRefRewardRaw={directRefRewardRaw} />}
              {tab === "nodes"      && <NodesTab snap={snap} />}
              {tab === "staking"    && <PlaceholderTab title="质押订单" desc="质押合约尚未上链。落地后此处复用「订单管理」数据源（rune_stake_orders）展示该地址全部质押单。" />}
              {tab === "rewards"    && <RewardsTab snap={snap} directRefRewardRaw={directRefRewardRaw} />}
              {tab === "withdrawals" && <PlaceholderTab title="提现记录" desc="提现合约尚未上链，提现记录将通过 rune_withdrawals 展示。" />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalHeader({ address, onClose }: { address: string; onClose: () => void }) {
  let display = address;
  try { display = getAddress(address); } catch { /* keep lowercase */ }
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-5 py-3">
      <div className="flex items-center gap-3">
        <Wallet className="h-4 w-4 text-amber-400 shrink-0" />
        <h2 className="text-sm font-semibold text-foreground">会员详情</h2>
        <button
          onClick={onClose}
          className="ml-auto p-1.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-1 break-all">
        <span className="font-mono text-[11px] text-foreground/85 break-all">{display}</span>
        <CopyButton value={display} title="复制地址" />
        <a
          href={`${EXPLORER}/address/${display}`} target="_blank" rel="noreferrer"
          className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground"
          title="区块浏览器"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function TagsBlock({ address }: { address: string }) {
  return (
    <div className="px-5 pt-4">
      <div className="rounded-xl border border-border/60 bg-card/40 p-3">
        <div className="flex items-center gap-2 mb-2">
          <TagIcon className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">会员标签</span>
        </div>
        <TagChipsForAddress address={address} editable />
        <div className="mt-3 pt-3 border-t border-border/40">
          <TagPickerInline address={address} />
        </div>
      </div>
    </div>
  );
}

function Tabs({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const items: Array<{ key: Tab; label: string; icon: typeof Server }> = [
    { key: "overview",    label: "概览",     icon: Activity },
    { key: "nodes",       label: "节点购买", icon: Server },
    { key: "staking",     label: "质押订单", icon: Coins },
    { key: "rewards",     label: "奖励",     icon: Gift },
    { key: "withdrawals", label: "提现",     icon: ArrowDownToLine },
  ];
  return (
    <div className="px-5 mt-4">
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border/60 bg-card/40 p-1">
        {items.map((it) => {
          const active = it.key === tab;
          const Icon = it.icon;
          return (
            <button
              key={it.key}
              onClick={() => onChange(it.key)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OverviewTab({
  snap, address, directRefRewardRaw,
}: { snap: Snapshot; address: string; directRefRewardRaw: bigint }) {
  const isRoot = address.toLowerCase() === ROOT;
  const totalDownlineInflow = snap.referrerPurchases.reduce((acc, p) => acc + BigInt(p.amountRaw), 0n);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="链上绑定" value={snap.member?.boundAt ? new Date(snap.member.boundAt).toLocaleString("sv") : "—"} />
        <Stat label="系统注册" value={snap.member?.registeredAt ? new Date(snap.member.registeredAt).toLocaleString("sv") : "—"} />
        <Stat label="自有节点" value={snap.ownNode ? `${snap.ownNode.nodeId} · ${TIER_META[snap.ownNode.nodeId]?.name ?? "—"}` : "未购"} />
        <Stat label="入金 USDT" value={snap.ownNode ? fmtUsdt18(snap.ownNode.amountRaw, 0) : "—"} />
      </div>

      <Section icon={GitBranch} label="上级 (Referrer)">
        {snap.upline
          ? snap.upline === ROOT
            ? <span className="text-amber-300 text-xs font-semibold">ROOT</span>
            : <SwapAddress addr={snap.upline} />
          : isRoot ? <span className="text-amber-300 text-xs font-semibold">本身是 ROOT</span>
          : <span className="text-xs text-muted-foreground">无</span>}
      </Section>

      <Section icon={GitBranch} label={`直推下线 (${snap.downlines.length})`}>
        {snap.downlines.length === 0 ? (
          <span className="text-xs text-muted-foreground">暂无</span>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {snap.downlines.map((d) => (
              <div key={d.user} className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-muted/30">
                <SwapAddress addr={d.user} />
                <span className="text-[10px] text-muted-foreground shrink-0">{new Date(d.boundAt).toLocaleDateString("sv")}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section icon={Gift} label="作为推荐人累计">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="下线入金 USDT"  value={fmtUsdt18(totalDownlineInflow.toString(), 0)} />
          <Stat label="预估直推奖励 USDT" value={fmtUsdt18(directRefRewardRaw.toString(), 2)} amber />
        </div>
      </Section>
    </div>
  );
}

function NodesTab({ snap }: { snap: Snapshot }) {
  if (!snap.ownNode) {
    return <p className="text-sm text-muted-foreground py-6 text-center">该地址尚未购买节点</p>;
  }
  const meta = TIER_META[snap.ownNode.nodeId];
  return (
    <div className="rounded-xl border border-border/60 bg-card/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Server className="h-4 w-4" style={{ color: meta?.color ?? "#fbbf24" }} />
        <span className="font-semibold text-foreground" style={{ color: meta?.color ?? undefined }}>
          {snap.ownNode.nodeId} · {meta?.name ?? "—"}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">直推 {meta?.rate ?? 0}%</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Stat label="入金 USDT" value={fmtUsdt18(snap.ownNode.amountRaw, 2)} />
        <Stat label="标价 USDT" value={(meta?.price ?? 0).toLocaleString()} />
      </div>
      <div className="text-[11px] text-muted-foreground">
        购买时间: <span className="text-foreground">{new Date(snap.ownNode.paidAt).toLocaleString("sv")}</span>
      </div>
      <FullTxLine label="tx" hash={snap.ownNode.txHash} />
    </div>
  );
}

function RewardsTab({ snap, directRefRewardRaw }: { snap: Snapshot; directRefRewardRaw: bigint }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card/40 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Coins className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-semibold text-foreground">节点直推 · USDT</span>
          <span className="ml-auto text-[11px] text-muted-foreground">{snap.referrerPurchases.length} 笔</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <Stat label="累计推广入金" value={`${fmtUsdt18(snap.referrerPurchases.reduce((a, p) => a + BigInt(p.amountRaw), 0n).toString(), 0)} U`} />
          <Stat label="累计直推奖励" value={`${fmtUsdt18(directRefRewardRaw.toString(), 2)} U`} amber />
        </div>
        {snap.referrerPurchases.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-2">该会员尚无下线节点购买。</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {snap.referrerPurchases.slice(0, 50).map((p) => {
              const rate = TIER_META[p.nodeId]?.rate ?? 0;
              const rewardRaw = (BigInt(p.amountRaw) * BigInt(rate * 100)) / 10_000n;
              return (
                <div key={p.txHash} className="rounded-lg border border-border/40 bg-card/20 p-2 space-y-1">
                  <div className="flex items-center gap-2 text-[11px] flex-wrap">
                    <SwapAddress addr={p.user} />
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px]">{p.nodeId}</span>
                    <span className="ml-auto tabular-nums text-amber-300">+{fmtUsdt18(rewardRaw.toString(), 2)} U</span>
                  </div>
                  <FullTxLine label="tx" hash={p.txHash} />
                </div>
              );
            })}
            {snap.referrerPurchases.length > 50 && (
              <p className="text-[10px] text-muted-foreground text-center pt-1">仅显示前 50 条 / 共 {snap.referrerPurchases.length}</p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-border/60 bg-card/20 p-3">
        <div className="flex items-center gap-2 mb-1">
          <Gift className="h-3.5 w-3.5 text-amber-300" />
          <span className="text-xs font-semibold text-foreground">质押直推 · EMBER</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          质押合约尚未上链。文档定义：每笔质押入金 — 上级 5% EMBER 等值奖励 + V3 起 1% 平级 + V 级团队差 4–29% + V6/V8/V9 沉淀分红。落地后此处自动出明细。
        </p>
      </div>
    </div>
  );
}

function PlaceholderTab({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-card/20 px-4 py-8 text-center">
      <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
      <p className="text-[11px] text-muted-foreground leading-relaxed max-w-md mx-auto">{desc}</p>
    </div>
  );
}

function Section({ icon: Icon, label, children }: { icon: typeof Server; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, amber }: { label: string; value: string; amber?: boolean }) {
  return (
    <div className="rounded-lg border border-border/40 bg-card/30 px-2.5 py-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold tabular-nums truncate ${amber ? "text-amber-300" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

/** Click-to-swap address inside the modal — calls `open()` on the same
 *  context, which mutates `addr` and triggers the effect to refetch. */
function SwapAddress({ addr }: { addr: string }) {
  const { open } = useMemberDetail();
  let display = addr;
  try { display = getAddress(addr); } catch { /* */ }
  return (
    <span className="inline-flex items-center gap-1 max-w-full">
      <button
        onClick={(e) => { e.stopPropagation(); open(addr); }}
        className="font-mono text-[11px] text-foreground/85 hover:text-primary break-all text-left"
        title="切换至该地址详情"
      >
        {display}
      </button>
      <CopyButton value={display} title="复制地址" />
    </span>
  );
}

function FullTxLine({ label, hash }: { label: string; hash: string }) {
  return (
    <div className="flex items-start gap-1.5 flex-wrap">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0 mt-0.5">{label}</span>
      <a
        href={`${EXPLORER}/tx/${hash}`} target="_blank" rel="noreferrer"
        className="font-mono text-[11px] text-primary hover:underline break-all"
      >
        {hash}
      </a>
      <CopyButton value={hash} title="复制 tx hash" />
      <a
        href={`${EXPLORER}/tx/${hash}`} target="_blank" rel="noreferrer"
        className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground shrink-0"
        title="区块浏览器"
      >
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
