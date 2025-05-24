import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useState } from "react";
import { useSearchParams } from "@remix-run/react";
import { Layout } from "~/components/Layout";
import { FolderBrowser } from "~/components/folder-browser";
import { FileUploader } from "~/components/FileUploader";

export const meta: MetaFunction = () => {
  return [
    { title: "My Files - FileManager" },
    {
      name: "description",
      content: "View and manage your uploaded files",
    },
  ];
};

export async function loader({ context }: LoaderFunctionArgs) {
  if (!context.user) {
    throw redirect("/auth/login");
  }

  return {};
}

export default function Files() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showUploader, setShowUploader] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(
    searchParams.get("folder"),
  );

  const handleFolderChange = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    // Update URL without reloading
    if (folderId) {
      setSearchParams({ folder: folderId });
    } else {
      setSearchParams({});
    }
  };

  const handleUploadToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setShowUploader(true);
  };
  const handleDownloadFile = async (fileId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}`);
      if (!response.ok) {
        throw new Error("Failed to get file download URL");
      }

      const data = await response.json();

      if (!data.downloadUrl) {
        throw new Error("Download URL not available");
      }

      // Create a temporary link to download the file
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = data.downloadUrl;
      a.target = "_blank"; // Open in new tab
      a.rel = "noopener noreferrer"; // Security best practice
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };
  return (
    <Layout>
      <div className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Show uploader when requested */}
          {showUploader && (
            <div className="mb-8">
              <FileUploader
                currentFolderId={currentFolderId}
                maxSizeInMB={500}
                chunkSizeInMB={5}
                allowedFileTypes={[]}
                initiateUrl="/api/upload/initiate"
                presignedUrl="/api/upload/presigned-url"
                completeUrl="/api/upload/complete"
                abortUrl="/api/upload/abort"
              />
            </div>
          )}{" "}
          {/* Folder Browser */}
          <FolderBrowser
            currentFolderId={currentFolderId || undefined}
            onFolderChange={handleFolderChange}
            onUploadToFolder={handleUploadToFolder}
            onDownloadFile={handleDownloadFile}
          />
        </div>
      </div>
    </Layout>
  );
}
