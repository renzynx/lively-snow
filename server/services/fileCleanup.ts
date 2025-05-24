import * as cron from "node-cron";
import { eq, and, isNull, lt } from "drizzle-orm";
import { files } from "../database/schema";
import { deleteObject } from "../utils/s3";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

interface CleanupServiceOptions {
  db: LibSQLDatabase<any>;
  maxAgeHours?: number; // Maximum age for unfinished files in hours (default: 24)
  cronSchedule?: string; // Cron schedule (default: every hour)
  enableLogging?: boolean;
}

export class FileCleanupService {
  private db: LibSQLDatabase<any>;
  private maxAgeHours: number;
  private cronSchedule: string;
  private enableLogging: boolean;
  private task?: cron.ScheduledTask;

  constructor(options: CleanupServiceOptions) {
    this.db = options.db;
    this.maxAgeHours = options.maxAgeHours ?? 24; // Default: 24 hours
    this.cronSchedule = options.cronSchedule ?? "0 * * * *"; // Default: every hour
    this.enableLogging = options.enableLogging ?? true;
  }

  /**
   * Start the scheduled cleanup task
   */
  start(): void {
    if (this.task) {
      this.log("Cleanup service is already running");
      return;
    }

    this.log(
      `Starting file cleanup service with schedule: ${this.cronSchedule}`,
    );
    this.log(
      `Will delete unfinished files older than ${this.maxAgeHours} hours`,
    );
    this.task = cron.schedule(
      this.cronSchedule,
      async () => {
        await this.cleanup();
      },
      {
        timezone: "UTC",
      },
    );

    this.task.start();
    this.log("File cleanup service started");
  }

  /**
   * Stop the scheduled cleanup task
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task.destroy();
      this.task = undefined;
      this.log("File cleanup service stopped");
    }
  }

  /**
   * Run cleanup immediately (can be called manually)
   */
  async cleanup(): Promise<{ deletedCount: number; errors: string[] }> {
    const startTime = Date.now();
    this.log("Starting cleanup of unfinished files...");

    try {
      // Calculate cutoff time (files older than maxAgeHours)
      const cutoffTime = new Date(
        Date.now() - this.maxAgeHours * 60 * 60 * 1000,
      );

      // Find unfinished files older than cutoff time
      const unfinishedFiles = await this.db
        .select()
        .from(files)
        .where(
          and(
            isNull(files.completed_at), // File not completed
            lt(files.created_at, cutoffTime), // Older than cutoff
          ),
        );

      if (unfinishedFiles.length === 0) {
        this.log("No unfinished files found for cleanup");
        return { deletedCount: 0, errors: [] };
      }

      this.log(`Found ${unfinishedFiles.length} unfinished files to cleanup`);

      const errors: string[] = [];
      let deletedCount = 0;

      // Process each file
      for (const file of unfinishedFiles) {
        try {
          const promises: Promise<any>[] = [];

          // Delete from S3 if s3_key exists
          if (file.s3_key) {
            promises.push(deleteObject(file.s3_key));
          }

          // Delete from database
          promises.push(this.db.delete(files).where(eq(files.id, file.id)));

          await Promise.all(promises);
          deletedCount++;
          this.log(
            `Deleted unfinished file: ${file.name} (ID: ${file.id}, Age: ${this.getFileAge(file.created_at)})`,
          );
        } catch (error) {
          const errorMsg = `Failed to delete file ${file.name} (ID: ${file.id}): ${error}`;
          errors.push(errorMsg);
          console.error(errorMsg, error);
        }
      }

      const duration = Date.now() - startTime;
      this.log(
        `Cleanup completed in ${duration}ms. Deleted: ${deletedCount}, Errors: ${errors.length}`,
      );

      return { deletedCount, errors };
    } catch (error) {
      const errorMsg = `Cleanup failed: ${error}`;
      console.error(errorMsg, error);
      return { deletedCount: 0, errors: [errorMsg] };
    }
  }

  /**
   * Get statistics about unfinished files
   */
  async getStats(): Promise<{
    totalUnfinished: number;
    eligibleForCleanup: number;
    oldestFile?: { name: string; age: string; id: string };
  }> {
    try {
      // Get all unfinished files
      const allUnfinished = await this.db
        .select()
        .from(files)
        .where(isNull(files.completed_at)); // Calculate cutoff time
      const cutoffTime = new Date(
        Date.now() - this.maxAgeHours * 60 * 60 * 1000,
      );

      // Count eligible files
      const eligibleFiles = allUnfinished.filter(
        (file) => file.created_at < cutoffTime,
      );

      // Find oldest file
      let oldestFile;
      if (allUnfinished.length > 0) {
        const oldest = allUnfinished.reduce((prev, current) =>
          prev.created_at < current.created_at ? prev : current,
        );
        oldestFile = {
          name: oldest.name,
          age: this.getFileAge(oldest.created_at),
          id: oldest.id,
        };
      }

      return {
        totalUnfinished: allUnfinished.length,
        eligibleForCleanup: eligibleFiles.length,
        oldestFile,
      };
    } catch (error) {
      console.error("Failed to get cleanup stats:", error);
      return {
        totalUnfinished: 0,
        eligibleForCleanup: 0,
      };
    }
  }
  /**
   * Format file age for display
   */
  private getFileAge(createdAt: Date): string {
    const ageMs = Date.now() - createdAt.getTime();
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const ageDays = Math.floor(ageHours / 24);

    if (ageDays > 0) {
      return `${ageDays} day${ageDays !== 1 ? "s" : ""}`;
    } else {
      return `${ageHours} hour${ageHours !== 1 ? "s" : ""}`;
    }
  }

  /**
   * Log message with timestamp
   */
  private log(message: string): void {
    if (this.enableLogging) {
      console.log(`[FileCleanup ${new Date().toISOString()}] ${message}`);
    }
  }
}

// Factory function for easy instantiation
export function createFileCleanupService(
  options: CleanupServiceOptions,
): FileCleanupService {
  return new FileCleanupService(options);
}
