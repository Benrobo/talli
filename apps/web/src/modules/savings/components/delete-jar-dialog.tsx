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
import { useDeleteSavingsJar } from "@/api/http/v1/savings/savings.hooks";
import type { Jar } from "@/modules/savings/types";

interface DeleteJarDialogProps {
  jar: Jar;
  trigger: ReactNode;
}

export function DeleteJarDialog({ jar, trigger }: DeleteJarDialogProps) {
  const deleteJar = useDeleteSavingsJar();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const canDelete = jar.savedMinor === 0;

  async function handleDelete() {
    try {
      await deleteJar.mutateAsync(jar.id);
      toast.success("Jar deleted");
      setOpen(false);
      navigate({ to: "/app/savings" });
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Couldn't delete jar. Try again.";
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-bold tracking-[-0.01em]">Delete jar</DialogTitle>
          <DialogDescription>
            {canDelete
              ? `This will permanently remove "${jar.name}" and its deposit history.`
              : `"${jar.name}" already has savings, so it can't be deleted.`}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={deleteJar.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={!canDelete || deleteJar.isPending} onClick={handleDelete}>
            {deleteJar.isPending ? "Deleting…" : "Delete jar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
