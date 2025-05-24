import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID!,
    secretAccessKey: process.env.SECRET_ACCESS_KEY!,
  },
});

export const S3_BUCKET = process.env.S3_BUCKET_NAME!;

// 5MB chunk size for multipart upload
export const CHUNK_SIZE = 5 * 1024 * 1024;

export interface MultipartUploadInfo {
  uploadId: string;
  key: string;
  bucket: string;
}

export interface PartInfo {
  partNumber: number;
  etag: string;
}

// Initialize multipart upload
export async function initializeMultipartUpload(
  key: string,
  contentType: string,
): Promise<MultipartUploadInfo> {
  const command = new CreateMultipartUploadCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const response = await s3Client.send(command);

  if (!response.UploadId) {
    throw new Error("Failed to initialize multipart upload");
  }

  return {
    uploadId: response.UploadId,
    key,
    bucket: S3_BUCKET,
  };
}

// Generate presigned URL for uploading a part
export async function generatePresignedUploadUrl(
  key: string,
  uploadId: string,
  partNumber: number,
): Promise<string> {
  const command = new UploadPartCommand({
    Bucket: S3_BUCKET,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
}

// Complete multipart upload
export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: PartInfo[],
): Promise<void> {
  const command = new CompleteMultipartUploadCommand({
    Bucket: S3_BUCKET,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.map((part) => ({
        ETag: part.etag,
        PartNumber: part.partNumber,
      })),
    },
  });

  await s3Client.send(command);
}

// Abort multipart upload
export async function abortMultipartUpload(
  key: string,
  uploadId: string,
): Promise<void> {
  const command = new AbortMultipartUploadCommand({
    Bucket: S3_BUCKET,
    Key: key,
    UploadId: uploadId,
  });

  await s3Client.send(command);
}

// Generate presigned URL for downloading
export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

// Delete object from S3
export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
}

// Generate S3 key for a file
export function generateS3Key(
  userId: string,
  fileId: string,
  filename: string,
): string {
  return `${userId}/${filename}`;
}
