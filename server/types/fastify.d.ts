import "fastify";
import { type db } from "../database";
import type { UploadMetadata, DownloadProgress, MergeProgress } from ".";

declare module "fastify" {
  interface Session {
    user: Omit<User, "password"> | null;
  }

  interface FastifyInstance {
    db: typeof db;
    upload: Map<string, UploadMetadata>;
    downloads: Map<string, DownloadProgress>;
    merges: Map<string, MergeProgress>;
    authenticate: any;
  }
}
