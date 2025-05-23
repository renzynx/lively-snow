import type { db } from "server/database";
import type { User } from "server/database/schema";

export interface AppLoadContextT {
  db: typeof db;
  user: Omit<User, "password"> | null;
}

declare module "@remix-run/node" {
  interface AppLoadContext extends AppLoadContextT {}
}
