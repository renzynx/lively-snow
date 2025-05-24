import type { FastifyPluginAsync } from "fastify";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "../../database/index.js";
import {
  folders,
  files,
  type Folder,
  type InsertFolder,
} from "../../database/schema";

const foldersRoute: FastifyPluginAsync = async (fastify) => {
  // Get all folders for the authenticated user
  fastify.get(
    "/",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      try {
        const user = request.session.user!;

        const userFolders = await db.query.folders.findMany({
          where: eq(folders.user_id, user.id),
          with: {
            parent: true,
            children: true,
            files: true,
          },
          orderBy: (folders, { asc }) => [asc(folders.name)],
        });

        return reply.send({ folders: userFolders });
      } catch (error) {
        console.error("Error fetching folders:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );

  // Get folder contents (subfolders and files)
  fastify.get(
    "/:folderId/contents",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      try {
        const user = request.session.user!;

        const { folderId } = request.params as { folderId: string };

        // Verify folder belongs to user
        const folder = await db.query.folders.findFirst({
          where: and(eq(folders.id, folderId), eq(folders.user_id, user.id)),
        });

        if (!folder) {
          return reply.code(404).send({ error: "Folder not found" });
        }

        // Get subfolders
        const subfolders = await db.query.folders.findMany({
          where: and(
            eq(folders.parent_id, folderId),
            eq(folders.user_id, user.id),
          ),
          orderBy: (folders, { asc }) => [asc(folders.name)],
        });

        // Get files in folder
        const folderFiles = await db.query.files.findMany({
          where: and(eq(files.folder_id, folderId), eq(files.user_id, user.id)),
          orderBy: (files, { desc }) => [desc(files.created_at)],
        });

        return reply.send({
          folder,
          subfolders,
          files: folderFiles,
        });
      } catch (error) {
        console.error("Error fetching folder contents:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );

  // Get root level contents (folders and files without parent)
  fastify.get(
    "/root",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      try {
        const user = request.session.user!;

        // Get root folders (no parent)
        const rootFolders = await db.query.folders.findMany({
          where: and(isNull(folders.parent_id), eq(folders.user_id, user.id)),
          orderBy: (folders, { asc }) => [asc(folders.name)],
        });

        // Get root files (no folder)
        const rootFiles = await db.query.files.findMany({
          where: and(isNull(files.folder_id), eq(files.user_id, user.id)),
          orderBy: (files, { desc }) => [desc(files.created_at)],
        });
        return reply.send({
          subfolders: rootFolders,
          files: rootFiles,
        });
      } catch (error) {
        console.error("Error fetching root contents:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );

  // Create a new folder
  fastify.post(
    "/",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      try {
        const user = request.session.user!;

        const { name, parentId } = request.body as {
          name: string;
          parentId?: string;
        };

        if (!name || name.trim().length === 0) {
          return reply.code(400).send({ error: "Folder name is required" });
        }

        // If parentId is provided, verify it exists and belongs to user
        if (parentId) {
          const parentFolder = await db.query.folders.findFirst({
            where: and(eq(folders.id, parentId), eq(folders.user_id, user.id)),
          });

          if (!parentFolder) {
            return reply.code(404).send({ error: "Parent folder not found" });
          }
        }

        // Check if folder with same name already exists in same location
        const existingFolder = await db.query.folders.findFirst({
          where: and(
            eq(folders.name, name.trim()),
            eq(folders.user_id, user.id),
            parentId
              ? eq(folders.parent_id, parentId)
              : isNull(folders.parent_id),
          ),
        });

        if (existingFolder) {
          return reply
            .code(409)
            .send({ error: "Folder with this name already exists" });
        }

        const newFolder: InsertFolder = {
          name: name.trim(),
          parent_id: parentId || null,
          user_id: user.id,
        };

        const [createdFolder] = await db
          .insert(folders)
          .values(newFolder)
          .returning();

        return reply.code(201).send({ folder: createdFolder });
      } catch (error) {
        console.error("Error creating folder:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );

  // Rename a folder
  fastify.patch(
    "/:folderId",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      try {
        const user = request.session.user!;

        const { folderId } = request.params as { folderId: string };
        const { name } = request.body as { name: string };

        if (!name || name.trim().length === 0) {
          return reply.code(400).send({ error: "Folder name is required" });
        }

        // Verify folder belongs to user
        const folder = await db.query.folders.findFirst({
          where: and(eq(folders.id, folderId), eq(folders.user_id, user.id)),
        });

        if (!folder) {
          return reply.code(404).send({ error: "Folder not found" });
        }

        // Check if folder with same name already exists in same location
        const existingFolder = await db.query.folders.findFirst({
          where: and(
            eq(folders.name, name.trim()),
            eq(folders.user_id, user.id),
            folder.parent_id
              ? eq(folders.parent_id, folder.parent_id)
              : isNull(folders.parent_id),
          ),
        });

        if (existingFolder && existingFolder.id !== folderId) {
          return reply
            .code(409)
            .send({ error: "Folder with this name already exists" });
        }

        const [updatedFolder] = await db
          .update(folders)
          .set({ name: name.trim() })
          .where(eq(folders.id, folderId))
          .returning();

        return reply.send({ folder: updatedFolder });
      } catch (error) {
        console.error("Error renaming folder:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );

  // Move a folder to a different parent
  fastify.patch(
    "/:folderId/move",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      try {
        const user = request.session.user!;

        const { folderId } = request.params as { folderId: string };
        const { parentId } = request.body as { parentId?: string };

        // Verify folder belongs to user
        const folder = await db.query.folders.findFirst({
          where: and(eq(folders.id, folderId), eq(folders.user_id, user.id)),
        });

        if (!folder) {
          return reply.code(404).send({ error: "Folder not found" });
        }

        // If parentId is provided, verify it exists and belongs to user
        if (parentId) {
          const parentFolder = await db.query.folders.findFirst({
            where: and(eq(folders.id, parentId), eq(folders.user_id, user.id)),
          });

          if (!parentFolder) {
            return reply.code(404).send({ error: "Parent folder not found" });
          }

          // Prevent moving folder into itself or its descendants
          if (parentId === folderId) {
            return reply
              .code(400)
              .send({ error: "Cannot move folder into itself" });
          }

          // TODO: Add recursive check to prevent moving into descendants
        }

        // Check if folder with same name already exists in destination
        const existingFolder = await db.query.folders.findFirst({
          where: and(
            eq(folders.name, folder.name),
            eq(folders.user_id, user.id),
            parentId
              ? eq(folders.parent_id, parentId)
              : isNull(folders.parent_id),
          ),
        });

        if (existingFolder && existingFolder.id !== folderId) {
          return reply.code(409).send({
            error: "Folder with this name already exists in destination",
          });
        }

        const [updatedFolder] = await db
          .update(folders)
          .set({ parent_id: parentId || null })
          .where(eq(folders.id, folderId))
          .returning();

        return reply.send({ folder: updatedFolder });
      } catch (error) {
        console.error("Error moving folder:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );

  // Delete a folder (and optionally its contents)
  fastify.delete(
    "/:folderId",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      try {
        const user = request.session.user!;

        const { folderId } = request.params as { folderId: string };
        const { force } = request.query as { force?: string };

        // Verify folder belongs to user
        const folder = await db.query.folders.findFirst({
          where: and(eq(folders.id, folderId), eq(folders.user_id, user.id)),
          with: {
            children: true,
            files: true,
          },
        });

        if (!folder) {
          return reply.code(404).send({ error: "Folder not found" });
        }

        // Check if folder has contents
        const hasContents =
          folder.children.length > 0 || folder.files.length > 0;

        if (hasContents && force !== "true") {
          return reply.code(400).send({
            error: "Folder is not empty",
            hasSubfolders: folder.children.length > 0,
            hasFiles: folder.files.length > 0,
          });
        }

        if (force === "true" && hasContents) {
          // TODO: Implement recursive deletion of contents
          // For now, just prevent deletion of non-empty folders
          return reply
            .code(400)
            .send({ error: "Recursive deletion not yet implemented" });
        }

        await db.delete(folders).where(eq(folders.id, folderId));

        return reply.code(204).send();
      } catch (error) {
        console.error("Error deleting folder:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );

  // Get folder breadcrumb path
  fastify.get(
    "/:folderId/breadcrumb",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      try {
        const user = request.session.user!;

        const { folderId } = request.params as { folderId: string };

        // Build breadcrumb path
        const breadcrumb: Folder[] = [];
        let currentFolderId: string | null = folderId;
        while (currentFolderId) {
          const folder: Folder | undefined = await db.query.folders.findFirst({
            where: and(
              eq(folders.id, currentFolderId),
              eq(folders.user_id, user.id),
            ),
          });

          if (!folder) {
            return reply.code(404).send({ error: "Folder not found in path" });
          }

          breadcrumb.unshift(folder);
          currentFolderId = folder.parent_id;
        }

        return reply.send({ breadcrumb });
      } catch (error) {
        console.error("Error getting breadcrumb:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );
};

export default foldersRoute;
