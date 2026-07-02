import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import toast from "react-hot-toast";
import { Icon } from "@benrobo/iconary/react";
import { Alert01Icon } from "@benrobo/iconary/core/duotone-rounded";
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
import { formatNaira } from "@/lib/format";
import type { Collection } from "@/modules/collections/types";

interface DeleteCollectionDialogProps {
  collection: Collection;
  trigger: ReactNode;
}

export function DeleteCollectionDialog({ collection, trigger }: DeleteCollectionDialogProps) {
  const deleteCollection = useDeleteCollection();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const held = collection.availableMinor;
  const canDelete = held === 0;

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
              ? `This will permanently remove "${collection.title}" and its member list. This can't be undone.`
              : `To delete "${collection.title}", the money still in it has to be withdrawn first.`}
          </DialogDescription>
        </DialogHeader>

        {!canDelete ? (
          <div className="flex items-start gap-2.5 rounded-[14px] border border-amber/40 bg-amber-soft px-3.5 py-3 text-amber-deep">
            <Icon icon={Alert01Icon} size={17} className="mt-0.5 shrink-0" />
            <div className="text-[12.5px] leading-relaxed">
              <span className="font-semibold">{formatNaira(held)} still in this collection.</span>{" "}
              Withdraw it to your bank first, then you can delete this collection.
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={deleteCollection.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!canDelete}
            loading={deleteCollection.isPending}
            onClick={handleDelete}
          >
            Delete collection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
