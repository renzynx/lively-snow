import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Trash2, RefreshCw, AlertTriangle, Info } from "lucide-react";

interface CleanupStats {
  totalUnfinished: number;
  eligibleForCleanup: number;
  oldestFile?: {
    name: string;
    age: string;
    id: string;
  };
}

interface CleanupResult {
  success: boolean;
  message?: string;
  data?: {
    deletedCount: number;
    errors: string[];
  };
  error?: string;
}

export function CleanupPanel() {
  const [stats, setStats] = React.useState<CleanupStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = React.useState(false);
  const [isRunningCleanup, setIsRunningCleanup] = React.useState(false);
  const [lastCleanup, setLastCleanup] = React.useState<CleanupResult | null>(
    null,
  );

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch("/api/cleanup/stats");
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch cleanup stats:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const runCleanup = async () => {
    setIsRunningCleanup(true);
    setLastCleanup(null);
    try {
      const response = await fetch("/api/cleanup/trigger", {
        method: "POST",
      });
      const data = await response.json();
      setLastCleanup(data);

      // Refresh stats after cleanup
      if (data.success) {
        await fetchStats();
      }
    } catch (error) {
      setLastCleanup({
        success: false,
        error: "Failed to run cleanup",
      });
    } finally {
      setIsRunningCleanup(false);
    }
  };

  React.useEffect(() => {
    fetchStats();
  }, []);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          File Cleanup Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {isLoadingStats ? "..." : (stats?.totalUnfinished ?? 0)}
            </div>
            <div className="text-sm text-muted-foreground">
              Unfinished Files
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {isLoadingStats ? "..." : (stats?.eligibleForCleanup ?? 0)}
            </div>
            <div className="text-sm text-muted-foreground">
              Ready for Cleanup
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-sm font-medium">Oldest File</div>
            <div className="text-sm text-muted-foreground">
              {isLoadingStats ? (
                "Loading..."
              ) : stats?.oldestFile ? (
                <div>
                  <div className="truncate">{stats.oldestFile.name}</div>
                  <div className="text-xs">Age: {stats.oldestFile.age}</div>
                </div>
              ) : (
                "None"
              )}
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Automatic Cleanup
              </div>
              <div className="text-blue-700 dark:text-blue-300">
                Files that fail to complete upload are automatically cleaned up
                every 6 hours. Files older than 24 hours without completion are
                deleted from both database and storage.
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={isLoadingStats}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoadingStats ? "animate-spin" : ""}`}
            />
            Refresh Stats
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={runCleanup}
            disabled={
              isRunningCleanup || (stats?.eligibleForCleanup ?? 0) === 0
            }
            className="flex items-center gap-2"
          >
            <Trash2
              className={`h-4 w-4 ${isRunningCleanup ? "animate-pulse" : ""}`}
            />
            {isRunningCleanup ? "Running Cleanup..." : "Run Cleanup Now"}
          </Button>
        </div>

        {/* Cleanup Result */}
        {lastCleanup && (
          <div
            className={`p-4 rounded-lg border ${
              lastCleanup.success
                ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
            }`}
          >
            <div className="flex items-start gap-2">
              {lastCleanup.success ? (
                <div className="text-green-600">✓</div>
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
              )}
              <div className="text-sm">
                <div
                  className={`font-medium mb-1 ${
                    lastCleanup.success
                      ? "text-green-900 dark:text-green-100"
                      : "text-red-900 dark:text-red-100"
                  }`}
                >
                  {lastCleanup.success ? "Cleanup Completed" : "Cleanup Failed"}
                </div>
                <div
                  className={
                    lastCleanup.success
                      ? "text-green-700 dark:text-green-300"
                      : "text-red-700 dark:text-red-300"
                  }
                >
                  {lastCleanup.message || lastCleanup.error}
                </div>
                {lastCleanup.data?.errors &&
                  lastCleanup.data.errors.length > 0 && (
                    <div className="mt-2">
                      <Badge variant="destructive" className="text-xs">
                        {lastCleanup.data.errors.length} errors
                      </Badge>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
