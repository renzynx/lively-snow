import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Download } from "lucide-react";
import type { FileItem } from "~/types/folder-browser";

interface FilePreviewDialogProps {
  file: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload?: (file: FileItem) => void;
}

export function FilePreviewDialog({
  file,
  open,
  onOpenChange,
  onDownload,
}: FilePreviewDialogProps) {
  if (!file) return null;

  const getPreviewUrl = (file: FileItem) => {
    // Use the direct download endpoint which redirects to S3
    return `/api/files/${file.id}/download`;
  };

  const isImage = (contentType: string) => {
    return contentType.startsWith("image/");
  };

  const isVideo = (contentType: string) => {
    return contentType.startsWith("video/");
  };

  const isAudio = (contentType: string) => {
    return contentType.startsWith("audio/");
  };

  const isPdf = (contentType: string) => {
    return contentType === "application/pdf";
  };
  const isText = (contentType: string) => {
    return (
      contentType.startsWith("text/") ||
      contentType === "application/json" ||
      contentType === "application/javascript" ||
      contentType === "application/xml"
    );
  };
  const renderPreview = () => {
    if (!file.completed_at) {
      return (
        <div className="flex items-center justify-center h-96 text-muted-foreground">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">File not ready</div>
            <div className="text-sm">This file is still uploading...</div>
          </div>
        </div>
      );
    }

    const previewUrl = getPreviewUrl(file);
    if (isImage(file.content_type)) {
      return (
        <div className="flex items-center justify-center max-h-96 overflow-hidden">
          <img
            src={previewUrl}
            alt={file.name}
            className="max-w-full max-h-96 object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              target.nextElementSibling?.classList.remove("hidden");
            }}
          />
          <div className="hidden text-center text-muted-foreground">
            <div className="text-lg font-medium mb-2">
              Preview not available
            </div>
            <div className="text-sm">Unable to load image preview</div>
          </div>
        </div>
      );
    }

    if (isVideo(file.content_type)) {
      return (
        <div className="flex items-center justify-center">
          <video
            src={previewUrl}
            controls
            className="max-w-full max-h-96"
            onError={(e) => {
              const target = e.target as HTMLVideoElement;
              target.style.display = "none";
              target.nextElementSibling?.classList.remove("hidden");
            }}
          >
            Your browser does not support the video tag.
          </video>
          <div className="hidden text-center text-muted-foreground">
            <div className="text-lg font-medium mb-2">
              Preview not available
            </div>
            <div className="text-sm">Unable to load video preview</div>
          </div>
        </div>
      );
    }

    if (isAudio(file.content_type)) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-lg font-medium mb-4">{file.name}</div>
            <audio
              src={previewUrl}
              controls
              className="w-full max-w-md"
              onError={(e) => {
                const target = e.target as HTMLAudioElement;
                target.style.display = "none";
                target.nextElementSibling?.classList.remove("hidden");
              }}
            >
              Your browser does not support the audio tag.
            </audio>
            <div className="hidden text-center text-muted-foreground mt-4">
              <div className="text-lg font-medium mb-2">
                Preview not available
              </div>
              <div className="text-sm">Unable to load audio preview</div>
            </div>
          </div>
        </div>
      );
    }

    if (isPdf(file.content_type)) {
      return (
        <div className="h-96">
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title={file.name}
            onError={(e) => {
              const target = e.target as HTMLIFrameElement;
              target.style.display = "none";
              target.nextElementSibling?.classList.remove("hidden");
            }}
          />
          <div className="hidden text-center text-muted-foreground p-8">
            <div className="text-lg font-medium mb-2">
              Preview not available
            </div>
            <div className="text-sm">Unable to load PDF preview</div>
          </div>
        </div>
      );
    }

    if (isText(file.content_type) && file.size < 1024 * 1024) {
      // Only preview text files smaller than 1MB
      return <TextPreview file={file} previewUrl={previewUrl} />;
    }

    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">
            This file is not previewable
          </div>
          <div className="text-sm">File type: {file.content_type}</div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between mt-4">
            <DialogTitle className="text-xl">{file.name}</DialogTitle>
            <div className="flex items-center gap-2">
              {file.completed_at && onDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDownload(file)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Size: {formatFileSize(file.size)} • Type: {file.content_type}
          </div>
        </DialogHeader>
        <div className="mt-4">{renderPreview()}</div>
      </DialogContent>
    </Dialog>
  );
}

// Text preview component
function TextPreview({
  file,
  previewUrl,
}: {
  file: FileItem;
  previewUrl: string;
}) {
  const [content, setContent] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(previewUrl);
        if (!response.ok) {
          throw new Error("Failed to fetch file content");
        }
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load content");
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [previewUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Preview not available</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-auto">
      <pre className="text-sm bg-muted p-4 rounded-md whitespace-pre-wrap">
        {content}
      </pre>
    </div>
  );
}

// Helper function for file size formatting
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
