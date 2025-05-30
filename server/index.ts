import "dotenv/config";
import process from "node:process";
import * as path from "node:path";
import chalk from "chalk";
import { remixFastify } from "@mcansh/remix-fastify";
import { fastify, type FastifyReply, type FastifyRequest } from "fastify";
import multipart from "@fastify/multipart";
import autoload from "@fastify/autoload";
import sourceMapSupport from "source-map-support";
import getPort, { portNumbers } from "get-port";
import { fastifySession } from "@fastify/session";
import { fastifyCookie } from "@fastify/cookie";
import { DrizzleStore } from "./utils/session";
import { db } from "./database";
import { createFileCleanupService } from "./services/fileCleanup";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

sourceMapSupport.install();

const app = fastify({ trustProxy: true });

app.register(fastifyCookie);
app.register(fastifySession, {
  secret: process.env.SESSION_SECRET!,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 day
    sameSite: "lax",
    httpOnly: true,
    domain:
      process.env.NODE_ENV === "production" ? process.env.DOMAIN : undefined,
  },
  store: new DrizzleStore(db),
});

app.register(multipart, {
  limits: {
    fileSize: 6 * 1024 * 1024, // 6MB to allow for 5MB chunks + overhead
    files: 1, // Only one file per request (chunk)
  },
});

app.register(autoload, {
  dir: path.join(__dirname, "routes"),
  options: { prefix: "/api" },
});

app.decorate("db", db);
app.decorate("downloads", new Map());
app.decorate(
  "authenticate",
  async function (request: FastifyRequest, reply: FastifyReply) {
    if (!request.session.user) {
      reply.code(401).send({ error: "Authentication required" });
    }
  },
);

app.register(remixFastify, {
  getLoadContext(request) {
    return {
      db,
      user: request.session?.user,
    };
  },
});

// Initialize file cleanup service
const cleanupService = createFileCleanupService({
  db,
  maxAgeHours: 24, // Delete unfinished files older than 24 hours
  cronSchedule: "0 */6 * * *", // Run every 6 hours
  enableLogging: true,
});

// Start cleanup service
cleanupService.start();

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log(chalk.yellow("🛑 Received SIGTERM, shutting down gracefully..."));
  cleanupService.stop();
  app.close(() => {
    console.log(chalk.blue("✅ Server closed"));
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log(chalk.yellow("🛑 Received SIGINT, shutting down gracefully..."));
  cleanupService.stop();
  app.close(() => {
    console.log(chalk.blue("✅ Server closed"));
    process.exit(0);
  });
});

const host = "0.0.0.0";
const desiredPort = Number(process.env.PORT) || 3000;
getPort({
  port: portNumbers(desiredPort, desiredPort + 100),
})
  .then((portToUse) => {
    if (portToUse !== desiredPort) {
      console.warn(
        chalk.yellow(
          `⚠️  Port ${desiredPort} is not available, using ${portToUse} instead.`,
        ),
      );
    }

    app.listen({ port: portToUse, host }).then((address) => {
      console.log(chalk.blue(`🚀 Server is running at ${address}`));
    });
  })
  .catch((error) => {
    console.error(chalk.red("Error starting server:", error));
    process.exit(1);
  });
