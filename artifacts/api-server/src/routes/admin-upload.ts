import { Router } from "express";
import multer from "multer";
import { requireAdmin } from "../lib/auth.js";
import { ObjectStorageService } from "../lib/objectStorage.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const storage = new ObjectStorageService();

router.post("/admin/upload", requireAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }
  try {
    const signedUrl = await storage.getObjectEntityUploadURL();

    const uploadRes = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": req.file.mimetype },
      body: req.file.buffer,
    });

    if (!uploadRes.ok) {
      throw new Error(`GCS upload failed: ${uploadRes.status}`);
    }

    const objectPath = storage.normalizeObjectEntityPath(signedUrl);
    const fileUrl = `/api/storage${objectPath}`;

    res.json({
      fileUrl,
      objectPath,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  } catch (err) {
    console.error("[admin/upload]", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
