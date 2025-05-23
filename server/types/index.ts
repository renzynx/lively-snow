export interface UploadMetadata {
  filename: string;
  contentType: string;
  fileSize: number;
  totalChunks: number;
  uploadDir: string;
  receivedChunks: Set<number>;
}
