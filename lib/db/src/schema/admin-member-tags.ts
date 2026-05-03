import { pgTable, serial, text, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

/**
 * Admin-side wallet tagging — lets ops group members (e.g. "一线领导",
 * "VIP", "风险账户") and filter every list page in the admin panel by
 * tag. Pure metadata: no on-chain meaning, never exposed to end-users.
 *
 * Two tables:
 *   admin_member_tags             — catalogue of tag names + colors
 *   admin_member_tag_assignments  — many-to-many wallet ↔ tag, plus a
 *                                   per-assignment note ("第三季度业绩
 *                                   达标 / 已升 V3"…)
 *
 * `chain_id` is on the assignment so the same address bound to mainnet
 * vs testnet stays separately tagged — same convention as every other
 * `rune_*` table in this repo.
 */
export const adminMemberTagsTable = pgTable(
  "admin_member_tags",
  {
    id:          serial("id").primaryKey(),
    name:        text("name").notNull(),
    color:       text("color").notNull().default("#fbbf24"),
    description: text("description"),
    createdBy:   text("created_by"),
    createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("admin_member_tags_name_uq").on(t.name),
  ],
);

export const adminMemberTagAssignmentsTable = pgTable(
  "admin_member_tag_assignments",
  {
    id:          serial("id").primaryKey(),
    tagId:       integer("tag_id").notNull().references(() => adminMemberTagsTable.id, { onDelete: "cascade" }),
    chainId:     integer("chain_id").notNull(),
    userAddress: text("user_address").notNull(),
    note:        text("note"),
    createdBy:   text("created_by"),
    createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("admin_member_tag_assignments_uq").on(t.tagId, t.chainId, t.userAddress),
    index("admin_member_tag_assignments_user_idx").on(t.chainId, t.userAddress),
    index("admin_member_tag_assignments_tag_idx").on(t.tagId),
  ],
);

export type AdminMemberTag = typeof adminMemberTagsTable.$inferSelect;
export type InsertAdminMemberTag = typeof adminMemberTagsTable.$inferInsert;
export type AdminMemberTagAssignment = typeof adminMemberTagAssignmentsTable.$inferSelect;
export type InsertAdminMemberTagAssignment = typeof adminMemberTagAssignmentsTable.$inferInsert;
