import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import toast from "react-hot-toast";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";
import { useDeleteCollection } from "@/api/http/v1/collections/collections.hooks";
import type { Collection } from "@/modules/collections/types";

interface DeleteCollectionDialogProps {
  collection: Collection;
  trigger: ReactNode;
}

export function DeleteCollectionDialog({ collection, trigger }: DeleteCollectionDialogProps) {
  const deleteCollection = useDeleteCollection();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const canDelete = collection.collectedMinor === 0;

  async function handleDelete() {
    try {
      await deleteCollection.mutateAsync(collection.slug);
      toast.success("Collection deleted");
      setOpen(false);
      navigate({ to: "/app/collections" });
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Couldn't delete collection. Try again.";
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-bold tracking-[-0.01em]">Delete collection</DialogTitle>
          <DialogDescription>
            {canDelete
              ? `This will permanently remove "${collection.title}" and its member list.`
              : `"${collection.title}" already has payments, so it can't be deleted.`}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={deleteCollection.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!canDelete || deleteCollection.isPending}
            onClick={handleDelete}
          >
            {deleteCollection.isPending ? "Deleting…" : "Delete collection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
