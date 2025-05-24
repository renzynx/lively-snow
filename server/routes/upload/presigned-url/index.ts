import type { FastifyPluginAsync } from "fastify";
import { files } from "../../../database/schema";
import { eq } from "drizzle-orm";
import { generatePresignedUploadUrl } from "../../../utils/s3";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get(
    "/",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const user = request.session.user!;

      try {
        const query = request.query as {
          uploadId: string;
          s3UploadId: string;
          partNumber: string;
        };

        if (
          !query ||
          !query.uploadId ||
          !query.s3UploadId ||
          !query.partNumber
        ) {
          return reply.code(400).send({
            error: "uploadId, s3UploadId and partNumber are required",
          });
        }

        const { uploadId, s3UploadId } = query;
        const partNumber = parseInt(query.partNumber, 10);

        // Validate part number (must be between 1 and 10,000)
        if (isNaN(partNumber) || partNumber < 1 || partNumber > 10000) {
          return reply.code(400).send({
            error: "Part number must be between 1 and 10,000",
          });
        }

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
        } // Verify S3 upload was initialized and matches the request
        if (
          !file.s3_key ||
          !file.s3_upload_id ||
          file.s3_upload_id !== s3UploadId
        ) {
          return reply.code(400).send({
            error: "S3 upload not properly initialized or upload ID mismatch",
          });
        }

        // Generate presigned URL for this part
        const presignedUrl = await generatePresignedUploadUrl(
          file.s3_key,
          file.s3_upload_id,
          partNumber,
        );

        return reply.send({
          success: true,
          uploadUrl: presignedUrl,
          partNumber,
        });
      } catch (error) {
        console.error("Presigned URL generation error:", error);
        return reply
          .code(500)
          .send({ error: "Failed to generate presigned URL" });
      }
    },
  );
};

export default route;
