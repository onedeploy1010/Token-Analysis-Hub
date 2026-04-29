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

      {/* Tab strip — every button declares the same `border` on both states
          (transparent vs amber) so its content box is identical pixel-for-
          pixel; using `ring` for the active state shifted the visual centre
          relative to inactive cells. `flex` instead of `grid` because
          `flex-1 basis-0` is what guarantees true equal width regardless
          of any pseudo-element / Safari quirks. */}
      <div className="relative px-4 lg:px-6 pt-4">
        <div className="flex gap-1.5 rounded-xl border border-border/55 bg-card/60 p-1 surface-3d">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                title={t(tab.descKey)}
                className={cn(
                  "flex-1 basis-0 min-w-0 inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 transition-colors",
                  isActive
                    ? "border-amber-500/40 bg-gradient-to-br from-amber-500/20 via-amber-600/15 to-amber-700/10 text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-card/80",
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
