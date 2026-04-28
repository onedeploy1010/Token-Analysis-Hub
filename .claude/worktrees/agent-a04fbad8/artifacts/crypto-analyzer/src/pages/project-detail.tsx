import { useParams, Link } from "wouter";
import { useGetProject } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/shared/project-card";
import { formatPercent } from "@/lib/format";
import { Activity, ArrowLeft, ExternalLink, ShieldAlert, Star, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/language-context";

/**
 * Bilingual render helper — mirrors the pattern used across home.tsx / projects.tsx.
 * For zh/zh-TW we show the localized label followed by " · ENG" so both scripts
 * appear together. For en we show English only. For ko/ja/th/vi we show only
 * that language's label.
 */
function useBi() {
  const { t, language } = useLanguage();
  const isEn = language === "en";
  const isZh = language === "zh" || language === "zh-TW";
  return {
    t,
    language,
    isEn,
    /** localized label, optionally suffixed with " · <ENG>" when rendering zh/zh-TW */
    bi: (key: string, en: string) => {
      if (isEn) return en;
      if (isZh) return `${t(key)} · ${en}`;
      return t(key);
    },
  };
}

export default function ProjectDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { t, bi, isEn } = useBi();

  const { data: project, isLoading, isError } = useGetProject(id, {
    query: {
      enabled: !!id && !isNaN(id),
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
        <Skeleton className="h-8 w-24 mb-8 bg-card" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-40 w-full rounded-xl bg-card" />
            <Skeleton className="h-64 w-full rounded-xl bg-card" />
          </div>
          <Skeleton className="h-[500px] w-full rounded-xl bg-card" />
        </div>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="container mx-auto px-4 py-20 text-center animate-slide-up">
        <ShieldAlert className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">{bi("mr.detail.notFound", "Project not found")}</h1>
        <p className="text-muted-foreground mb-6">
          {isEn
            ? "The project you are looking for does not exist or has been removed."
            : t("mr.detail.notFoundDesc")}
        </p>
        <Link href="/projects">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> {bi("mr.detail.back", "Back to Projects")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 animate-slide-up">
      <Link href="/projects" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> {bi("mr.detail.back", "Back to Projects")}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-border/50">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground">{project.name}</h1>
                <Badge variant="secondary" className="font-mono text-sm px-2 py-1 bg-muted/50 border-border">
                  {project.symbol}
                </Badge>
                {project.isRecommended && (
                  <Badge className="bg-primary text-primary-foreground">
                    <Star className="mr-1 h-3 w-3 fill-current" /> {bi("mr.detail.recommended", "Recommended")}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <RiskBadge level={project.riskLevel} />
                <Badge variant="outline" className="uppercase tracking-wider text-[10px] bg-background/50 backdrop-blur">
                  {project.category}
                </Badge>
                {project.website && (
                  <a href={project.website} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline inline-flex items-center">
                    {bi("mr.detail.website", "Official Website")} <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl p-4 min-w-[200px] text-center md:text-right shadow-[0_4px_15px_rgba(0,0,0,0.2)] border-t-[3px] border-t-chart-2">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1 flex flex-col md:items-end gap-0.5">
                <span>{isEn ? "Current APY" : "Current APY"}</span>
                {!isEn && <span className="text-[9px] opacity-70">{t("mr.detail.currentApy")}</span>}
              </p>
              <p className="text-4xl font-bold num text-chart-2">
                {formatPercent(project.apy)}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 border-l-4 border-primary pl-4">
              <span className="flex flex-col">
                <span>Intelligence Report</span>
                {!isEn && <span className="text-sm font-normal text-muted-foreground">{t("mr.detail.report")}</span>}
              </span>
            </h2>
            <div className="prose prose-invert max-w-none text-muted-foreground leading-relaxed text-[15px] bg-card/30 p-6 rounded-xl border border-border/50">
              <p>{project.description}</p>
            </div>

            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-4">
                {project.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="bg-accent/50 text-accent-foreground font-normal hover:bg-accent border border-border/50">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Metrics */}
        <div className="space-y-6">
          <Card className="bg-card/80 backdrop-blur border-border shadow-sm">
            <CardHeader className="border-b border-border/50 pb-4 mb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                Key Metrics{!isEn && <span className="text-sm font-normal text-muted-foreground ml-2">{t("mr.detail.metrics")}</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium flex justify-between">
                  <span>Total Value Locked</span>
                  {!isEn && <span className="opacity-70">{t("mr.detail.tvl")}</span>}
                </p>
                <p className="text-2xl font-bold num tracking-tight text-foreground/90">
                  {project.tvl.startsWith("$") ? project.tvl : `$${project.tvl}`}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium flex justify-between">
                  <span>Market Cap</span>
                  {!isEn && <span className="opacity-70">{t("mr.detail.mcap")}</span>}
                </p>
                <p className="text-xl font-medium num tracking-tight">
                  {project.marketCap.startsWith("$") ? project.marketCap : `$${project.marketCap}`}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium flex justify-between">
                  <span>Terminal Rating</span>
                  {!isEn && <span className="opacity-70">{t("mr.detail.rating")}</span>}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xl num text-primary">{project.rating.toFixed(1)}</span>
                  <span className="text-sm font-medium text-muted-foreground">/ 5.0</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-primary/20 bg-gradient-to-b from-card/80 to-background relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Yield Simulator
                {!isEn && <span className="text-sm font-normal text-muted-foreground ml-2">{t("mr.detail.simulator")}</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {t("mr.detail.simDesc").replace("{symbol}", project.symbol)}
              </p>
              <Link href="/tools">
                <Button className="w-full shadow-[0_0_15px_rgba(var(--primary),0.2)] hover:shadow-[0_0_20px_rgba(var(--primary),0.4)] transition-shadow">
                  {bi("mr.detail.launchSim", "Launch Simulator")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
