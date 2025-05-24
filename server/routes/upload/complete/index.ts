import type { FastifyPluginAsync } from "fastify";
import { files } from "../../../database/schema";
import { eq } from "drizzle-orm";
import { completeMultipartUpload, type PartInfo } from "../../../utils/s3";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.post(
    "/",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const user = request.session.user!;

      try {
        const data = request.body as {
          uploadId: string;
          parts: PartInfo[];
        };

        if (!data || !data.uploadId || !Array.isArray(data.parts)) {
          return reply.code(400).send({
            error: "uploadId and parts array are required",
          });
        }

        const { uploadId, parts } = data;

        // Validate parts array
        if (parts.length === 0) {
          return reply.code(400).send({
            error: "At least one part is required",
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
        }

        // Verify S3 upload was initialized
        if (!file.s3_key || !file.s3_upload_id) {
          return reply.code(400).send({
            error: "S3 upload not properly initialized",
          });
        }

        // Sort parts by part number to ensure correct order
        const sortedParts = parts.sort((a, b) => a.partNumber - b.partNumber);

        // Validate part numbers are sequential starting from 1
        for (let i = 0; i < sortedParts.length; i++) {
          if (sortedParts[i]!.partNumber !== i + 1) {
            return reply.code(400).send({
              error: `Invalid part number sequence. Expected ${i + 1}, got ${sortedParts[i]!.partNumber}`,
            });
          }
        }

        // Complete multipart upload in S3
        await completeMultipartUpload(
          file.s3_key,
          file.s3_upload_id,
          sortedParts,
        );

        // Mark upload as completed in database
        await fastify.db
          .update(files)
          .set({
            completed_at: new Date(),
            s3_upload_id: null, // Clear upload ID since upload is complete
          })
          .where(eq(files.id, file.id));

        return reply.send({
          success: true,
          fileId: file.id,
          message: "Upload completed successfully",
        });
      } catch (error) {
        console.error("S3 upload completion error:", error);
        return reply.code(500).send({ error: "Failed to complete S3 upload" });
      }
    },
  );
};

export default route;
