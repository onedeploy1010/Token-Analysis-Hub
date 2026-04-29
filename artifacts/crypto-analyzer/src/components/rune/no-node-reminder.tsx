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

  const tx = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

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
                {tx("mr.noNode.step", "温馨提示")}
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-white leading-snug">
              {tx("mr.noNode.title", "你已绑定推荐关系，还差一步")}
            </DialogTitle>
            <DialogDescription className="text-sm text-white/70 leading-relaxed">
              {tx(
                "mr.noNode.desc",
                "现在可以查看推荐关系并分享你的邀请链接，但要获得返佣，必须先持有节点。",
              )}
            </DialogDescription>
          </div>

          <div className="space-y-2.5">
            <Row
              icon={<ShieldCheck className="h-4 w-4 text-emerald-300" />}
              text={tx("mr.noNode.point1", "已绑定上级 — 可在概览查看你的推荐关系链")}
            />
            <Row
              icon={<Users className="h-4 w-4 text-cyan-300" />}
              text={tx("mr.noNode.point2", "可分享邀请链接 — 但下线购买节点时你不会获得直推奖励")}
            />
            <Row
              icon={<Gift className="h-4 w-4 text-amber-300" />}
              text={tx(
                "mr.noNode.point3",
                "持有节点后才解锁返佣 — 直推最高 15%，下线越多奖励越高",
              )}
            />
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2.5">
            <p className="text-[11px] leading-relaxed text-amber-100/90">
              {tx(
                "mr.noNode.hint",
                "节点等级越高，直推返佣比例越高（符胚 5% → 符主 15%）。先购买节点，邀请链接每一笔成交都会即时返佣到你的钱包。",
              )}
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <Button
              onClick={() => { emitOpenPurchase(); onClose(); }}
              className="w-full h-11 bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold gap-2"
            >
              {tx("mr.noNode.cta", "立即购买节点")} <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full h-9 text-xs text-white/60 hover:text-white/85 hover:bg-white/5"
            >
              {tx("mr.noNode.later", "稍后再说，先逛逛")}
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
