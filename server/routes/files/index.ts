import { eq, and } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { files } from "../../database/schema";
import { deleteObject, generatePresignedDownloadUrl } from "../../utils/s3";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get("/:fileId", async function (request, reply) {
    const { fileId } = request.params as { fileId: string };

    if (!fileId) {
      return reply.status(400).send({ error: "File ID is required" });
    }

    const file = await fastify.db.query.files.findFirst({
      where: eq(files.id, fileId),
    });

    if (!file || !file.s3_key || !file.completed_at) {
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

  // Direct download endpoint - redirects to S3 URL
  fastify.get("/:fileId/download", async function (request, reply) {
    const { fileId } = request.params as { fileId: string };

    if (!fileId) {
      return reply.status(400).send({ error: "File ID is required" });
    }

    const file = await fastify.db.query.files.findFirst({
      where: eq(files.id, fileId),
    });

    if (!file || !file.s3_key || !file.completed_at) {
      return reply.status(404).send({ error: "File not found" });
    }

    const url = await generatePresignedDownloadUrl(file.s3_key);

    if (!url) {
      return reply
        .status(500)
        .send({ error: "Failed to generate download URL" });
    } // Redirect to the S3 presigned URL for direct download
    return reply.status(302).redirect(url);
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

        const promises = [
          fastify.db.delete(files).where(eq(files.id, fileId)),
          deleteObject(file.s3_key!),
        ];

        await Promise.all(promises);

        return reply.status(204).send();
      } catch (error) {
        console.error("Error deleting file:", error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default route;
