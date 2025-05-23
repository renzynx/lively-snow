import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { FileUploader } from "~/components/FileUploader";
import { Layout } from "~/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Upload, FileText, Shield, Zap } from "lucide-react";

export const meta: MetaFunction = () => {
  return [
    { title: "Upload Files - FileManager" },
    {
      name: "description",
      content:
        "Upload multiple large files simultaneously with our secure platform",
    },
  ];
};

export async function loader({ context }: LoaderFunctionArgs) {
  const { user } = context;

  // Check if user is authenticated
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return json({ user });
}

export type ActionData =
  | { error: string; success?: never }
  | { success: true; file: UploadedFile; error?: never };

type UploadedFile = {
  name: string;
  contentType: string;
  size: string;
  sizeInBytes: number;
  savedAs: string;
  filePath: string;
  url: string;
};

export default function UploadPage() {
  const features = [
    {
      icon: Upload,
      title: "Large File Support",
      description: "Upload files up to 15GB with chunked upload technology",
    },
    {
      icon: Shield,
      title: "Secure Transfer",
      description: "All uploads are encrypted and transferred securely",
    },
    {
      icon: Zap,
      title: "Fast Processing",
      description: "Optimized upload speeds with concurrent processing",
    },
  ];

  return (
    <Layout>
      <div className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Upload Your Files
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Securely upload and store your files with our advanced file
              management system. Upload multiple files simultaneously with
              progress tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upload Section */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    File Upload
                  </CardTitle>
                  <CardDescription>
                    Drag and drop your files or click to browse. Maximum file
                    size: 15GB per file.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FileUploader
                    maxSizeInMB={15360} // 15GB
                    chunkSizeInMB={5}
                    title=""
                    description=""
                    maxConcurrentUploads={3}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Features Sidebar */}
            <div className="space-y-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Upload Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {features.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <div key={index} className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">
                            {feature.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    asChild
                  >
                    <a href="/files">
                      <FileText className="mr-2 h-4 w-4" />
                      View My Files
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    asChild
                  >
                    <a href="/">← Back to Home</a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Upload Tips */}
          <div className="mt-12">
            <Card className="border-0 bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">Upload Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div className="space-y-1">
                    <h4 className="font-medium">Supported Formats</h4>
                    <p className="text-muted-foreground">
                      All file types are supported including documents, images,
                      videos, and archives.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-medium">Upload Speed</h4>
                    <p className="text-muted-foreground">
                      Files are uploaded in chunks for optimal speed and
                      reliability.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-medium">Storage Limit</h4>
                    <p className="text-muted-foreground">
                      Individual files can be up to 15GB. No limit on total
                      storage.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
