import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, Link } from "@remix-run/react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { eq, desc, asc, and, like, sql, isNotNull } from "drizzle-orm";
import { files } from "server/database/schema";
import { Layout } from "~/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "~/components/ui/pagination";
import { Badge } from "~/components/ui/badge";
import { Search, Download, FileText, Upload, Eye } from "lucide-react";
import { formatFileSize } from "~/lib/utils";

export const meta: MetaFunction = () => {
  return [
    { title: "My Files - FileManager" },
    {
      name: "description",
      content: "View and manage your uploaded files",
    },
  ];
};

interface FileData {
  id: string;
  name: string;
  size: number;
  content_type: string;
  user_id: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface LoaderData {
  files: FileData[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  search: string;
  sortBy: string;
  sortOrder: string;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { db, user } = context;

  // Check if user is authenticated
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const pageParam = url.searchParams.get("page") || "1";
  const limitParam = url.searchParams.get("limit") || "10";
  const search = url.searchParams.get("search") || "";
  const sortBy = url.searchParams.get("sortBy") || "created_at";
  const sortOrder = url.searchParams.get("sortOrder") || "desc";

  const page = Math.max(1, parseInt(pageParam, 10));
  const limit = Math.min(100, Math.max(1, parseInt(limitParam, 10)));
  const offset = (page - 1) * limit;

  try {
    // Build where conditions
    const whereConditions = [
      eq(files.user_id, user.id),
      isNotNull(files.completed_at),
    ];

    if (search) {
      whereConditions.push(like(files.name, `%${search}%`));
    } // Build order by
    let orderByColumn;
    switch (sortBy) {
      case "name":
        orderByColumn = files.name;
        break;
      case "size":
        orderByColumn = files.size;
        break;
      case "created_at":
        orderByColumn = files.created_at;
        break;
      default:
        orderByColumn = files.created_at;
    }

    const orderBy =
      sortOrder === "asc" ? asc(orderByColumn) : desc(orderByColumn); // Get total count for pagination
    const totalCountResults = await db
      .select({ count: sql`count(*)` })
      .from(files)
      .where(and(...whereConditions));

    const totalCount = Number(totalCountResults[0]?.count || 0);
    const totalPages = Math.ceil(totalCount / limit);

    // Get files with pagination
    const userFiles = await db
      .select()
      .from(files)
      .where(and(...whereConditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return json({
      files: userFiles,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      search,
      sortBy,
      sortOrder,
    });
  } catch (error) {
    console.error("Files fetch error:", error);
    return json({
      files: [],
      pagination: {
        page: 1,
        limit: 10,
        totalCount: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
      search: "",
      sortBy: "created_at",
      sortOrder: "desc",
    });
  }
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith("image/")) return "🖼️";
  if (contentType.startsWith("video/")) return "🎥";
  if (contentType.startsWith("audio/")) return "🎵";
  if (contentType.includes("pdf")) return "📄";
  if (contentType.includes("text/")) return "📝";
  if (contentType.includes("zip") || contentType.includes("rar")) return "📦";
  return "📁";
}

export default function Files() {
  const data = useLoaderData<LoaderData>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(data.search || "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchValue.trim()) {
      newParams.set("search", searchValue.trim());
    } else {
      newParams.delete("search");
    }
    newParams.set("page", "1"); // Reset to first page on search
    setSearchParams(newParams);
  };

  const handleSort = (field: string) => {
    const newParams = new URLSearchParams(searchParams);
    const currentSortBy = searchParams.get("sortBy");
    const currentSortOrder = searchParams.get("sortOrder");

    if (currentSortBy === field && currentSortOrder === "desc") {
      newParams.set("sortOrder", "asc");
    } else {
      newParams.set("sortOrder", "desc");
    }
    newParams.set("sortBy", field);
    setSearchParams(newParams);
  };
  const handleLimitChange = (limit: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("limit", limit);
    newParams.set("page", "1"); // Reset to first page
    setSearchParams(newParams);
  };

  const getSortIcon = (field: string) => {
    if (data.sortBy !== field) return "";
    return data.sortOrder === "asc" ? " ↑" : " ↓";
  };
  return (
    <Layout>
      <div className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                My Files
              </h1>
              <p className="mt-2 text-muted-foreground">
                Manage and organize your uploaded files
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex gap-2">
              <Button asChild>
                <Link to="/upload">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Files
                </Link>
              </Button>
            </div>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Files ({data.pagination.totalCount})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Show</span>
                  <Select
                    value={searchParams.get("limit") || "10"}
                    onValueChange={handleLimitChange}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">
                    per page
                  </span>
                </div>
              </div>

              {/* Search Form */}
              <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search files..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button type="submit" variant="outline">
                  Search
                </Button>
              </form>
            </CardHeader>

            <CardContent>
              {data.files.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No files found</h3>
                  <p className="text-muted-foreground mb-4">
                    {data.search
                      ? "Try adjusting your search terms."
                      : "Upload your first file to get started."}
                  </p>
                  <Button asChild>
                    <Link to="/upload">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Files
                    </Link>
                  </Button>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => handleSort("name")}
                        >
                          Name{getSortIcon("name")}
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => handleSort("size")}
                        >
                          Size{getSortIcon("size")}
                        </TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => handleSort("created_at")}
                        >
                          Uploaded{getSortIcon("created_at")}
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.files.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {getFileIcon(file.content_type)}
                              </span>
                              <span
                                className="truncate max-w-xs"
                                title={file.name}
                              >
                                {file.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{formatFileSize(file.size)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {file.content_type.split("/")[0]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(file.created_at), {
                              addSuffix: true,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {file.completed_at && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                    title="View file"
                                  >
                                    <a
                                      href={`/api/files/${file.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </a>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                    title="Download file"
                                  >
                                    <a
                                      href={`/api/files/${file.id}`}
                                      download={file.name}
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>{" "}
                  {/* Pagination */}
                  {data.pagination.totalPages > 1 && (
                    <div className="mt-6 flex justify-center">
                      <Pagination>
                        <PaginationContent>
                          {data.pagination.hasPrev && (
                            <PaginationItem>
                              <PaginationPrevious
                                href={`?${new URLSearchParams({
                                  ...Object.fromEntries(searchParams.entries()),
                                  page: (data.pagination.page - 1).toString(),
                                }).toString()}`}
                              />
                            </PaginationItem>
                          )}

                          {/* Page numbers */}
                          {(() => {
                            const current = data.pagination.page;
                            const total = data.pagination.totalPages;
                            const pages = [];

                            // Always show first page
                            if (current > 3) {
                              pages.push(
                                <PaginationItem key={1}>
                                  <PaginationLink
                                    href={`?${new URLSearchParams({
                                      ...Object.fromEntries(
                                        searchParams.entries(),
                                      ),
                                      page: "1",
                                    }).toString()}`}
                                    isActive={current === 1}
                                  >
                                    1
                                  </PaginationLink>
                                </PaginationItem>,
                              );

                              if (current > 4) {
                                pages.push(
                                  <PaginationItem key="ellipsis1">
                                    <PaginationEllipsis />
                                  </PaginationItem>,
                                );
                              }
                            }

                            // Show pages around current
                            const start = Math.max(1, current - 1);
                            const end = Math.min(total, current + 1);

                            for (let i = start; i <= end; i++) {
                              pages.push(
                                <PaginationItem key={i}>
                                  <PaginationLink
                                    href={`?${new URLSearchParams({
                                      ...Object.fromEntries(
                                        searchParams.entries(),
                                      ),
                                      page: i.toString(),
                                    }).toString()}`}
                                    isActive={current === i}
                                  >
                                    {i}
                                  </PaginationLink>
                                </PaginationItem>,
                              );
                            }

                            // Always show last page
                            if (current < total - 2) {
                              if (current < total - 3) {
                                pages.push(
                                  <PaginationItem key="ellipsis2">
                                    <PaginationEllipsis />
                                  </PaginationItem>,
                                );
                              }

                              pages.push(
                                <PaginationItem key={total}>
                                  <PaginationLink
                                    href={`?${new URLSearchParams({
                                      ...Object.fromEntries(
                                        searchParams.entries(),
                                      ),
                                      page: total.toString(),
                                    }).toString()}`}
                                    isActive={current === total}
                                  >
                                    {total}
                                  </PaginationLink>
                                </PaginationItem>,
                              );
                            }

                            return pages;
                          })()}

                          {data.pagination.hasNext && (
                            <PaginationItem>
                              <PaginationNext
                                href={`?${new URLSearchParams({
                                  ...Object.fromEntries(searchParams.entries()),
                                  page: (data.pagination.page + 1).toString(),
                                }).toString()}`}
                              />
                            </PaginationItem>
                          )}
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
