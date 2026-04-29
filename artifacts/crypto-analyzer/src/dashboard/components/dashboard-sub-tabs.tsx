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
 * Shared sub-tab pill row used on Vault page, Profile-Referral page,
 * Profile-Nodes page (and anywhere else that needs an in-page tab strip).
 * Same `bg-card/60` + amber-active style as the rest of the dashboard so
 * the visual rhythm stays consistent — `grid-cols-${n}` on the wrapper
 * keeps every tab at exactly equal width regardless of label length.
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
  const cols =
    tabs.length === 2 ? "grid-cols-2"
    : tabs.length === 3 ? "grid-cols-3"
    : tabs.length === 4 ? "grid-cols-4"
    : "grid-cols-5";

  return (
    <div className={cn("grid gap-1.5 rounded-xl border border-border/55 bg-card/60 p-1 surface-3d", cols)}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              // `flex w-full` (not inline-flex) so the button fills its
              // grid cell — `inline-flex` shrinks to content and makes the
              // active tab visibly off-centre when the label is shorter.
              "flex w-full min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 transition-all",
              isActive
                ? "bg-gradient-to-br from-amber-500/20 via-amber-600/15 to-amber-700/10 ring-1 ring-amber-500/35 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-card/80",
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
