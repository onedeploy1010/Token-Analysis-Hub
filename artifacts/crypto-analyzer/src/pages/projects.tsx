import { useState, useMemo } from "react";
import { useListProjects } from "@rune/api-client-react";
import { ProjectCard } from "@/components/shared/project-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, SlidersHorizontal, ArrowRight, Zap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/language-context";

export default function Projects() {
  const { t, language } = useLanguage();
  const isEn = language === "en";

  const categoryMap: Record<string, () => string> = {
    "all": () => `${t("mr.cat.all")}${!isEn ? " · ALL" : ""}`,
    "Vault": () => `Vault${!isEn ? ` · ${t("mr.cat.vault")}` : ""}`,
    "DEX": () => `DEX${!isEn ? ` · ${t("mr.cat.dex")}` : ""}`,
    "Lending": () => `Lending${!isEn ? ` · ${t("mr.cat.lending")}` : ""}`,
    "Yield": () => `Yield${!isEn ? ` · ${t("mr.cat.yield")}` : ""}`,
    "Derivatives": () => `Derivatives${!isEn ? ` · ${t("mr.cat.derivatives")}` : ""}`,
    "Staking": () => `Staking${!isEn ? ` · ${t("mr.cat.staking")}` : ""}`,
    "Infrastructure": () => `Infrastructure`,
  };

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("trending");

  const { data: projects, isLoading } = useListProjects({
    category: category !== "all" ? category : undefined,
    sortBy: sortBy as any,
  });

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.symbol.toLowerCase().includes(search.toLowerCase()) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))
    );
  }, [projects, search]);

  const categories = ["all", "Vault", "DEX", "Lending", "Yield", "Derivatives", "Staking"];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 animate-slide-up">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/50 pb-6">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            {!isEn && <span className="text-[11px] font-semibold uppercase tracking-widest text-primary/70">PROJECT INTELLIGENCE</span>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
            {t("mr.projects.label")}
          </h1>
          <p className="text-sm text-muted-foreground pt-1">{t("mr.projects.sub")}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={isEn ? "Search projects, symbols..." : t("mr.projects.search")}
              className="pl-9 bg-card/50 backdrop-blur-sm border-border w-full focus-visible:ring-primary shadow-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[160px] bg-card/50 backdrop-blur-sm border-border shadow-sm">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder={isEn ? "Sort by" : t("mr.projects.sort.trending")} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trending">{isEn ? "Trending" : `Trending · ${t("mr.projects.sort.trending")}`}</SelectItem>
              <SelectItem value="newest">{isEn ? "Newest" : `Newest · ${t("mr.projects.sort.newest")}`}</SelectItem>
              <SelectItem value="rating">{isEn ? "Rating" : `Rating · ${t("mr.projects.sort.rating")}`}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── RUNE Featured Hero ── */}
      <Link href="/projects/rune">
        <div className="relative w-full overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-background via-[#0f172a] to-[#1e1b4b] cursor-pointer group hover:border-primary/60 transition-all duration-500 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
          {/* Glow orb */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/12 rounded-full blur-[100px] pointer-events-none group-hover:bg-primary/22 transition-colors duration-700 -translate-y-1/2 translate-x-1/3" />
          {/* Shimmer sweep */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.035)_50%,transparent_100%)] -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
          {/* Watermark */}
          <div className="absolute right-4 bottom-0 text-[120px] sm:text-[160px] font-black italic text-white/[0.022] select-none pointer-events-none leading-none tracking-tighter translate-y-6">RUNE</div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-stretch">

            {/* ── Left: identity + copy ── */}
            <div className="flex-1 p-6 sm:p-8 space-y-4">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/20 border border-primary/30 text-primary text-[11px] font-bold uppercase tracking-wider">
                <Zap className="h-3 w-3" /> {t("mr.projects.featured")}{!isEn && " · FEATURED ANALYSIS"}
              </div>

              {/* Logo + title */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-black border border-primary/25 shadow-[0_0_16px_rgba(251,191,36,0.18)] shrink-0">
                  <img src="/rune-logo-new.png" alt="RUNE Protocol" className="w-full h-full object-contain" />
                </div>
                <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-white leading-tight">
                  RUNE Protocol <span className="text-primary/70">—</span> <span className="text-primary">{t("mr.projects.rune.subtitle")}</span>
                </h2>
              </div>

              {/* Description */}
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-lg">
                {t("mr.projects.rune.desc")}
              </p>

              {/* Tags — keep symbol-like tags as-is across locales */}
              <div className="flex flex-wrap gap-1.5">
                {["Dual-Token", "Node Staking", "AMM", "Layer1", "Cross-chain"].map(tag => (
                  <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary/80 font-medium">{tag}</span>
                ))}
              </div>

              {/* Mobile-only stats row */}
              <div className="md:hidden pt-2 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-widest">APY</p>
                    <p className="text-lg font-bold font-mono text-primary leading-tight mt-0.5">170.82%</p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-white/[0.02] px-3 py-2">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-widest">TVL</p>
                    <p className="text-lg font-bold font-mono text-foreground/85 leading-tight mt-0.5">$312M</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 text-primary text-sm font-semibold">
                  {t("mr.action.viewFull")}{!isEn && " · FULL ANALYSIS"} <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* ── Right: sparkline + stats panel (desktop only) ── */}
            <div className="hidden md:flex flex-col justify-center gap-5 px-8 py-6 border-l border-primary/15 shrink-0 w-[300px] bg-white/[0.018] relative">
              {/* Animated sparkline — 6 stage price trajectory */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/60 font-medium">
                    Price Trajectory
                  </span>
                  <span className="text-[11px] font-mono text-primary font-semibold">+12,000%</span>
                </div>
                <div className="relative h-16 w-full">
                  <svg viewBox="0 0 240 64" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="sparkLineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%"  stopColor="hsl(38, 92%, 58%)" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="hsl(38, 92%, 58%)" stopOpacity="1" />
                      </linearGradient>
                      <linearGradient id="sparkAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"  stopColor="hsl(38, 92%, 58%)" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="hsl(38, 92%, 58%)" stopOpacity="0" />
                      </linearGradient>
                      <filter id="sparkGlow">
                        <feGaussianBlur stdDeviation="1.6" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>
                    {/* Baseline grid */}
                    <line x1="0" y1="60" x2="240" y2="60" stroke="hsl(38, 92%, 58%)" strokeOpacity="0.1" strokeDasharray="2 3" />
                    {/* Filled area */}
                    <motion.path
                      d="M 0 60 L 0 58 L 48 56 L 96 50 L 144 38 L 192 18 L 240 4 L 240 64 L 0 64 Z"
                      fill="url(#sparkAreaGrad)"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                    />
                    {/* Stroke line — drawing animation */}
                    <motion.path
                      d="M 0 58 L 48 56 L 96 50 L 144 38 L 192 18 L 240 4"
                      fill="none"
                      stroke="url(#sparkLineGrad)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#sparkGlow)"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    />
                    {/* Stage dots */}
                    {[
                      { x: 0,   y: 58 },
                      { x: 48,  y: 56 },
                      { x: 96,  y: 50 },
                      { x: 144, y: 38 },
                      { x: 192, y: 18 },
                      { x: 240, y: 4  },
                    ].map((p, i) => (
                      <motion.circle
                        key={i}
                        cx={p.x} cy={p.y} r="2.5"
                        fill="hsl(38, 92%, 58%)"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.4 + i * 0.18 }}
                        style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                      />
                    ))}
                    {/* Pulsing target dot at the peak */}
                    <motion.circle
                      cx="240" cy="4" r="4"
                      fill="hsl(38, 92%, 58%)"
                      animate={{ scale: [1, 2.4, 1], opacity: [0.7, 0, 0.7] }}
                      transition={{ duration: 2.0, repeat: Infinity, ease: "easeInOut", delay: 1.8 }}
                      style={{ transformOrigin: "240px 4px" }}
                    />
                  </svg>
                </div>
                <div className="flex justify-between text-[11px] font-mono text-muted-foreground/50 -mt-1">
                  <span>$0.028</span>
                  <span className="text-primary/60">$4.56</span>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/15 to-transparent" />

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest">{t("mr.metric.apy.label")}</p>
                  <p className="text-2xl font-bold font-mono text-primary leading-none">170.82%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest">{t("mr.metric.tvl.label")}</p>
                  <p className="text-2xl font-bold font-mono text-foreground/85 leading-none">$312M</p>
                </div>
              </div>

              {/* CTA */}
              <div className="inline-flex items-center gap-2 text-primary font-semibold text-sm group-hover:gap-3 transition-all whitespace-nowrap pt-1">
                {t("mr.action.viewFull")}{!isEn && " · FULL ANALYSIS"} <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

          </div>
        </div>
      </Link>

      {/* ── Category filter — mobile: Select dropdown / desktop: tab row ── */}
      <div className="mt-10">
        {/* Mobile */}
        <div className="sm:hidden">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full bg-card/50 backdrop-blur-sm border-border shadow-sm">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder={isEn ? "Category" : t("mr.cat.all")} />
              </div>
            </SelectTrigger>
            <SelectContent>
              {categories.map(c => (
                <SelectItem key={c} value={c}>{categoryMap[c]?.() || c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop */}
        <div className="hidden sm:flex overflow-x-auto pb-2 hide-scrollbar border-b border-border/50">
        <div className="flex space-x-6 min-w-max">
          {categories.map(c => {
            const isActive = category === c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {categoryMap[c]?.() || c}
                {isActive && (
                  <motion.div
                    layoutId="activeCategory"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
        </div>
      </div>

      {/* ── Project grid ── */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array(8).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-[280px] w-full rounded-xl bg-card border border-border" />
          ))}
        </div>
      ) : (
        <motion.div layout className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence>
            {filteredProjects.length > 0 ? (
              filteredProjects.map(project => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <ProjectCard project={project} />
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center border border-dashed border-border rounded-xl bg-card/30">
                <Search className="mx-auto h-10 w-10 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-medium">
                  {isEn ? "No projects found" : `No projects found · ${t("mr.projects.empty")}`}
                </h3>
                <p className="text-muted-foreground mt-1">
                  {isEn ? "Try adjusting your filters or search query." : t("mr.projects.emptyDesc")}
                </p>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
