import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { files } from "../../../database/schema";
import { abortMultipartUpload } from "../../../utils/s3";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.post(
    "/",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const user = request.session.user!;

      try {
        const data = request.body as {
          uploadId: string;
        };

        if (!data || !data.uploadId) {
          return reply.code(400).send({
            error: "uploadId is required",
          });
        }

        const { uploadId } = data;

        // Get file record from database
        const [file] = await fastify.db
          .select()
          .from(files)
          .where(eq(files.id, uploadId))
          .limit(1);

        if (!file) {
          return reply.code(404).send({ error: "Upload not found" });
        }

        // Verify user owns this upload
        if (file.user_id !== user.id) {
          return reply.code(403).send({ error: "Access denied" });
        }

        // Check if upload is already completed
        if (file.completed_at) {
          return reply.code(400).send({ error: "Upload already completed" });
        }

        // Verify S3 upload was initialized
        if (!file.s3_key || !file.s3_upload_id) {
          return reply.code(400).send({
            error: "S3 upload not properly initialized",
          });
        }

        // Abort multipart upload in S3
        await abortMultipartUpload(file.s3_key, file.s3_upload_id);

        // Delete file record from database
        await fastify.db.delete(files).where(eq(files.id, file.id));

        // Clean up upload metadata from memory
        fastify.upload.delete(file.id);

        return reply.send({
          success: true,
          message: "Upload aborted successfully",
        });
      } catch (error) {
        console.error("S3 upload abort error:", error);
        return reply.code(500).send({ error: "Failed to abort S3 upload" });
      }
    },
  );
};

export default route;
