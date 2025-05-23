import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { db } from "server/database";
import { files } from "server/database/schema";
import { eq } from "drizzle-orm";
import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { PassThrough } from "stream";

export async function loader({ params, context }: LoaderFunctionArgs) {
  const { uploadId } = params;

  if (!uploadId) {
    return json({ message: "Missing uploadId" }, { status: 400 });
  }

  // Validate the uploadId to prevent directory traversal attacks
  if (!/^[a-zA-Z0-9-]+$/.test(uploadId)) {
    return json({ message: "Invalid uploadId format" }, { status: 400 });
  }

  const metadata = await db.query.files.findFirst({
    where: eq(files.id, uploadId),
  });

  if (!metadata) {
    return json({ message: "File not found" }, { status: 404 });
  }

  const uploadDir =
    process.env.DATA_FOLDER || path.join(process.cwd(), "uploads");

  const fileDir = path.join(uploadDir, metadata.user_id, uploadId);

  try {
    // Check if the directory exists
    await fs.access(fileDir);
  } catch (error) {
    return json({ message: "File not found" }, { status: 404 });
  }

  const outputStream = new PassThrough();

  // Process chunks in sequence
  (async () => {
    try {
      for (let i = 0; i < metadata.total_chunks; i++) {
        const chunkPath = path.join(fileDir, `chunk-${i}`);
        // Create a read stream for each chunk
        const fileStream = fsSync.createReadStream(chunkPath);

        // Wait for the chunk to be fully piped before moving to the next one
        await new Promise<void>((resolve, reject) => {
          fileStream.on("error", (err) => reject(err));
          fileStream.pipe(outputStream, { end: false });
          fileStream.on("end", () => resolve());
        });
      }
      // End the stream after all chunks have been processed
      outputStream.end();
    } catch (error) {
      console.error("Error streaming file:", error);
      outputStream.destroy(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  })();
  // Return a streaming response
  return new Response(outputStream as any, {
    status: 200,
    headers: {
      "Content-Type": metadata.content_type || "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(metadata.name)}"`,
      "Content-Length": metadata.size.toString(),
    },
  });
}
