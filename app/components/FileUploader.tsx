import { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { DropZone } from "./upload/DropZone";
import { FileList } from "./upload/FileList";
import { UploaderControls } from "./upload/UploaderControls";
import { type FileUploadEntry } from "./upload/FileListItem";
import {
  preFetchPresignedUrls,
  calculateUploadStats,
  createFileId,
  validateFile,
} from "~/lib/utils";
import { useFileStore } from "~/stores/fileStore";

export interface FileUploaderProps {
  maxSizeInMB?: number;
  chunkSizeInMB?: number;
  allowedFileTypes?: string[];
  initiateUrl?: string;
  presignedUrl?: string;
  completeUrl?: string;
  abortUrl?: string;
  title?: string;
  description?: string;
  maxConcurrentUploads?: number;
  currentFolderId?: string | null;
}

export function FileUploader({
  maxSizeInMB = 15360, // 15GB (15 * 1024 = 15360MB)
  chunkSizeInMB = 5, // Default chunk size of 5MB
  allowedFileTypes,
  initiateUrl = "/api/upload/initiate",
  presignedUrl = "/api/upload/presigned-url",
  completeUrl = "/api/upload/complete",
  abortUrl = "/api/upload/abort",
  title = "Upload Files",
  description,
  maxConcurrentUploads = 3,
  currentFolderId = null,
}: FileUploaderProps) {
  const { addFile, currentFolderId: storeFolderId } = useFileStore();
  const [files, setFiles] = useState<FileUploadEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Pre-fetching optimization state
  const [presignedUrlCache, setPresignedUrlCache] = useState<
    Map<string, string>
  >(new Map());
  const [urlFetchPromises, setUrlFetchPromises] = useState<
    Map<string, Promise<string>>
  >(new Map());

  // Refs to manage upload state
  const xhrRefs = useRef<Map<string, XMLHttpRequest>>(new Map());
  const pendingUploadsRef = useRef<string[]>([]);
  const activeUploadsCountRef = useRef<number>(0);
  const uploadStartTimeRefs = useRef<Map<string, number>>(new Map());
  const speedUpdateIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(
    new Map(),
  ); // Use store's currentFolderId if no explicit currentFolderId is provided
  const activeFolderId = currentFolderId || storeFolderId;

  // Convert chunk size to bytes
  const chunkSizeInBytes = chunkSizeInMB * 1024 * 1024;

  // Function refs to avoid circular dependencies
  const uploadNextPartRef = useRef<(fileId: string) => Promise<void>>();
  const finalizeUploadRef = useRef<(fileId: string) => Promise<void>>();
  const processQueueRef = useRef<() => void>();

  // Function to finalize the upload
  const finalizeUpload = useCallback(
    async (fileId: string): Promise<void> => {
      const fileEntry = files.find((f) => f.id === fileId);
      if (!fileEntry || !fileEntry.uploadId) {
        return;
      }
      try {
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === fileId ? { ...f, status: "finalizing" } : f,
          ),
        );
        // FIX: Send only uploadId and parts
        const response = await fetch(completeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uploadId: fileEntry.uploadId,
            parts: fileEntry.completedParts,
          }),
        });
        if (!response.ok) {
          throw new Error(`Failed to complete upload: ${response.statusText}`);
        }
        const result = await response.json();
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === fileId
              ? { ...f, status: "completed", result, progress: 100 }
              : f,
          ),
        );

        // Add file to Zustand store when upload is completed
        if (result.success && result.fileId) {
          const completedFileEntry = files.find((f) => f.id === fileId);
          if (completedFileEntry) {
            const newFileItem = {
              id: result.fileId,
              name: completedFileEntry.file.name,
              size: completedFileEntry.file.size,
              content_type: completedFileEntry.file.type,
              completed_at: new Date(),
              s3_key: null,
              s3_upload_id: null,
              user_id: "", // This will be set by the server
              folder_id: activeFolderId,
              created_at: new Date(),
              updated_at: new Date(),
            };
            addFile(newFileItem);
          }
        }

        activeUploadsCountRef.current = Math.max(
          0,
          activeUploadsCountRef.current - 1,
        );
        setTimeout(() => processQueueRef.current?.(), 0);
      } catch (error) {
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: "error",
                  error:
                    error instanceof Error ? error.message : "Unknown error",
                }
              : f,
          ),
        );
      }
    },
    [files, completeUrl, addFile, activeFolderId],
  ); // Function to upload the next part of a file
  const uploadNextPart = useCallback(
    async (fileId: string): Promise<void> => {
      const fileEntry = files.find((f) => f.id === fileId);
      if (!fileEntry || !fileEntry.uploadId || !fileEntry.s3UploadId) {
        return;
      }

      const partNumber = fileEntry.currentPart || 1;
      const totalParts = fileEntry.totalParts || 1;

      if (partNumber > totalParts) {
        await finalizeUploadRef.current?.(fileId);
        return;
      }

      try {
        const start = (partNumber - 1) * chunkSizeInBytes;
        const end = Math.min(start + chunkSizeInBytes, fileEntry.file.size);
        const chunk = fileEntry.file.slice(start, end);

        const cacheKey = `${fileEntry.uploadId}-part-${partNumber}`;
        let uploadUrl = presignedUrlCache.get(cacheKey);

        if (!uploadUrl) {
          const ongoingFetch = urlFetchPromises.get(cacheKey);
          if (ongoingFetch) {
            uploadUrl = await ongoingFetch;
          } else {
            // FIX: Use GET and query params for presigned-url
            const url = `${presignedUrl}?uploadId=${encodeURIComponent(
              fileEntry.uploadId,
            )}&s3UploadId=${encodeURIComponent(
              fileEntry.s3UploadId,
            )}&partNumber=${partNumber}`;
            const response = await fetch(url, { method: "GET" });
            if (!response.ok) {
              throw new Error(
                `Failed to get presigned URL: ${response.statusText}`,
              );
            }
            const data = await response.json();
            uploadUrl = data.uploadUrl;
            setPresignedUrlCache((prev) =>
              new Map(prev).set(cacheKey, uploadUrl!),
            );
          }
        }

        const xhr = new XMLHttpRequest();
        const xhrKey = `${fileId}-part-${partNumber}`;
        xhrRefs.current.set(xhrKey, xhr);

        const startTime = Date.now();
        uploadStartTimeRefs.current.set(fileId, startTime);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const partProgress = (event.loaded / event.total) * 100;
            const overallProgress =
              ((partNumber - 1) / totalParts) * 100 + partProgress / totalParts;

            const stats = calculateUploadStats(
              (partNumber - 1) * chunkSizeInBytes + event.loaded,
              fileEntry.file.size,
              startTime,
            );

            setFiles((prevFiles) =>
              prevFiles.map((f) =>
                f.id === fileId
                  ? {
                      ...f,
                      progress: Math.round(overallProgress),
                      speed: stats.speed,
                      timeRemaining: stats.timeRemaining,
                    }
                  : f,
              ),
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const etag = xhr.getResponseHeader("ETag");
            if (etag) {
              setFiles((prevFiles) =>
                prevFiles.map((f) =>
                  f.id === fileId
                    ? {
                        ...f,
                        completedParts: [
                          ...(f.completedParts || []),
                          { partNumber, etag: etag.replace(/"/g, "") },
                        ],
                        currentPart: partNumber + 1,
                      }
                    : f,
                ),
              );

              xhrRefs.current.delete(xhrKey);
              setTimeout(() => uploadNextPartRef.current?.(fileId), 0);
            }
          } else {
            setFiles((prevFiles) =>
              prevFiles.map((f) =>
                f.id === fileId
                  ? {
                      ...f,
                      status: "error",
                      error: `Upload failed: ${xhr.statusText}`,
                    }
                  : f,
              ),
            );
          }
        };

        xhr.onerror = () => {
          setFiles((prevFiles) =>
            prevFiles.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    status: "error",
                    error: "Upload error occurred",
                  }
                : f,
            ),
          );
        };

        xhr.open("PUT", uploadUrl!);
        xhr.send(chunk);
      } catch (error) {
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: "error",
                  error:
                    error instanceof Error ? error.message : "Unknown error",
                }
              : f,
          ),
        );
      }
    },
    [
      files,
      chunkSizeInBytes,
      presignedUrl,
      presignedUrlCache,
      urlFetchPromises,
    ],
  );

  // Function to initiate an upload
  const initiateUpload = useCallback(
    async (fileEntry: FileUploadEntry): Promise<void> => {
      try {
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === fileEntry.id ? { ...f, status: "initiating" } : f,
          ),
        );

        const response = await fetch(initiateUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: fileEntry.file.name,
            size: fileEntry.file.size,
            contentType: fileEntry.file.type,
            chunkSize: chunkSizeInBytes,
            folderId: activeFolderId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to initiate upload: ${response.statusText}`);
        }
        const data = await response.json();
        const { uploadId, s3UploadId } = data;
        const totalParts = Math.ceil(fileEntry.file.size / chunkSizeInBytes);

        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === fileEntry.id
              ? {
                  ...f,
                  uploadId,
                  s3UploadId,
                  totalParts,
                  currentPart: 1,
                  completedParts: [],
                  status: "uploading" as const,
                  shouldStartUpload: true, // Flag to trigger upload start
                }
              : f,
          ),
        );

        // Pre-fetch the first few presigned URLs for larger files
        if (totalParts > 1) {
          const prefetchCount = Math.min(3, totalParts);
          await preFetchPresignedUrls(
            presignedUrl,
            uploadId,
            s3UploadId,
            1,
            prefetchCount,
            presignedUrlCache,
            urlFetchPromises,
            setPresignedUrlCache,
            setUrlFetchPromises,
          );
        }
      } catch (error) {
        console.error("Error initiating upload:", error);
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === fileEntry.id
              ? {
                  ...f,
                  status: "error",
                  error:
                    error instanceof Error ? error.message : "Unknown error",
                }
              : f,
          ),
        );
      }
    },
    [
      initiateUrl,
      chunkSizeInBytes,
      activeFolderId,
      presignedUrl,
      presignedUrlCache,
      urlFetchPromises,
    ],
  );

  // Function to process the upload queue
  const processQueue = useCallback(() => {
    const pendingFiles = pendingUploadsRef.current;
    const activeCount = activeUploadsCountRef.current;

    if (activeCount >= maxConcurrentUploads || pendingFiles.length === 0) {
      return;
    }

    const fileId = pendingFiles.shift();
    if (fileId) {
      const fileEntry = files.find((f) => f.id === fileId);
      if (fileEntry && fileEntry.status === "idle") {
        activeUploadsCountRef.current++;
        initiateUpload(fileEntry);
      }
    }
  }, [files, maxConcurrentUploads, initiateUpload]);
  // Update refs
  useEffect(() => {
    uploadNextPartRef.current = uploadNextPart;
    finalizeUploadRef.current = finalizeUpload;
    processQueueRef.current = processQueue;
  }, [uploadNextPart, finalizeUpload, processQueue]);
  // Start upload when shouldStartUpload flag is set
  useEffect(() => {
    files.forEach((file) => {
      if (file.shouldStartUpload && file.uploadId && file.s3UploadId) {
        // Reset the flag and start upload
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === file.id ? { ...f, shouldStartUpload: false } : f,
          ),
        );
        setTimeout(() => uploadNextPartRef.current?.(file.id), 0);
      }
    });
  }, [files]);

  // Function to cancel an upload
  const cancelUpload = useCallback(
    (fileId: string) => {
      const fileEntry = files.find((f) => f.id === fileId);

      // Cancel XHR requests
      for (let i = 1; i <= (fileEntry?.totalParts || 0); i++) {
        const xhr = xhrRefs.current.get(`${fileId}-part-${i}`);
        if (xhr) {
          xhr.abort();
          xhrRefs.current.delete(`${fileId}-part-${i}`);
        }
      }

      // Clean up intervals
      if (speedUpdateIntervalsRef.current.has(fileId)) {
        clearInterval(speedUpdateIntervalsRef.current.get(fileId)!);
        speedUpdateIntervalsRef.current.delete(fileId);
      }

      // Abort server-side upload
      if (fileEntry && fileEntry.uploadId && fileEntry.s3UploadId) {
        fetch(abortUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uploadId: fileEntry.uploadId,
            s3UploadId: fileEntry.s3UploadId,
          }),
        }).catch(console.error);
      }

      // Remove from pending uploads
      const index = pendingUploadsRef.current.indexOf(fileId);
      if (index > -1) {
        pendingUploadsRef.current.splice(index, 1);
      }

      // Remove file
      setFiles((prevFiles) => prevFiles.filter((f) => f.id !== fileId));

      activeUploadsCountRef.current = Math.max(
        0,
        activeUploadsCountRef.current - 1,
      );
      setTimeout(() => processQueueRef.current?.(), 0);
    },
    [files, abortUrl],
  );

  // Helper functions for controls
  const startAllUploads = useCallback(() => {
    const idleFiles = files.filter((f) => f.status === "idle");
    idleFiles.forEach((file) => {
      if (!pendingUploadsRef.current.includes(file.id)) {
        pendingUploadsRef.current.push(file.id);
      }
    });
    processQueueRef.current?.();
  }, [files]);

  const cancelAllUploads = useCallback(() => {
    const activeFiles = files.filter((f) =>
      ["uploading", "initiating", "finalizing"].includes(f.status),
    );
    activeFiles.forEach((file) => {
      cancelUpload(file.id);
    });
  }, [files, cancelUpload]);

  const clearCompleted = useCallback(() => {
    setFiles((prevFiles) =>
      prevFiles.filter((file) => file.status !== "completed"),
    );
  }, []);

  // File processing
  const processFiles = useCallback(
    (newFiles: File[]) => {
      setErrorMessage(null);
      const fileEntries: FileUploadEntry[] = [];

      for (const file of newFiles) {
        const validation = validateFile(file, maxSizeInMB, allowedFileTypes);

        if (!validation.isValid) {
          setErrorMessage(validation.error || "File validation failed");
          continue;
        }

        const fileEntry: FileUploadEntry = {
          id: createFileId(),
          file,
          status: "idle",
          progress: 0,
          speed: 0,
          timeRemaining: "",
        };

        fileEntries.push(fileEntry);
        pendingUploadsRef.current.push(fileEntry.id);
      }

      setFiles((prevFiles) => [...prevFiles, ...fileEntries]);
      setTimeout(() => processQueueRef.current?.(), 0);
    },
    [maxSizeInMB, allowedFileTypes],
  );

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        processFiles(droppedFiles);
      }
    },
    [processFiles],
  );

  // Calculate overall progress
  const getOverallProgress = useCallback(() => {
    if (files.length === 0) return 0;
    const totalProgress = files.reduce((sum, file) => sum + file.progress, 0);
    return Math.round(totalProgress / files.length);
  }, [files]);

  // Helper booleans for controls
  const hasIdleFiles = files.some((f) => f.status === "idle");
  const hasActiveFiles = files.some((f) =>
    ["uploading", "initiating", "finalizing"].includes(f.status),
  );
  const hasCompletedFiles = files.some((f) => f.status === "completed");

  // Clean up on unmount
  useEffect(() => {
    const intervals = speedUpdateIntervalsRef.current;
    return () => {
      intervals.forEach((interval) => {
        clearInterval(interval);
      });
    };
  }, []);

  // Process queue when files change
  useEffect(() => {
    if (pendingUploadsRef.current.length > 0) {
      setTimeout(() => processQueueRef.current?.(), 0);
    }
  }, [files]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Display */}
        {errorMessage && (
          <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-800">
            {errorMessage}
          </div>
        )}

        {/* Drop Zone */}
        <DropZone
          onFilesSelected={processFiles}
          isDragOver={isDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          maxSizeInMB={maxSizeInMB}
          allowedFileTypes={allowedFileTypes}
          disabled={activeUploadsCountRef.current >= maxConcurrentUploads}
        />

        {/* Uploader Controls */}
        {files.length > 0 && (
          <UploaderControls
            overallProgress={getOverallProgress()}
            activeUploadsCount={activeUploadsCountRef.current}
            maxConcurrentUploads={maxConcurrentUploads}
            hasIdleFiles={hasIdleFiles}
            hasActiveFiles={hasActiveFiles}
            hasCompletedFiles={hasCompletedFiles}
            onStartAll={startAllUploads}
            onCancelAll={cancelAllUploads}
            onClearCompleted={clearCompleted}
          />
        )}

        {/* File List */}
        <FileList
          files={files}
          onUpload={initiateUpload}
          onCancel={cancelUpload}
          onRetry={initiateUpload}
        />
      </CardContent>
    </Card>
  );
}
