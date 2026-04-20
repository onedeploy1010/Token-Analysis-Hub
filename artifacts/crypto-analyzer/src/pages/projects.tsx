import { useState, useMemo } from "react";
import { useListProjects } from "@workspace/api-client-react";
import { ProjectCard } from "@/components/shared/project-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

export default function Projects() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("trending");

  // Type assertion for the sortBy param since it expects specific strings
  const { data: projects, isLoading } = useListProjects({ 
    category: category !== "all" ? category : undefined,
    sortBy: sortBy as any
  });

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.symbol.toLowerCase().includes(search.toLowerCase()) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))
    );
  }, [projects, search]);

  const categories = ["all", "DEX", "Lending", "Yield", "Derivatives", "Infrastructure"];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border pb-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-mono">Project Intelligence</h1>
          <p className="text-muted-foreground">Filter and analyze vetted DeFi opportunities.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search projects, symbols..."
              className="pl-9 bg-card border-border w-full focus-visible:ring-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-[140px] bg-card border-border">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Category" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c} value={c}>
                    {c === "all" ? "All Categories" : c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[140px] bg-card border-border">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trending">Trending</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-[280px] w-full rounded-xl bg-card border border-border" />)}
        </div>
      ) : (
        <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence>
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => (
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
                <h3 className="text-lg font-medium">No projects found</h3>
                <p className="text-muted-foreground mt-1">Try adjusting your filters or search query.</p>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
