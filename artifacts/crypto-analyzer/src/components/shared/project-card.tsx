import { Link } from "wouter";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ArrowUpRight, FlaskConical, ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { formatPercent } from "@/lib/format";
import { Project, ProjectRiskLevel } from "@workspace/api-client-react";

const DEEP_ANALYSIS_ROUTES: Record<string, string> = {
  RUNE: "/projects/rune",
  B18:  "/projects/b18",
  HYPE: "/projects/hyperliquid",
  ATM:  "/projects/legend-atm",
};

interface ProjectCardProps {
  project: Project;
}

const CATEGORY_META: Record<string, { color: string; bg: string; glow: string; border: string }> = {
  vault:          { color: "text-purple-400",  bg: "bg-purple-500",       glow: "group-hover:shadow-[0_8px_32px_rgba(168,85,247,0.18)]",  border: "group-hover:border-purple-500/40" },
  dex:            { color: "text-amber-400",   bg: "bg-amber-500",        glow: "group-hover:shadow-[0_8px_32px_rgba(245,158,11,0.18)]",  border: "group-hover:border-amber-500/40" },
  lending:        { color: "text-emerald-400", bg: "bg-emerald-500",      glow: "group-hover:shadow-[0_8px_32px_rgba(52,211,153,0.15)]",  border: "group-hover:border-emerald-500/40" },
  yield:          { color: "text-sky-400",     bg: "bg-sky-500",          glow: "group-hover:shadow-[0_8px_32px_rgba(56,189,248,0.15)]",  border: "group-hover:border-sky-500/40" },
  derivatives:    { color: "text-rose-400",    bg: "bg-rose-500",         glow: "group-hover:shadow-[0_8px_32px_rgba(244,63,94,0.15)]",   border: "group-hover:border-rose-500/40" },
  staking:        { color: "text-indigo-400",  bg: "bg-indigo-500",       glow: "group-hover:shadow-[0_8px_32px_rgba(99,102,241,0.15)]",  border: "group-hover:border-indigo-500/40" },
  infrastructure: { color: "text-amber-400",   bg: "bg-amber-500",        glow: "group-hover:shadow-[0_8px_32px_rgba(245,158,11,0.18)]",  border: "group-hover:border-amber-500/40" },
};

function getCategoryMeta(category: string) {
  return CATEGORY_META[category.toLowerCase()] ?? CATEGORY_META.dex;
}

export function RiskBadge({ level }: { level: ProjectRiskLevel }) {
  const config: Record<ProjectRiskLevel, { label: string; labelZh: string; color: string; icon: typeof ShieldCheck }> = {
    low:    { label: "Low",    labelZh: "低风险", color: "text-emerald-400", icon: ShieldCheck },
    medium: { label: "Medium", labelZh: "中风险", color: "text-amber-400",   icon: Shield },
    high:   { label: "High",   labelZh: "高风险", color: "text-rose-400",    icon: ShieldAlert },
  };
  const { label, labelZh, color, icon: Icon } = config[level];
  return (
    <div className={`flex items-center gap-1 ${color}`}>
      <Icon className="h-3 w-3" />
      <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      <span className="text-[9px] opacity-60">{labelZh}</span>
    </div>
  );
}

export function ProjectCard({ project }: ProjectCardProps) {
  const href = DEEP_ANALYSIS_ROUTES[project.symbol] ?? `/projects/${project.id}`;
  const hasDeepAnalysis = project.symbol in DEEP_ANALYSIS_ROUTES;
  const meta = getCategoryMeta(project.category);

  return (
    <Link href={href}>
      <Card className={`
        corner-brackets h-full bg-card/70 backdrop-blur-sm border-border/60
        hover:bg-card/90 hover:-translate-y-1.5 cursor-pointer overflow-hidden
        group flex flex-col transition-all duration-300
        ${meta.glow} ${meta.border}
      `}>

        {/* Top accent bar */}
        <div className={`h-[2px] w-full ${meta.bg} opacity-60 group-hover:opacity-100 transition-opacity duration-300`} />

        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex justify-between items-start gap-2">

            {/* Left: logo + name + badges */}
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              {project.symbol === "RUNE" ? (
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-black border border-primary/25 shrink-0 shadow-[0_0_10px_rgba(251,191,36,0.15)]">
                  <img src="/rune-logo.png" alt="RUNE" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className={`w-9 h-9 rounded-lg ${meta.bg} bg-opacity-15 border border-current/10 shrink-0 flex items-center justify-center`}>
                  <span className={`text-xs font-bold font-mono ${meta.color}`}>
                    {project.symbol.slice(0, 2)}
                  </span>
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-base leading-tight tracking-tight group-hover:text-primary transition-colors truncate">
                  {project.name}
                </h3>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-[10px] font-mono font-semibold text-muted-foreground tracking-widest">
                    {project.symbol}
                  </span>
                  <span className="text-muted-foreground/30 text-[10px]">·</span>
                  <span className={`inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded ${meta.color} bg-current/10`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.bg}`} />
                    {project.category}
                  </span>
                  {hasDeepAnalysis && (
                    <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-semibold tracking-wider">
                      <FlaskConical className="h-2.5 w-2.5" /> ANALYSIS
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: recommended star */}
            {project.isRecommended && (
              <div className="shrink-0">
                <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <svg className="w-3 h-3 fill-primary text-primary" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 pb-4 px-5">
          {/* Description */}
          <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-5 leading-relaxed">
            {project.description}
          </p>

          {/* APY + TVL metrics */}
          <div className="grid grid-cols-2 gap-3">
            {/* APY */}
            <div className="relative rounded-lg bg-muted/20 border border-border/40 px-3 py-2.5 group-hover:border-primary/20 transition-colors">
              <div className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-1 flex items-center gap-1">
                APY
                <span className="opacity-50">·</span>
                <span className="opacity-60">年化</span>
              </div>
              <div className="text-2xl font-bold num-gold leading-none">
                {formatPercent(project.apy)}
              </div>
            </div>

            {/* TVL */}
            <div className="rounded-lg bg-muted/20 border border-border/40 px-3 py-2.5 group-hover:border-border/60 transition-colors">
              <div className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-1 flex items-center gap-1">
                TVL
                <span className="opacity-50">·</span>
                <span className="opacity-60">锁仓</span>
              </div>
              <div className="text-lg font-semibold font-mono text-foreground/90 leading-none num">
                {project.tvl.startsWith("$") ? project.tvl : `$${project.tvl}`}
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="px-5 pb-4 pt-0">
          <div className="w-full flex items-center justify-between pt-3 border-t border-border/40">
            <RiskBadge level={project.riskLevel} />
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground/60 group-hover:text-primary transition-colors">
              {hasDeepAnalysis ? "深度分析" : "查看分析"}
              <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
