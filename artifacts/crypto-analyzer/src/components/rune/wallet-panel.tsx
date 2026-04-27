import { useActiveAccount } from "thirdweb/react";
import { motion } from "framer-motion";
import { Wallet, UserPlus, ShieldCheck, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { WalletConnectButton } from "./wallet-connect-button";
import { useUsdtBalance } from "@/hooks/rune/use-usdt";
import { useReferrerOf } from "@/hooks/rune/use-community";
import { useUserPurchase } from "@/hooks/rune/use-node-presell";
import { NODE_META, type NodeId } from "@/lib/thirdweb/contracts";
import { runeChain } from "@/lib/thirdweb/chains";

/** Format a bigint with 18 decimals down to a readable USDT string. */
function fmtUsdt(raw: bigint | undefined, maxFrac = 2): string {
  if (raw === undefined) return "—";
  const base = 10n ** 18n;
  const whole = raw / base;
  const frac = raw % base;
  if (maxFrac === 0) return whole.toLocaleString("en-US");
  const fracStr = frac.toString().padStart(18, "0").slice(0, maxFrac).replace(/0+$/, "");
  return fracStr ? `${whole.toLocaleString("en-US")}.${fracStr}` : whole.toLocaleString("en-US");
}

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/**
 * Collapsed state (no wallet): a centered hero with the ConnectButton and
 * a hint about what's unlocked by connecting.
 *
 * Expanded state (wallet connected): a 3-up stat strip — USDT balance,
 * owned node, upstream referrer.
 */
export function WalletPanel() {
  const account = useActiveAccount();
  const addr = account?.address;

  const { data: usdtRaw } = useUsdtBalance(addr);
  const { referrer, isBound, isRoot, isLoading: referrerLoading } = useReferrerOf(addr);
  const { hasPurchased, nodeId, payTime } = useUserPurchase(addr);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-amber-700/30 bg-gradient-to-br from-amber-950/30 via-card/50 to-card p-5 sm:p-6"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(38,90%,50%,0.08),transparent_60%)] pointer-events-none" />

      <div className="relative z-10">
        {!addr ? (
          // ── Not connected ──
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">Connect your wallet</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  MetaMask · TokenPocket · Trust Wallet · OKX · WalletConnect.
                  <br className="hidden sm:block" />
                  Connected to <span className="text-foreground">{runeChain.name}</span>.
                </p>
              </div>
            </div>
            <div className="sm:ml-auto"><WalletConnectButton /></div>
          </div>
        ) : (
          // ── Connected ──
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-mono text-foreground">{shortAddr(addr)}</span>
                <span className="opacity-50">·</span>
                <span>{runeChain.name}</span>
              </div>
              <WalletConnectButton />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* USDT balance */}
              <div className="rounded-xl border border-border/50 bg-background/40 p-3.5">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60 mb-1">USDT Balance</p>
                <p className="num text-xl text-foreground">
                  {fmtUsdt(usdtRaw as bigint | undefined, 2)} <span className="text-xs text-muted-foreground font-normal">USDT</span>
                </p>
              </div>

              {/* Owned node */}
              <div className="rounded-xl border border-border/50 bg-background/40 p-3.5">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60 mb-1">Owned Node</p>
                {hasPurchased && nodeId ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${NODE_META[nodeId as NodeId]?.color ?? "text-foreground"}`}>
                        {NODE_META[nodeId as NodeId]?.nameEn ?? `#${nodeId}`}
                      </p>
                      {payTime && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {new Date(Number(payTime) * 1000).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">— None yet</p>
                )}
              </div>

              {/* Referrer */}
              <div className="rounded-xl border border-border/50 bg-background/40 p-3.5">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60 mb-1">Upstream Referrer</p>
                {referrerLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : !isBound ? (
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-sm text-amber-300">Not bound</span>
                    <UserPlus className="h-3 w-3 text-muted-foreground ml-auto" />
                  </div>
                ) : isRoot ? (
                  <span className="inline-flex items-center gap-1 text-sm text-primary font-semibold">ROOT</span>
                ) : (
                  <a
                    href={`${runeChain.blockExplorers?.[0]?.url ?? "https://bscscan.com"}/address/${referrer}`}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-mono text-foreground hover:text-primary transition-colors"
                  >
                    {shortAddr(referrer!)} <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
