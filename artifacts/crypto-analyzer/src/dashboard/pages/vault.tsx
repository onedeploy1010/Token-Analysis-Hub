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
  labelZh: string;
  labelEn: string;
  descZh: string;
  descEn: string;
}> = [
  { key: "pool", icon: BarChart2, labelZh: "金库",  labelEn: "Vault", descZh: "底池沉淀 · 交易资金", descEn: "LP Pools · Trading Fund" },
  { key: "lock", icon: Lock,      labelZh: "锁仓",  labelEn: "Lock",  descZh: "锁仓RUNE · 获得veRUNE", descEn: "Lock RUNE · Earn veRUNE" },
  { key: "burn", icon: Flame,     labelZh: "销毁",  labelEn: "Burn",  descZh: "永久销毁 · 每日EMBER",  descEn: "Burn RUNE · Daily EMBER" },
];

/**
 * Vault page — restyled to mainnet's amber/card token language. Soft amber
 * glow blurs replace TAICLAW's HUD-corner + scan-line aesthetic; tab strip
 * and section frames use `bg-card` + `border-border` semantic tokens so the
 * theme tracks the global tokens in `src/index.css`.
 */
export default function Vault() {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh" || i18n.language === "zh-TW";
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
          <h2 className="text-base font-bold tracking-tight text-foreground">
            {isZh ? "符库" : "VAULT"}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          {isZh ? "锁仓 · 销毁 · 底池沉淀" : "Lock · Burn · LP Accumulation"}
        </p>
      </div>

      {/* Tab strip */}
      <div className="relative px-4 lg:px-6 pt-4">
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/55 bg-card/60 p-1 surface-3d">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "relative flex flex-col items-start gap-1 rounded-lg px-3 py-2.5 text-left transition-all",
                  isActive
                    ? "bg-gradient-to-br from-amber-500/20 via-amber-600/15 to-amber-700/10 ring-1 ring-amber-500/35"
                    : "opacity-60 hover:opacity-90 hover:bg-card/80",
                )}
                data-testid={`tab-vault-${tab.key}`}
              >
                <div
                  className={cn(
                    "h-6 w-6 rounded-md flex items-center justify-center shrink-0",
                    isActive ? "bg-primary/20 ring-1 ring-primary/40" : "bg-muted/40",
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
                </div>
                <span className={cn("text-[11px] font-bold mt-0.5", isActive ? "text-primary" : "text-muted-foreground")}>
                  {isZh ? tab.labelZh : tab.labelEn}
                </span>
                <p className="text-[9px] leading-snug text-muted-foreground">
                  {isZh ? tab.descZh : tab.descEn}
                </p>
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
