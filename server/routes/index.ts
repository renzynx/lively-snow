import type { FastifyPluginAsync } from "fastify";

const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get("/", async function (_, reply) {
    return reply.send({ message: "123123" });
  });
};

export default routes;
