export interface UploadMetadata {
  filename: string;
  contentType: string;
  fileSize: number;
  totalChunks: number;
  uploadDir: string;
  receivedChunks: Set<number>;
  s3Key?: string;
  s3UploadId?: string;
}

export interface DownloadProgress {
  fileId: string;
  status: "downloading" | "completed" | "error";
  progress: number; // 0-100
  downloadedBytes: number;
  totalBytes: number;
  error?: string;
  filename?: string;
  url?: string;
}

export interface MergeProgress {
  fileId: string;
  status: "merging" | "completed" | "error";
  progress: number; // 0-100
  currentChunk: number;
  totalChunks: number;
  error?: string;
}
