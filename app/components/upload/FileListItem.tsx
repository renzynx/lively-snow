import { AlertCircle, CheckCircle2, File, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { formatFileSize } from "~/lib/utils";

export type UploadStatus =
  | "idle"
  | "initiating"
  | "uploading"
  | "finalizing"
  | "completed"
  | "error";

export type FileUploadEntry = {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  uploadId?: string;
  s3UploadId?: string;
  speed: number; // Speed in KB/s
  timeRemaining: string;
  result?: any;
  uploadUrls?: string[]; // S3 presigned URLs for each part
  completedParts?: Array<{ partNumber: number; etag: string }>;
  currentPart?: number;
  totalParts?: number;
};

interface FileListItemProps {
  fileEntry: FileUploadEntry;
  onUpload: (fileEntry: FileUploadEntry) => void;
  onCancel: (fileId: string) => void;
  onRetry: (fileEntry: FileUploadEntry) => void;
}

export function FileListItem({
  fileEntry,
  onUpload,
  onCancel,
  onRetry,
}: FileListItemProps) {
  const getStatusIcon = () => {
    switch (fileEntry.status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "uploading":
      case "initiating":
      case "finalizing":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <File className="w-5 h-5 text-gray-400" />;
    }
  };
  const getStatusColor = () => {
    switch (fileEntry.status) {
      case "completed":
        return "text-green-600 dark:text-green-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      case "uploading":
      case "initiating":
      case "finalizing":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <div className="flex items-center space-x-4 p-4 border rounded-lg">
      {/* File Icon and Info */}
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <div className="flex-shrink-0">{getStatusIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {fileEntry.file.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {formatFileSize(fileEntry.file.size)}
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="flex-shrink-0">
        <span className={`text-sm font-medium capitalize ${getStatusColor()}`}>
          {fileEntry.status}
        </span>
        {fileEntry.error && (
          <div
            className="text-xs text-red-500 mt-1 max-w-32 truncate"
            title={fileEntry.error}
          >
            {fileEntry.error}
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="flex-shrink-0 w-32">
        {(fileEntry.status === "uploading" ||
          fileEntry.status === "completed") && (
          <div className="space-y-1">
            <Progress value={fileEntry.progress} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{fileEntry.progress}%</span>
              {fileEntry.timeRemaining && fileEntry.status === "uploading" && (
                <span>{fileEntry.timeRemaining}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0">
        {fileEntry.status === "idle" && (
          <Button onClick={() => onUpload(fileEntry)} size="sm" className="h-8">
            Upload
          </Button>
        )}
        {(fileEntry.status === "uploading" ||
          fileEntry.status === "initiating" ||
          fileEntry.status === "finalizing") && (
          <Button
            onClick={() => onCancel(fileEntry.id)}
            variant="destructive"
            size="sm"
            className="h-8"
          >
            Cancel
          </Button>
        )}
        {fileEntry.status === "error" && (
          <Button
            onClick={() => onRetry(fileEntry)}
            variant="outline"
            size="sm"
            className="h-8"
          >
            Retry
          </Button>
        )}
        {fileEntry.status === "completed" && (
          <Button
            onClick={() => onCancel(fileEntry.id)}
            variant="ghost"
            size="sm"
            className="h-8"
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
