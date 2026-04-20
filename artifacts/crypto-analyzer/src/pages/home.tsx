import { useEffect, useState, useRef } from "react";
import { useGetProjectsSummary, useListProjects } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowUp, ArrowDown, TrendingUp, Minus } from "lucide-react";
import { ProjectCard } from "@/components/shared/project-card";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import type { Project } from "@workspace/api-client-react";

function AnimatedCounter({ value, isCurrency = false, isPercent = false }: { value: number | string, isCurrency?: boolean, isPercent?: boolean }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [displayValue, setDisplayValue] = useState(0);
  
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g,"")) : value;
  const stringPrefix = typeof value === 'string' && value.startsWith('$') ? '$' : '';
  const stringSuffix = typeof value === 'string' && value.match(/[KMB]$/) ? value.match(/[KMB]$/)?.[0] : '';

  useEffect(() => {
    if (!isInView || isNaN(numValue)) return;
    let startTime: number;
    const duration = 1500;
    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(numValue * easeProgress);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, numValue]);

  if (isNaN(numValue)) return <span ref={ref}>{value}</span>;
  let formatted = displayValue.toFixed(isPercent ? 2 : (numValue > 1000 ? 0 : 2));
  if (isCurrency && !stringPrefix) formatted = `$${formatted}`;
  return <span ref={ref}>{stringPrefix}{formatted}{stringSuffix}</span>;
}

function getSeededChange(project: Project): number {
  const seed = (project.id * 7919 + project.apy * 1000) % 1000;
  const raw = ((seed / 1000) * 12) - 4;
  return Math.round(raw * 100) / 100;
}

function getRankStyle(rank: number) {
  if (rank === 0) return { bg: "bg-amber-500/15 border-amber-500/40", text: "text-amber-400", label: "1st" };
  if (rank === 1) return { bg: "bg-slate-400/10 border-slate-400/30", text: "text-slate-300", label: "2nd" };
  if (rank === 2) return { bg: "bg-orange-600/10 border-orange-600/30", text: "text-orange-500", label: "3rd" };
  return { bg: "bg-muted/30 border-border/50", text: "text-muted-foreground", label: `${rank + 1}th` };
}

function YieldChangeBadge({ change }: { change: number }) {
  if (change > 0.5) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded px-2 py-0.5 font-mono">
      <ArrowUp className="h-3 w-3" />+{change.toFixed(2)}%
    </span>
  );
  if (change < -0.5) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-400/10 border border-red-400/20 rounded px-2 py-0.5 font-mono">
      <ArrowDown className="h-3 w-3" />{change.toFixed(2)}%
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/40 border border-border/40 rounded px-2 py-0.5 font-mono">
      <Minus className="h-3 w-3" />{change > 0 ? "+" : ""}{change.toFixed(2)}%
    </span>
  );
}

