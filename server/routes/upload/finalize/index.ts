import type { FastifyPluginAsync } from "fastify";
import { files } from "../../../database/schema";
import { eq } from "drizzle-orm";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.post(
    "/",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      try {
        const query = request.query as { uploadId?: string };
        const uploadId = query.uploadId;

        if (!uploadId) {
          return reply.code(400).send({ error: "Missing uploadId" });
        }

        // Get upload metadata
        const uploadData = fastify.upload.get(uploadId);

        if (!uploadData) {
          return reply.code(404).send({ error: "Upload session not found" });
        }

        // Check if all chunks were received
        if (uploadData.receivedChunks.size !== uploadData.totalChunks) {
          return reply.code(400).send({
            error: `Not all chunks received. Expected ${uploadData.totalChunks}, got ${uploadData.receivedChunks.size}`,
          });
        }

        await fastify.db
          .update(files)
          .set({ completed_at: new Date() })
          .where(eq(files.id, uploadId));

        // Clean up the map
        fastify.upload.delete(uploadId);

        return reply.send({ success: true });
      } catch (error) {
        console.error("Finalize upload error:", error);

        return reply.code(500).send({ error: "Failed to finalize upload" });
      }
    },
  );
};

export default route;
