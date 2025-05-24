import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatFileSize = (sizeInBytes: number): string => {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  } else if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(2)} KB`;
  } else if (sizeInBytes < 1024 * 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
};

export const formatTimeRemaining = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.ceil(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return `${minutes}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
};

// Upload-related utility functions

/**
 * Pre-fetch multiple presigned URLs for smoother upload experience
 */
export async function preFetchPresignedUrls(
  presignedUrl: string,
  uploadId: string,
  s3UploadId: string,
  startPart: number,
  count: number = 3,
  presignedUrlCache: Map<string, string>,
  urlFetchPromises: Map<string, Promise<string>>,
  setPresignedUrlCache: (
    fn: (prev: Map<string, string>) => Map<string, string>,
  ) => void,
  setUrlFetchPromises: (
    fn: (prev: Map<string, Promise<string>>) => Map<string, Promise<string>>,
  ) => void,
): Promise<void> {
  const fetchPromises = [];

  for (let i = startPart; i < startPart + count; i++) {
    const cacheKey = `${uploadId}-part-${i}`;

    // Skip if already cached or being fetched
    if (presignedUrlCache.has(cacheKey) || urlFetchPromises.has(cacheKey)) {
      continue;
    }

    const url = `${presignedUrl}?uploadId=${encodeURIComponent(
      uploadId,
    )}&s3UploadId=${encodeURIComponent(s3UploadId)}&partNumber=${i}`;

    // Store the promise in the Map
    const fetchPromise = fetch(url, { method: "GET" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to get presigned URL: ${response.statusText}`,
          );
        }
        return response.json();
      })
      .then((data) => {
        // Update the cache with the new URL
        setPresignedUrlCache((prev) =>
          new Map(prev).set(cacheKey, data.uploadUrl),
        );
        return data.uploadUrl;
      })
      .finally(() => {
        // Clean up the promise from the Map when done regardless of success/failure
        setUrlFetchPromises((prev) => {
          const newMap = new Map(prev);
          newMap.delete(cacheKey);
          return newMap;
        });
      });

    // Add to tracking Map and promises array
    setUrlFetchPromises((prev) => new Map(prev).set(cacheKey, fetchPromise));
    fetchPromises.push(fetchPromise);
  }

  // Wait for all promises to complete (failures won't cause this to reject)
  await Promise.allSettled(fetchPromises);
}

/**
 * Calculate speed and time remaining for an upload
 */
export function calculateUploadStats(
  uploadedBytes: number,
  totalBytes: number,
  startTime: number,
): { speed: number; timeRemaining: string } {
  const currentTime = Date.now();
  const elapsedTime = (currentTime - startTime) / 1000; // in seconds

  if (elapsedTime <= 0) {
    return { speed: 0, timeRemaining: "Calculating..." };
  }

  const speed = uploadedBytes / 1024 / elapsedTime; // KB/s
  const remainingBytes = totalBytes - uploadedBytes;
  const remainingTime = remainingBytes / (speed * 1024); // in seconds

  // Use the existing formatTimeRemaining function for consistency
  const timeRemaining =
    remainingTime > 0 && isFinite(remainingTime)
      ? formatTimeRemaining(remainingTime)
      : "Calculating...";

  return { speed, timeRemaining };
}

/**
 * Create a unique file ID with a timestamp and random string
 */
export function createFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Validate file size and type
 */
export function validateFile(
  file: File,
  maxSizeInMB: number,
  allowedFileTypes?: string[],
): { isValid: boolean; error?: string } {
  // Validate file size
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    return {
      isValid: false,
      error: `File '${file.name}' is too large. Maximum size is ${formatFileSize(maxSizeInBytes)}.`,
    };
  }

  // Skip type validation if no types specified
  if (!allowedFileTypes?.length) {
    return { isValid: true };
  }

  // Validate file type
  const fileType = file.type;
  const isAllowed = allowedFileTypes.some((type) => fileType.startsWith(type));

  if (!isAllowed) {
    return {
      isValid: false,
      error: `File type not allowed for '${file.name}'. Allowed types: ${allowedFileTypes.join(", ")}`,
    };
  }

  return { isValid: true };
}
