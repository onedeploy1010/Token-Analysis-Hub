import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useActiveAccount } from "thirdweb/react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users, Copy, CheckCircle2, Share2, ExternalLink,
  TrendingUp, Wallet, Link as LinkIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUsdtBalance } from "@/hooks/rune/use-usdt";
import { useReferrerOf } from "@/hooks/rune/use-community";
import { useUserPurchase } from "@/hooks/rune/use-node-presell";
import { useTeam, usePersonalStats, type ReferrerRow } from "@/hooks/rune/use-team";
import { NODE_META, type NodeId, COMMUNITY_ROOT } from "@/lib/thirdweb/contracts";
import { runeChain } from "@/lib/thirdweb/chains";
import { buildReferralUrl } from "@/hooks/rune/use-referral-param";
import { useToast } from "@/hooks/use-toast";

type Tab = "overview" | "team";

/** Short-hand 0x123…abcd formatter for display. */
const short = (a: string | undefined) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");

/** 18-decimal bigint → human USDT string. */
function fmtUsdt(raw: bigint | undefined | string, dec = 2): string {
  if (raw === undefined || raw === null) return "—";
  const v = typeof raw === "string" ? BigInt(raw) : raw;
  const base = 10n ** 18n;
  const whole = v / base;
  const frac = v % base;
  if (dec === 0) return whole.toLocaleString("en-US");
  const fracStr = frac.toString().padStart(18, "0").slice(0, dec).replace(/0+$/, "");
  return fracStr ? `${whole.toLocaleString("en-US")}.${fracStr}` : whole.toLocaleString("en-US");
}

/**
 * Authenticated personal hub. Mounted at `/dashboard`. Guards itself —
 * if the user disconnects mid-session we bounce them back to /recruit
 * automatically so the state machine never shows empty data.
 */
