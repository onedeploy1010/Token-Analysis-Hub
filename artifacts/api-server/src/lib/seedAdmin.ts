import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { adminUsersTable } from "@workspace/db/schema";

export async function seedAdminUser(): Promise<void> {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) return;

  try {
    const existing = await db.select().from(adminUsersTable).limit(1);
    if (existing.length > 0) return;

    const passwordHash = await bcrypt.hash(password, 10);
    await db.insert(adminUsersTable).values({ username, passwordHash });
    console.log(`[seed] Admin user "${username}" created`);
  } catch (err) {
    console.error("[seed] Failed to seed admin user:", err);
  }
}
