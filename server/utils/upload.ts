import * as fs from "node:fs";
import * as path from "node:path";
import crypto from "node:crypto";

export const uploadDir =
  process.env.DATA_FOLDER || path.join(process.cwd(), "uploads");

/**
 * Validates an uploadId to prevent directory traversal attacks
 */
export function validateUploadId(uploadId: string): boolean {
  return /^[a-zA-Z0-9-]+$/.test(uploadId);
}

/**
 * Generates a unique upload ID
 */
export function generateUploadId(): string {
  return crypto.randomUUID();
}

/**
 * Creates a directory for an upload session
 */
export function createUploadDirectory(
  userId: string,
  uploadId: string,
): string {
  const fileDir = path.join(uploadDir, userId, uploadId);

  fs.mkdirSync(fileDir, { recursive: true });

  return fileDir;
}
