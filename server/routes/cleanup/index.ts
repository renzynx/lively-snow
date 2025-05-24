import type { FastifyPluginAsync } from "fastify";
import { createFileCleanupService } from "../../services/fileCleanup";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
  // Get cleanup statistics (admin only)
  fastify.get(
    "/stats",
    { preHandler: fastify.authenticate },
    async function (request, reply) {
      try {
        const user = request.session.user!;

        if (user.role !== "admin" && user.role !== "super_admin") {
          return reply.status(403).send({ error: "Admin access required" });
        }

        const cleanupService = createFileCleanupService({
          db: fastify.db,
          enableLogging: false, // Don't log for stats requests
        });

        const stats = await cleanupService.getStats();

        return reply.send({
          success: true,
          data: stats,
        });
      } catch (error) {
        console.error("Error getting cleanup stats:", error);
        return reply.status(500).send({
          success: false,
          error: "Failed to get cleanup statistics",
        });
      }
    },
  );
  // Manual cleanup trigger (admin only)
  fastify.post(
    "/trigger",
    { preHandler: fastify.authenticate },
    async function (request, reply) {
      try {
        const user = request.session.user!;

        if (user.role !== "admin" && user.role !== "super_admin") {
          return reply.status(403).send({ error: "Admin access required" });
        }

        const cleanupService = createFileCleanupService({
          db: fastify.db,
          enableLogging: true,
        });

        const result = await cleanupService.cleanup();

        return reply.send({
          success: true,
          message: `Cleanup completed. Deleted ${result.deletedCount} files.`,
          data: {
            deletedCount: result.deletedCount,
            errors: result.errors,
          },
        });
      } catch (error) {
        console.error("Error during manual cleanup:", error);
        return reply.status(500).send({
          success: false,
          error: "Cleanup failed",
        });
      }
    },
  );
};

export default route;
