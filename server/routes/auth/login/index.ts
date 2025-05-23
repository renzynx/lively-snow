import type { FastifyPluginAsync } from "fastify";
import { verify } from "argon2";
import { eq } from "drizzle-orm";
import { users } from "../../../database/schema";

const routes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 6 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { email, password } = request.body as {
          email: string;
          password: string;
        };

        const user = await fastify.db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user) {
          return reply.code(401).send({ error: "Invalid email or password" });
        }

        const isPasswordValid = await verify(user.password, password);

        if (!isPasswordValid) {
          return reply.code(401).send({ error: "Invalid email or password" });
        }

        const { password: _, ...safeUser } = user;

        request.session.user = safeUser;

        return reply.send({ success: true, message: "Login successful" });
      } catch (error) {
        console.error("Error during login:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
