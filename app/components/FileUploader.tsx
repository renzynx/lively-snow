import { AlertCircle, CheckCircle2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Progress } from "~/components/ui/progress";
import { RingProgress } from "~/components/ui/ring-progress";
import { formatFileSize, formatTimeRemaining } from "~/lib/utils";
import { ScrollArea } from "./ui/scroll-area";

// Define the status type for the upload
type UploadStatus =
  | "idle"
  | "initiating"
  | "uploading"
  | "finalizing"
  | "completed"
  | "error";

// Define a type for file upload entry
type FileUploadEntry = {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  uploadId?: string;
  speed: number; // Speed in KB/s
  timeRemaining: string;
  result?: any;
};

export interface FileUploaderProps {
  maxSizeInMB?: number;
  chunkSizeInMB?: number;
  allowedFileTypes?: string[];
  initiateUrl?: string;
  uploadUrl?: string;
  finalizeUrl?: string;
  title?: string;
  description?: string;
  maxConcurrentUploads?: number;
}

export function FileUploader({
  maxSizeInMB = 15360, // 15GB (15 * 1024 = 15360MB)
  chunkSizeInMB = 5, // Default chunk size of 5MB
  allowedFileTypes,
  initiateUrl = "/api/upload/initiate",
  uploadUrl = "/api/upload",
  finalizeUrl = "/api/upload/finalize",
  title = "Upload Files",
  description,
  maxConcurrentUploads = 3,
}: FileUploaderProps) {
  const [files, setFiles] = useState<FileUploadEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs to manage upload state
  const xhrRefs = useRef<Map<string, XMLHttpRequest>>(new Map());
  const pendingUploadsRef = useRef<string[]>([]);
  const activeUploadsCountRef = useRef<number>(0);
  const uploadStartTimeRefs = useRef<Map<string, number>>(new Map());
  const lastLoadedRefs = useRef<Map<string, number>>(new Map());
  const speedUpdateIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(
    new Map(),
  );

  // Convert chunk size to bytes
  const chunkSizeInBytes = chunkSizeInMB * 1024 * 1024;

  // Helper function to update file status
  const updateFileStatus = useCallback(
    (fileId: string, status: UploadStatus) => {
      setFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.id === fileId ? { ...file, status } : file,
        ),
      );
    },
    [],
  );

  // Helper function to update file progress
  const updateFileProgress = useCallback((fileId: string, progress: number) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === fileId ? { ...file, progress } : file,
      ),
    );
  }, []);

  // Helper function to update file entry
  const updateFileEntry = useCallback(
    (fileId: string, updates: Partial<FileUploadEntry>) => {
      setFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.id === fileId ? { ...file, ...updates } : file,
        ),
      );
    },
    [],
  );

  // Helper function to handle file upload error
  const handleFileError = useCallback(
    (fileId: string, errorMsg: string) => {
      if (speedUpdateIntervalsRef.current.has(fileId)) {
        clearInterval(speedUpdateIntervalsRef.current.get(fileId)!);
        speedUpdateIntervalsRef.current.delete(fileId);
      }

      updateFileEntry(fileId, { status: "error", error: errorMsg });

      // Release the upload slot
      activeUploadsCountRef.current--;

      // Process the next upload
      processQueueRef.current();
    },
    [updateFileEntry],
  );

  // Start speed tracking for a file
  const startSpeedTracking = useCallback(
    (fileId: string, totalSize: number) => {
      // Reset values
      uploadStartTimeRefs.current.set(fileId, Date.now());
      lastLoadedRefs.current.set(fileId, 0);

      // Clear any existing interval
      if (speedUpdateIntervalsRef.current.has(fileId)) {
        clearInterval(speedUpdateIntervalsRef.current.get(fileId)!);
      }

      // Update speed every second
      const interval = setInterval(() => {
        const fileEntry = files.find((f) => f.id === fileId);
        if (fileEntry && fileEntry.status === "uploading") {
          const xhr = xhrRefs.current.get(fileId);
          const loaded = xhr?.upload
            ? lastLoadedRefs.current.get(fileId) || 0
            : 0;
          const startTime =
            uploadStartTimeRefs.current.get(fileId) || Date.now();
          const elapsedSeconds = (Date.now() - startTime) / 1000;

          if (elapsedSeconds > 0 && loaded > 0) {
            // Calculate speed in KB/s
            const speedKBps = loaded / 1024 / elapsedSeconds;

            // Calculate time remaining
            const bytesRemaining = totalSize - loaded;
            let remainingTime = "";
            if (speedKBps > 0) {
              const secondsRemaining = bytesRemaining / 1024 / speedKBps;
              remainingTime = formatTimeRemaining(secondsRemaining);
            }

            // Update the file entry
            setFiles((prevFiles) =>
              prevFiles.map((f) =>
                f.id === fileId
                  ? {
                      ...f,
                      speed: Math.round(speedKBps),
                      timeRemaining: remainingTime,
                    }
                  : f,
              ),
            );
          }
        } else {
          // If file is no longer uploading, clear the interval
          clearInterval(speedUpdateIntervalsRef.current.get(fileId)!);
          speedUpdateIntervalsRef.current.delete(fileId);
        }
      }, 1000);

      speedUpdateIntervalsRef.current.set(fileId, interval);
    },
    [files],
  );

  // Function to finalize the upload
  const finalizeUpload = useCallback(
    async (fileId: string, uploadId: string) => {
      try {
        // Make the request to finalize the upload
        const response = await fetch(`${finalizeUrl}?uploadId=${uploadId}`, {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error(`Failed to finalize upload: ${response.statusText}`);
        }

        const result = await response.json();
        updateFileEntry(fileId, { status: "completed", result });

        // Release the upload slot
        activeUploadsCountRef.current--;

        // Process the next upload
        processQueueRef.current();
      } catch (error) {
        console.error(`Error finalizing upload for file ${fileId}:`, error);
        handleFileError(
          fileId,
          error instanceof Error ? error.message : "Failed to finalize upload",
        );
      }
    },
    [finalizeUrl, updateFileEntry, handleFileError],
  );

  // Upload a chunk with XMLHttpRequest
  const uploadChunkWithXHR = useCallback(
    (
      fileId: string,
      chunkIndex: number,
      uploadId: string,
      totalChunks: number,
    ) => {
      const fileEntry = files.find((f) => f.id === fileId);
      if (!fileEntry) return;

      const file = fileEntry.file;

      // Create a chunk from the file
      const start = chunkIndex * chunkSizeInBytes;
      const end = Math.min(start + chunkSizeInBytes, file.size);
      const chunk = file.slice(start, end);

      // Create the form data for this chunk
      const formData = new FormData();
      formData.append("chunk", chunk);
      formData.append("partNumber", chunkIndex.toString());

      // Create XHR
      const xhr = new XMLHttpRequest();
      xhrRefs.current.set(fileId, xhr);

      // Setup progress monitoring
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const chunkProgress = event.loaded / event.total;
          const overallProgress =
            ((chunkIndex + chunkProgress) / totalChunks) * 100;

          // Update progress
          updateFileProgress(fileId, Math.round(overallProgress));

          // Update lastLoaded for speed calculation
          lastLoadedRefs.current.set(
            fileId,
            chunkIndex * chunkSizeInBytes + event.loaded,
          );
        }
      };

      // Handle completion
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Update chunk index
          const newChunkIndex = chunkIndex + 1;

          // Check if all chunks are uploaded
          if (newChunkIndex < totalChunks) {
            // Upload next chunk
            uploadChunkWithXHR(fileId, newChunkIndex, uploadId, totalChunks);
          } else {
            // Finalize the upload
            if (speedUpdateIntervalsRef.current.has(fileId)) {
              clearInterval(speedUpdateIntervalsRef.current.get(fileId)!);
              speedUpdateIntervalsRef.current.delete(fileId);
            }

            updateFileStatus(fileId, "finalizing");
            finalizeUpload(fileId, uploadId);
          }
        } else {
          handleFileError(fileId, `Failed to upload: ${xhr.statusText}`);
        }
      };

      // Handle errors
      xhr.onerror = () => {
        handleFileError(fileId, "Network error occurred during upload");
      };

      xhr.onabort = () => {
        // Handle by cancelUpload
      };

      // Open and send the request
      xhr.open(
        "POST",
        `${uploadUrl}?uploadId=${uploadId}&partNumber=${chunkIndex}`,
      );
      xhr.send(formData);
    },
    [
      files,
      chunkSizeInBytes,
      uploadUrl,
      updateFileProgress,
      updateFileStatus,
      finalizeUpload,
      handleFileError,
    ],
  );

  // Upload file with XMLHttpRequest for better progress tracking
  const uploadFileWithXHR = useCallback(
    (fileId: string, uploadId: string, totalChunks: number) => {
      const fileEntry = files.find((f) => f.id === fileId);
      if (!fileEntry) return;

      // Start speed tracking
      startSpeedTracking(fileId, fileEntry.file.size);

      // Upload first chunk
      uploadChunkWithXHR(fileId, 0, uploadId, totalChunks);
    },
    [files, uploadChunkWithXHR, startSpeedTracking],
  );

  // Initiate upload for a file
  const initiateUpload = useCallback(
    async (fileEntry: FileUploadEntry) => {
      const { id, file } = fileEntry;

      updateFileStatus(id, "initiating");

      try {
        // Calculate total chunks
        const totalChunks = Math.ceil(file.size / chunkSizeInBytes);

        // Make the request to the server
        const response = await fetch(initiateUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            fileSize: file.size,
            totalChunks,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to initiate upload: ${response.statusText}`);
        }

        const data = await response.json();
        const uploadId = data.uploadId;

        // Update file entry with uploadId
        updateFileEntry(id, { uploadId, status: "uploading" });

        // Start upload
        uploadFileWithXHR(id, uploadId, totalChunks);
      } catch (error) {
        console.error(`Error initiating upload for ${file.name}:`, error);
        handleFileError(
          id,
          error instanceof Error ? error.message : "Failed to initiate upload",
        );
      }
    },
    [
      initiateUrl,
      chunkSizeInBytes,
      updateFileStatus,
      updateFileEntry,
      uploadFileWithXHR,
      handleFileError,
    ],
  );

  // Function to process the queue outside of React's hooks to avoid circular dependencies
  const processQueue = useCallback(() => {
    console.log(
      `Processing queue: ${pendingUploadsRef.current.length} pending, ${activeUploadsCountRef.current}/${maxConcurrentUploads} active uploads`,
    );

    if (
      pendingUploadsRef.current.length > 0 &&
      activeUploadsCountRef.current < maxConcurrentUploads
    ) {
      const availableSlots =
        maxConcurrentUploads - activeUploadsCountRef.current;
      const toProcess = Math.min(
        availableSlots,
        pendingUploadsRef.current.length,
      );

      console.log(`Starting ${toProcess} new uploads from queue`);

      for (let i = 0; i < toProcess; i++) {
        const fileId = pendingUploadsRef.current.shift();
        if (!fileId) continue;

        const fileEntry = files.find((f) => f.id === fileId);

        if (fileEntry && fileEntry.status === "idle") {
          activeUploadsCountRef.current++;
          initiateUpload(fileEntry);
        } else if (fileEntry) {
          console.warn(
            `File ${fileId} already has status: ${fileEntry.status}`,
          );
        } else {
          console.warn(`File ${fileId} not found in files array`);
        }
      }
    }
  }, [files, maxConcurrentUploads, initiateUpload]);

  // Keep a ref to the latest processQueue function to avoid dependency cycles
  const processQueueRef = useRef(processQueue);

  // Update the ref whenever processQueue changes
  useEffect(() => {
    processQueueRef.current = processQueue;
  }, [processQueue]);

  // Function to cancel the upload of a specific file
  const cancelUpload = useCallback(
    (fileId: string) => {
      const xhr = xhrRefs.current.get(fileId);
      if (xhr) {
        xhr.abort();
        xhrRefs.current.delete(fileId);
      }

      if (speedUpdateIntervalsRef.current.has(fileId)) {
        clearInterval(speedUpdateIntervalsRef.current.get(fileId)!);
        speedUpdateIntervalsRef.current.delete(fileId);
      }

      // Handle pending uploads
      const pendingIndex = pendingUploadsRef.current.indexOf(fileId);
      if (pendingIndex !== -1) {
        pendingUploadsRef.current.splice(pendingIndex, 1);
      } else {
        // If it was an active upload, release the slot
        activeUploadsCountRef.current--;
      }

      updateFileEntry(fileId, {
        status: "idle",
        progress: 0,
        speed: 0,
        timeRemaining: "",
      });

      // Process the next upload
      processQueueRef.current();
    },
    [updateFileEntry],
  );

  // Function to remove a file from the list
  const removeFile = useCallback(
    (fileId: string) => {
      // Cancel upload if in progress
      const fileEntry = files.find((f) => f.id === fileId);
      if (
        fileEntry &&
        ["uploading", "initiating", "finalizing"].includes(fileEntry.status)
      ) {
        cancelUpload(fileId);
      }

      // Remove file from the list
      setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId));
    },
    [files, cancelUpload],
  );

  // Start all pending uploads
  const startAllUploads = useCallback(() => {
    // Add all idle files to pending uploads
    const idleFiles = files.filter((file) => file.status === "idle");

    idleFiles.forEach((file) => {
      if (!pendingUploadsRef.current.includes(file.id)) {
        pendingUploadsRef.current.push(file.id);
      }
    });

    // Process the queue
    processQueueRef.current();
  }, [files]);

  // Cancel all active uploads
  const cancelAllUploads = useCallback(() => {
    files.forEach((file) => {
      if (["uploading", "initiating", "finalizing"].includes(file.status)) {
        cancelUpload(file.id);
      }
    });

    // Clear pending uploads
    pendingUploadsRef.current = [];
  }, [files, cancelUpload]);

  // Clear all completed uploads
  const clearCompleted = useCallback(() => {
    setFiles((prevFiles) =>
      prevFiles.filter((file) => file.status !== "completed"),
    );
  }, []);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = event.target.files;
    setErrorMessage(null);

    if (!newFiles || newFiles.length === 0) return;

    // Process each new file
    const fileEntries: FileUploadEntry[] = [];

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      if (!file) continue;

      // Validate file size
      if (file.size > maxSizeInMB * 1024 * 1024) {
        setErrorMessage(
          `File '${file.name}' is too large. Maximum size is ${maxSizeInMB}MB.`,
        );
        continue;
      }

      // Validate file type
      if (allowedFileTypes && allowedFileTypes.length > 0) {
        const fileType = file.type;
        const isAllowed = allowedFileTypes.some((type) =>
          fileType.startsWith(type),
        );
        if (!isAllowed) {
          setErrorMessage(
            `File type not allowed for '${file.name}'. Allowed types: ${allowedFileTypes.join(", ")}`,
          );
          continue;
        }
      }

      // Create a new file entry with a unique ID
      const fileEntry: FileUploadEntry = {
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        file: file,
        status: "idle",
        progress: 0,
        speed: 0,
        timeRemaining: "",
      };

      fileEntries.push(fileEntry);
      pendingUploadsRef.current.push(fileEntry.id);
    }

    // Add new files to the list
    setFiles((prevFiles) => [...prevFiles, ...fileEntries]);

    // Reset the input
    event.target.value = "";

    // Immediately process the queue to start uploads
    setTimeout(() => processQueueRef.current(), 0);
  };

  // Process the queue when component mounts or files array changes
  useEffect(() => {
    if (pendingUploadsRef.current.length > 0) {
      setTimeout(() => processQueueRef.current(), 0);
    }
  }, [files]);

  // Clean up speed intervals on unmount
  useEffect(() => {
    const intervals = new Map(speedUpdateIntervalsRef.current);
    return () => {
      // Clean up all interval timers
      intervals.forEach((interval) => {
        clearInterval(interval);
      });
    };
  }, []);

  // Calculate overall progress
  const getOverallProgress = useCallback(() => {
    if (files.length === 0) return 0;

    const totalProgress = files.reduce((sum, file) => sum + file.progress, 0);
    return Math.round(totalProgress / files.length);
  }, [files]);

  // Get counts by status
  const getStatusCounts = useCallback(() => {
    return files.reduce((counts: Record<string, number>, file) => {
      counts[file.status] = (counts[file.status] || 0) + 1;
      return counts;
    }, {});
  }, [files]);

  const statusCounts = getStatusCounts();
  const totalActive =
    (statusCounts.uploading || 0) +
    (statusCounts.initiating || 0) +
    (statusCounts.finalizing || 0);

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description || (
            <>
              Upload files up to {maxSizeInMB}MB in size
              {allowedFileTypes && allowedFileTypes.length > 0 && (
                <span> of types: {allowedFileTypes.join(", ")}</span>
              )}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              type="file"
              name="file"
              id="file"
              multiple
              onChange={handleFileChange}
              accept={
                allowedFileTypes && allowedFileTypes.length > 0
                  ? allowedFileTypes.join(",")
                  : undefined
              }
              className="cursor-pointer"
            />
            {errorMessage && (
              <div className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle size={16} />
                {errorMessage}
              </div>
            )}
          </div>{" "}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
                <div className="flex justify-end items-center gap-2 my-4">
                  <RingProgress
                    progress={getOverallProgress()}
                    size={60}
                    thickness={4}
                    progressClassName="text-primary"
                    showPercentage={true}
                    fontSize={15}
                  />
                </div>
                <div className="flex gap-2">
                  {statusCounts.idle! > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startAllUploads}
                    >
                      <Upload size={14} className="mr-1" /> Start All
                    </Button>
                  )}
                  {totalActive > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelAllUploads}
                    >
                      <X size={14} className="mr-1" /> Cancel All
                    </Button>
                  )}
                  {statusCounts.completed! > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearCompleted}
                    >
                      Clear Completed
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          <ScrollArea className="h-[300px] overflow-hidden border rounded-md mt-4 p-2">
            {files.map((fileEntry) => (
              <div
                key={fileEntry.id}
                className="border rounded-md p-2 space-y-2 text-sm my-1"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 truncate">
                    {fileEntry.status === "completed" ? (
                      <CheckCircle2
                        className="text-green-500 shrink-0"
                        size={16}
                      />
                    ) : fileEntry.status === "error" ? (
                      <AlertCircle
                        className="text-red-500 shrink-0"
                        size={16}
                      />
                    ) : (
                      <span className="w-4 h-4 shrink-0" />
                    )}
                    <span className="truncate" title={fileEntry.file.name}>
                      {fileEntry.file.name.length > 50
                        ? fileEntry.file.name.slice(0, 50) + "..."
                        : fileEntry.file.name}
                    </span>
                    <span className="text-muted-foreground shrink-0">
                      {formatFileSize(fileEntry.file.size)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {fileEntry.status === "idle" ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          pendingUploadsRef.current.push(fileEntry.id);
                          processQueueRef.current();
                        }}
                      >
                        <Upload size={14} />
                      </Button>
                    ) : ["uploading", "initiating", "finalizing"].includes(
                        fileEntry.status,
                      ) ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => cancelUpload(fileEntry.id)}
                      >
                        <X size={14} />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeFile(fileEntry.id)}
                      >
                        <X size={14} />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <div>
                      {fileEntry.status === "uploading" && (
                        <>
                          {fileEntry.progress}%
                          {fileEntry.speed > 0 && (
                            <span className="ml-2">
                              {fileEntry.speed} KB/s
                              {fileEntry.timeRemaining && (
                                <span className="ml-1">
                                  • {fileEntry.timeRemaining} remaining
                                </span>
                              )}
                            </span>
                          )}
                        </>
                      )}
                      {fileEntry.status === "initiating" &&
                        "Preparing upload..."}
                      {fileEntry.status === "finalizing" && "Finalizing..."}
                      {fileEntry.status === "completed" && "Completed"}
                      {fileEntry.status === "error" && fileEntry.error}
                    </div>
                    <div>
                      {["uploading", "initiating", "finalizing"].includes(
                        fileEntry.status,
                      ) && (
                        <span className="capitalize">{fileEntry.status}</span>
                      )}
                    </div>
                  </div>{" "}
                  {["uploading", "initiating", "finalizing"].includes(
                    fileEntry.status,
                  ) && (
                    <div className="flex items-center">
                      <Progress value={fileEntry.progress} className="h-1" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
