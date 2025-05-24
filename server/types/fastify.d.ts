import "fastify";
import { type db } from "../database";
import type { DownloadProgress } from ".";

declare module "fastify" {
  interface Session {
    user: Omit<User, "password"> | null;
  }

  interface FastifyInstance {
    db: typeof db;
    downloads: Map<string, DownloadProgress>;
    authenticate: any;
  }
}
