import type { FastifyPluginAsync } from "fastify";
import { files } from "../../../database/schema";
import { eq } from "drizzle-orm";
import {
  initializeMultipartUpload,
  generateS3Key,
  CHUNK_SIZE,
} from "../../../utils/s3";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.post(
    "/",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const user = request.session.user!;

      try {
        const data = request.body as {
          filename: string;
          size: number;
          contentType: string;
          folderId?: string;
        };

        if (!data || !data.filename || !data.size || !data.contentType) {
          return reply.code(400).send({
            error: "filename, size, and contentType are required",
          });
        }

        const { filename, size, contentType, folderId } = data;

        // If folderId is provided, verify it exists and belongs to user
        if (folderId) {
          const folder = await fastify.db.query.folders.findFirst({
            where: (folders, { and, eq }) =>
              and(eq(folders.id, folderId), eq(folders.user_id, user.id)),
          });

          if (!folder) {
            return reply.code(404).send({
              error: "Folder not found",
            });
          }
        }

        // Check file size limit (15GB)
        const maxSize = 15 * 1024 * 1024 * 1024; // 15GB in bytes
        if (size > maxSize) {
          return reply.code(400).send({
            error: "File size exceeds maximum limit of 15GB",
          });
        }

        // Calculate total chunks based on 5MB chunk size
        const totalChunks = Math.ceil(size / CHUNK_SIZE); // Create file record in database
        const [file] = await fastify.db
          .insert(files)
          .values({
            name: filename,
            size,
            content_type: contentType,
            user_id: user.id,
            folder_id: folderId || null,
          })
          .returning();

        if (!file) {
          return reply
            .status(500)
            .send({ error: "Failed to create file record" });
        }

        // Generate S3 key
        const s3Key = generateS3Key(user.id, file.id, filename);

        // Initialize multipart upload in S3
        const multipartUpload = await initializeMultipartUpload(
          s3Key,
          contentType,
        );

        // Update file record with S3 information
        await fastify.db
          .update(files)
          .set({
            s3_key: s3Key,
            s3_upload_id: multipartUpload.uploadId,
          })
          .where(eq(files.id, file.id)); // Store upload metadata in memory for tracking
        fastify.upload.set(file.id, {
          filename,
          contentType,
          fileSize: size,
          totalChunks,
          uploadDir: "", // Not used for S3 uploads
          receivedChunks: new Set<number>(),
          s3Key,
          s3UploadId: multipartUpload.uploadId,
        });

        return reply.send({
          success: true,
          uploadId: file.id,
          s3UploadId: multipartUpload.uploadId,
          s3Key,
          totalChunks,
          chunkSize: CHUNK_SIZE,
        });
      } catch (error) {
        console.error("S3 upload initialization error:", error);
        return reply
          .code(500)
          .send({ error: "Failed to initialize S3 upload" });
      }
    },
  );
};

export default route;
