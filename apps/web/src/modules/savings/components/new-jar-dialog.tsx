import { useState, type ReactNode } from "react";
import { useForm } from "@tanstack/react-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { BottomSheet, Button, Input, Switch } from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import { useCreateSavingsJar } from "@/api/http/v1/savings/savings.hooks";
import { createSavingsJarSchema } from "@/api/http/v1/savings/savings.types";
import { JarStylePicker } from "@/modules/savings/components/jar-style-picker";
import {
  DEFAULT_JAR_COLOR,
  DEFAULT_JAR_ICON,
  jarIconFor,
} from "@/modules/savings/jar-style";

interface NewJarDialogProps {
  trigger: ReactNode;
}

export function NewJarDialog({ trigger }: NewJarDialogProps) {
  const createJar = useCreateSavingsJar();
  const [open, setOpen] = useState(false);
  const [icon, setIcon] = useState(DEFAULT_JAR_ICON);
  const [accentColor, setAccentColor] = useState(DEFAULT_JAR_COLOR);

  const form = useForm({
    defaultValues: { name: "", target: "", locked: false, unlockDate: "" },
    onSubmit: async ({ value }) => {
      try {
        const payload = createSavingsJarSchema.parse({
          name: value.name.trim(),
          icon,
          accentColor,
          targetAmount: Number(value.target),
          lockUntil: value.locked && value.unlockDate ? new Date(value.unlockDate) : undefined,
        });
        await createJar.mutateAsync(payload);
        toast.success("Savings jar created");
        reset();
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast.error(error.issues[0]?.message ?? "Invalid input");
          return;
        }
        toast.error("Couldn't create jar. Try again.");
      }
    },
  });

  function reset() {
    setOpen(false);
    form.reset();
    setIcon(DEFAULT_JAR_ICON);
    setAccentColor(DEFAULT_JAR_COLOR);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="contents">
        {trigger}
      </button>

      <BottomSheet
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : reset())}
        title="New savings jar"
        description="Set money aside — make it yours with an icon and color."
        className="max-w-[460px] pb-7"
      >
        <form
          className="flex flex-col gap-4 pt-1"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Subscribe
            selector={(state) => state.values.name}
            children={(name) => (
              <div className="flex items-center gap-3.5">
                <span
                  className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-chip transition-colors"
                  style={{ backgroundColor: accentColor }}
                >
                  <Icon icon={jarIconFor(icon)} size={26} />
                </span>
                <div className="min-w-0">
                  <div className="font-display text-[17px] font-bold tracking-[-0.01em] text-foreground">
                    {name.trim() || "New jar"}
                  </div>
                  <div className="text-[12px] text-content-muted">This is how it'll look</div>
                </div>
              </div>
            )}
          />

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
                  placeholder="e.g. Rent, Laptop, Detty December"
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

          <JarStylePicker
            icon={icon}
            accentColor={accentColor}
            onIconChange={setIcon}
            onColorChange={setAccentColor}
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

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting] as const}
            children={([canSubmit, isSubmitting]) => (
              <Button
                block
                size="lg"
                type="submit"
                className="mt-1"
                disabled={!canSubmit || isSubmitting}
                loading={createJar.isPending}
              >
                Create jar
              </Button>
            )}
          />
        </form>
      </BottomSheet>
    </>
  );
}
