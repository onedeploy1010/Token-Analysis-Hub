import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, projectsTable } from "@rune/db";
import {
  ListProjectsQueryParams,
  ListProjectsResponse,
  GetProjectParams,
  GetProjectResponse,
  GetProjectsSummaryResponse,
} from "@rune/api-zod";

const router: IRouter = Router();

router.get("/projects", async (req, res): Promise<void> => {
  const params = ListProjectsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let query = db.select().from(projectsTable).$dynamic();

  if (params.data.category) {
    query = query.where(eq(projectsTable.category, params.data.category));
  }

  const sortBy = params.data.sortBy ?? "trending";
  const orderedQuery =
    sortBy === "newest"  ? query.orderBy(desc(projectsTable.id)) :
    sortBy === "rating"  ? query.orderBy(desc(projectsTable.rating)) :
    /* trending / default */ query.orderBy(desc(projectsTable.apy));

  const projects = await orderedQuery;
  const visibleProjects = projects.filter(p => !p.archived);

  res.json(ListProjectsResponse.parse(visibleProjects.map(p => ({
    ...p,
    website: p.website ?? undefined,
    riskLevel: p.riskLevel as "low" | "medium" | "high",
  }))));
});

router.get("/projects/stats/summary", async (_req, res): Promise<void> => {
  const allProjects = await db.select().from(projectsTable);
  const projects = allProjects.filter(p => !p.archived);

  const totalTvlNum = projects.reduce((acc, p) => {
    const match = p.tvl.replace(/[$,BMK]/g, "");
    const num = parseFloat(match) || 0;
    const multiplier = p.tvl.includes("B") ? 1e9 : p.tvl.includes("M") ? 1e6 : p.tvl.includes("K") ? 1e3 : 1;
    return acc + num * multiplier;
  }, 0);

  const totalTvlStr = totalTvlNum >= 1e9
    ? `$${(totalTvlNum / 1e9).toFixed(2)}B`
    : totalTvlNum >= 1e6
    ? `$${(totalTvlNum / 1e6).toFixed(2)}M`
    : `$${totalTvlNum.toFixed(0)}`;

  const avgApy = projects.length > 0
    ? projects.reduce((acc, p) => acc + p.apy, 0) / projects.length
    : 0;

  const recommendedCount = projects.filter(p => p.isRecommended).length;

  const categoryCounts: Record<string, number> = {};
  for (const p of projects) {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  }

  res.json(GetProjectsSummaryResponse.parse({
    totalProjects: projects.length,
    totalTvl: totalTvlStr,
    avgApy: Math.round(avgApy * 10) / 10,
    recommendedCount,
    categoryCounts,
  }));
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetProjectParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(GetProjectResponse.parse({
    ...project,
    website: project.website ?? undefined,
    riskLevel: project.riskLevel as "low" | "medium" | "high",
  }));
});

export default router;
