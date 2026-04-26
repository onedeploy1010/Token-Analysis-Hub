import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle, Users, Percent, LayoutGrid } from "lucide-react";
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
  initialNodeId?: NodeId;
  onClose: () => void;
  onPurchased: () => void;
  onSkip: () => void;
}

const ALL_NODE_IDS: readonly NodeId[] = NODE_IDS;
const LEVEL_NUM: Record<string, number> = { initial: 1, mid: 2, advanced: 3, super: 4, founder: 5 };

function fmt18(raw: bigint): string {
  return (raw / 10n ** 18n).toLocaleString("en-US");
}

type Step = "idle" | "approving" | "buying" | "done";

export function PurchaseNodeModal({ open, initialNodeId, onClose, onPurchased, onSkip }: Props) {
  const { t, language } = useLanguage();
  const account = useActiveAccount();
  const [selected, setSelected] = useState<NodeId | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const { data: configs } = useNodeConfigs();
  const { mutateAsync: sendTx } = useSendTransaction();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setSelected(initialNodeId ?? null);
      setStep("idle");
    }
  }, [open, initialNodeId]);

  const configArray = (configs as any) as undefined | {
    nodeId: bigint; payAmount: bigint; maxLimit: bigint; curNum: bigint; directRate: bigint;
  }[];

  const activeId = initialNodeId ?? selected;
  const activeCfg = activeId && configArray
    ? configArray.find((c) => Number(c.nodeId) === activeId)
    : undefined;

  async function handleBuy(nodeId: NodeId, cfg: typeof activeCfg) {
    if (!account || !cfg) return;
    try {
      setStep("approving");
      const allowance = await readUsdtAllowance(account.address);
      if (allowance < cfg.payAmount) {
        await sendTx(prepareContractCall({
          contract: usdtContract,
          method: "function approve(address,uint256)",
          params: [nodePresellContract.address as `0x${string}`, maxUint256],
        }));
      }
      setStep("buying");
      await sendTx(prepareContractCall({
        contract: nodePresellContract,
        method: "function nodePresell(uint256)",
        params: [BigInt(nodeId)],
      }));
      setStep("done");
      toast({
        title: t("mr.buy.toastDone"),
        description: t("mr.buy.toastDoneDesc").replace("{node}", NODE_META[nodeId].nameEn),
      });
      setTimeout(onPurchased, 800);
    } catch (e: any) {
      setStep("idle");
      toast({ title: t("mr.buy.toastFail"), description: e?.message ?? t("mr.buy.toastFailDesc"), variant: "destructive" });
    }
  }

  const busy = step === "approving" || step === "buying";
  const isDirectMode = !!initialNodeId;

  // ── Status strip shared between both modes ──────────────────────────────────
  function StatusStrip({ nodeId }: { nodeId: NodeId | null }) {
    if (step === "approving") return (
      <div className="flex items-center gap-2.5 rounded-xl border border-blue-500/25 bg-blue-500/8 px-3.5 py-2.5 text-[11px] text-blue-200">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400 shrink-0" />
        <span>{t("mr.buy.approving")}</span>
      </div>
    );
    if (step === "buying") return (
      <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3.5 py-2.5 text-[11px] text-amber-200">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400 shrink-0" />
        <span>{t("mr.buy.sending")}</span>
      </div>
    );
    if (step === "done") return (
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3.5 py-2.5 text-[11px] text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
        <span>{t("mr.buy.confirmed")}</span>
      </div>
    );
    if (!nodeId) return (
      <div className="flex items-center gap-1.5 text-[10px] text-white/25 px-1">
        <AlertCircle className="h-3 w-3 shrink-0" />
        <span>{t("mr.buy.selectHint")}</span>
      </div>
    );
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <DialogContent className="bg-[#07101f] border border-white/10 max-w-sm max-h-[88dvh] overflow-y-auto p-0 gap-0 overflow-hidden">

        {isDirectMode
          ? <DirectNodeView
              nodeId={initialNodeId}
              configArray={configArray}
              step={step}
              busy={busy}
              language={language}
              t={t}
              onSkip={onSkip}
              onBuy={() => handleBuy(initialNodeId, activeCfg)}
              StatusStrip={StatusStrip}
            />
          : <PickerView
              selected={selected}
              setSelected={setSelected}
              configArray={configArray}
              step={step}
              busy={busy}
              language={language}
              t={t}
              onSkip={onSkip}
              onBuy={() => selected && handleBuy(selected, activeCfg)}
              StatusStrip={StatusStrip}
            />
        }

      </DialogContent>
    </Dialog>
  );
}

