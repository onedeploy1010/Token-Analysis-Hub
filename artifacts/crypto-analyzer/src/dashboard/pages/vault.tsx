import { useState } from "react";
import { Lock, Flame, Shield, BarChart2, LineChart, ExternalLink } from "lucide-react";
import { cn } from "@dashboard/lib/utils";
import { RuneLockSection } from "@dashboard/components/vault/rune-lock-section";
import { EmberBurnSection } from "@dashboard/components/vault/ember-burn-section";
import { VaultLpPool } from "@dashboard/components/vault/vault-lp-pool";
import { VaultCharts, VaultRecruitment } from "@dashboard/components/vault/vault-charts";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { PageEnter, SubTabSwitch } from "@dashboard/components/page-enter";

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
    <PageEnter>
    <div className="relative overflow-hidden pb-24 lg:pb-8">
      {/* Brighter, layered ambient glows for the new "premium reactor" feel.
          overflow-hidden on the wrapper clips them inside the viewport. */}
      <div className="pointer-events-none absolute -top-24 left-[8%] h-[30rem] w-[30rem] rounded-full bg-amber-500/[0.10] blur-[120px]" />
      <div className="pointer-events-none absolute top-[28%] right-[6%] h-[26rem] w-[26rem] rounded-full bg-amber-400/[0.07] blur-[100px]" />
      <div className="pointer-events-none absolute top-[60%] left-[18%] h-[22rem] w-[22rem] rounded-full bg-orange-500/[0.05] blur-[110px]" />

      {/* Animated diagonal scan-line for "tech" texture */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, transparent 0%, transparent 38%, rgba(251,191,36,0.05) 50%, transparent 62%, transparent 100%)",
          backgroundSize: "250% 100%",
          mixBlendMode: "screen",
        }}
        animate={{ backgroundPosition: ["180% 0%", "-80% 0%"] }}
        transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
      />

      <style>{`
        @keyframes vaultFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .vault-fade { animation: vaultFadeIn 0.22s ease-out both; }
        @keyframes vaultPulseLine { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
      `}</style>

      {/* Page header — premium reactor strip */}
      <div className="relative px-4 lg:px-6 pt-5 pb-4">
        {/* Top + bottom edge accent lines */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-300/85 to-transparent" />
        <div className="pointer-events-none absolute inset-x-[12%] top-[1.5px] h-px bg-gradient-to-r from-transparent via-amber-200/45 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-500/35 to-transparent" style={{ animation: "vaultPulseLine 3.4s ease-in-out infinite" }} />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Reactor-style icon container */}
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center ring-2 ring-amber-400/55"
              style={{
                background: "linear-gradient(135deg, rgba(251,191,36,0.32), rgba(180,90,10,0.18))",
                boxShadow: "0 4px 16px hsl(38 95% 55% / 0.45), inset 0 1px 0 rgba(255,255,255,0.20)",
              }}
            >
              <Shield className="h-4 w-4 text-amber-200" strokeWidth={2.4} />
            </div>
            <div>
              <h2
                className="text-[18px] font-black leading-tight tracking-[0.02em]"
                style={{
                  background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 40%, #fbbf24 65%, #d97706 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.5))",
                }}
              >
                {t("vault.pageTitle")}
              </h2>
              <p className="text-[10px] text-amber-200/65 mt-0.5 tracking-wide">
                {t("vault.pageSubtitle")}
              </p>
            </div>
          </div>
          {/* 查看分析 — links to mainnet RUNE project analytics page.
              Opens in a NEW TAB intentionally:
                1) Keeps the user's place on /app/vault (no lost scroll/tab
                   selection when they come back).
                2) Defence-in-depth against any global onboarding effect
                   firing on the freshly-mounted /projects/rune page and
                   stealing navigation back to /app/profile (the original
                   bug the user reported). The new-tab boot is fully
                   isolated from the dashboard's mounted state. */}
          <a
            href="/projects/rune"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all hover:scale-[1.03] active:scale-95"
            style={{
              background: "linear-gradient(135deg, rgba(96,165,250,0.20), rgba(59,130,246,0.10))",
              border: "1px solid rgba(96,165,250,0.45)",
              color: "rgb(147,197,253)",
              boxShadow: "0 0 16px rgba(59,130,246,0.30), inset 0 1px 0 rgba(255,255,255,0.10)",
            }}
            data-testid="link-view-analysis"
          >
            <LineChart className="h-3 w-3" />
            <span className="tracking-wide">{t("vault.viewAnalysis", "View Analysis")}</span>
            <ExternalLink className="h-2.5 w-2.5 opacity-70 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
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
      <div className="pt-4 space-y-4">
        <SubTabSwitch tabKey={activeTab}>
          {activeTab === "pool" && (
            <div className="space-y-4 pb-4">
              {/* Recruitment + LP target progress pinned to the top of the
                  pool tab so users see where the launch trigger stands
                  before scrolling into pool-composition details. */}
              <VaultRecruitment />
              <VaultLpPool />
              <VaultCharts />
            </div>
          )}
          {activeTab === "lock" && <RuneLockSection />}
          {activeTab === "burn" && <EmberBurnSection />}
        </SubTabSwitch>
      </div>
    </div>
    </PageEnter>
  );
}
