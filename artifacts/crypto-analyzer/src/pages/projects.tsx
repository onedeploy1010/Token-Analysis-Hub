import { useState, useMemo } from "react";
import { useListProjects } from "@workspace/api-client-react";
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
              placeholder="Search projects, symbols..."
              className="pl-9 bg-card/50 backdrop-blur-sm border-border w-full focus-visible:ring-primary shadow-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[160px] bg-card/50 backdrop-blur-sm border-border shadow-sm">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trending">Trending 热门</SelectItem>
              <SelectItem value="newest">Newest 最新</SelectItem>
              <SelectItem value="rating">Rating 评级</SelectItem>
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
                  RUNE Protocol <span className="text-primary/70">—</span> <span className="text-primary">深度节点分析</span>
                </h2>
              </div>

              {/* Description */}
              <p className="text-muted-foreground text-sm sm:text-[15px] leading-relaxed max-w-lg">
                双TOKEN通缩经济模型 · 四级节点收益拆解 · 完整 tokenomics 图表 · 节点 ROI 交互计算器
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {["双TOKEN通缩", "节点质押", "AMM设计", "Layer1", "Cross-chain"].map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary/80 font-medium">{tag}</span>
                ))}
              </div>

              {/* Mobile-only stats row */}
              <div className="flex items-center gap-4 pt-1 md:hidden">
                <div className="space-y-0.5">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-widest">APY</p>
                  <p className="text-xl font-bold font-mono text-primary">170.82%</p>
                </div>
                <div className="w-px h-8 bg-border/50" />
                <div className="space-y-0.5">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-widest">TVL</p>
                  <p className="text-xl font-bold font-mono text-foreground/80">$312M</p>
                </div>
                <div className="ml-auto inline-flex items-center gap-1.5 text-primary text-sm font-semibold">
                  {t("mr.action.viewFull")}{!isEn && " · FULL ANALYSIS"} <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* ── Right: stats panel (desktop only) ── */}
            <div className="hidden md:flex flex-col items-center justify-center gap-6 px-10 border-l border-primary/15 shrink-0 min-w-[200px] bg-white/[0.018]">
              <div className="text-center space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{t("mr.metric.apy.label")}</p>
                <p className="text-4xl font-bold font-mono text-primary leading-none">170.82%</p>
              </div>
              <div className="w-10 h-px bg-primary/20" />
              <div className="text-center space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{t("mr.metric.tvl.label")}</p>
                <p className="text-3xl font-bold font-mono text-foreground/80 leading-none">$312M</p>
              </div>
              <div className="mt-2 inline-flex items-center gap-2 text-primary font-semibold text-sm group-hover:gap-3 transition-all whitespace-nowrap">
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
                <SelectValue placeholder="Category" />
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
                <h3 className="text-lg font-medium">No projects found 未找到项目</h3>
                <p className="text-muted-foreground mt-1">Try adjusting your filters or search query.</p>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
