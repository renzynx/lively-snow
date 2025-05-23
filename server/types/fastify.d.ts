import "fastify";
import { type db } from "../database";
import type { UploadMetadata } from ".";

declare module "fastify" {
  interface Session {
    user: Omit<User, "password"> | null;
  }

  interface FastifyInstance {
    db: typeof db;
    upload: Map<string, UploadMetadata>;
    authenticate: any;
  }
}
