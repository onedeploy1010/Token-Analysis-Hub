import { useState } from "react";
import { Lock, Flame, Shield, BarChart2 } from "lucide-react";
import { cn } from "@dashboard/lib/utils";
import { RuneLockSection } from "@dashboard/components/vault/rune-lock-section";
import { EmberBurnSection } from "@dashboard/components/vault/ember-burn-section";
import { VaultLpPool } from "@dashboard/components/vault/vault-lp-pool";
import { VaultCharts } from "@dashboard/components/vault/vault-charts";
import { useTranslation } from "react-i18next";

type VaultTab = "pool" | "lock" | "burn";

const TABS: Array<{
  key: VaultTab;
  icon: React.ElementType;
  labelKey: string;
  descKey: string;
}> = [
  { key: "pool", icon: BarChart2, labelKey: "vault.tabPool", descKey: "vault.tabPoolDesc" },
  { key: "lock", icon: Lock,      labelKey: "vault.tabLock", descKey: "vault.tabLockDesc" },
  { key: "burn", icon: Flame,     labelKey: "vault.tabBurn", descKey: "vault.tabBurnDesc" },
];

/**
 * Vault page — restyled to mainnet's amber/card token language. All visible
 * strings flow through `t("vault.*")` keys (en/zh/zh-TW filled; others fall
 * back to en until backfilled).
 */
export default function Vault() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<VaultTab>("pool");

  return (
    <div className="relative pb-24 lg:pb-8">
      {/* Soft ambient glows — mainnet visual signature */}
      <div className="pointer-events-none absolute -top-20 left-[10%] h-[28rem] w-[28rem] rounded-full bg-amber-500/[0.04] blur-[120px]" />
      <div className="pointer-events-none absolute top-[40%] right-[8%] h-[24rem] w-[24rem] rounded-full bg-amber-500/[0.025] blur-[100px]" />

      <style>{`
        @keyframes vaultFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .vault-fade { animation: vaultFadeIn 0.22s ease-out both; }
      `}</style>

      {/* Page header */}
      <div className="relative px-4 lg:px-6 pt-5 pb-4 border-b border-border/40">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-primary" />
          <h2 className="text-base font-bold tracking-tight text-foreground">{t("vault.pageTitle")}</h2>
        </div>
        <p className="text-xs text-muted-foreground">{t("vault.pageSubtitle")}</p>
      </div>

      {/* Tab strip — `grid-cols-3` keeps every cell at exactly 1/3 width
          (independent of label length) so longer translations don't push
          neighbours sideways on a 360px viewport. Icon hides under sm to
          give the label more room on small phones. */}
      <div className="relative px-4 lg:px-6 pt-4">
        <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-border/55 bg-card/60 p-1 surface-3d">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                title={t(tab.descKey)}
                className={cn(
                  // `inline-flex` inside a grid cell shrinks to content width,
                  // so the active tab visibly drifts when its label is shorter
                  // than its neighbours. `flex w-full` forces the button to
                  // fill the cell — every tab is now exactly 1/3 wide.
                  "flex w-full min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 transition-all",
                  isActive
                    ? "bg-gradient-to-br from-amber-500/20 via-amber-600/15 to-amber-700/10 ring-1 ring-amber-500/35 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/80",
                )}
                data-testid={`tab-vault-${tab.key}`}
              >
                <Icon className={cn("hidden sm:block h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                <span className="text-[12px] font-bold tracking-wide whitespace-nowrap truncate">{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div key={activeTab} className="vault-fade pt-4 space-y-4">
        {activeTab === "pool" && (
          <div className="space-y-4 pb-4">
            <VaultLpPool />
            <VaultCharts />
          </div>
        )}
        {activeTab === "lock" && <RuneLockSection />}
        {activeTab === "burn" && <EmberBurnSection />}
      </div>
    </div>
  );
}