function RiskDot({ level }: { level: string }) {
  const cls =
    level === "low" ? "bg-emerald-400" :
    level === "medium" ? "bg-amber-400" : "bg-red-400";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls} shrink-0`} />;
}

function TrendingRow({ project, rank, delay }: { project: Project; rank: number; delay: number }) {
  const change = getSeededChange(project);
  const { bg, text, label } = getRankStyle(rank);

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link href={project.symbol === "RUNE" ? "/projects/rune" : project.symbol === "B18" ? "/projects/b18" : `/projects/${project.id}`}>
        <div className="group flex items-center gap-4 px-4 py-3.5 rounded-xl border border-border/40 bg-card/50 hover:bg-card hover:border-primary/30 transition-all cursor-pointer">
          {project.symbol === "RUNE" ? (
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-black border border-primary/20 shrink-0">
              <img src="/rune-logo.png" alt="RUNE" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className={`w-9 h-9 rounded-lg border text-xs font-bold flex items-center justify-center shrink-0 ${bg} ${text}`}>
              {label}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-semibold text-sm text-foreground truncate">{project.name}</span>
              <span className="text-[10px] sm:text-[11px] font-mono text-muted-foreground border border-border/50 rounded px-1 sm:px-1.5 py-px shrink-0">{project.symbol}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 hidden sm:inline shrink-0">{project.category}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <RiskDot level={project.riskLevel} />
              <span className="text-[10px] sm:text-[11px] text-muted-foreground capitalize">{project.riskLevel} risk</span>
              <span className="text-muted-foreground/40 text-[10px]">·</span>
              <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono truncate">TVL {project.tvl}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-lg font-bold font-mono text-primary leading-none">{project.apy.toFixed(2)}%</span>
            <YieldChangeBadge change={change} />
          </div>

          <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 ml-1 hidden sm:block" />
        </div>
      </Link>
    </motion.div>
  );
}

export default function Home() {
  const { data: summary, isLoading: isSummaryLoading } = useGetProjectsSummary();
  const { data: allProjects, isLoading: isTrendingLoading } = useListProjects({ sortBy: "trending" });

  const trendingProjects = allProjects?.filter(p => p.trending).slice(0, 6) ?? [];
  const topByApy = allProjects ? [...allProjects].sort((a, b) => b.apy - a.apy).slice(0, 3) : [];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } as const }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-16">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md p-8 md:p-12 lg:p-16 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background/50 to-background pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-chart-2/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur border border-border shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Live Data / 实时数据</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight lg:text-6xl text-foreground">
            <motion.span initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="block">
              Institutional-Grade
            </motion.span>
            <motion.span initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="text-primary block mt-2">
              DeFi Intelligence
            </motion.span>
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.5 }} className="block text-2xl lg:text-3xl text-muted-foreground font-medium mt-4 font-sans">
              机构级去中心化金融研究平台
            </motion.span>
          </h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.5 }} className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Discover, analyze, and simulate returns for high-yield DeFi projects. Real-time APY tracking, risk assessment, and impermanent loss calculators built for serious capital.
            <br /><span className="text-sm mt-2 block opacity-80">发现、分析并模拟高收益 DeFi 项目的回报。专为严肃资本打造的实时年化追踪、风险评估和无常损失计算器。</span>
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.5 }} className="flex flex-wrap gap-4 pt-4">
            <Link href="/projects" className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.4)] transition-all hover:bg-primary/90 hover:shadow-[0_0_25px_rgba(var(--primary),0.6)]">
              Explore Projects 探索项目
            </Link>
            <Link href="/tools" className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background/50 backdrop-blur px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
              Launch Simulators 启动模拟器
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* Market Overview */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight border-l-4 border-primary pl-4 flex flex-col">
          <span className="text-foreground">Market Overview</span>
          <span className="text-sm font-normal text-muted-foreground">市场概览 · Global DeFi metrics</span>
        </h2>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {isSummaryLoading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-[120px] w-full rounded-xl bg-card border border-border" />)
          ) : summary ? (
            <>
              <Card className="bg-card/80 backdrop-blur-sm border-border shadow-sm border-t-[3px] border-t-primary hover:bg-card transition-colors">
                <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex flex-col gap-1"><span>Total Value Locked</span><span className="text-[10px] opacity-70">总锁仓量</span></CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold font-mono"><AnimatedCounter value={summary.totalTvl} /></div></CardContent>
              </Card>
              <Card className="bg-card/80 backdrop-blur-sm border-border shadow-sm border-t-[3px] border-t-chart-2 hover:bg-card transition-colors">
                <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex flex-col gap-1"><span>Average Market APY</span><span className="text-[10px] opacity-70">市场平均年化</span></CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold font-mono text-chart-2"><AnimatedCounter value={summary.avgApy} isPercent />%</div></CardContent>
              </Card>
              <Card className="bg-card/80 backdrop-blur-sm border-border shadow-sm border-t-[3px] border-t-chart-3 hover:bg-card transition-colors">
                <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex flex-col gap-1"><span>Tracked Projects</span><span className="text-[10px] opacity-70">追踪项目</span></CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold font-mono"><AnimatedCounter value={summary.totalProjects} /></div></CardContent>
              </Card>
              <Card className="bg-card/80 backdrop-blur-sm border-border shadow-sm border-t-[3px] border-t-chart-4 hover:bg-card transition-colors">
                <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex flex-col gap-1"><span>Top Category</span><span className="text-[10px] opacity-70">热门赛道</span></CardTitle></CardHeader>
                <CardContent><div className="text-xl font-bold uppercase tracking-wider truncate pt-1">{Object.entries(summary.categoryCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "DEX"}</div></CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </section>

      {/* Trending Opportunities */}
      <section className="space-y-6">
        <div className="flex items-start justify-between border-b border-border/50 pb-4">
          <div className="border-l-4 border-chart-2 pl-4">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-primary/70">热门机会</span>
              <TrendingUp className="h-3 w-3 text-primary/50" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground leading-tight">
              Trending Opportunities
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">Highest yield changes in 24h</p>
          </div>
          <Link href="/projects" className="text-sm font-medium text-primary hover:underline inline-flex items-center shrink-0 mt-1">
            View All <ArrowUpRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        {isTrendingLoading ? (
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-xl bg-card border border-border" />
            ))}
          </div>
        ) : trendingProjects.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
            {/* Leaderboard list */}
            <div className="space-y-2.5">
              {trendingProjects.map((project, i) => (
                <TrendingRow key={project.id} project={project} rank={i} delay={i * 0.07} />
              ))}
            </div>

            {/* Side panel: Top APY snapshot */}
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Top APY Snapshot</span>
                  <span className="text-[10px] text-muted-foreground/60">最高年化速览</span>
                </div>
                {topByApy.map((p, i) => {
                  const change = getSeededChange(p);
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className={`text-xs font-bold w-5 text-center ${i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : "text-orange-500"}`}>
                        #{i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{p.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{p.symbol}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold font-mono text-primary">{p.apy.toFixed(2)}%</div>
                        <YieldChangeBadge change={change} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-chart-2/30 bg-chart-2/5 p-5 space-y-3">
                <span className="text-xs uppercase tracking-widest text-chart-2/80 font-medium">24h Yield Activity</span>
                <span className="block text-[10px] text-muted-foreground/60">24小时收益变动概览</span>
                {allProjects && (() => {
                  const changes = allProjects.map(p => getSeededChange(p));
                  const rising = changes.filter(c => c > 0.5).length;
                  const falling = changes.filter(c => c < -0.5).length;
                  const stable = changes.length - rising - falling;
                  return (
                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(rising / changes.length) * 100}%` }} />
                        </div>
                        <span className="text-xs font-mono text-emerald-400 w-16 text-right">{rising} rising</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
                          <div className="h-full bg-muted-foreground/40 rounded-full transition-all" style={{ width: `${(stable / changes.length) * 100}%` }} />
                        </div>
                        <span className="text-xs font-mono text-muted-foreground w-16 text-right">{stable} stable</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${(falling / changes.length) * 100}%` }} />
                        </div>
                        <span className="text-xs font-mono text-red-400 w-16 text-right">{falling} falling</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center border border-dashed border-border rounded-xl bg-card/30">
            <p className="text-muted-foreground">No trending projects at this time.</p>
          </div>
        )}
      </section>

      {/* Top Recommended Projects */}
      <section className="space-y-6">
        <div className="flex items-start justify-between border-b border-border/50 pb-4">
          <div className="border-l-4 border-primary pl-4">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-primary/70">精选推荐</span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground leading-tight">
              Recommended Projects
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">Curated for you</p>
          </div>
          <Link href="/projects" className="text-sm font-medium text-primary hover:underline inline-flex items-center shrink-0 mt-1">
            View All <ArrowUpRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        {isTrendingLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-[280px] w-full rounded-xl bg-card border border-border" />)}
          </div>
        ) : allProjects && allProjects.filter(p => p.isRecommended).length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {allProjects.filter(p => p.isRecommended).slice(0, 4).map(project => (
              <motion.div key={project.id} variants={itemVariants}>
                <ProjectCard project={project} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="py-12 text-center border border-dashed border-border rounded-xl bg-card/30">
            <p className="text-muted-foreground">No recommended projects at this time.</p>
          </div>
        )}
      </section>
    </div>
  );
}
