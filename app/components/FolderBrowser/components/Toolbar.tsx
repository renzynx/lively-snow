import {
  FolderPlus,
  Grid3X3,
  List,
  Upload,
  Search,
  SortAsc,
  SortDesc,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type {
  FolderContents,
  SortConfig,
  SortField,
  SortDirection,
} from "../types";

interface ToolbarProps {
  contents: FolderContents;
  viewMode: "grid" | "table";
  setViewMode: (mode: "grid" | "table") => void;
  onCreateFolder: () => void;
  onUploadToFolder?: (folderId: string | null) => void;
  currentFolderId: string | null | undefined;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortConfig: SortConfig;
  onSortChange: (field: SortField, direction: SortDirection) => void;
}

export function Toolbar({
  contents,
  viewMode,
  setViewMode,
  onCreateFolder,
  onUploadToFolder,
  currentFolderId,
  searchQuery,
  onSearchChange,
  sortConfig,
  onSortChange,
}: ToolbarProps) {
  const handleSortFieldChange = (field: SortField) => {
    onSortChange(field, sortConfig.direction);
  };

  const toggleSortDirection = () => {
    const newDirection: SortDirection =
      sortConfig.direction === "asc" ? "desc" : "asc";
    onSortChange(sortConfig.field, newDirection);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          {contents.folder ? contents.folder.name : "My Files"}
        </h2>

        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-8 px-2"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="h-8 px-2"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={onCreateFolder}>
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </Button>

          {onUploadToFolder && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onUploadToFolder(currentFolderId || null)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          )}
        </div>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Sort Controls */}
        <div className="flex items-center space-x-2">
          <Select
            value={sortConfig.field}
            onValueChange={(value) => handleSortFieldChange(value as SortField)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="size">Size</SelectItem>
              <SelectItem value="created_at">Date</SelectItem>
              <SelectItem value="content_type">Type</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleSortDirection}
            className="px-2"
          >
            {sortConfig.direction === "asc" ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
