import type { FastifyPluginAsync } from "fastify";
import * as path from "node:path";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.post("/", async (request, reply) => {
    try {
      // Get query parameters
      const query = request.query as {
        uploadId?: string;
        partNumber?: string;
      };
      const uploadId = query.uploadId;
      const partNumberStr = query.partNumber;

      if (!uploadId || !partNumberStr) {
        return reply
          .code(400)
          .send({ error: "Missing uploadId or partNumber" });
      }

      const partNumber = parseInt(partNumberStr, 10);
      if (isNaN(partNumber)) {
        return reply.code(400).send({ error: "Invalid partNumber" });
      }

      // Get upload metadata
      const uploadData = fastify.upload.get(uploadId);

      if (!uploadData) {
        return reply.code(404).send({ error: "Upload session not found" });
      }

      // Process the uploaded part
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({ error: "No file part received" });
      }

      // Save the chunk to a separate file
      const chunkFilePath = path.join(
        uploadData.uploadDir,
        `chunk-${partNumber}`,
      );

      await pipeline(data.file, createWriteStream(chunkFilePath));

      // Mark the chunk as received
      uploadData.receivedChunks.add(partNumber);

      // Update the map
      fastify.upload.set(uploadId, uploadData);

      return reply.send({
        success: true,
        chunkIndex: partNumber,
        receivedChunks: uploadData.receivedChunks.size,
        totalChunks: uploadData.totalChunks,
      });
    } catch (error) {
      console.error("Chunk upload error:", error);
      return reply.code(500).send({ error: "Failed to upload chunk" });
    }
  });
};

export default route;
