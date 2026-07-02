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
  Switch,
} from "@/components/ui";
import { updateSavingsJarSchema } from "@/api/http/v1/savings/savings.types";
import { useUpdateSavingsJar } from "@/api/http/v1/savings/savings.hooks";
import type { Jar } from "@/modules/savings/types";

interface EditJarDialogProps {
  jar: Jar;
  trigger: ReactNode;
}

function toDateInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function EditJarDialog({ jar, trigger }: EditJarDialogProps) {
  const updateJar = useUpdateSavingsJar(jar.id);
  const [open, setOpen] = useState(false);
  const locked = jar.status === "locked" || !!jar.lockUntil;

  const form = useForm({
    defaultValues: {
      name: jar.name,
      target: jar.targetAmountMinor ? String(Math.round(jar.targetAmountMinor / 100)) : "",
      locked,
      unlockDate: toDateInput(jar.lockUntil),
    },
    onSubmit: async ({ value }) => {
      try {
        const payload = updateSavingsJarSchema.parse({
          name: value.name.trim(),
          targetAmount:
            jar.canEditAmounts && value.target ? Number(value.target) * 100 : undefined,
          lockUntil: value.locked && value.unlockDate ? new Date(value.unlockDate) : null,
        });
        await updateJar.mutateAsync(payload);
        toast.success("Jar updated");
        setOpen(false);
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast.error(error.issues[0]?.message ?? "Invalid input");
          return;
        }
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Couldn't update jar. Try again.";
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
          form.setFieldValue("name", jar.name);
          form.setFieldValue(
            "target",
            jar.targetAmountMinor ? String(Math.round(jar.targetAmountMinor / 100)) : ""
          );
          form.setFieldValue("locked", jar.status === "locked" || !!jar.lockUntil);
          form.setFieldValue("unlockDate", toDateInput(jar.lockUntil));
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-bold tracking-[-0.01em]">Edit jar</DialogTitle>
          <DialogDescription>Update the name, target, or lock settings for this savings jar.</DialogDescription>
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
            name="name"
            validators={{
              onChange: ({ value }) => (value.trim().length > 0 ? undefined : "Jar name is required"),
            }}
            children={(field) => (
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-medium text-content-muted">Jar name</span>
                <Input
                  autoFocus
                  placeholder="e.g. Rent, Laptop, Emergency"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                />
              </label>
            )}
          />

          <form.Field
            name="target"
            validators={{
              onChange: ({ value }) => {
                if (!jar.canEditAmounts) return undefined;
                if (!value) return "Target amount is required";
                return Number(value) > 0 ? undefined : "Target amount must be greater than zero";
              },
            }}
            children={(field) => (
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-medium text-content-muted">Target amount</span>
                <Input
                  inputMode="numeric"
                  placeholder="₦0"
                  disabled={!jar.canEditAmounts}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value.replace(/[^\d]/g, ""))}
                  onBlur={field.handleBlur}
                />
                {!jar.canEditAmounts ? (
                  <span className="mt-1.5 block text-[11.5px] text-content-faint">
                    Target can't be changed after money has been saved.
                  </span>
                ) : null}
              </label>
            )}
          />

          <form.Field
            name="locked"
            children={(field) => (
              <div className="flex items-center justify-between rounded-[12px] border border-hairline bg-inset px-4 py-3">
                <div>
                  <div className="text-[13.5px] font-medium">Lock this jar</div>
                  <div className="text-[12px] text-content-muted">Can't withdraw until the unlock date</div>
                </div>
                <Switch checked={field.state.value} onCheckedChange={field.handleChange} />
              </div>
            )}
          />

          <form.Subscribe
            selector={(state) => state.values.locked}
            children={(isLocked) =>
              isLocked ? (
                <form.Field
                  name="unlockDate"
                  validators={{
                    onChange: ({ value, fieldApi }) => {
                      if (!fieldApi.form.getFieldValue("locked")) return undefined;
                      return value ? undefined : "Unlock date is required when jar is locked";
                    },
                  }}
                  children={(field) => (
                    <label className="block">
                      <span className="mb-1.5 block text-[12.5px] font-medium text-content-muted">Unlock date</span>
                      <Input
                        type="date"
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        onBlur={field.handleBlur}
                      />
                    </label>
                  )}
                />
              ) : null
            }
          />
        </form>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={updateJar.isPending}>
            Cancel
          </Button>
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting] as const}
            children={([canSubmit, isSubmitting]) => (
              <Button
                onClick={() => form.handleSubmit()}
                disabled={!canSubmit || isSubmitting || updateJar.isPending}
              >
                {updateJar.isPending ? "Saving…" : "Save changes"}
              </Button>
            )}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
