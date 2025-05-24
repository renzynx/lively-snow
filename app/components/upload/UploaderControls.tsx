import { Button } from "~/components/ui/button";
import { RingProgress } from "~/components/ui/ring-progress";

interface UploaderControlsProps {
  overallProgress: number;
  activeUploadsCount: number;
  maxConcurrentUploads: number;
  hasIdleFiles: boolean;
  hasActiveFiles: boolean;
  hasCompletedFiles: boolean;
  onStartAll: () => void;
  onCancelAll: () => void;
  onClearCompleted: () => void;
}

export function UploaderControls({
  overallProgress,
  activeUploadsCount,
  maxConcurrentUploads,
  hasIdleFiles,
  hasActiveFiles,
  hasCompletedFiles,
  onStartAll,
  onCancelAll,
  onClearCompleted,
}: UploaderControlsProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border">
      {/* Progress Ring */}
      <div className="flex items-center space-x-4">
        <RingProgress progress={overallProgress} size={60}>
          {overallProgress}%
        </RingProgress>

        <div className="space-y-1">
          <div className="text-sm font-medium">Upload Progress</div>
          <div className="text-xs text-muted-foreground">
            {activeUploadsCount > 0 && (
              <span>
                {activeUploadsCount} active upload
                {activeUploadsCount !== 1 ? "s" : ""}
              </span>
            )}
            {activeUploadsCount === 0 && hasIdleFiles && (
              <span>Ready to upload</span>
            )}
            {activeUploadsCount === 0 && !hasIdleFiles && (
              <span>No uploads pending</span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        {hasIdleFiles && (
          <Button
            onClick={onStartAll}
            disabled={activeUploadsCount >= maxConcurrentUploads}
            size="sm"
          >
            {activeUploadsCount > 0 ? "Resume Uploads" : "Start All"}
          </Button>
        )}

        {hasActiveFiles && (
          <Button onClick={onCancelAll} variant="destructive" size="sm">
            Cancel All
          </Button>
        )}

        {hasCompletedFiles && (
          <Button onClick={onClearCompleted} variant="outline" size="sm">
            Clear Completed
          </Button>
        )}
      </div>
    </div>
  );
}
