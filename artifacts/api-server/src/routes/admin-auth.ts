import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@rune/db";
import { adminUsersTable } from "@rune/db/schema";
import { eq } from "drizzle-orm";
import { signAdminToken } from "../lib/auth.js";

const router = Router();

router.post("/admin/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    res.status(400).json({ error: "username and password required" });
    return;
  }
  try {
    const [user] = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.username, username))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = signAdminToken({ adminId: user.id, username: user.username });
    // Return role + permissions so the admin-panel can gate sidebar / UI
    // client-side. Server-side enforcement (added in a later patch) still
    // re-reads the row in `requirePermission` so a tampered client can't
    // escalate. Cast to any for the role/permissions columns until the
    // shared @rune/db is rebuilt with the new schema fields.
    const role = (user as any).role ?? "admin";
    const permissions = ((user as any).permissions ?? []) as string[];
    res.json({ token, username: user.username, role, permissions });
  } catch (err) {
    console.error("[admin/login]", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
