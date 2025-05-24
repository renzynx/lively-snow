import { eq, and } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { files } from "../../database/schema";
import { generatePresignedDownloadUrl } from "server/utils/s3";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get("/:fileId", async function (request, reply) {
    const { fileId } = request.params as { fileId: string };

    if (!fileId) {
      return reply.status(400).send({ error: "File ID is required" });
    }

    const file = await fastify.db.query.files.findFirst({
      where: eq(files.id, fileId),
      columns: {
        id: true,
        name: true,
        s3_key: true,
        content_type: true,
      },
    });

    if (!file || !file.s3_key) {
      return reply.status(404).send({ error: "File not found" });
    }

    const url = await generatePresignedDownloadUrl(file.s3_key);

    if (!url) {
      return reply
        .status(500)
        .send({ error: "Failed to generate download URL" });
    }

    return reply.send({
      id: file.id,
      name: file.name,
      contentType: file.content_type,
      downloadUrl: url,
    });
  });

  // Delete a file
  fastify.delete(
    "/:fileId",
    { preHandler: fastify.authenticate },
    async function (request, reply) {
      try {
        const user = request.session.user!;
        const { fileId } = request.params as { fileId: string };

        if (!fileId) {
          return reply.status(400).send({ error: "File ID is required" });
        }

        // Verify file belongs to user
        const file = await fastify.db.query.files.findFirst({
          where: and(eq(files.id, fileId), eq(files.user_id, user.id)),
        });

        if (!file) {
          return reply.status(404).send({ error: "File not found" });
        }

        // Delete the file from database
        await fastify.db.delete(files).where(eq(files.id, fileId));

        // TODO: Also delete from S3 storage
        // await deleteFromS3(file.s3_key);

        return reply.status(204).send();
      } catch (error) {
        console.error("Error deleting file:", error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default route;
