import * as React from "react";
import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "~/components/ui/breadcrumb";
import type { FolderItem } from "~/types/folder-browser";

interface BreadcrumbNavProps {
  breadcrumb: FolderItem[];
  onNavigate: (folderId: string | null) => void;
  currentFolderName?: string;
}

export function BreadcrumbNav({
  breadcrumb,
  onNavigate,
  currentFolderName,
}: BreadcrumbNavProps) {
  return (
    <Breadcrumb>
      <BreadcrumbList className="overflow-x-auto pb-2">
        <BreadcrumbItem>
          <BreadcrumbLink
            onClick={() => onNavigate(null)}
            className="flex items-center"
          >
            <Home className="h-4 w-4" />
          </BreadcrumbLink>
        </BreadcrumbItem>

        {breadcrumb.map((folder) => (
          <React.Fragment key={folder.id}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => onNavigate(folder.id)}>
                {folder.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </React.Fragment>
        ))}

        {currentFolderName && breadcrumb.length === 0 && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{currentFolderName}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