// ── Direct mode: dedicated single-node confirmation ─────────────────────────
function DirectNodeView({
  nodeId, configArray, step, busy, language, t, onSkip, onBuy, StatusStrip,
}: {
  nodeId: NodeId;
  configArray: any;
  step: Step;
  busy: boolean;
  language: string;
  t: (k: string) => string;
  onSkip: () => void;
  onBuy: () => void;
  StatusStrip: React.FC<{ nodeId: NodeId | null }>;
}) {
  const meta = NODE_META[nodeId];
  const cfg = configArray?.find((c: any) => Number(c.nodeId) === nodeId);
  const lv = LEVEL_NUM[meta.level] ?? 1;
  const remaining = cfg ? Number(cfg.maxLimit - cfg.curNum) : null;
  const totalSeats = cfg ? Number(cfg.maxLimit) : 0;
  const occupiedPct = cfg && totalSeats > 0 ? Math.round(((totalSeats - (remaining ?? 0)) / totalSeats) * 100) : 0;
  const directPct = cfg ? Number(cfg.directRate) / 100 : null;
  const price = cfg ? fmt18(cfg.payAmount) : meta.priceUsdt.toLocaleString("en-US");
  const soldOut = cfg && cfg.curNum >= cfg.maxLimit;

  return (
    <>
      {/* Header — tinted with node color */}
      <div
        className="relative px-5 pt-5 pb-4 border-b border-white/[0.07] overflow-hidden"
        style={{ background: `linear-gradient(135deg, rgba(${meta.rgb},0.12) 0%, transparent 60%)` }}
      >
        <div className="flex items-start gap-3">
          {/* Big icon */}
          <div
            className="h-14 w-14 rounded-2xl shrink-0 flex items-center justify-center text-3xl font-bold"
            style={{
              background: `rgba(${meta.rgb}, 0.18)`,
              color: `rgb(${meta.rgb})`,
              border: `1.5px solid rgba(${meta.rgb}, 0.35)`,
              boxShadow: `0 0 24px rgba(${meta.rgb}, 0.3)`,
            }}
          >
            {meta.nameCn.charAt(meta.nameCn.length - 1)}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2 mb-0.5">
              <DialogTitle className="text-lg font-bold text-white leading-none">
                {meta.nameCn}
              </DialogTitle>
              <span className={`text-[9px] font-mono uppercase tracking-[0.2em] ${meta.color}`}>
                {meta.nameEn}
              </span>
              <span className="ml-auto text-[8px] font-mono text-white/30 border border-white/10 rounded px-1.5 py-0.5">
                LV.{lv}
              </span>
            </div>
            <DialogDescription className="text-[11px] text-white/40 leading-snug">
              {language.startsWith("zh") ? "确认购买该节点席位，支付 USDT 即刻激活" : "Confirm purchase — pay USDT to activate instantly"}
            </DialogDescription>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-px bg-white/[0.05] mx-4 mt-4 rounded-xl overflow-hidden border border-white/[0.07]">
        {/* Price */}
        <div className="bg-[#07101f] px-3 py-3 flex flex-col gap-1">
          <span className="text-[9px] text-white/30 uppercase tracking-[0.18em] font-mono">
            {language.startsWith("zh") ? "价格" : "Price"}
          </span>
          <span className="text-[17px] font-bold tabular-nums leading-none" style={{ color: `rgb(${meta.rgb})` }}>
            {price}
          </span>
          <span className="text-[8px] text-white/20 font-mono uppercase tracking-[0.15em]">USDT</span>
        </div>

        {/* Remaining */}
        <div className="bg-[#07101f] px-3 py-3 flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <Users className="h-2.5 w-2.5 text-white/25" />
            <span className="text-[9px] text-white/30 uppercase tracking-[0.18em] font-mono">
              {language.startsWith("zh") ? "剩余" : "Left"}
            </span>
          </div>
          <span className="text-[17px] font-bold tabular-nums leading-none text-white/85">
            {remaining !== null ? remaining.toLocaleString() : "—"}
          </span>
          <span className="text-[8px] text-white/20 font-mono uppercase tracking-[0.15em]">
            {language.startsWith("zh") ? "席位" : "seats"}
          </span>
        </div>

        {/* Commission */}
        <div className="bg-[#07101f] px-3 py-3 flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <Percent className="h-2.5 w-2.5 text-white/25" />
            <span className="text-[9px] text-white/30 uppercase tracking-[0.18em] font-mono">
              {language.startsWith("zh") ? "返佣" : "Comm."}
            </span>
          </div>
          <span className="text-[17px] font-bold tabular-nums leading-none" style={{ color: `rgb(${meta.rgb})` }}>
            {directPct !== null ? `${directPct}%` : "—"}
          </span>
          <span className="text-[8px] text-white/20 font-mono uppercase tracking-[0.15em]">
            {language.startsWith("zh") ? "直推" : "direct"}
          </span>
        </div>
      </div>

      {/* Occupancy bar */}
      {cfg && (
        <div className="px-4 mt-3">
          <div className="flex justify-between text-[9px] text-white/25 mb-1">
            <span>{language.startsWith("zh") ? "席位占用" : "Occupancy"}</span>
            <span className="tabular-nums">{occupiedPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${occupiedPct}%`, background: `rgba(${meta.rgb}, 0.7)` }}
            />
          </div>
        </div>
      )}

      {/* Status + buttons */}
      <div className="px-4 mt-4 pb-5 space-y-3">
        <StatusStrip nodeId={nodeId} />
        {soldOut ? (
          <Button onClick={onSkip} className="w-full h-11 text-sm" variant="outline">
            {language.startsWith("zh") ? "已售罄，返回" : "Sold Out — Go Back"}
          </Button>
        ) : (
          <div className="flex gap-2.5">
            <Button
              variant="ghost"
              onClick={onSkip}
              disabled={busy}
              className="w-24 h-11 text-sm border border-white/10 hover:bg-white/5 text-white/50 hover:text-white/80"
            >
              {t("mr.buy.later")}
            </Button>
            <Button
              className="flex-1 h-11 font-semibold gap-2 text-sm text-black disabled:opacity-40 disabled:shadow-none transition-all"
              style={{
                background: `rgb(${meta.rgb})`,
                boxShadow: `0 0 20px rgba(${meta.rgb}, 0.4)`,
              }}
              disabled={busy || step === "done"}
              onClick={onBuy}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <><ShieldCheck className="h-4 w-4" />{t("mr.buy.approveBuy")}<ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Picker mode: full tier list (fallback when no nodeId pre-selected) ───────
function PickerView({
  selected, setSelected, configArray, step, busy, language, t, onSkip, onBuy, StatusStrip,
}: {
  selected: NodeId | null;
  setSelected: (id: NodeId) => void;
  configArray: any;
  step: Step;
  busy: boolean;
  language: string;
  t: (k: string) => string;
  onSkip: () => void;
  onBuy: () => void;
  StatusStrip: React.FC<{ nodeId: NodeId | null }>;
}) {
  return (
    <>
      {/* Header */}
      <div className="relative px-5 pt-5 pb-4 border-b border-white/[0.07]">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.06] via-transparent to-transparent pointer-events-none" />
        <div className="flex items-center gap-2.5 mb-2">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 shrink-0">
            <LayoutGrid className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div>
            <DialogTitle className="text-[14px] font-bold text-white leading-tight">
              {t("mr.buy.title")}
            </DialogTitle>
          </div>
        </div>
        <DialogDescription className="text-[11px] text-white/40 leading-snug">
          {t("mr.buy.desc")}
        </DialogDescription>
      </div>

      {/* Tier list */}
      <div className="flex flex-col gap-1.5 px-4 py-4">
        {[...ALL_NODE_IDS].sort((a, b) => b - a).map((id) => {
          const meta = NODE_META[id];
          const cfg = configArray?.find((c: any) => Number(c.nodeId) === id);
          const soldOut = cfg && cfg.curNum >= cfg.maxLimit;
          const remaining = cfg ? Number(cfg.maxLimit - cfg.curNum) : 0;
          const directPct = cfg ? Number(cfg.directRate) / 100 : null;
          const isActive = selected === id;
          const lv = LEVEL_NUM[meta.level] ?? 1;

          return (
            <button
              key={id}
              type="button"
              disabled={busy || !!soldOut}
              onClick={() => setSelected(id)}
              className="relative flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 transition-all duration-150 text-left overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                borderColor: isActive ? `rgb(${meta.rgb})` : "rgba(255,255,255,0.08)",
                background: isActive ? `rgba(${meta.rgb}, 0.07)` : "rgba(255,255,255,0.02)",
                boxShadow: isActive ? `0 0 18px rgba(${meta.rgb}, 0.2)` : "none",
              }}
            >
              <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
                style={{ background: `rgb(${meta.rgb})`, opacity: isActive ? 1 : 0.35 }} />
              <span
                className="ml-0.5 h-9 w-9 rounded-lg shrink-0 flex items-center justify-center text-base font-bold"
                style={{
                  background: `rgba(${meta.rgb}, 0.14)`,
                  color: `rgb(${meta.rgb})`,
                  border: `1px solid rgba(${meta.rgb}, 0.28)`,
                  boxShadow: isActive ? `0 0 10px rgba(${meta.rgb}, 0.3)` : "none",
                }}
              >
                {meta.nameCn.charAt(meta.nameCn.length - 1)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[13px] font-bold text-white">{meta.nameCn}</span>
                  <span className={`text-[9px] font-mono uppercase tracking-[0.16em] ${meta.color}`}>{meta.nameEn}</span>
                  <span className="ml-auto text-[8px] font-mono text-white/25 border border-white/10 rounded px-1 py-0.5">LV.{lv}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-white/35">
                  {soldOut ? <span className="text-red-400/80">{t("mr.buy.soldOut")}</span> : cfg ? (
                    <>
                      <span><span className="text-white/70 font-semibold">{remaining}</span> {t("mr.buy.seatsLeft")}</span>
                      {directPct !== null && <><span className="text-white/15">·</span><span>{language.startsWith("zh") ? "返佣 " : "Comm. "}<span className="font-semibold" style={{ color: `rgb(${meta.rgb})` }}>{directPct}%</span></span></>}
                    </>
                  ) : <span>{t("mr.buy.loadingCfg")}</span>}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[15px] font-bold tabular-nums" style={{ color: isActive ? `rgb(${meta.rgb})` : "rgba(255,255,255,0.8)" }}>
                  {cfg ? fmt18(cfg.payAmount) : "—"}
                </div>
                <div className="text-[8px] text-white/20 font-mono uppercase tracking-[0.18em]">USDT</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Status + buttons */}
      <div className="px-4 pb-5 space-y-3">
        <StatusStrip nodeId={selected} />
        <div className="flex gap-2.5">
          <Button variant="ghost" onClick={onSkip} disabled={busy}
            className="w-24 h-11 text-sm border border-white/10 hover:bg-white/5 text-white/50 hover:text-white/80">
            {t("mr.buy.later")}
          </Button>
          <Button
            className="flex-1 h-11 font-semibold gap-2 text-sm bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.35)] disabled:opacity-40 disabled:shadow-none transition-all"
            disabled={!selected || busy || step === "done"}
            onClick={onBuy}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <><ShieldCheck className="h-4 w-4" />{t("mr.buy.approveBuy")}<ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
