import { useTranslation } from "react-i18next";
import { cn } from "@dashboard/lib/utils";

export interface SubTabItem<K extends string = string> {
  key: K;
  icon: React.ComponentType<{ className?: string }>;
  /** i18n key */
  labelKey: string;
  /** English fallback if the key is missing */
  fallback: string;
}

/**
 * Shared sub-tab pill row used on Vault, Profile-Referral, Profile-Nodes
 * (and anywhere else that needs an in-page tab strip). `flex-1 basis-0`
 * gives every tab true equal width regardless of label length; both
 * states declare the same `border` (transparent vs amber) so the
 * content box is identical pixel-for-pixel and the active highlight
 * doesn't drift relative to the cell.
 */
export function DashboardSubTabs<K extends string>({
  tabs,
  active,
  onChange,
  testIdPrefix,
}: {
  tabs: ReadonlyArray<SubTabItem<K>>;
  active: K;
  onChange: (key: K) => void;
  testIdPrefix?: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-1.5 rounded-xl border border-border/55 bg-card/60 p-1 surface-3d">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              "flex-1 basis-0 min-w-0 inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 transition-colors",
              isActive
                ? "border-amber-500/40 bg-gradient-to-br from-amber-500/20 via-amber-600/15 to-amber-700/10 text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-card/80",
            )}
            data-testid={testIdPrefix ? `${testIdPrefix}-${tab.key}` : undefined}
          >
            <Icon className={cn("hidden sm:block h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
            <span className="text-[12px] font-bold tracking-wide whitespace-nowrap truncate">
              {t(tab.labelKey, tab.fallback)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
