import { Upload, File } from "lucide-react";
import { useRef } from "react";

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  isDragOver: boolean;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  maxSizeInMB: number;
  allowedFileTypes?: string[];
  disabled?: boolean;
}

export function DropZone({
  onFilesSelected,
  isDragOver,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  maxSizeInMB,
  allowedFileTypes,
  disabled = false,
}: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onFilesSelected(Array.from(files));
    }
    // Reset the input
    event.target.value = "";
  };

  const handleBrowseClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200
        ${
          isDragOver
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={handleBrowseClick}
    >
      <div className="flex flex-col items-center space-y-4">
        <div
          className={`
          p-4 rounded-full transition-colors duration-200
          ${
            isDragOver
              ? "bg-blue-100 dark:bg-blue-900/30"
              : "bg-gray-100 dark:bg-gray-800"
          }
        `}
        >
          <Upload
            className={`
            w-8 h-8 transition-colors duration-200
            ${
              isDragOver
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 dark:text-gray-400"
            }
          `}
          />
        </div>

        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {isDragOver ? "Drop files here" : "Upload files"}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Drag and drop files here or{" "}
            <span className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
              browse
            </span>{" "}
            to select files
          </p>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          {allowedFileTypes && allowedFileTypes.length > 0 && (
            <div className="flex items-center justify-center space-x-2">
              <File className="w-3 h-3" />
              <span>
                Allowed types:{" "}
                {allowedFileTypes
                  .map((type) => type.replace(/^.*\//, ""))
                  .join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>

      <input
        type="file"
        multiple
        accept={allowedFileTypes?.join(", ")}
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        ref={fileInputRef}
        disabled={disabled}
      />
    </div>
  );
}
