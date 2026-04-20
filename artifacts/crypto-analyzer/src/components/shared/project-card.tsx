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
    low: { label: "Low Risk", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    medium: { label: "Med Risk", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    high: { label: "High Risk", color: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
  };

  const { label, color } = config[level];

  return (
    <Badge variant="outline" className={`font-mono uppercase text-[10px] px-1.5 py-0 rounded-sm ${color}`}>
      {label}
    </Badge>
  );
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="h-full bg-card hover:bg-accent/10 border-border hover:border-primary/50 transition-all duration-300 cursor-pointer overflow-hidden group flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1">
              <h3 className="font-bold text-lg leading-none tracking-tight group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-muted-foreground px-1.5 py-0.5 rounded bg-muted/50">
                  {project.symbol}
                </span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  {project.category}
                </span>
              </div>
            </div>
            {project.isRecommended && (
              <div className="bg-primary/20 text-primary p-1.5 rounded-full" title="Recommended Project">
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
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Current APY</p>
              <p className="text-xl font-bold font-mono text-chart-2">
                {formatPercent(project.apy)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">TVL</p>
              <p className="text-lg font-bold font-mono">
                {project.tvl.startsWith("$") ? project.tvl : `$${project.tvl}`}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-0 pb-4 flex justify-between items-center border-t border-border/50 mt-4 px-6 pt-4">
          <RiskBadge level={project.riskLevel} />
          <div className="flex items-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
            Analyze <ArrowUpRight className="ml-1 h-3 w-3" />
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
