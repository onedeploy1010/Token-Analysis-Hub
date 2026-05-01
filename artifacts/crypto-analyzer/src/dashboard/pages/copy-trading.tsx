/**
 * Copy Trading Page — Setup wizard + Dashboard (tab switching)
 */

import { Hourglass } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Copy Trading Page — 2026-05-01: temporarily disabled.
 *
 * The full setup wizard + dashboard implementation lives at
 * `dashboard/components/strategy/copy-trading-{flow,dashboard}.tsx`. To
 * re-enable, restore the original imports + state-based tab switcher (see
 * git history for this file). Until the production trading agent is
 * cleared for live use, render a "coming soon" panel so users see the
 * feature exists but can't act on it.
 */
export default function CopyTradingPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background text-foreground pb-24 lg:pb-8">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/8 to-transparent p-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
            <Hourglass className="h-5 w-5 text-amber-300" />
          </div>
          <h1 className="text-base font-bold text-foreground">
            {t("common.notReady.title", "暂未开放")}
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
            {t("copyTrading.comingSoon", "TAICLAW AI 跟单交易功能即将上线，敬请期待。")}
          </p>
        </div>
      </div>
    </div>
  );
}
