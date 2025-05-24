import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Layout } from "~/components/Layout";
import { CleanupPanel } from "~/components/CleanupPanel";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Shield,
  Users,
  Database,
  Activity,
  HardDrive,
  Trash2,
  Settings,
  BarChart3,
} from "lucide-react";

export const meta: MetaFunction = () => {
  return [
    { title: "Admin Dashboard - FileManager" },
    {
      name: "description",
      content: "Administrative dashboard for managing the file system",
    },
  ];
};

export async function loader({ context }: LoaderFunctionArgs) {
  if (!context.user) {
    throw redirect("/auth/login");
  }

  // Check if user is admin or super admin
  const isAdmin =
    context.user.role === "admin" || context.user.role === "super_admin";

  if (!isAdmin) {
    throw redirect("/files");
  }

  return {
    user: context.user,
  };
}

export default function AdminDashboard() {
  const { user } = useLoaderData<typeof loader>();

  const adminStats = [
    {
      title: "Total Users",
      value: "N/A",
      icon: Users,
      description: "Registered users",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: "Storage Used",
      value: "N/A",
      icon: HardDrive,
      description: "Total storage consumed",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/30",
    },
    {
      title: "Active Files",
      value: "N/A",
      icon: Database,
      description: "Successfully uploaded files",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
    },
    {
      title: "System Health",
      value: "Good",
      icon: Activity,
      description: "Overall system status",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    },
  ];

  const adminFeatures = [
    {
      title: "File Cleanup Management",
      description: "Monitor and manage automated cleanup of unfinished uploads",
      icon: Trash2,
      available: true,
    },
    {
      title: "User Management",
      description: "Manage user accounts, roles, and permissions",
      icon: Users,
      available: false,
    },
    {
      title: "Storage Analytics",
      description: "View detailed storage usage and analytics",
      icon: BarChart3,
      available: false,
    },
    {
      title: "System Settings",
      description: "Configure system-wide settings and preferences",
      icon: Settings,
      available: false,
    },
  ];

  return (
    <Layout>
      <div className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Admin Dashboard
              </h1>
              <Badge variant="secondary" className="ml-2">
                {user.role === "super_admin" ? "Super Admin" : "Admin"}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Manage system settings, monitor performance, and oversee file
              operations.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {adminStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {stat.title}
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {stat.value}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {stat.description}
                        </p>
                      </div>
                      <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                        <Icon className={`h-6 w-6 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* File Cleanup Management */}
          <CleanupPanel />

          {/* Admin Features Overview */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Administrative Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {adminFeatures.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        feature.available
                          ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
                          : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/30"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            feature.available
                              ? "bg-green-100 dark:bg-green-900/50"
                              : "bg-gray-100 dark:bg-gray-700"
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 ${
                              feature.available
                                ? "text-green-600 dark:text-green-400"
                                : "text-gray-500"
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-foreground">
                              {feature.title}
                            </h3>
                            <Badge
                              variant={
                                feature.available ? "default" : "secondary"
                              }
                              className="text-xs"
                            >
                              {feature.available ? "Available" : "Coming Soon"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <p>
                  Additional admin tools and actions will be available here as
                  the system grows.
                </p>
                <p className="mt-2">
                  Current focus: File cleanup management is fully functional and
                  automated.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
