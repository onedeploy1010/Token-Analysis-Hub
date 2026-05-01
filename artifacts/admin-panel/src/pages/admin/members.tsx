import { useEffect, useMemo, useState } from "react";
import { getAddress } from "viem";
import { PageShell } from "./page-shell";
import { MobileDataCard } from "@/components/mobile-card";
import { supabase, adminChainId, fmtUsdt18 } from "@/lib/supabase";
import { Loader2, Search, Wallet, Copy, Check, X, ExternalLink, ArrowUp, Users } from "lucide-react";

/**
 * Members page — every wallet that has bound a referrer (rune_members)
 * enriched with on-chain purchase + upline + direct downlines. Clicking
 * any address opens an inline detail modal with full info.
 *
 * Data: parallel SELECT on rune_members / rune_purchases / rune_referrers;
 * joined client-side because (user, chain_id) is the join key without a real FK.
 */
const ROOT = "0x0000000000000000000000000000000000000001";
const PAGE_SIZE = 30;

interface MemberRow {
  user: string;
  boundAt: string;
  registeredAt: string;
  nodeId: number | null;
  amount: string | null;
  paidAt: string | null;
  txHash: string | null;
}

const EXPLORER = adminChainId === 56
  ? "https://bscscan.com"
  : "https://testnet.bscscan.com";

/** Best-effort EIP-55 checksum. Falls back to lowercase if input isn't
 *  a 0x-40-hex string (e.g. partial input during search). */
function checksum(addr: string): string {
  try { return getAddress(addr); } catch { return addr; }
}

