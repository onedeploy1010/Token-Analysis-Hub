import { useEffect, useMemo, useState } from "react";
import { createPublicClient, http, parseAbi } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { PageShell } from "./page-shell";
import { supabase, adminChainId } from "@/lib/supabase";
import { useAdminAuth } from "@/contexts/admin-auth";
import {
  Loader2, FileCode2, Save, RefreshCw, ExternalLink, Lock, Check, AlertTriangle,
} from "lucide-react";

/**
 * 合约管理 — two stacked sections:
 *   1) On-chain live state (NodePresell.getNodeConfigs) for all 5 tiers.
 *   2) system_config rows (jsonb) — viewable always, editable with
 *      contracts.write permission.
 *
 * Spec gap: when a tier's on-chain payAmount disagrees with the matching
 * row in system_config.node_tiers we surface a red badge so admins can
 * either reconcile the JSON or push a fix-tx (out of scope here).
 *
 * Auth: edits go straight to Supabase via the user's session JWT — RLS
 * policy on system_config restricts UPDATE to admins (set up separately).
 */

const RPC_URL = adminChainId === 56
  ? "https://bsc-dataseed.binance.org"
  : "https://bsc-testnet.publicnode.com";

const VIEM_CHAIN = adminChainId === 56 ? bsc : bscTestnet;

const NODE_PRESELL_ADDR =
  adminChainId === 56
    ? (import.meta.env.VITE_RUNE_NODE_PRESELL_MAINNET as string | undefined) ?? "0xF32747E7c120BB6333Ac83F25192c089e8d9b62E"
    : (import.meta.env.VITE_RUNE_NODE_PRESELL_TESTNET as string | undefined) ?? "0x6a30f26338742670637f47dfC04600B4d1eF1E9a";

const COMMUNITY_ADDR =
  adminChainId === 56
    ? (import.meta.env.VITE_RUNE_COMMUNITY_MAINNET as string | undefined) ?? "0xe6f1d4B5ea4B5a025e1E45C9E3d83F31201B6C9c"
    : (import.meta.env.VITE_RUNE_COMMUNITY_TESTNET as string | undefined) ?? "0x42a06ac2208E9F8e25673BA0F6c44bc56fD2aa62";

const EXPLORER = adminChainId === 56 ? "https://bscscan.com" : "https://testnet.bscscan.com";

const NODE_PRESELL_ABI = parseAbi([
  "function getNodeConfigs(uint256[] nodeIds_) view returns ((uint256 nodeId, address payToken, uint256 payAmount, uint256 maxLimit, uint256 curNum, uint256 directRate)[])",
  "function owner() view returns (address)",
  "function paused() view returns (bool)",
]);

const TIER_IDS = [101, 201, 301, 401, 501] as const;

interface NodeConfigOnChain {
  nodeId: number;
  payToken: string;
  payAmount: bigint;
  maxLimit: bigint;
  curNum: bigint;
  directRate: bigint;
}

