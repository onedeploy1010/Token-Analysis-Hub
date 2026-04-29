import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight } from "lucide-react";
import { emitOpenPurchase } from "@/lib/rune/purchase-signal";
import { useLanguage } from "@/contexts/language-context";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Friendly one-shot reminder for bound-but-unpurchased users on /dashboard.
 * Concise version per user 2026-04-29: title + one-line explanation + CTA.
 */
export function NoNodeReminder({ open, onClose }: Props) {
  const { t } = useLanguage();
  const tx = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="bg-[#080f1e] border border-amber-500/40 max-w-sm p-0 overflow-hidden">
        <div className="absolute -top-16 -right-12 w-40 h-40 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="relative p-5 space-y-3">
          <div className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-amber-300" />
            </div>
            <DialogTitle className="text-base font-bold text-white">
              {tx("mr.noNode.title", "持有节点才能拿返佣")}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-white/70 leading-relaxed">
            {tx("mr.noNode.desc", "下线买节点 → 按档位返佣 5%-15%。还没有节点，先买一个。")}
          </DialogDescription>
          <div className="flex gap-2 pt-1">
            <Button
              onClick={() => { emitOpenPurchase(); onClose(); }}
              className="flex-1 h-10 bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-1"
            >
              {tx("mr.noNode.cta", "购买节点")} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="h-10 px-3 text-xs text-white/60 hover:text-white/85 hover:bg-white/5"
            >
              {tx("mr.noNode.later", "稍后")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