function CopyAddress({ addr, full = false }: { addr: string; full?: boolean }) {
  const [copied, setCopied] = useState(false);
  const display = checksum(addr);
  const short = `${display.slice(0, 8)}…${display.slice(-6)}`;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono">
      <span className={full ? "text-[12px]" : "text-xs"}>{full ? display : short}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          void navigator.clipboard.writeText(display).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          });
        }}
        className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        title="复制完整地址"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      </button>
      <a
        href={`${EXPLORER}/address/${display}`}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        title="区块浏览器查看"
      >
        <ExternalLink className="h-3 w-3" />
      </a>
    </span>
  );
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [referrers, setReferrers] = useState<Array<{ user: string; referrer: string; boundAt: string }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "withNode" | "noNode">("all");
  const [page, setPage] = useState(0);
  const [detailAddr, setDetailAddr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [m, p, r] = await Promise.all([
          supabase
            .from("rune_members")
            .select("user, bound_at, registered_at")
            .eq("chain_id", adminChainId)
            .order("bound_at", { ascending: false })
            .limit(2000),
          supabase
            .from("rune_purchases")
            // amount is numeric(78,0) — cast to text so JSON.parse doesn't
            // truncate the 22-digit raw 18-decimal value to a lossy double.
            .select("user, node_id, amount::text, paid_at, tx_hash")
            .eq("chain_id", adminChainId),
          supabase
            .from("rune_referrers")
            .select("user, referrer, bound_at")
            .eq("chain_id", adminChainId),
        ]);
        if (m.error) throw new Error(m.error.message);
        if (p.error) throw new Error(p.error.message);
        if (r.error) throw new Error(r.error.message);

        const purchaseByUser = new Map<string, any>();
        for (const x of p.data ?? []) purchaseByUser.set(x.user, x);

        setMembers((m.data ?? []).map((row: any) => {
          const buy = purchaseByUser.get(row.user);
          return {
            user: row.user,
            boundAt: row.bound_at,
            registeredAt: row.registered_at,
            nodeId: buy?.node_id ?? null,
            amount: buy?.amount ?? null,
            paidAt: buy?.paid_at ?? null,
            txHash: buy?.tx_hash ?? null,
          };
        }));
        setReferrers((r.data ?? []).map((x: any) => ({
          user: x.user, referrer: x.referrer, boundAt: x.bound_at,
        })));
      } catch (e: any) {
        setError(e?.message ?? "load failed");
      }
    })();
  }, []);

  const { uplineOf, downlinesOf } = useMemo(() => {
    const u = new Map<string, string>();
    const d = new Map<string, string[]>();
    if (referrers) {
      for (const r of referrers) {
        u.set(r.user, r.referrer);
        const arr = d.get(r.referrer) ?? [];
        arr.push(r.user);
        d.set(r.referrer, arr);
      }
    }
    return { uplineOf: u, downlinesOf: d };
  }, [referrers]);

  const filtered = useMemo(() => {
    if (!members) return [];
    const q = search.trim().toLowerCase();
    return members.filter((r) => {
      if (filter === "withNode" && !r.nodeId) return false;
      if (filter === "noNode" && r.nodeId) return false;
      if (q && !r.user.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [members, search, filter]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const detail = detailAddr ? members?.find((m) => m.user === detailAddr) ?? null : null;

  return (
    <PageShell
      title="会员管理"
      subtitle={`Members · chain ${adminChainId} · ${filtered.length}/${members?.length ?? "…"} 显示`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜地址 0x… / Search address"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card/40 p-0.5 text-xs">
          {([
            { v: "all", label: "全部" },
            { v: "withNode", label: "有节点" },
            { v: "noNode", label: "无节点" },
          ] as const).map(({ v, label }) => (
            <button
              key={v}
              onClick={() => { setFilter(v); setPage(0); }}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === v ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >{label}</button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          {error}
        </div>
      )}

      {!members && !error ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> 加载中…
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto rounded-2xl border border-border/60 bg-card/40">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">地址</th>
                  <th className="text-left px-4 py-3">节点</th>
                  <th className="text-right px-4 py-3">入金 USDT</th>
                  <th className="text-left px-4 py-3">绑定时间</th>
                  <th className="text-right px-4 py-3">直推</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => (
                  <tr
                    key={r.user}
                    onClick={() => setDetailAddr(r.user)}
                    className="border-t border-border/40 hover:bg-muted/20 cursor-pointer"
                  >
                    <td className="px-4 py-2.5"><CopyAddress addr={r.user} full /></td>
                    <td className="px-4 py-2.5">
                      {r.nodeId ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">{r.nodeId}</span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.amount ? fmtUsdt18(r.amount, 0) : "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.boundAt ? new Date(r.boundAt).toLocaleString("sv") : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-xs">{downlinesOf.get(r.user)?.length ?? 0}</td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">无匹配记录</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {paged.map((r) => (
              <div key={r.user} onClick={() => setDetailAddr(r.user)}>
                <MobileDataCard
                  header={
                    <div className="flex items-center gap-2 flex-wrap">
                      <Wallet className="h-3.5 w-3.5 text-amber-400" />
                      <CopyAddress addr={r.user} />
                    </div>
                  }
                  fields={[
                    { label: "节点", value: r.nodeId ? <span className="text-amber-300 font-semibold">{r.nodeId}</span> : "—" },
                    { label: "入金 USDT", value: r.amount ? fmtUsdt18(r.amount, 0) : "—" },
                    { label: "绑定时间", value: r.boundAt ? new Date(r.boundAt).toLocaleDateString("sv") : "—" },
                    { label: "直推人数", value: String(downlinesOf.get(r.user)?.length ?? 0) },
                  ]}
                />
              </div>
            ))}
            {paged.length === 0 && (
              <p className="text-center text-muted-foreground py-12">无匹配记录</p>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
              <span>第 {page + 1} / {totalPages} 页 · 共 {filtered.length} 条</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                  className="px-3 py-1.5 rounded border border-border hover:bg-card disabled:opacity-40">上一页</button>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 rounded border border-border hover:bg-card disabled:opacity-40">下一页</button>
              </div>
            </div>
          )}
        </>
      )}

      {detailAddr && detail && (
        <DetailDrawer
          row={detail}
          upline={uplineOf.get(detailAddr) ?? null}
          downlines={downlinesOf.get(detailAddr) ?? []}
          onClose={() => setDetailAddr(null)}
        />
      )}
    </PageShell>
  );
}

function DetailDrawer({ row, upline, downlines, onClose }: {
  row: MemberRow; upline: string | null; downlines: string[]; onClose: () => void;
}) {
  const isRoot = row.user === ROOT;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="fixed right-0 top-0 h-full w-full max-w-lg bg-background border-l border-border overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-border px-5 py-3 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">会员详情</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-5">
          <Section label="钱包地址">
            <CopyAddress addr={row.user} full />
          </Section>

          <Section label="上级 (Referrer)">
            {upline ? (
              upline === ROOT
                ? <span className="text-amber-300 text-xs font-semibold">ROOT</span>
                : <CopyAddress addr={upline} full />
            ) : isRoot ? <span className="text-amber-300 text-xs font-semibold">本身是 ROOT</span>
              : <span className="text-xs text-muted-foreground">—</span>}
          </Section>

          <Section label={`直推下线 (${downlines.length})`}>
            {downlines.length === 0 ? (
              <span className="text-xs text-muted-foreground">暂无</span>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {downlines.map((d) => (
                  <div key={d} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/30">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <CopyAddress addr={d} />
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section label="节点">
            {row.nodeId ? (
              <div className="space-y-1 text-xs">
                <div>档位: <span className="text-amber-300 font-semibold">{row.nodeId}</span></div>
                <div>入金: <span className="font-mono">{fmtUsdt18(row.amount ?? "0", 2)} USDT</span></div>
                <div>购买时间: <span className="text-muted-foreground">{row.paidAt ? new Date(row.paidAt).toLocaleString("sv") : "—"}</span></div>
                {row.txHash && (
                  <div className="flex items-center gap-2">
                    tx:
                    <a href={`${EXPLORER}/tx/${row.txHash}`} target="_blank" rel="noreferrer"
                      className="font-mono text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                      {row.txHash.slice(0, 12)}…{row.txHash.slice(-8)} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            ) : <span className="text-xs text-muted-foreground">未购节点</span>}
          </Section>

          <Section label="时间">
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>链上绑定 (boundAt): <span className="text-foreground">{row.boundAt ? new Date(row.boundAt).toLocaleString("sv") : "—"}</span></div>
              <div>系统记录 (registeredAt): <span className="text-foreground">{row.registeredAt ? new Date(row.registeredAt).toLocaleString("sv") : "—"}</span></div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{label}</div>
      {children}
    </div>
  );
}
