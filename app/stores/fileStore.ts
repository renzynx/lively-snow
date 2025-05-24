import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Import types from the FolderBrowser
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

export type SortField = "name" | "size" | "created_at" | "content_type";
export type SortDirection = "asc" | "desc";

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
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

// Zustand store interface
interface FileStoreState {
  // Current state
  currentFolderId: string | null;
  contents: PaginatedFolderContents;
  breadcrumb: FolderItem[];
  loading: boolean;
  error: string | null;

  // UI state
  viewMode: "grid" | "table";
  searchQuery: string;
  sortConfig: SortConfig;

  // Pagination state
  filesPage: number;
  foldersPage: number;
  itemsPerPage: number;
  // Actions for folder management
  setCurrentFolder: (folderId: string | null) => void;
  setContents: (contents: PaginatedFolderContents) => void;
  setBreadcrumb: (breadcrumb: FolderItem[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // UI actions
  setViewMode: (mode: "grid" | "table") => void;
  setSearchQuery: (query: string) => void;
  setSortConfig: (config: SortConfig) => void;

  // Pagination actions
  setFilesPage: (page: number) => void;
  setFoldersPage: (page: number) => void;
  setItemsPerPage: (count: number) => void;

  // File operations
  addFile: (file: FileItem) => void;
  updateFile: (fileId: string, updates: Partial<FileItem>) => void;
  removeFile: (fileId: string) => void;

  // Folder operations
  addFolder: (folder: FolderItem) => void;
  updateFolder: (folderId: string, updates: Partial<FolderItem>) => void;
  removeFolder: (folderId: string) => void;
  // Async operations
  fetchFolderContents: (folderId: string | null) => Promise<void>;
  createFolder: (name: string, parentId: string | null) => Promise<void>;
  renameFolder: (folderId: string, newName: string) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
}

export const useFileStore = create<FileStoreState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentFolderId: null,
      contents: {
        subfolders: [],
        files: [],
        filesPagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 20,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        subfoldersPagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 20,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
      breadcrumb: [],
      loading: false,
      error: null,

      // UI state
      viewMode: "grid",
      searchQuery: "",
      sortConfig: {
        field: "name",
        direction: "asc",
      },

      // Pagination state
      filesPage: 1,
      foldersPage: 1,
      itemsPerPage: 20,

      // Basic setters
      setCurrentFolder: (folderId) => set({ currentFolderId: folderId }),
      setContents: (contents) => set({ contents }),
      setBreadcrumb: (breadcrumb) => set({ breadcrumb }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }), // UI setters
      setViewMode: (mode) => set({ viewMode: mode }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSortConfig: (config) => set({ sortConfig: config }),

      // Pagination setters
      setFilesPage: (page) => set({ filesPage: page }),
      setFoldersPage: (page) => set({ foldersPage: page }),
      setItemsPerPage: (count) => set({ itemsPerPage: count }),

      // File operations
      addFile: (file) =>
        set((state) => ({
          contents: {
            ...state.contents,
            files: [...state.contents.files, file],
          },
        })),

      updateFile: (fileId, updates) =>
        set((state) => ({
          contents: {
            ...state.contents,
            files: state.contents.files.map((file) =>
              file.id === fileId ? { ...file, ...updates } : file,
            ),
          },
        })),

      removeFile: (fileId) =>
        set((state) => ({
          contents: {
            ...state.contents,
            files: state.contents.files.filter((file) => file.id !== fileId),
          },
        })),

      // Folder operations
      addFolder: (folder) =>
        set((state) => ({
          contents: {
            ...state.contents,
            subfolders: [...state.contents.subfolders, folder],
          },
        })),

      updateFolder: (folderId, updates) =>
        set((state) => ({
          contents: {
            ...state.contents,
            subfolders: state.contents.subfolders.map((folder) =>
              folder.id === folderId ? { ...folder, ...updates } : folder,
            ),
          },
        })),

      removeFolder: (folderId) =>
        set((state) => ({
          contents: {
            ...state.contents,
            subfolders: state.contents.subfolders.filter(
              (folder) => folder.id !== folderId,
            ),
          },
        })), // Async operations
      fetchFolderContents: async (folderId) => {
        try {
          set({ loading: true, error: null });

          const state = get();
          const searchParams = new URLSearchParams();

          // Add pagination parameters
          searchParams.set("filesPage", state.filesPage.toString());
          searchParams.set("foldersPage", state.foldersPage.toString());
          searchParams.set("itemsPerPage", state.itemsPerPage.toString());

          // Add search and sort parameters
          if (state.searchQuery.trim()) {
            searchParams.set("search", state.searchQuery.trim());
          }
          searchParams.set("sortBy", state.sortConfig.field);
          searchParams.set("sortOrder", state.sortConfig.direction);

          const url = folderId
            ? `/api/folders/${folderId}/contents?${searchParams.toString()}`
            : `/api/folders/root?${searchParams.toString()}`;

          const response = await fetch(url);

          if (!response.ok) {
            throw new Error("Failed to fetch folder contents");
          }

          const data = await response.json();
          set({
            contents: data,
            currentFolderId: folderId,
          });

          // Update breadcrumb
          if (folderId) {
            const breadcrumbResponse = await fetch(
              `/api/folders/${folderId}/breadcrumb`,
            );
            if (breadcrumbResponse.ok) {
              const breadcrumbData = await breadcrumbResponse.json();
              set({ breadcrumb: breadcrumbData.breadcrumb || [] });
            }
          } else {
            set({ breadcrumb: [] });
          }

          set({ loading: false });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to load folder contents",
            loading: false,
          });
        }
      },

      createFolder: async (name, parentId) => {
        try {
          set({ loading: true, error: null });

          const response = await fetch("/api/folders", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: name.trim(),
              parentId: parentId || null,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to create folder");
          }

          const { folder } = await response.json();

          // Add the new folder to the current contents if it belongs here
          const state = get();
          if (folder.parent_id === state.currentFolderId) {
            get().addFolder(folder);
          }

          set({ loading: false });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to create folder",
            loading: false,
          });
        }
      },

      renameFolder: async (folderId, newName) => {
        try {
          set({ loading: true, error: null });

          const response = await fetch(`/api/folders/${folderId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: newName.trim() }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to rename folder");
          }

          const { folder } = await response.json();

          // Update the folder in the current contents
          get().updateFolder(folderId, {
            name: folder.name,
            updated_at: folder.updated_at,
          });

          set({ loading: false });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to rename folder",
            loading: false,
          });
        }
      },

      deleteFolder: async (folderId) => {
        try {
          set({ loading: true, error: null });

          const response = await fetch(`/api/folders/${folderId}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to delete folder");
          }

          // Remove the folder from current contents
          get().removeFolder(folderId);

          // If we were in the folder that was deleted, navigate to parent
          const state = get();
          if (state.currentFolderId === folderId) {
            const parentFolder =
              state.breadcrumb.length > 1
                ? state.breadcrumb[state.breadcrumb.length - 2]
                : null;
            const navigateToId = parentFolder ? parentFolder.id : null;
            await get().fetchFolderContents(navigateToId);
          }

          set({ loading: false });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to delete folder",
            loading: false,
          });
        }
      },

      deleteFile: async (fileId) => {
        try {
          set({ loading: true, error: null });

          const response = await fetch(`/api/files/${fileId}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to delete file");
          }

          // Remove the file from current contents
          get().removeFile(fileId);

          set({ loading: false });
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : "Failed to delete file",
            loading: false,
          });
        }
      },
    }),
    {
      name: "file-store",
    },
  ),
);
