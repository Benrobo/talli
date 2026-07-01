import { useState, type ReactNode } from "react";
import { useForm } from "@tanstack/react-form";
import toast from "react-hot-toast";
import { z } from "zod";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
} from "@/components/ui";
import { updateCollectionSchema } from "@/api/http/v1/collections/collections.types";
import { useUpdateCollection } from "@/api/http/v1/collections/collections.hooks";
import type { Collection } from "@/modules/collections/types";

interface EditCollectionDialogProps {
  collection: Collection;
  trigger: ReactNode;
}

function toDateInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function EditCollectionDialog({ collection, trigger }: EditCollectionDialogProps) {
  const updateCollection = useUpdateCollection(collection.slug);
  const [open, setOpen] = useState(false);
  const isPerPerson = collection.collectionType === "fixed_per_person";

  const form = useForm({
    defaultValues: {
      title: collection.title,
      purpose: collection.purpose,
      amount: isPerPerson
        ? String(Math.round(collection.perPersonMinor))
        : String(Math.round(collection.targetMinor)),
      due: toDateInput(collection.deadline),
    },
    onSubmit: async ({ value }) => {
      const amount = Number(value.amount);
      try {
        const payload = updateCollectionSchema.parse({
          title: value.title.trim(),
          purpose: value.purpose.trim(),
          amountPerMember: isPerPerson && collection.canEditAmounts ? amount : undefined,
          targetAmount: !isPerPerson && collection.canEditAmounts ? amount : undefined,
          deadline: value.due ? new Date(value.due) : null,
        });
        await updateCollection.mutateAsync(payload);
        toast.success("Collection updated");
        setOpen(false);
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast.error(error.issues[0]?.message ?? "Invalid input");
          return;
        }
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Couldn't update collection. Try again.";
        toast.error(message);
      }
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          form.reset();
          form.setFieldValue("title", collection.title);
          form.setFieldValue("purpose", collection.purpose);
          form.setFieldValue(
            "amount",
            isPerPerson
              ? String(Math.round(collection.perPersonMinor))
              : String(Math.round(collection.targetMinor))
          );
          form.setFieldValue("due", toDateInput(collection.deadline));
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-bold tracking-[-0.01em]">Edit collection</DialogTitle>
          <DialogDescription>Update the title, details, or due date for this collection.</DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="title"
            validators={{
              onChange: ({ value }) => (value.trim().length > 0 ? undefined : "Title is required"),
            }}
            children={(field) => (
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-medium text-content-muted">What's it for?</span>
                <Input
                  autoFocus
                  placeholder="e.g. Saturday football pitch"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                />
              </label>
            )}
          />

          <form.Field
            name="purpose"
            children={(field) => (
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-medium text-content-muted">
                  Description (optional)
                </span>
                <Input
                  placeholder="What is this collection for?"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                />
              </label>
            )}
          />

          <form.Field
            name="amount"
            validators={{
              onChange: ({ value }) => {
                if (!collection.canEditAmounts) return undefined;
                if (!value) return "Amount is required";
                return Number(value) > 0 ? undefined : "Amount must be greater than zero";
              },
            }}
            children={(field) => (
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-medium text-content-muted">
                  {isPerPerson ? "Amount per person" : "Target amount"}
                </span>
                <Input
                  inputMode="numeric"
                  placeholder="₦0"
                  disabled={!collection.canEditAmounts}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value.replace(/[^\d]/g, ""))}
                  onBlur={field.handleBlur}
                />
                {!collection.canEditAmounts ? (
                  <span className="mt-1.5 block text-[11.5px] text-content-faint">
                    Amount can't be changed after payments come in.
                  </span>
                ) : null}
              </label>
            )}
          />

          <form.Field
            name="due"
            children={(field) => (
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-medium text-content-muted">Due date (optional)</span>
                <Input
                  type="date"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                />
              </label>
            )}
          />
        </form>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={updateCollection.isPending}>
            Cancel
          </Button>
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting] as const}
            children={([canSubmit, isSubmitting]) => (
              <Button
                onClick={() => form.handleSubmit()}
                disabled={!canSubmit || isSubmitting || updateCollection.isPending}
              >
                {updateCollection.isPending ? "Saving…" : "Save changes"}
              </Button>
            )}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
