import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Form } from "@remix-run/react";
import type { FolderItem } from "~/types/folder-browser";

interface CreateFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  currentFolderId: string | null;
}

export function CreateFolderDialog({
  isOpen,
  onClose,
  onSubmit,
  currentFolderId,
}: CreateFolderDialogProps) {
  const [folderName, setFolderName] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderName.trim()) {
      onSubmit(folderName);
      setFolderName("");
    }
  };

  React.useEffect(() => {
    if (!isOpen) {
      setFolderName("");
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <Form method="post" action="/files" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder.
            </DialogDescription>
          </DialogHeader>

          <input type="hidden" name="action" value="createFolder" />
          {currentFolderId && (
            <input type="hidden" name="parentId" value={currentFolderId} />
          )}

          <Input
            name="name"
            placeholder="Folder name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)}
            autoFocus
          />

          <DialogFooter className="mt-4">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!folderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface RenameFolderDialogProps {
  isOpen: boolean;
  folder: FolderItem | null;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export function RenameFolderDialog({
  isOpen,
  folder,
  onClose,
  onSubmit,
}: RenameFolderDialogProps) {
  const [folderName, setFolderName] = React.useState("");

  React.useEffect(() => {
    if (folder) {
      setFolderName(folder.name);
    } else {
      setFolderName("");
    }
  }, [folder]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderName.trim()) {
      onSubmit(folderName);
    }
  };

  if (!folder) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <Form method="post" action="/files" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Enter a new name for the folder.
            </DialogDescription>
          </DialogHeader>

          <input type="hidden" name="action" value="renameFolder" />
          <input type="hidden" name="folderId" value={folder.id} />

          <Input
            name="name"
            placeholder="Folder name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)}
            autoFocus
          />

          <DialogFooter className="mt-4">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!folderName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
