import type { FastifyPluginAsync } from "fastify";
import { files } from "../../../database/schema";
import { createUploadDirectory } from "../../../utils/upload";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.post(
    "/",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const user = request.session.user!;

      try {
        const data = request.body as any;

        if (!data) {
          return reply.code(400).send({ error: "No metadata received" });
        }

        const filename = data.filename;
        const contentType = data.contentType;
        const fileSize = data.fileSize;
        const totalChunks = data.totalChunks;

        if (
          !filename ||
          !contentType ||
          isNaN(fileSize) ||
          isNaN(totalChunks)
        ) {
          return reply.code(400).send({ error: "Missing required metadata" });
        }

        const [file] = await fastify.db
          .insert(files)
          .values({
            name: filename,
            size: fileSize,
            content_type: contentType,
            user_id: user.id,
            total_chunks: totalChunks,
          })
          .returning();

        if (!file) {
          console.log("Something went wrong while creating file record");

          return reply.status(500).send({ error: "Internal Server Error" });
        }

        const uploadDir = createUploadDirectory(user.id, file.id);

        fastify.upload.set(file.id, {
          filename,
          contentType,
          fileSize,
          totalChunks,
          receivedChunks: new Set(),
          uploadDir,
        });

        return reply.send({ uploadId: file.id, totalChunks });
      } catch (error) {
        console.error("Upload initiation error:", error);
        return reply.code(500).send({ error: "Failed to initiate upload" });
      }
    },
  );
};

export default route;
