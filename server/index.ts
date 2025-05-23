import "dotenv/config";
import process from "node:process";
import * as path from "node:path";
import * as fs from "node:fs";
import chalk from "chalk";
import { remixFastify } from "@mcansh/remix-fastify";
import { fastify, type FastifyReply, type FastifyRequest } from "fastify";
import multipart from "@fastify/multipart";
import autoload from "@fastify/autoload";
import sourceMapSupport from "source-map-support";
import getPort, { portNumbers } from "get-port";
import { fastifySession } from "@fastify/session";
import { fastifyCookie } from "@fastify/cookie";
import { uploadDir } from "./utils/upload";
import { DrizzleStore } from "./utils/session";
import { db } from "./database";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

sourceMapSupport.install();

const app = fastify();

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.register(fastifyCookie);
app.register(fastifySession, {
  secret: process.env.SESSION_SECRET!,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60, // 1 day
    sameSite: true,
    httpOnly: true,
    domain: process.env.DOMAIN,
  },
  store: new DrizzleStore(db),
});

app.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

app.register(autoload, {
  dir: path.join(__dirname, "routes"),
  options: { prefix: "/api" },
});

app.decorate("db", db);
app.decorate("upload", new Map());
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
