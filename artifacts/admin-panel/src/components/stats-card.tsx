import type { LucideIcon } from "lucide-react";

/**
 * KPI tile used across admin dashboards. Tints icon + glow with `color`
 * so different metrics stay distinguishable when grids get dense. Accent
 * ring stays subtle on hover so the dashboard reads as data, not decor.
 */
interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: { value: number; positive: boolean };
  /** Tailwind RGB or hex (e.g. "#fbbf24"). Defaults to amber-400. */
  color?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "#fbbf24",
}: StatsCardProps) {
  return (
    <div className="rounded-2xl p-3.5 lg:p-5 relative overflow-hidden border border-border/60 bg-card/40">
      <div
        aria-hidden
        className="absolute top-0 right-0 w-20 h-20 opacity-[0.08] pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 70%)`,
          filter: "blur(12px)",
        }}
      />

      <div className="relative flex items-start justify-between mb-2.5 lg:mb-3">
        <span className="text-[10px] lg:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight">
          {title}
        </span>
        {Icon && (
          <div
            className="h-7 w-7 lg:h-8 lg:w-8 rounded-lg flex items-center justify-center shrink-0 ml-2"
            style={{ background: `${color}15`, border: `1px solid ${color}25` }}
          >
            <Icon className="h-3.5 w-3.5 lg:h-4 lg:w-4" style={{ color }} />
          </div>
        )}
      </div>
      <div className="relative text-xl lg:text-2xl font-bold text-foreground tracking-tight truncate">
        {value}
      </div>
      {(subtitle || trend) && (
        <div className="relative flex items-center gap-2 mt-1.5 lg:mt-2">
          {trend && (
            <span
              className={`text-[10px] lg:text-xs font-bold px-1.5 py-0.5 rounded ${
                trend.positive
                  ? "text-emerald-400 bg-emerald-500/10"
                  : "text-red-400 bg-red-500/10"
              }`}
            >
              {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
          )}
          {subtitle && (
            <span className="text-[10px] lg:text-xs text-muted-foreground truncate">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