export default function Dashboard() {
  const account = useActiveAccount();
  const address = account?.address;
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("overview");

  // Disconnect → kick back to /recruit immediately. useEffect avoids
  // navigating during render which React doesn't like.
  useEffect(() => {
    if (!address) navigate("/recruit");
  }, [address, navigate]);

  if (!address) return null;

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl space-y-8">
      {/* ── Header ── */}
      <div className="flex items-end justify-between border-b border-border/40 pb-5">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/60 block mb-1">Personal Hub</span>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
            <Wallet className="h-3.5 w-3.5" />
            <span className="font-mono">{short(address)}</span>
            <span className="opacity-40">·</span>
            <span>{runeChain.name}</span>
          </p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-border/30">
        {[
          { id: "overview" as const, Icon: LayoutDashboard, label: "Overview" },
          { id: "team"     as const, Icon: Users,           label: "Team" },
        ].map(({ id, Icon, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative px-5 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors ${
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {active && (
                <motion.div
                  layoutId="dashTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab panels ── */}
      {tab === "overview" ? <OverviewTab address={address} /> : <TeamTab address={address} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Overview tab
──────────────────────────────────────────────────────────────────────────── */
function OverviewTab({ address }: { address: string }) {
  const { data: usdtRaw } = useUsdtBalance(address);
  const { referrer, isBound, isRoot } = useReferrerOf(address);
  const { hasPurchased, nodeId, payTime, amount } = useUserPurchase(address);
  const { data: stats } = usePersonalStats(address);

  const referralUrl = buildReferralUrl(address);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast({ title: "Link copied", description: "Share this link to invite others into your line." });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Copy failed", description: "Select the link manually to copy.", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="USDT"                 value={`${fmtUsdt(usdtRaw as bigint | undefined, 2)}`} sub="balance" />
        <Kpi label="Direct invitees"      value={stats ? String(stats.directCount) : "…"}        sub="wallets" />
        <Kpi label="Team total"           value={stats ? String(stats.totalDownstreamCount) : "…"} sub="incl. indirect" />
        <Kpi label="Team invested"        value={stats ? `$${fmtUsdt(stats.totalDownstreamInvested, 0)}` : "…"} sub="USDT (all-time)" highlight />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Owned node */}
        <Card className="bg-card/70 backdrop-blur border-border">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-400" /> Owned Node
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            {hasPurchased && nodeId ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className={`text-[10px] font-mono uppercase tracking-[0.22em] ${NODE_META[nodeId as NodeId]?.color ?? "text-foreground"}`}>
                      {NODE_META[nodeId as NodeId]?.nameEn}
                    </p>
                    <p className="text-2xl font-bold mt-1">{NODE_META[nodeId as NodeId]?.nameCn}</p>
                  </div>
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-border/30">
                  <div>
                    <p className="text-muted-foreground/60 uppercase text-[10px] tracking-widest mb-0.5">Paid</p>
                    <p className="num text-foreground">${amount ? fmtUsdt(amount, 0) : "—"} USDT</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground/60 uppercase text-[10px] tracking-widest mb-0.5">Purchased</p>
                    <p className="num text-foreground">{payTime ? new Date(Number(payTime) * 1000).toLocaleDateString() : "—"}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No node yet.
                <br />
                <Button size="sm" variant="link" onClick={() => (window.location.href = "/recruit")} className="text-amber-400">
                  Go to recruit →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referral link */}
        <Card className="bg-card/70 backdrop-blur border-border">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-amber-400" /> Referral Link
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Share this link. Anyone who connects via it will have your wallet
              auto-filled as their referrer in the onboarding flow.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-[11px] font-mono text-foreground/80 truncate">
                {referralUrl}
              </div>
              <Button size="sm" variant="outline" onClick={copyLink} className="gap-1.5 shrink-0">
                {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/30">
              <div className="text-xs text-muted-foreground">
                <span className="opacity-60 uppercase text-[10px] tracking-widest block">Your upstream</span>
                {isRoot ? (
                  <span className="text-amber-300 font-semibold">ROOT</span>
                ) : isBound && referrer ? (
                  <a
                    href={`${runeChain.blockExplorers?.[0]?.url ?? "https://bscscan.com"}/address/${referrer}`}
                    target="_blank" rel="noreferrer"
                    className="font-mono text-foreground hover:text-amber-400 inline-flex items-center gap-1"
                  >
                    {short(referrer)} <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">Not bound</span>
                )}
              </div>
              {navigator.share && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5"
                  onClick={() => navigator.share({ title: "Join RUNE", url: referralUrl }).catch(() => {})}
                >
                  <Share2 className="h-3.5 w-3.5" /> Share
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Team tab — recursive downstream tree
──────────────────────────────────────────────────────────────────────────── */

/** One node in the tree. Children are fetched lazily when expanded. */
function TeamNode({ row, depth }: { row: ReferrerRow; depth: number }) {
  const [open, setOpen] = useState(false);
  const { data: children, isLoading } = useTeam(open ? row.user : undefined);

  return (
    <div className="relative" style={{ marginLeft: depth === 0 ? 0 : 16 }}>
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-lg border transition-colors cursor-pointer ${
          open ? "border-amber-700/40 bg-amber-950/10" : "border-border/40 bg-card/30 hover:border-border/70"
        }`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`text-[11px] font-mono transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
        <span className="font-mono text-xs text-foreground">{short(row.user)}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {new Date(row.boundAt).toLocaleDateString()}
        </span>
      </div>
      {open && (
        <div className="pl-3 border-l border-border/20 mt-1 space-y-1">
          {isLoading ? (
            <p className="text-[11px] text-muted-foreground py-1 px-2">Loading…</p>
          ) : !children || children.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/70 py-1 px-2">No downstream</p>
          ) : (
            children.map((child) => <TeamNode key={child.user} row={child} depth={depth + 1} />)
          )}
        </div>
      )}
    </div>
  );
}

function TeamTab({ address }: { address: string }) {
  const { data: directTeam, isLoading } = useTeam(address);
  const { data: stats } = usePersonalStats(address);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Direct"           value={stats ? String(stats.directCount) : "…"}              sub="1st layer" />
        <Kpi label="Total team"       value={stats ? String(stats.totalDownstreamCount) : "…"}      sub="recursive" />
        <Kpi label="Direct purchases" value={stats ? String(stats.directPurchaseCount) : "…"}       sub="converted" />
        <Kpi label="Direct invested"  value={stats ? `$${fmtUsdt(stats.directTotalInvested, 0)}` : "…"} sub="USDT" highlight />
      </div>

      <Card className="bg-card/70 backdrop-blur border-border">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-400" /> Downstream Tree
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-1">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading team…</p>
          ) : !directTeam || directTeam.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-3 opacity-30" />
              No invitees yet. Share your link from the Overview tab.
            </div>
          ) : (
            directTeam.map((row) => <TeamNode key={row.user} row={row} depth={0} />)
          )}
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground/50 text-center">
        Tree data is indexed from <span className="font-mono">EventAddReferrer</span> on the Community proxy ({short(COMMUNITY_ROOT)} omitted).
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Shared KPI tile
──────────────────────────────────────────────────────────────────────────── */
function Kpi({ label, value, sub, highlight = false }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="border border-border/50 bg-card/60 rounded-xl p-4 corner-brackets">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70 mb-1.5">{label}</div>
      <div className={`text-xl num ${highlight ? "num-gold" : "text-foreground"}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground/60 mt-1">{sub}</div>}
    </div>
  );
}
