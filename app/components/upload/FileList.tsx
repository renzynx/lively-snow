import { ScrollArea } from "~/components/ui/scroll-area";
import { FileListItem, type FileUploadEntry } from "./FileListItem";

interface FileListProps {
  files: FileUploadEntry[];
  onUpload: (fileEntry: FileUploadEntry) => void;
  onCancel: (fileId: string) => void;
  onRetry: (fileEntry: FileUploadEntry) => void;
}

export function FileList({
  files,
  onUpload,
  onCancel,
  onRetry,
}: FileListProps) {
  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No files added yet.</p>
        <p className="text-sm mt-1">
          Use the drop zone above to add files for upload.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-64">
      <div className="space-y-2">
        {files.map((fileEntry) => (
          <FileListItem
            key={fileEntry.id}
            fileEntry={fileEntry}
            onUpload={onUpload}
            onCancel={onCancel}
            onRetry={onRetry}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
