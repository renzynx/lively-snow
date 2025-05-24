import * as React from "react";
import { File, Folder, Download, Eye, Trash2, Edit2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { formatFileSize } from "~/lib/utils";
import type { FolderItem, FileItem } from "~/types/folder-browser";

interface TableViewProps {
  folders: FolderItem[];
  files: FileItem[];
  onFolderClick: (folderId: string) => void;
  onFileClick: (file: FileItem) => void;
  onDeleteFolder: (folder: FolderItem) => void;
  onRenameFolder: (folder: FolderItem) => void;
  onDeleteFile: (file: FileItem) => void;
  onDownloadFile?: (file: FileItem) => void;
}

export function TableView({
  folders,
  files,
  onFolderClick,
  onFileClick,
  onDeleteFolder,
  onRenameFolder,
  onDeleteFile,
  onDownloadFile,
}: TableViewProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Modified</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Folders */}
          {folders.map((folder) => (
            <TableRow
              key={folder.id}
              className="cursor-pointer"
              onClick={() => onFolderClick(folder.id)}
            >
              <TableCell>
                <div className="flex items-center space-x-3">
                  <Folder className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  <span className="font-medium">{folder.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">—</TableCell>
              <TableCell className="text-muted-foreground">Folder</TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(folder.updated_at).toLocaleDateString()}
              </TableCell>{" "}
              <TableCell className="text-right">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFolderClick(folder.id);
                    }}
                    title="View folder"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRenameFolder(folder);
                    }}
                    title="Edit folder"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFolder(folder);
                    }}
                    title="Delete folder"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}

          {/* Files */}
          {files.map((file) => (
            <TableRow
              key={file.id}
              className="cursor-pointer"
              onClick={() => onFileClick(file)}
            >
              <TableCell>
                <div className="flex items-center space-x-3">
                  <File className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  <span className="font-medium">{file.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatFileSize(file.size)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {file.content_type}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {file.completed_at
                  ? new Date(file.completed_at).toLocaleDateString()
                  : "Uploading..."}
              </TableCell>{" "}
              <TableCell className="text-right">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileClick(file);
                    }}
                    title="View file"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {file.completed_at && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownloadFile?.(file);
                      }}
                      title="Download file"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFile(file);
                    }}
                    title="Delete file"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}

          {/* Empty State */}
          {folders.length === 0 && files.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-36 text-center">
                <div className="flex flex-col items-center justify-center">
                  <Folder className="h-16 w-16 mb-4 opacity-50" />
                  <div className="text-lg font-medium mb-2">
                    This folder is empty
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Create a folder or upload files to get started
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
