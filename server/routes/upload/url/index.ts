import type { FastifyPluginAsync } from "fastify";
import { files } from "../../../database/schema";
import { eq } from "drizzle-orm";
import { generateS3Key, s3Client, S3_BUCKET } from "../../../utils/s3";
import { Upload } from "@aws-sdk/lib-storage";
import * as path from "node:path";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.post(
    "/",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const user = request.session.user!;
      try {
        const data = request.body as { url: string; filename?: string };

        if (!data || !data.url) {
          return reply.code(400).send({ error: "URL is required" });
        }

        const url = data.url.trim();

        // Basic URL validation
        try {
          new URL(url);
        } catch {
          return reply.code(400).send({ error: "Invalid URL format" });
        }

        // Fetch file metadata first to get content length and type
        const headResponse = await fetch(url, { method: "HEAD" });

        if (!headResponse.ok) {
          return reply.code(400).send({
            error: `Failed to fetch file from URL: ${headResponse.status} ${headResponse.statusText}`,
          });
        }

        // Get content length and type
        const contentLength = headResponse.headers.get("content-length");
        const contentType =
          headResponse.headers.get("content-type") ||
          "application/octet-stream";

        if (!contentLength) {
          return reply.code(400).send({
            error: "Unable to determine file size from URL",
          });
        }

        const fileSize = parseInt(contentLength, 10);

        // Check file size limit (15GB)
        const maxSize = 15 * 1024 * 1024 * 1024; // 15GB in bytes
        if (fileSize > maxSize) {
          return reply.code(400).send({
            error: "File size exceeds maximum limit of 15GB",
          });
        }

        // Determine filename
        let filename = data.filename;
        if (!filename) {
          // Try to extract filename from URL or Content-Disposition header
          const disposition = headResponse.headers.get("content-disposition");
          if (disposition && disposition.includes("filename=")) {
            const match = disposition.match(
              /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
            );
            if (match && match[1]) {
              filename = match[1].replace(/['"]/g, "");
            }
          }

          if (!filename) {
            // Extract from URL pathname
            const urlPath = new URL(url).pathname;
            filename = path.basename(urlPath) || "downloaded-file";
          }
        }

        // Create file record in database
        const [file] = await fastify.db
          .insert(files)
          .values({
            name: filename,
            size: fileSize,
            content_type: contentType,
            user_id: user.id,
          })
          .returning();

        if (!file) {
          return reply
            .status(500)
            .send({ error: "Failed to create file record" });
        }

        // Generate S3 key
        const s3Key = generateS3Key(user.id, file.id, filename);

        // Update file record with S3 key
        await fastify.db
          .update(files)
          .set({ s3_key: s3Key })
          .where(eq(files.id, file.id));

        // Initialize download progress tracking
        const initialProgress = {
          fileId: file.id,
          status: "downloading" as const,
          progress: 0,
          downloadedBytes: 0,
          totalBytes: fileSize,
          filename,
          url,
        };

        fastify.downloads.set(file.id, initialProgress);

        // Start streaming upload to S3
        try {
          const response = await fetch(url);
          if (!response.ok || !response.body) {
            throw new Error(`Failed to download file: ${response.status}`);
          }

          // Create upload using AWS SDK v3 lib-storage
          const upload = new Upload({
            client: s3Client,
            params: {
              Bucket: S3_BUCKET,
              Key: s3Key,
              Body: response.body,
              ContentType: contentType,
              ContentLength: fileSize,
            },
          });

          // Track upload progress
          upload.on("httpUploadProgress", (progress) => {
            const uploadedBytes = progress.loaded || 0;
            const progressPercent = Math.round(
              (uploadedBytes / fileSize) * 100,
            );

            fastify.downloads.set(file.id, {
              fileId: file.id,
              status: "downloading",
              progress: progressPercent,
              downloadedBytes: uploadedBytes,
              totalBytes: fileSize,
              filename,
              url,
            });
          });

          // Complete the upload
          await upload.done();

          // Mark upload as completed in database
          await fastify.db
            .update(files)
            .set({ completed_at: new Date() })
            .where(eq(files.id, file.id));

          // Update final progress
          fastify.downloads.set(file.id, {
            fileId: file.id,
            status: "completed",
            progress: 100,
            downloadedBytes: fileSize,
            totalBytes: fileSize,
            filename,
            url,
          });

          // Clean up progress after a delay
          setTimeout(() => {
            fastify.downloads.delete(file.id);
          }, 5000);

          return reply.send({
            success: true,
            uploadId: file.id,
            filename: filename,
            size: fileSize,
            contentType: contentType,
          });
        } catch (uploadError) {
          console.error("S3 upload error:", uploadError);

          // Update progress with error
          fastify.downloads.set(file.id, {
            fileId: file.id,
            status: "error",
            progress: 0,
            downloadedBytes: 0,
            totalBytes: fileSize,
            filename,
            url,
            error:
              uploadError instanceof Error
                ? uploadError.message
                : "Upload failed",
          });

          // Clean up error progress after a delay
          setTimeout(() => {
            fastify.downloads.delete(file.id);
          }, 60000);

          return reply.code(500).send({ error: "Failed to upload file to S3" });
        }
      } catch (error) {
        console.error("URL upload error:", error);
        return reply
          .code(500)
          .send({ error: "Failed to start download from URL" });
      }
    },
  );
};

export default route;
