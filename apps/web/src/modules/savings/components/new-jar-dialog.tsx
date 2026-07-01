import { useState, type ReactNode } from "react";
import { useForm } from "@tanstack/react-form";
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
  Input,
  Switch,
} from "@/components/ui";
import { useCreateSavingsJar } from "@/api/http/v1/savings/savings.hooks";
import { createSavingsJarSchema } from "@/api/http/v1/savings/savings.types";
import { z } from "zod";

interface NewJarDialogProps {
  trigger: ReactNode;
}

export function NewJarDialog({ trigger }: NewJarDialogProps) {
  const createJar = useCreateSavingsJar();
  const [open, setOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      name: "",
      target: "",
      locked: false,
      unlockDate: "",
    },
    onSubmit: async ({ value }) => {
      const targetAmount = Number(value.target);
      try {
        const payload = createSavingsJarSchema.parse({
          name: value.name.trim(),
          targetAmount,
          lockUntil: value.locked && value.unlockDate ? new Date(value.unlockDate) : undefined,
        });
        await createJar.mutateAsync(payload);
        toast.success("Savings jar created");
        setOpen(false);
        form.reset();
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast.error(error.issues[0]?.message ?? "Invalid input");
          return;
        }
        toast.error("Couldn't create jar. Try again.");
      }
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) form.reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-bold tracking-[-0.01em]">New savings jar</DialogTitle>
          <DialogDescription>Set money aside — lock it until a date or keep it flexible.</DialogDescription>
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
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </label>
            )}
          />

          <form.Field
            name="target"
            validators={{
              onChange: ({ value }) => {
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
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value.replace(/[^\d]/g, ""))}
                  onBlur={field.handleBlur}
                />
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
            children={(locked) =>
              locked ? (
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
                        onChange={(e) => field.handleChange(e.target.value)}
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
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={createJar.isPending}>
            Cancel
          </Button>
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting] as const}
            children={([canSubmit, isSubmitting]) => (
              <Button onClick={() => form.handleSubmit()} disabled={!canSubmit || isSubmitting || createJar.isPending}>
                {createJar.isPending ? "Creating…" : "Create jar"}
              </Button>
            )}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
