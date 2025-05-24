import * as React from "react";
import {
  File,
  Folder,
  Download,
  Eye,
  MoreHorizontal,
  Trash2,
  Edit2,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "~/components/ui/context-menu";
import { formatFileSize } from "~/lib/utils";
import type { FolderItem, FileItem } from "~/types/folder-browser";

interface GridViewProps {
  folders: FolderItem[];
  files: FileItem[];
  onFolderClick: (folderId: string) => void;
  onFileClick: (file: FileItem) => void;
  onDeleteFolder: (folder: FolderItem) => void;
  onRenameFolder: (folder: FolderItem) => void;
  onDeleteFile: (file: FileItem) => void;
  onDownloadFile?: (file: FileItem) => void;
}

export function GridView({
  folders,
  files,
  onFolderClick,
  onFileClick,
  onDeleteFolder,
  onRenameFolder,
  onDeleteFile,
  onDownloadFile,
}: GridViewProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
      {/* Folders */}
      {folders.map((folder) => (
        <div
          key={folder.id}
          className="group relative bg-card border rounded-lg p-4 hover:shadow-md hover:bg-accent/50 cursor-pointer transition-all"
          onClick={() => onFolderClick(folder.id)}
        >
          <div className="flex flex-col items-center space-y-2">
            <Folder className="h-12 w-12 text-blue-500" />
            <span
              className="text-sm font-medium text-center truncate w-full"
              title={folder.name}
            >
              {folder.name}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              asChild
              onClick={(e) => e.stopPropagation()}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onRenameFolder(folder);
                }}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFolder(folder);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}

      {/* Files */}
      {files.map((file) => (
        <ContextMenu key={file.id}>
          <ContextMenuTrigger asChild>
            <div
              className="group relative bg-card border rounded-lg p-4 hover:shadow-md hover:bg-accent/50 cursor-pointer transition-all"
              onClick={() => onFileClick(file)}
            >
              <div className="flex flex-col items-center space-y-2">
                <File className="h-12 w-12 text-gray-500" />
                <div className="text-center w-full">
                  <div
                    className="text-sm font-medium truncate"
                    title={file.name}
                  >
                    {file.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </div>
                </div>
              </div>{" "}
              {file.completed_at && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownloadFile?.(file);
                  }}
                >
                  <Download className="h-3 w-3" />
                </Button>
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => onFileClick(file)}>
              <Eye className="h-4 w-4 mr-2" />
              View
            </ContextMenuItem>{" "}
            {file.completed_at && (
              <ContextMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadFile?.(file);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </ContextMenuItem>
            )}
            <ContextMenuSeparator />
            <ContextMenuItem
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFile(file);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ))}

      {/* Empty State */}
      {folders.length === 0 && files.length === 0 && (
        <div className="col-span-full p-12 text-center text-muted-foreground">
          <Folder className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <div className="text-lg font-medium mb-2">This folder is empty</div>
          <div className="text-sm">
            Create a folder or upload files to get started
          </div>
        </div>
      )}
    </div>
  );
}
