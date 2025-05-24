import {
  integer,
  sqliteTable,
  text,
  foreignKey,
} from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

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

export const folders = sqliteTable(
  "folders",
  {
    id: text("id")
      .primaryKey()
      .$default(() => randomUUID()),
    name: text("name").notNull(),
    parent_id: text("parent_id"),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (table) => {
    return {
      parentReference: foreignKey({
        columns: [table.parent_id],
        foreignColumns: [table.id],
        name: "folders_parent_id_fkey",
      }),
    };
  },
);

export const files = sqliteTable("files", {
  id: text("id")
    .primaryKey()
    .$default(() => randomUUID()),
  name: text("name").notNull(),
  size: integer("size").notNull(),
  content_type: text("content_type").notNull(),
  completed_at: integer("completed_at", { mode: "timestamp" }),
  s3_key: text("s3_key"),
  s3_upload_id: text("s3_upload_id"),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id),
  folder_id: text("folder_id").references(() => folders.id),
  ...timestamps,
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  files: many(files),
  folders: many(folders),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.user_id],
    references: [users.id],
  }),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  user: one(users, {
    fields: [folders.user_id],
    references: [users.id],
  }),
  parent: one(folders, {
    fields: [folders.parent_id],
    references: [folders.id],
    relationName: "folderParent",
  }),
  children: many(folders, {
    relationName: "folderParent",
  }),
  files: many(files),
}));

export const filesRelations = relations(files, ({ one }) => ({
  user: one(users, {
    fields: [files.user_id],
    references: [users.id],
  }),
  folder: one(folders, {
    fields: [files.folder_id],
    references: [folders.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;
export type File = typeof files.$inferSelect;
export type InsertFile = typeof files.$inferInsert;
export type Folder = typeof folders.$inferSelect;
export type InsertFolder = typeof folders.$inferInsert;
