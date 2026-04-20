import { useGetProjectsSummary, useListProjects } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCompactCurrency, formatPercent, formatNumber } from "@/lib/format";
import { Activity, ArrowUpRight, BarChart3, TrendingUp, Layers, Grid2X2 as Grid } from "lucide-react";
import { ProjectCard } from "@/components/shared/project-card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Home() {
  const { data: summary, isLoading: isSummaryLoading } = useGetProjectsSummary();
  const { data: trendingProjects, isLoading: isTrendingLoading } = useListProjects({ sortBy: "trending" });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-card p-8 md:p-12 lg:p-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary shadow-sm backdrop-blur-sm">
            <Activity className="mr-2 h-4 w-4" /> Terminal v2.0 Active
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-foreground font-mono">
            Institutional-Grade <br />
            <span className="text-primary">DeFi Intelligence</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Discover, analyze, and simulate returns for high-yield DeFi projects. 
            Real-time APY tracking, risk assessment, and impermanent loss calculators built for serious capital.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <Link href="/projects" className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
              Explore Projects
            </Link>
            <Link href="/tools" className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
              Launch Simulators
            </Link>
          </div>
        </div>
      </section>

      {/* Global Stats */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight font-mono border-b border-border pb-2 inline-flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" /> Market Overview
        </h2>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isSummaryLoading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-[120px] w-full rounded-xl bg-card border border-border" />)
          ) : summary ? (
            <>
              <Card className="bg-card/50 backdrop-blur-sm border-border overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Value Locked</CardTitle>
                  <Layers className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-mono tracking-tighter">
                    {summary.totalTvl.startsWith("$") ? summary.totalTvl : `$${summary.totalTvl}`}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Across all tracked protocols</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-border overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-chart-2/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Average Market APY</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-mono tracking-tighter text-chart-2">
                    {formatPercent(summary.avgApy)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Volume-weighted average</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-border overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tracked Projects</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-mono tracking-tighter">
                    {formatNumber(summary.totalProjects)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{summary.recommendedCount} recommended</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-border overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Top Category</CardTitle>
                  <Grid className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold uppercase tracking-wider truncate">
                    {Object.entries(summary.categoryCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || "DEX"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Most active sector</p>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </section>

      {/* Trending Projects */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h2 className="text-xl font-semibold tracking-tight font-mono inline-flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-chart-2" /> Trending Opportunities
          </h2>
          <Link href="/projects" className="text-sm font-medium text-primary hover:text-primary/80 inline-flex items-center">
            View All <ArrowUpRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        
        {isTrendingLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-[280px] w-full rounded-xl bg-card border border-border" />)}
          </div>
        ) : trendingProjects && trendingProjects.length > 0 ? (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {trendingProjects.slice(0, 4).map(project => (
              <motion.div key={project.id} variants={itemVariants}>
                <ProjectCard project={project} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="py-12 text-center border border-dashed border-border rounded-xl bg-card/30">
            <p className="text-muted-foreground">No trending projects found at this time.</p>
          </div>
        )}
      </section>
    </div>
  );
}
