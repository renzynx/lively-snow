import { hash } from "argon2";
import { users } from "../../../database/schema";
import { eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { generateUsername } from "unique-username-generator";

const routes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", maxLength: 255 },
            password: { type: "string", minLength: 6, maxLength: 100 },
            username: { type: "string", minLength: 3, maxLength: 20 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { email, password, username } = request.body as {
          email: string;
          password: string;
          username?: string;
        };

        const existingUser = await fastify.db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (existingUser) {
          return reply.code(409).send({ error: "Email already taken" });
        }

        const hashedPassword = await hash(password);

        await fastify.db.insert(users).values({
          email,
          password: hashedPassword,
          username: username || generateUsername("-", 0, 15),
        });

        return reply.send({
          success: true,
          message: "Registration successful",
        });
      } catch (error) {
        console.error("Error during registration:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
