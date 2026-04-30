import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Gift, ShieldCheck, ArrowRight, Users } from "lucide-react";
import { emitOpenPurchase } from "@/lib/rune/purchase-signal";
import { useLanguage } from "@/contexts/language-context";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Friendly reminder shown to a bound-but-unpurchased user the first time
 * they land on /dashboard. The dashboard itself stays viewable (referral
 * link + downstream visible) so they understand the flow, but commission
 * eligibility hangs on actually owning a node — this dialog spells that
 * out and offers the buy-node CTA.
 *
 * Dismissable; persists per-session via the parent's flag so we don't
 * nag on every tab switch or rerender.
 */
export function NoNodeReminder({ open, onClose }: Props) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="bg-[#080f1e] border border-amber-500/40 max-w-md p-0 overflow-hidden">
        <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_55%)] pointer-events-none" />

        <div className="relative p-6 space-y-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
                <AlertCircle className="h-4.5 w-4.5 text-amber-300" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                {t("mr.noNode.step")}
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-white leading-snug">
              {t("mr.noNode.title")}
            </DialogTitle>
            <DialogDescription className="text-sm text-white/70 leading-relaxed">
              {t("mr.noNode.desc")}
            </DialogDescription>
          </div>

          <div className="space-y-2.5">
            <Row
              icon={<ShieldCheck className="h-4 w-4 text-emerald-300" />}
              text={t("mr.noNode.point1")}
            />
            <Row
              icon={<Users className="h-4 w-4 text-cyan-300" />}
              text={t("mr.noNode.point2")}
            />
            <Row
              icon={<Gift className="h-4 w-4 text-amber-300" />}
              text={t("mr.noNode.point3")}
            />
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2.5">
            <p className="text-[11px] leading-relaxed text-amber-100/90">
              {t("mr.noNode.hint")}
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <Button
              onClick={() => { emitOpenPurchase(); onClose(); }}
              className="w-full h-11 bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold gap-2"
            >
              {t("mr.noNode.cta")} <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full h-9 text-xs text-white/60 hover:text-white/85 hover:bg-white/5"
            >
              {t("mr.noNode.later")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <p className="text-[12.5px] leading-relaxed text-white/85">{text}</p>
    </div>
  );
}
