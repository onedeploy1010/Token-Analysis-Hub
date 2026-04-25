import { Router } from "express";
import { db } from "@rune/db";
import { resourcesTable } from "@rune/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth.js";

const router = Router();

router.get("/admin/resources", requireAdmin, async (req, res) => {
  try {
    const { language, category } = req.query;
    let query = db.select().from(resourcesTable).$dynamic();
    if (typeof language === "string" && language) {
      query = query.where(eq(resourcesTable.language, language));
    }
    const rows = await query.orderBy(asc(resourcesTable.language), asc(resourcesTable.sortOrder), asc(resourcesTable.createdAt));
    res.json(rows);
  } catch (err) {
    console.error("[admin/resources GET]", err);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});

router.post("/admin/resources", requireAdmin, async (req, res) => {
  try {
    const { language, category, title, description, fileUrl, fileType, fileSize, sortOrder, visible, previewImageUrl } = req.body ?? {};
    if (!language || !category || !title || !fileUrl) {
      res.status(400).json({ error: "language, category, title, fileUrl are required" });
      return;
    }
    const [created] = await db.insert(resourcesTable).values({
      language,
      category,
      title,
      description: description ?? "",
      fileUrl,
      fileType: fileType ?? "pdf",
      fileSize: fileSize ?? "",
      sortOrder: sortOrder ?? 0,
      visible: visible !== undefined ? Boolean(visible) : true,
      previewImageUrl: previewImageUrl ?? "",
    }).returning();
    res.status(201).json(created);
  } catch (err) {
    console.error("[admin/resources POST]", err);
    res.status(500).json({ error: "Failed to create resource" });
  }
});

router.put("/admin/resources/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { language, category, title, description, fileUrl, fileType, fileSize, sortOrder, visible, previewImageUrl } = req.body ?? {};
    const [updated] = await db.update(resourcesTable)
      .set({
        ...(language !== undefined && { language }),
        ...(category !== undefined && { category }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(fileUrl !== undefined && { fileUrl }),
        ...(fileType !== undefined && { fileType }),
        ...(fileSize !== undefined && { fileSize }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(visible !== undefined && { visible: Boolean(visible) }),
        ...(previewImageUrl !== undefined && { previewImageUrl }),
      })
      .where(eq(resourcesTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Resource not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    console.error("[admin/resources PUT]", err);
    res.status(500).json({ error: "Failed to update resource" });
  }
});

router.delete("/admin/resources/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(resourcesTable).where(eq(resourcesTable.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error("[admin/resources DELETE]", err);
    res.status(500).json({ error: "Failed to delete resource" });
  }
});

export default router;
