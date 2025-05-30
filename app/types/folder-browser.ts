export interface FolderItem {
  id: string;
  name: string;
  parent_id: string | null;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface FileItem {
  id: string;
  name: string;
  size: number;
  content_type: string;
  completed_at: Date | null;
  s3_key: string | null;
  s3_upload_id: string | null;
  user_id: string;
  folder_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface FolderContents {
  folder?: FolderItem;
  subfolders: FolderItem[];
  files: FileItem[];
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedFolderContents {
  folder?: FolderItem;
  subfolders: FolderItem[];
  files: FileItem[];
  filesPagination: PaginationInfo;
  subfoldersPagination: PaginationInfo;
}

export type SortField = "name" | "size" | "created_at" | "content_type";
export type SortDirection = "asc" | "desc";

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface FolderBrowserProps {
  currentFolderId?: string;
  contents?: PaginatedFolderContents; // Optional since it comes from store
  breadcrumb?: FolderItem[]; // Optional since it comes from store
  onFolderChange: (folderId: string | null) => void;
  onFileSelect?: (file: FileItem) => void;
  onUploadToFolder?: (folderId: string | null) => void;
  onDownloadFile?: (fileId: string, fileName: string) => void;
}
