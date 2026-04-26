import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Coins, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { maxUint256 } from "thirdweb/utils";
import { nodePresellContract, usdtContract, NODE_META, NODE_IDS, type NodeId } from "@/lib/thirdweb/contracts";
import { readUsdtAllowance } from "@/hooks/rune/use-usdt";
import { useNodeConfigs } from "@/hooks/rune/use-node-presell";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";

interface Props {
  open: boolean;
  onClose: () => void;
  onPurchased: () => void;
  onSkip: () => void;
}

const ALL_NODE_IDS: readonly NodeId[] = NODE_IDS;
const LEVEL_NUM: Record<string, number> = { initial: 1, mid: 2, advanced: 3, super: 4, founder: 5 };

function fmt18(raw: bigint, decimals = 0): string {
  const base = 10n ** 18n;
  const whole = raw / base;
  if (decimals === 0) return whole.toLocaleString("en-US");
  const frac = raw % base;
  const fracStr = frac.toString().padStart(18, "0").slice(0, decimals).replace(/0+$/, "");
  return fracStr ? `${whole.toLocaleString("en-US")}.${fracStr}` : whole.toLocaleString("en-US");
}

type Step = "select" | "approving" | "buying" | "done";

export function PurchaseNodeModal({ open, onClose, onPurchased, onSkip }: Props) {
  const { t, language } = useLanguage();
  const account = useActiveAccount();
  const [selected, setSelected] = useState<NodeId | null>(null);
  const [step, setStep] = useState<Step>("select");
  const { data: configs } = useNodeConfigs();
  const { mutateAsync: sendTx } = useSendTransaction();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setSelected(null);
      setStep("select");
    }
  }, [open]);

  const configArray = (configs as any) as undefined | { nodeId: bigint; payAmount: bigint; maxLimit: bigint; curNum: bigint; directRate: bigint }[];
  const selectedConfig = selected && configArray
    ? configArray.find((c) => Number(c.nodeId) === selected)
    : undefined;

  async function handleBuy() {
    if (!account || !selected || !selectedConfig) return;
    try {
      setStep("approving");
      const allowance = await readUsdtAllowance(account.address);
      if (allowance < selectedConfig.payAmount) {
        const approveTx = prepareContractCall({
          contract: usdtContract,
          method: "function approve(address,uint256)",
          params: [nodePresellContract.address as `0x${string}`, maxUint256],
        });
        await sendTx(approveTx);
      }

      setStep("buying");
      const buyTx = prepareContractCall({
        contract: nodePresellContract,
        method: "function nodePresell(uint256)",
        params: [BigInt(selected)],
      });
      await sendTx(buyTx);

      setStep("done");
      toast({ title: t("mr.buy.toastDone"), description: t("mr.buy.toastDoneDesc").replace("{node}", NODE_META[selected].nameEn) });
      setTimeout(onPurchased, 800);
    } catch (e: any) {
      setStep("select");
      toast({
        title: t("mr.buy.toastFail"),
        description: e?.message ?? t("mr.buy.toastFailDesc"),
        variant: "destructive",
      });
    }
  }

  const busy = step === "approving" || step === "buying";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <DialogContent className="bg-[#07101f] border border-white/10 max-w-md max-h-[88dvh] overflow-y-auto p-0 gap-0 overflow-hidden">

        {/* ── Header ── */}
        <div className="relative px-5 pt-5 pb-4 border-b border-white/[0.07]">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.06] via-transparent to-transparent pointer-events-none" />
          <DialogHeader className="space-y-0">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 shrink-0">
                <Coins className="h-4 w-4 text-amber-400" />
                <div className="absolute inset-0 rounded-xl shadow-[0_0_14px_rgba(245,158,11,0.35)]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-amber-400/70">
                  {t("mr.buy.step")}
                </span>
                <DialogTitle className="text-[15px] font-bold leading-tight text-white">
                  {t("mr.buy.title")}
                </DialogTitle>
              </div>
            </div>
            <DialogDescription className="text-[11px] text-muted-foreground/70 leading-snug">
              {t("mr.buy.desc")}
            </DialogDescription>
            <p className="text-[10px] leading-snug text-amber-300/60 font-medium pt-1">
              {t("mr.buy.descHint")}
            </p>
          </DialogHeader>
        </div>

        {/* ── Tier list ── */}
        <div className="flex flex-col gap-2 px-4 py-4">
          {[...ALL_NODE_IDS].sort((a, b) => b - a).map((id) => {
            const meta = NODE_META[id];
            const cfg = configArray?.find((c) => Number(c.nodeId) === id);
            const priceLabel = cfg ? fmt18(cfg.payAmount) : "—";
            const soldOut = cfg && cfg.curNum >= cfg.maxLimit;
            const remaining = cfg ? Number(cfg.maxLimit - cfg.curNum) : 0;
            const totalSeats = cfg ? Number(cfg.maxLimit) : 0;
            const occupiedPct = cfg && totalSeats > 0 ? Math.round(((totalSeats - remaining) / totalSeats) * 100) : 0;
            const directPct = cfg ? Number(cfg.directRate) / 100 : null;
            const isActive = selected === id;
            const lv = LEVEL_NUM[meta.level] ?? 1;

            return (
              <button
                key={id}
                type="button"
                disabled={busy || !!soldOut}
                onClick={() => setSelected(id)}
                className="group relative flex items-center gap-3 rounded-xl border-2 px-3.5 py-3 transition-all duration-150 text-left overflow-hidden cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  borderColor: isActive ? `rgb(${meta.rgb})` : "rgba(255,255,255,0.08)",
                  background: isActive ? `rgba(${meta.rgb}, 0.07)` : "rgba(255,255,255,0.02)",
                  boxShadow: isActive ? `0 0 22px rgba(${meta.rgb}, 0.22), inset 0 0 0 1px rgba(${meta.rgb}, 0.12)` : "none",
                }}
              >
                {/* Left accent bar */}
                <span
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-opacity"
                  style={{ background: `rgb(${meta.rgb})`, opacity: isActive ? 1 : 0.35 }}
                  aria-hidden
                />

                {/* Tier icon */}
                <span
                  className="ml-0.5 h-11 w-11 rounded-xl shrink-0 flex items-center justify-center text-[18px] font-bold transition-shadow"
                  style={{
                    background: `rgba(${meta.rgb}, 0.14)`,
                    color: `rgb(${meta.rgb})`,
                    border: `1px solid rgba(${meta.rgb}, 0.30)`,
                    boxShadow: isActive ? `0 0 14px rgba(${meta.rgb}, 0.35)` : "none",
                  }}
                >
                  {meta.nameCn.charAt(meta.nameCn.length - 1)}
                </span>

                {/* Info column */}
                <div className="flex-1 min-w-0">
                  {/* Name row */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-bold text-white leading-none">{meta.nameCn}</span>
                    <span className={`text-[9px] font-mono uppercase tracking-[0.18em] leading-none ${meta.color}`}>{meta.nameEn}</span>
                    <span className="ml-auto text-[8px] font-mono tracking-wider text-white/25 border border-white/10 rounded px-1 py-0.5 leading-none">
                      LV.{lv}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-2 text-[10px] mb-1.5">
                    {soldOut ? (
                      <span className="text-red-400/80 font-medium">{t("mr.buy.soldOut")}</span>
                    ) : cfg ? (
                      <>
                        <span className="text-white/40">
                          <span className="text-white/80 font-semibold tabular-nums">{remaining}</span>{" "}{t("mr.buy.seatsLeft")}
                        </span>
                        {directPct !== null && (
                          <>
                            <span className="text-white/15">|</span>
                            <span className="text-white/40">
                              {language.startsWith("zh") ? "返佣 " : "Comm. "}
                              <span className="font-semibold" style={{ color: `rgb(${meta.rgb})` }}>{directPct}%</span>
                            </span>
                          </>
                        )}
                      </>
                    ) : (
                      <span className="text-white/25">{t("mr.buy.loadingCfg")}</span>
                    )}
                  </div>

                  {/* Occupancy bar */}
                  {cfg && !soldOut && (
                    <>
                      <div className="h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${occupiedPct}%`,
                            background: `rgba(${meta.rgb}, ${isActive ? 0.8 : 0.45})`,
                            transition: "background 0.2s",
                          }}
                        />
                      </div>
                      <div className="text-[8px] text-white/20 mt-0.5 tabular-nums">{occupiedPct}% sold</div>
                    </>
                  )}
                </div>

                {/* Price column */}
                <div className="shrink-0 text-right leading-none pl-1">
                  <div
                    className="text-[17px] font-bold tabular-nums leading-none"
                    style={{ color: isActive ? `rgb(${meta.rgb})` : "rgba(255,255,255,0.85)" }}
                  >
                    {priceLabel}
                  </div>
                  <div className="text-[8px] text-white/25 mt-1 font-mono uppercase tracking-[0.2em]">USDT</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Status strip ── */}
        <div className="px-4 pb-2">
          {step === "approving" && (
            <div className="flex items-center gap-2.5 rounded-xl border border-blue-500/25 bg-blue-500/8 px-3.5 py-2.5 text-[11px] text-blue-200">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400 shrink-0" />
              <span>{t("mr.buy.approving")}</span>
            </div>
          )}
          {step === "buying" && (
            <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3.5 py-2.5 text-[11px] text-amber-200">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400 shrink-0" />
              <span>{t("mr.buy.sending")}</span>
            </div>
          )}
          {step === "done" && (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3.5 py-2.5 text-[11px] text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>{t("mr.buy.confirmed")}</span>
            </div>
          )}
          {step === "select" && !selected && (
            <div className="flex items-center gap-1.5 text-[10px] text-white/25 px-1">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span>{t("mr.buy.selectHint")}</span>
            </div>
          )}
        </div>

        {/* ── Action buttons ── */}
        <div className="flex gap-2.5 px-4 pb-5 pt-1">
          <Button
            variant="ghost"
            onClick={onSkip}
            disabled={busy}
            className="flex-[0_0_auto] w-24 h-11 text-sm border border-white/10 hover:bg-white/5 text-white/50 hover:text-white/80"
          >
            {t("mr.buy.later")}
          </Button>
          <Button
            className="flex-1 h-11 font-semibold gap-2 text-sm bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.35)] disabled:opacity-40 disabled:shadow-none transition-all"
            disabled={!selected || busy || step === "done"}
            onClick={handleBuy}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                <ShieldCheck className="h-4 w-4" />
                {t("mr.buy.approveBuy")}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
