import { Link } from "wouter";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ShieldAlert, Star } from "lucide-react";
import { formatPercent } from "@/lib/format";
import { Project, ProjectRiskLevel } from "@workspace/api-client-react";

interface ProjectCardProps {
  project: Project;
}

export function RiskBadge({ level }: { level: ProjectRiskLevel }) {
  const config = {
    low: { label: "Low Risk 低风险", color: "bg-emerald-500" },
    medium: { label: "Med Risk 中风险", color: "bg-amber-500" },
    high: { label: "High Risk 高风险", color: "bg-rose-500" },
  };

  const { label, color } = config[level];

  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function getCategoryColor(category: string) {
  switch (category.toLowerCase()) {
    case "dex": return "bg-chart-1";
    case "lending": return "bg-chart-2";
    case "yield": return "bg-chart-3";
    case "derivatives": return "bg-chart-4";
    case "infrastructure": return "bg-chart-5";
    default: return "bg-primary";
  }
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="h-full bg-card/80 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--glow-primary)] cursor-pointer overflow-hidden group flex flex-col">
        <CardHeader className="pb-4 relative">
          <div className={`absolute top-0 left-0 w-full h-1 ${getCategoryColor(project.category)} opacity-70`} />
          <div className="flex justify-between items-start gap-2 pt-2">
            <div className="space-y-1">
              <h3 className="font-bold text-lg leading-none tracking-tight group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs font-mono font-semibold text-muted-foreground">
                  {project.symbol}
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-accent-foreground font-medium uppercase tracking-wider bg-accent px-1.5 py-0.5 rounded-sm">
                  <span className={`h-1.5 w-1.5 rounded-full ${getCategoryColor(project.category)}`} />
                  {project.category}
                </span>
              </div>
            </div>
            {project.isRecommended && (
              <div className="bg-primary/10 text-primary p-1.5 rounded-full" title="Recommended Project">
                <Star className="h-3.5 w-3.5 fill-primary" />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 pb-4">
          <p className="text-sm text-muted-foreground line-clamp-3 mb-6">
            {project.description}
          </p>
          
          <div className="grid grid-cols-2 gap-4 mt-auto">
            <div className="space-y-1 border-l-2 border-chart-2 pl-3">
              <p className="text-[10px] flex flex-col font-medium text-muted-foreground uppercase tracking-wider">
                <span>Current APY</span>
                <span className="text-[9px] opacity-80">年化收益率</span>
              </p>
              <p className="text-2xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-br from-primary to-chart-2">
                {formatPercent(project.apy)}
              </p>
            </div>
            <div className="space-y-1 border-l-2 border-border pl-3">
              <p className="text-[10px] flex flex-col font-medium text-muted-foreground uppercase tracking-wider">
                <span>TVL</span>
                <span className="text-[9px] opacity-80">锁仓量</span>
              </p>
              <p className="text-lg font-semibold font-mono text-foreground/90">
                {project.tvl.startsWith("$") ? project.tvl : `$${project.tvl}`}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-0 pb-4 flex justify-between items-center border-t border-border/50 mt-4 px-6 pt-4">
          <RiskBadge level={project.riskLevel} />
          <div className="flex items-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
            分析 Analyze <ArrowUpRight className="ml-1 h-3 w-3" />
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
