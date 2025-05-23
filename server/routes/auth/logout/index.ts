import type { FastifyPluginAsync } from "fastify";

const routes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/",
    {
      preHandler: fastify.authenticate,
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Destroy the session in the store
        await new Promise<void>((resolve) => {
          request.session.destroy((err) => {
            if (err) {
              console.error("Error destroying session:", err);
            }

            resolve();
          });
        });

        return reply.send({ success: true, message: "Logout successful" });
      } catch (error) {
        console.error("Error during logout:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default routes;
