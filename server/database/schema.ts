import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";

export enum Role {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  USER = "user",
}

const timestamps = {
  created_at: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updated_at: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
};

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$default(() => randomUUID()),
  email: text("email").unique().notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default(Role.USER),
  ...timestamps,
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  session_data: text("session_data").notNull(),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id),
  ...timestamps,
});

export const files = sqliteTable("files", {
  id: text("id")
    .primaryKey()
    .$default(() => randomUUID()),
  name: text("name").notNull(),
  size: integer("size").notNull(),
  content_type: text("content_type").notNull(),
  completed_at: integer("completed_at", { mode: "timestamp" }),
  total_chunks: integer("total_chunks").notNull(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id),
  ...timestamps,
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;
export type File = typeof files.$inferSelect;
export type InsertFile = typeof files.$inferInsert;
