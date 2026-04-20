import { Router } from "express";
import { db } from "@workspace/db";
import { resourcesTable } from "@workspace/db/schema";
import { eq, and, asc } from "drizzle-orm";

const router = Router();

router.get("/resources", async (req, res) => {
  try {
    const { language } = req.query;
    const lang = (typeof language === "string" && language) ? language : "zh";

    const rows = await db
      .select()
      .from(resourcesTable)
      .where(and(eq(resourcesTable.language, lang), eq(resourcesTable.visible, true)))
      .orderBy(asc(resourcesTable.sortOrder), asc(resourcesTable.createdAt));

    res.json(rows);
  } catch (err) {
    console.error("[resources] GET /api/resources error:", err);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});

export default router;
