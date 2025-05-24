import * as React from "react";
import { lazy, Suspense } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { BreadcrumbNav } from "./BreadcrumbNav";
import { DeleteFileDialog, DeleteFolderDialog } from "./DeleteDialog";
import { CreateFolderDialog, RenameFolderDialog } from "./FolderDialog";
import { FilePreviewDialog } from "./FilePreviewDialog";
import { Toolbar } from "./Toolbar";
import { FolderBrowserSkeleton } from "./FolderBrowserSkeleton";
import { PaginationControls } from "./PaginationControls";
import { useFileStore } from "~/stores/fileStore";
import type {
  FileItem,
  FolderBrowserProps,
  FolderItem,
  SortField,
  SortDirection,
} from "~/types/folder-browser";
// Export the types so they can be used by importing components

// Lazy load the view components for better performance
const GridView = lazy(() =>
  import("./GridView").then((module) => ({
    default: module.GridView,
  })),
);
const TableView = lazy(() =>
  import("./TableView").then((module) => ({
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
  // Use Zustand store for state management
  const {
    contents,
    breadcrumb,
    loading,
    error,
    viewMode,
    searchQuery,
    sortConfig,
    filesPage,
    foldersPage,
    itemsPerPage,
    setViewMode,
    setSearchQuery,
    setSortConfig,
    setFilesPage,
    setFoldersPage,
    setItemsPerPage,
    fetchFolderContents,
    createFolder,
    renameFolder,
    deleteFolder,
    deleteFile,
  } = useFileStore(); // Dialog states (keep local since they're UI-specific)
  const [showCreateFolder, setShowCreateFolder] = React.useState(false);
  const [showRenameFolder, setShowRenameFolder] = React.useState(false);
  const [showDeleteFolder, setShowDeleteFolder] = React.useState(false);
  const [showDeleteFile, setShowDeleteFile] = React.useState(false);
  const [showFilePreview, setShowFilePreview] = React.useState(false);
  const [selectedFolder, setSelectedFolder] = React.useState<FolderItem | null>(
    null,
  );
  const [selectedFile, setSelectedFile] = React.useState<FileItem | null>(null);
  const [previewFile, setPreviewFile] = React.useState<FileItem | null>(null);

  // Handle folder operations using store actions
  const handleCreateFolder = async (name: string) => {
    await createFolder(name.trim(), currentFolderId || null);
    setShowCreateFolder(false);
  };

  const handleRenameFolder = async (name: string) => {
    if (!selectedFolder) return;
    await renameFolder(selectedFolder.id, name.trim());
    setShowRenameFolder(false);
    setSelectedFolder(null);
  };

  const handleDeleteFolder = async () => {
    if (!selectedFolder) return;

    await deleteFolder(selectedFolder.id);
    setShowDeleteFolder(false);

    // If we were in the folder that was deleted, go to the parent
    if (currentFolderId === selectedFolder.id) {
      const parentFolder =
        breadcrumb.length > 1 ? breadcrumb[breadcrumb.length - 2] : null;
      const navigateToId = parentFolder ? parentFolder.id : null;
      onFolderChange(navigateToId);
    }

    setSelectedFolder(null);
  };
  const handleDeleteFile = async () => {
    if (!selectedFile) return;
    await deleteFile(selectedFile.id);
    setShowDeleteFile(false);
    setSelectedFile(null);
  };

  // Handle file preview
  const handleFilePreview = (file: FileItem) => {
    setPreviewFile(file);
    setShowFilePreview(true);
  };

  const handleDownloadFile = (file: FileItem) => {
    if (file.s3_key && file.completed_at && onDownloadFile) {
      onDownloadFile(file.id, file.name);
    }
  }; // Navigate between folders
  const handleNavigateFolder = async (folderId: string | null) => {
    await fetchFolderContents(folderId);
    onFolderChange(folderId);
  }; // Fetch folder contents when any relevant parameter changes
  React.useEffect(() => {
    fetchFolderContents(currentFolderId || null);
  }, [
    currentFolderId,
    searchQuery,
    sortConfig,
    filesPage,
    foldersPage,
    itemsPerPage,
    fetchFolderContents,
  ]);
  // Search and sort utility functions
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleSortChange = (field: SortField, direction: SortDirection) => {
    setSortConfig({ field, direction });
  };
  // Pagination handlers
  const handleFilesPageChange = (page: number) => {
    setFilesPage(page);
  };

  const handleFoldersPageChange = (page: number) => {
    setFoldersPage(page);
  };

  const handleItemsPerPageChange = (itemsPerPage: number) => {
    setItemsPerPage(itemsPerPage);
    // Reset to first page when changing items per page
    setFilesPage(1);
    setFoldersPage(1);
  };

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
            folders={contents.subfolders}
            files={contents.files}
            onFolderClick={handleNavigateFolder}
            onFileClick={handleFilePreview}
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
            onDownloadFile={handleDownloadFile}
          />
        ) : (
          <TableView
            folders={contents.subfolders}
            files={contents.files}
            onFolderClick={handleNavigateFolder}
            onFileClick={handleFilePreview}
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
            onDownloadFile={handleDownloadFile}
          />
        )}
      </Suspense>
      {/* Pagination Controls */}
      {contents.subfoldersPagination && (
        <PaginationControls
          pagination={contents.subfoldersPagination}
          onPageChange={handleFoldersPageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          label="Folders"
        />
      )}
      {contents.filesPagination && (
        <PaginationControls
          pagination={contents.filesPagination}
          onPageChange={handleFilesPageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          label="Files"
        />
      )}
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
      />{" "}
      <DeleteFileDialog
        isOpen={showDeleteFile}
        file={selectedFile}
        onClose={() => {
          setShowDeleteFile(false);
          setSelectedFile(null);
        }}
        onConfirm={handleDeleteFile}
      />
      <FilePreviewDialog
        file={previewFile}
        open={showFilePreview}
        onOpenChange={setShowFilePreview}
        onDownload={handleDownloadFile}
      />
    </div>
  );
}
