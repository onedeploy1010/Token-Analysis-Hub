import { pgTable, text, serial, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  rating: real("rating").notNull().default(0),
  riskLevel: text("risk_level").notNull().default("medium"),
  apy: real("apy").notNull().default(0),
  tvl: text("tvl").notNull().default("$0"),
  marketCap: text("market_cap").notNull().default("$0"),
  website: text("website"),
  tags: text("tags").array().notNull().default([]),
  isRecommended: boolean("is_recommended").notNull().default(false),
  trending: boolean("trending").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
