import type { FastifyPluginAsync } from "fastify";

const routes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      return reply.send({
        user: request.session.user,
      });
    },
  );
};

export default routes;
