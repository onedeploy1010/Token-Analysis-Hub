import { useParams, Link } from "wouter";
import { useGetProject } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/shared/project-card";
import { formatPercent } from "@/lib/format";
import { Activity, ArrowLeft, ExternalLink, ShieldAlert, Star, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ProjectDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  
  const { data: project, isLoading, isError } = useGetProject(id, {
    query: {
      enabled: !!id && !isNaN(id),
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
        <Skeleton className="h-8 w-24 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <Skeleton className="h-[500px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Project not found</h1>
        <p className="text-muted-foreground mb-6">The project you are looking for does not exist or has been removed.</p>
        <Link href="/projects">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <Link href="/projects" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-border">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-extrabold tracking-tight">{project.name}</h1>
                <Badge variant="secondary" className="font-mono text-sm px-2 py-1 bg-muted/50 border-border">
                  {project.symbol}
                </Badge>
                {project.isRecommended && (
                  <Badge className="bg-primary text-primary-foreground">
                    <Star className="mr-1 h-3 w-3 fill-current" /> Recommended
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <RiskBadge level={project.riskLevel} />
                <Badge variant="outline" className="uppercase tracking-wider text-xs">
                  {project.category}
                </Badge>
                {project.website && (
                  <a href={project.website} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline inline-flex items-center">
                    Official Website <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
            
            <div className="bg-card border border-border rounded-xl p-4 min-w-[200px] text-center md:text-right">
              <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Current APY</p>
              <p className="text-4xl font-bold font-mono text-chart-2">
                {formatPercent(project.apy)}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold font-mono flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Intelligence Report
            </h2>
            <div className="prose prose-invert max-w-none text-muted-foreground leading-relaxed">
              <p>{project.description}</p>
            </div>
            
            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-4">
                {project.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="bg-accent text-accent-foreground font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Metrics */}
        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-mono">Key Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Total Value Locked</p>
                <p className="text-2xl font-bold font-mono tracking-tight">
                  {project.tvl.startsWith("$") ? project.tvl : `$${project.tvl}`}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Market Cap</p>
                <p className="text-xl font-medium font-mono tracking-tight">
                  {project.marketCap.startsWith("$") ? project.marketCap : `$${project.marketCap}`}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Terminal Rating</p>
                <div className="flex items-center gap-1">
                  <span className="text-xl font-bold font-mono">{project.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">/ 5.0</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border bg-gradient-to-b from-card to-background relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
            <CardHeader>
              <CardTitle className="text-lg font-mono flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Yield Simulator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Run advanced return simulations for {project.symbol} using the Terminal Tools.
              </p>
              <Link href="/tools">
                <Button className="w-full">Launch Simulator</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
