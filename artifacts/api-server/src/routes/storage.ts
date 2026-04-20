import { Router, type IRouter, type Request, type Response } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage.js";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const { name, size, contentType } = req.body ?? {};
  if (!name || !contentType) {
    res.status(400).json({ error: "name and contentType are required" });
    return;
  }
  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
  } catch (err) {
    console.error("Error generating upload URL", err);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

// Serve public assets — use router.use to avoid wildcard path issues with Express 5
router.use("/storage/public-objects", async (req: Request, res: Response) => {
  const filePath = req.path.replace(/^\//, "");
  try {
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const response = await objectStorageService.downloadObject(file);
    res.setHeader("Content-Type", response.headers.get("Content-Type") ?? "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=3600");
    const buf = await response.arrayBuffer();
    res.end(Buffer.from(buf));
  } catch (err) {
    console.error("Error serving public object", err);
    res.status(500).json({ error: "Failed to serve object" });
  }
});

// Serve private objects
router.use("/storage/objects", async (req: Request, res: Response) => {
  const objectPath = `/objects${req.path}`;
  try {
    const file = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(file);
    res.setHeader("Content-Type", response.headers.get("Content-Type") ?? "application/octet-stream");
    const buf = await response.arrayBuffer();
    res.end(Buffer.from(buf));
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    console.error("Error serving object", err);
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