interface ConfigRow {
  namespace: string;
  key: string;
  value: unknown;
  description: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

const KEY_ORDER = [
  "token_supply_rune",      "token_supply_ember",
  "pool_split_rule",        "staking_settlement_rule",
  "staking_packages",       "withdraw_fee_tiers",
  "inflow_control_tiers",   "outflow_mother_tiers", "outflow_sub_tiers",
  "sub_slippage_ladder",    "mother_burn_yield_tiers",
  "node_tiers",             "airdrop_unlock_stages",
  "v_level_rules",          "v_level_eligibility_rules",
  "price_defense_mechanisms",
  "tax_and_slippage",
];

export default function ContractsPage() {
  const { hasPermission } = useAdminAuth();
  const canWrite = hasPermission("contracts.write");
  const [chainState, setChainState] = useState<{
    configs: NodeConfigOnChain[] | null;
    owner: string | null;
    paused: boolean | null;
    error: string | null;
  }>({ configs: null, owner: null, paused: null, error: null });

  const [configRows, setConfigRows] = useState<ConfigRow[] | null>(null);
  const [configErr, setConfigErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function loadChain() {
    setRefreshing(true);
    try {
      const client = createPublicClient({ chain: VIEM_CHAIN, transport: http(RPC_URL) });
      const [configs, owner, paused] = await Promise.all([
        client.readContract({
          address: NODE_PRESELL_ADDR as `0x${string}`,
          abi: NODE_PRESELL_ABI,
          functionName: "getNodeConfigs",
          args: [TIER_IDS.map((n) => BigInt(n))],
        }),
        client.readContract({
          address: NODE_PRESELL_ADDR as `0x${string}`,
          abi: NODE_PRESELL_ABI,
          functionName: "owner",
        }).catch(() => null),
        client.readContract({
          address: NODE_PRESELL_ADDR as `0x${string}`,
          abi: NODE_PRESELL_ABI,
          functionName: "paused",
        }).catch(() => null),
      ]);
      setChainState({
        configs: (configs as readonly any[]).map((c) => ({
          nodeId: Number(c.nodeId),
          payToken: String(c.payToken),
          payAmount: BigInt(c.payAmount),
          maxLimit: BigInt(c.maxLimit),
          curNum: BigInt(c.curNum),
          directRate: BigInt(c.directRate),
        })),
        owner: owner ? String(owner) : null,
        paused: typeof paused === "boolean" ? paused : null,
        error: null,
      });
    } catch (e: any) {
      setChainState({ configs: null, owner: null, paused: null, error: e?.message ?? "RPC 调用失败" });
    } finally {
      setRefreshing(false);
    }
  }

  async function loadConfig() {
    const { data, error } = await supabase
      .from("system_config")
      .select("namespace, key, value, description, updated_by, updated_at")
      .eq("namespace", "rune");
    if (error) { setConfigErr(error.message); return; }
    const rows: ConfigRow[] = (data ?? []).map((r: any) => ({
      namespace: r.namespace,
      key: r.key,
      value: r.value,
      description: r.description,
      updatedBy: r.updated_by,
      updatedAt: r.updated_at,
    }));
    rows.sort((a, b) => {
      const ai = KEY_ORDER.indexOf(a.key);
      const bi = KEY_ORDER.indexOf(b.key);
      if (ai === -1 && bi === -1) return a.key.localeCompare(b.key);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    setConfigRows(rows);
  }

  useEffect(() => { void loadChain(); void loadConfig(); }, []);

  const tierGap = useMemo(() => {
    // Compare on-chain payAmount vs system_config.node_tiers[].priceUsdt
    const out: Record<number, "ok" | "diff" | "missing"> = {};
    if (!chainState.configs || !configRows) return out;
    const cfgRow = configRows.find((r) => r.key === "node_tiers");
    const cfgList = Array.isArray(cfgRow?.value) ? (cfgRow!.value as any[]) : [];
    for (const c of chainState.configs) {
      const cfgTier = cfgList.find((t: any) => Number(t.nodeId ?? t.id) === c.nodeId);
      if (!cfgTier) { out[c.nodeId] = "missing"; continue; }
      const cfgUsdt = BigInt(Math.round((Number(cfgTier.priceUsdt ?? cfgTier.price ?? 0)) * 1e18));
      out[c.nodeId] = cfgUsdt === c.payAmount ? "ok" : "diff";
    }
    return out;
  }, [chainState.configs, configRows]);

  return (
    <PageShell
      title="合约管理"
      subtitle={`Contracts · chain ${adminChainId} · ${adminChainId === 56 ? "BSC Mainnet" : "BSC Testnet"}`}
      actions={
        <button
          onClick={() => { void loadChain(); void loadConfig(); }}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card/40 hover:bg-card text-sm disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          刷新
        </button>
      }
    >
      {!canWrite && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 mb-4 flex items-center gap-2">
          <Lock className="h-4 w-4 shrink-0" />
          <span>你没有 <code className="text-[11px] bg-black/30 px-1 rounded">contracts.write</code> 权限，所有 system_config 行只读。</span>
        </div>
      )}

      {/* On-chain state */}
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 lg:p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <FileCode2 className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-foreground">链上合约状态 · NodePresell</h3>
          <a
            href={`${EXPLORER}/address/${NODE_PRESELL_ADDR}`}
            target="_blank" rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground font-mono"
          >
            {NODE_PRESELL_ADDR.slice(0, 10)}…{NODE_PRESELL_ADDR.slice(-6)}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {chainState.error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-3">
            {chainState.error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
          <SnapTile label="Owner" value={chainState.owner ? `${chainState.owner.slice(0, 8)}…${chainState.owner.slice(-6)}` : "—"} mono />
          <SnapTile
            label="Paused"
            value={
              chainState.paused == null
                ? "—"
                : chainState.paused
                  ? "⛔ 已暂停"
                  : "✅ 运行中"
            }
            tone={chainState.paused === true ? "danger" : chainState.paused === false ? "ok" : "muted"}
          />
          <SnapTile
            label="Community"
            value={`${COMMUNITY_ADDR.slice(0, 10)}…${COMMUNITY_ADDR.slice(-6)}`}
            mono
            href={`${EXPLORER}/address/${COMMUNITY_ADDR}`}
          />
        </div>

        {!chainState.configs && !chainState.error ? (
          <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> 读取链上配置中…
          </div>
        ) : chainState.configs ? (
          <div className="overflow-x-auto rounded-xl border border-border/40">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2.5">档位</th>
                  <th className="text-left px-3 py-2.5">payToken</th>
                  <th className="text-right px-3 py-2.5">payAmount (USDT)</th>
                  <th className="text-right px-3 py-2.5">maxLimit</th>
                  <th className="text-right px-3 py-2.5">curNum</th>
                  <th className="text-right px-3 py-2.5">directRate</th>
                  <th className="text-right px-3 py-2.5">规范对账</th>
                </tr>
              </thead>
              <tbody>
                {chainState.configs.map((c) => (
                  <tr key={c.nodeId} className="border-t border-border/40">
                    <td className="px-3 py-2"><span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">{c.nodeId}</span></td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{c.payToken.slice(0, 10)}…{c.payToken.slice(-6)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{Number(c.payAmount / 10n ** 16n) / 100}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.maxLimit.toString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.curNum.toString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.directRate.toString()}</td>
                    <td className="px-3 py-2 text-right">
                      <GapBadge state={tierGap[c.nodeId] ?? "ok"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* system_config rows */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">system_config · namespace=rune</h3>
          <span className="text-[11px] text-muted-foreground">{configRows?.length ?? "…"} 行</span>
        </div>

        {configErr && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {configErr}
          </div>
        )}

        {!configRows && !configErr ? (
          <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> 加载中…
          </div>
        ) : (
          configRows?.map((r) => (
            <ConfigRowCard
              key={r.key}
              row={r}
              canWrite={canWrite}
              onSaved={() => void loadConfig()}
            />
          ))
        )}
      </div>
    </PageShell>
  );
}

function GapBadge({ state }: { state: "ok" | "diff" | "missing" }) {
  if (state === "ok") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
        <Check className="h-3 w-3" /> 一致
      </span>
    );
  }
  if (state === "diff") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30">
        <AlertTriangle className="h-3 w-3" /> 不一致
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground border border-border/40">
      缺失
    </span>
  );
}

function SnapTile({
  label, value, mono, tone, href,
}: {
  label: string; value: string; mono?: boolean;
  tone?: "ok" | "danger" | "muted";
  href?: string;
}) {
  const toneClass =
    tone === "ok" ? "text-emerald-400"
    : tone === "danger" ? "text-red-400"
    : "text-foreground";
  const Inner = (
    <div className="rounded-xl border border-border/40 bg-card/30 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${toneClass} ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
    </div>
  );
  if (href) return <a href={href} target="_blank" rel="noreferrer" className="hover:opacity-80">{Inner}</a>;
  return Inner;
}

function ConfigRowCard({
  row, canWrite, onSaved,
}: {
  row: ConfigRow;
  canWrite: boolean;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(() => JSON.stringify(row.value, null, 2));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function startEdit() {
    setDraft(JSON.stringify(row.value, null, 2));
    setEditing(true);
    setErr(null);
  }

  async function save() {
    setErr(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft);
    } catch (e: any) {
      setErr(`JSON 解析失败: ${e?.message ?? e}`);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("system_config")
        .update({ value: parsed, updated_at: new Date().toISOString() })
        .eq("namespace", row.namespace)
        .eq("key", row.key);
      if (error) throw new Error(error.message);
      setEditing(false);
      setSavedAt(Date.now());
      onSaved();
    } catch (e: any) {
      setErr(e?.message ?? "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/20 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="font-mono text-sm text-foreground truncate">{row.key}</div>
          {row.description && (
            <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{row.description}</div>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums hidden sm:inline">
          {row.updatedAt ? new Date(row.updatedAt).toLocaleString("sv") : "—"}
        </span>
        <span className="text-[11px] text-muted-foreground">{open ? "收起" : "展开"}</span>
      </button>

      {open && (
        <div className="px-4 py-3 border-t border-border/40 space-y-2">
          {savedAt && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
              ✓ 已保存
            </div>
          )}
          {err && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {err}
            </div>
          )}

          {editing ? (
            <>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full font-mono text-[11px] leading-relaxed bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                rows={Math.min(28, draft.split("\n").length + 2)}
                spellCheck={false}
              />
              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  保存
                </button>
                <button
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted/30"
                >取消</button>
              </div>
            </>
          ) : (
            <>
              <pre className="w-full max-h-96 overflow-auto bg-background border border-border/40 rounded-lg p-3 text-[11px] leading-relaxed font-mono text-foreground/90">
                {JSON.stringify(row.value, null, 2)}
              </pre>
              {canWrite && (
                <button
                  onClick={startEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted/30"
                >
                  编辑 JSON
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
