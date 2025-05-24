import * as React from "react";
import { lazy, Suspense } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { BreadcrumbNav } from "./components/BreadcrumbNav";
import {
  DeleteFileDialog,
  DeleteFolderDialog,
} from "./components/DeleteDialog";
import {
  CreateFolderDialog,
  RenameFolderDialog,
} from "./components/FolderDialog";
import { Toolbar } from "./components/Toolbar";
import { FolderBrowserSkeleton } from "./components/FolderBrowserSkeleton";
import type {
  FileItem,
  FolderBrowserProps,
  FolderContents,
  FolderItem,
  SortConfig,
  SortField,
  SortDirection,
} from "./types";
// Export the types so they can be used by importing components
export * from "./types";

// Lazy load the view components for better performance
const GridView = lazy(() =>
  import("./components/GridView").then((module) => ({
    default: module.GridView,
  })),
);
const TableView = lazy(() =>
  import("./components/TableView").then((module) => ({
    default: module.TableView,
  })),
);

export function FolderBrowser({
  currentFolderId,
  contents: initialContents,
  breadcrumb: initialBreadcrumb,
  onFolderChange,
  onFileSelect,
  onUploadToFolder,
  onDownloadFile,
}: FolderBrowserProps) {
  // State management
  const [contents, setContents] = React.useState<FolderContents>(
    initialContents || { subfolders: [], files: [] },
  );
  const [breadcrumb, setBreadcrumb] = React.useState<FolderItem[]>(
    initialBreadcrumb || [],
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<"grid" | "table">("grid");

  // Search and sort state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({
    field: "name",
    direction: "asc",
  });

  // Dialog states
  const [showCreateFolder, setShowCreateFolder] = React.useState(false);
  const [showRenameFolder, setShowRenameFolder] = React.useState(false);
  const [showDeleteFolder, setShowDeleteFolder] = React.useState(false);
  const [showDeleteFile, setShowDeleteFile] = React.useState(false);
  const [selectedFolder, setSelectedFolder] = React.useState<FolderItem | null>(
    null,
  );
  const [selectedFile, setSelectedFile] = React.useState<FileItem | null>(null);
  // Folder operations
  const fetchFolderContents = async (folderId: string | null) => {
    try {
      setLoading(true);
      setError(null);

      const url = folderId
        ? `/api/folders/${folderId}/contents`
        : "/api/folders/root";

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch folder contents");
      }

      const data = await response.json();
      setContents(data);

      // Update breadcrumb
      if (folderId) {
        const breadcrumbResponse = await fetch(
          `/api/folders/${folderId}/breadcrumb`,
        );
        if (breadcrumbResponse.ok) {
          const breadcrumbData = await breadcrumbResponse.json();
          setBreadcrumb(breadcrumbData.breadcrumb || []);
        }
      } else {
        setBreadcrumb([]);
      }

      setLoading(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load folder contents",
      );
      setLoading(false);
    }
  };

  const handleCreateFolder = async (name: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          parentId: currentFolderId || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create folder");
      }

      setShowCreateFolder(false);

      // Fetch updated folder contents
      await fetchFolderContents(currentFolderId || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
      setLoading(false);
    }
  };
  const handleRenameFolder = async (name: string) => {
    if (!selectedFolder) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/folders/${selectedFolder.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to rename folder");
      }

      setShowRenameFolder(false);
      setSelectedFolder(null);

      // Fetch updated folder contents
      await fetchFolderContents(currentFolderId || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename folder");
      setLoading(false);
    }
  };
  const handleDeleteFolder = async () => {
    if (!selectedFolder) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/folders/${selectedFolder.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete folder");
      }

      setShowDeleteFolder(false);

      // If we were in the folder that was deleted, go to the parent
      if (currentFolderId === selectedFolder.id) {
        // If the deleted folder has a parent, navigate to it, otherwise go to root
        const parentFolder =
          breadcrumb.length > 1 ? breadcrumb[breadcrumb.length - 2] : null;
        const navigateToId = parentFolder ? parentFolder.id : null;
        await fetchFolderContents(navigateToId);
        onFolderChange(navigateToId);
      } else {
        // Otherwise just refresh the current view
        await fetchFolderContents(currentFolderId || null);
      }

      setSelectedFolder(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete folder");
      setLoading(false);
    }
  };
  const handleDeleteFile = async () => {
    if (!selectedFile) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/files/${selectedFile.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete file");
      }

      setShowDeleteFile(false);
      setSelectedFile(null);

      // Refresh the current view using the direct API call
      await fetchFolderContents(currentFolderId || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete file");
      setLoading(false);
    }
  };
  // Navigate between folders
  const handleNavigateFolder = async (folderId: string | null) => {
    try {
      setError(null);
      setLoading(true);

      // Fetch the contents of the target folder directly
      await fetchFolderContents(folderId);

      // Update the URL/state in the parent component
      onFolderChange(folderId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to navigate to folder",
      );
      setLoading(false);
    }
  };
  // Fetch contents when the component mounts or currentFolderId changes
  React.useEffect(() => {
    // Always fetch fresh data when currentFolderId changes
    fetchFolderContents(currentFolderId || null);
  }, [currentFolderId]);

  // Initialize with provided data if available
  React.useEffect(() => {
    if (initialContents) {
      setContents(initialContents);
    }
    if (initialBreadcrumb) {
      setBreadcrumb(initialBreadcrumb);
    }
  }, [initialContents, initialBreadcrumb]);

  // Add a safety timeout to reset loading state if it gets stuck
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (loading) {
      // If loading takes more than 10 seconds, reset it automatically
      timeoutId = setTimeout(() => {
        setLoading(false);
        setError("Loading timed out. Please try again.");
      }, 10000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading]);

  // Search and sort utility functions
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleSortChange = (field: SortField, direction: SortDirection) => {
    setSortConfig({ field, direction });
  };

  // Filter and sort contents
  const getFilteredAndSortedContents = React.useMemo(() => {
    let filteredFolders = contents.subfolders || [];
    let filteredFiles = contents.files || [];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredFolders = filteredFolders.filter((folder) =>
        folder.name.toLowerCase().includes(query),
      );
      filteredFiles = filteredFiles.filter((file) =>
        file.name.toLowerCase().includes(query),
      );
    }

    // Apply sorting
    const sortFn = (a: any, b: any) => {
      let aValue = a[sortConfig.field];
      let bValue = b[sortConfig.field];

      // Handle different field types
      if (sortConfig.field === "size") {
        aValue = aValue || 0;
        bValue = bValue || 0;
      } else if (sortConfig.field === "created_at") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (sortConfig.field === "content_type") {
        aValue = aValue || "";
        bValue = bValue || "";
      } else {
        aValue = String(aValue || "").toLowerCase();
        bValue = String(bValue || "").toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    };

    // Sort folders and files separately, folders always appear first
    filteredFolders.sort(sortFn);
    filteredFiles.sort(sortFn);

    return {
      subfolders: filteredFolders,
      files: filteredFiles,
    };
  }, [contents, searchQuery, sortConfig]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <FolderBrowserSkeleton viewMode={viewMode} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb Navigation */}
      <BreadcrumbNav
        breadcrumb={breadcrumb}
        onNavigate={handleNavigateFolder}
        currentFolderName={contents.folder?.name}
      />{" "}
      {/* Toolbar */}
      <Toolbar
        contents={contents}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onCreateFolder={() => setShowCreateFolder(true)}
        onUploadToFolder={onUploadToFolder}
        currentFolderId={currentFolderId}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        sortConfig={sortConfig}
        onSortChange={handleSortChange}
      />
      {/* Error Display */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
          {error}
        </div>
      )}
      {/* Content View with Suspense for lazy loading */}
      <Suspense
        fallback={
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <div>Loading view...</div>
              </div>
            </CardContent>
          </Card>
        }
      >
        {" "}
        {viewMode === "grid" ? (
          <GridView
            folders={getFilteredAndSortedContents.subfolders}
            files={getFilteredAndSortedContents.files}
            onFolderClick={handleNavigateFolder}
            onFileClick={(file) => onFileSelect?.(file)}
            onDeleteFolder={(folder) => {
              setSelectedFolder(folder);
              setShowDeleteFolder(true);
            }}
            onRenameFolder={(folder) => {
              setSelectedFolder(folder);
              setShowRenameFolder(true);
            }}
            onDeleteFile={(file) => {
              setSelectedFile(file);
              setShowDeleteFile(true);
            }}
            onDownloadFile={(file) => {
              if (file.s3_key && file.completed_at && onDownloadFile) {
                onDownloadFile(file.id, file.name);
              }
            }}
          />
        ) : (
          <TableView
            folders={getFilteredAndSortedContents.subfolders}
            files={getFilteredAndSortedContents.files}
            onFolderClick={handleNavigateFolder}
            onFileClick={(file) => onFileSelect?.(file)}
            onDeleteFolder={(folder) => {
              setSelectedFolder(folder);
              setShowDeleteFolder(true);
            }}
            onRenameFolder={(folder) => {
              setSelectedFolder(folder);
              setShowRenameFolder(true);
            }}
            onDeleteFile={(file) => {
              setSelectedFile(file);
              setShowDeleteFile(true);
            }}
            onDownloadFile={(file) => {
              if (file.s3_key && file.completed_at && onDownloadFile) {
                onDownloadFile(file.id, file.name);
              }
            }}
          />
        )}
      </Suspense>
      {/* Dialogs */}
      <CreateFolderDialog
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onSubmit={handleCreateFolder}
        currentFolderId={currentFolderId || null}
      />
      <RenameFolderDialog
        isOpen={showRenameFolder}
        folder={selectedFolder}
        onClose={() => {
          setShowRenameFolder(false);
          setSelectedFolder(null);
        }}
        onSubmit={handleRenameFolder}
      />
      <DeleteFolderDialog
        isOpen={showDeleteFolder}
        folder={selectedFolder}
        onClose={() => {
          setShowDeleteFolder(false);
          setSelectedFolder(null);
        }}
        onConfirm={handleDeleteFolder}
      />
      <DeleteFileDialog
        isOpen={showDeleteFile}
        file={selectedFile}
        onClose={() => {
          setShowDeleteFile(false);
          setSelectedFile(null);
        }}
        onConfirm={handleDeleteFile}
      />
    </div>
  );
}
