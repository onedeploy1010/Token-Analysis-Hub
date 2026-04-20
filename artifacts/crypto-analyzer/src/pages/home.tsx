import { useEffect, useState } from "react";
import { useGetProjectsSummary, useListProjects } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCompactCurrency, formatPercent, formatNumber } from "@/lib/format";
import { Activity, ArrowUpRight, BarChart3, TrendingUp, Layers, Grid2X2 as Grid } from "lucide-react";
import { ProjectCard } from "@/components/shared/project-card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, useAnimation, useInView } from "framer-motion";
import { useRef } from "react";

function AnimatedCounter({ value, isCurrency = false, isPercent = false }: { value: number | string, isCurrency?: boolean, isPercent?: boolean }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [displayValue, setDisplayValue] = useState(0);
  
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g,"")) : value;
  const stringPrefix = typeof value === 'string' && value.startsWith('$') ? '$' : '';
  const stringSuffix = typeof value === 'string' && value.endsWith('%') ? '%' : (typeof value === 'string' && value.match(/[KMB]$/) ? value.match(/[KMB]$/)?.[0] : '');

  useEffect(() => {
    if (!isInView || isNaN(numValue)) return;
    
    let startTime: number;
    const duration = 1500;
    
    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      // easeOutExpo
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(numValue * easeProgress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [isInView, numValue]);

  if (isNaN(numValue)) return <span ref={ref}>{value}</span>;

  let formatted = displayValue.toFixed(isPercent ? 2 : (numValue > 1000 ? 0 : 2));
  if (isCurrency && !stringPrefix) formatted = `$${formatted}`;
  
  return <span ref={ref}>{stringPrefix}{formatted}{stringSuffix}</span>;
}

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
    <div className="container mx-auto px-4 py-8 space-y-16">
      {/* Hero Section */}
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
              <span className="animate-pulse-glow absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Live Data / 实时数据</span>
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl text-foreground">
            <motion.span 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="block"
            >
              Institutional-Grade
            </motion.span>
            <motion.span 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-primary block mt-2"
            >
              DeFi Intelligence
            </motion.span>
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="block text-2xl lg:text-3xl text-muted-foreground font-medium mt-4 font-sans"
            >
              机构级去中心化金融研究平台
            </motion.span>
          </h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-lg text-muted-foreground max-w-2xl leading-relaxed"
          >
            Discover, analyze, and simulate returns for high-yield DeFi projects. Real-time APY tracking, risk assessment, and impermanent loss calculators built for serious capital.
            <br/><span className="text-sm mt-2 block opacity-80">发现、分析并模拟高收益 DeFi 项目的回报。专为严肃资本打造的实时年化追踪、风险评估和无常损失计算器。</span>
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="flex flex-wrap gap-4 pt-4"
          >
            <Link href="/projects" className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.4)] transition-all hover:bg-primary/90 hover:shadow-[0_0_25px_rgba(var(--primary),0.6)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
              Explore Projects 探索项目
            </Link>
            <Link href="/tools" className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background/50 backdrop-blur px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
              Launch Simulators 启动模拟器
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* Global Stats */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight border-l-4 border-primary pl-4 flex flex-col">
          <span className="text-foreground">Market Overview</span>
          <span className="text-sm font-normal text-muted-foreground">市场概览 Global DeFi metrics</span>
        </h2>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isSummaryLoading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-[120px] w-full rounded-xl bg-card border border-border" />)
          ) : summary ? (
            <>
              <Card className="bg-card/80 backdrop-blur-sm border-border shadow-sm border-t-[3px] border-t-primary hover:bg-card transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex flex-col gap-1">
                    <span>Total Value Locked</span>
                    <span className="text-[10px] opacity-70">总锁仓量</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-mono">
                    <AnimatedCounter value={summary.totalTvl} />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/80 backdrop-blur-sm border-border shadow-sm border-t-[3px] border-t-chart-2 hover:bg-card transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex flex-col gap-1">
                    <span>Average Market APY</span>
                    <span className="text-[10px] opacity-70">市场平均年化</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-mono text-chart-2">
                    <AnimatedCounter value={summary.avgApy} isPercent />%
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/80 backdrop-blur-sm border-border shadow-sm border-t-[3px] border-t-chart-3 hover:bg-card transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex flex-col gap-1">
                    <span>Tracked Projects</span>
                    <span className="text-[10px] opacity-70">追踪项目</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-mono">
                    <AnimatedCounter value={summary.totalProjects} />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/80 backdrop-blur-sm border-border shadow-sm border-t-[3px] border-t-chart-4 hover:bg-card transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex flex-col gap-1">
                    <span>Top Category</span>
                    <span className="text-[10px] opacity-70">热门赛道</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold uppercase tracking-wider truncate pt-1">
                    {Object.entries(summary.categoryCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || "DEX"}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </section>

      {/* Trending Projects */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <h2 className="text-2xl font-semibold tracking-tight border-l-4 border-chart-2 pl-4 flex flex-col">
            <span className="text-foreground">Trending Opportunities</span>
            <span className="text-sm font-normal text-muted-foreground">热门机会 Highest yield changes 24h</span>
          </h2>
          <Link href="/projects" className="text-sm font-medium text-primary hover:underline inline-flex items-center">
            View All 查看全部 <ArrowUpRight className="ml-1 h-4 w-4" />
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
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
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
