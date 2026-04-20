import { useState, useMemo } from "react";
import { useListProjects } from "@workspace/api-client-react";
import { ProjectCard } from "@/components/shared/project-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, SlidersHorizontal, ArrowRight, Zap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

const categoryMap: Record<string, string> = {
  "all": "All Categories 全部",
  "Vault": "Vault 金库铸造",
  "DEX": "DEX 去中心化交易所",
  "Lending": "Lending 借贷",
  "Yield": "Yield 收益",
  "Derivatives": "Derivatives 衍生品",
  "Staking": "Staking 质押",
  "Infrastructure": "Infrastructure 基础设施",
};

export default function Projects() {
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
            <span className="text-[11px] font-semibold uppercase tracking-widest text-primary/70">项目分析库</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
            Project Intelligence
          </h1>
          <p className="text-sm text-muted-foreground pt-1">金库铸造、DeFi协议深度 tokenomics 分析与收益模拟。</p>
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

      {/* ── RUNE Featured Hero (single full-width) ── */}
      <Link href="/projects/rune">
        <div className="relative w-full overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-background via-[#0f172a] to-[#1e1b4b] p-8 sm:p-10 cursor-pointer group hover:border-primary/60 transition-all duration-500 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
          {/* Glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px] pointer-events-none group-hover:bg-primary/25 transition-colors duration-700 -translate-y-1/2 translate-x-1/3" />
          {/* Shimmer */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)] -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          {/* Big watermark */}
          <div className="absolute right-0 bottom-0 text-[160px] sm:text-[200px] font-black italic text-white/[0.025] select-none pointer-events-none leading-none tracking-tighter translate-y-8">RUNE</div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/20 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider">
                <Zap className="h-3.5 w-3.5" /> 精选推荐 · Featured Analysis
              </div>
          <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-black border border-primary/25 shadow-[0_0_20px_rgba(251,191,36,0.2)] shrink-0">
                  <img src="/rune-logo.png" alt="RUNE Protocol" className="w-full h-full object-contain" />
                </div>
                <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
                  RUNE Protocol <span className="text-primary/80">—</span> 深度节点分析
                </h2>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
                双TOKEN通缩经济模型 · 四级节点收益拆解 · 完整 tokenomics 图表 · 节点 ROI 交互计算器
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {["双TOKEN通缩", "节点质押", "AMM设计", "Layer1", "Cross-chain"].map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary/80 font-medium">{tag}</span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-6 shrink-0">
              <div className="hidden md:block text-right space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">APY</p>
                <p className="text-3xl font-bold font-mono num text-primary">18.3%</p>
              </div>
              <div className="hidden md:block text-right space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">TVL</p>
                <p className="text-2xl font-bold font-mono num text-foreground/90">$312M</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="inline-flex items-center text-primary font-semibold text-sm group-hover:underline whitespace-nowrap">
                  查看完整分析 <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
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
                <SelectItem key={c} value={c}>{categoryMap[c] || c}</SelectItem>
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
                {categoryMap[c] || c}
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
