import { useState, type ReactNode } from "react";
import { useForm } from "@tanstack/react-form";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import { z } from "zod";
import { BottomSheet, Button, Input, Switch } from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import { updateSavingsJarSchema } from "@/api/http/v1/savings/savings.types";
import { useUpdateSavingsJar } from "@/api/http/v1/savings/savings.hooks";
import { JarStylePicker } from "@/modules/savings/components/jar-style-picker";
import { DEFAULT_JAR_COLOR, DEFAULT_JAR_ICON, jarIconFor } from "@/modules/savings/jar-style";
import type { Jar } from "@/modules/savings/types";

interface EditJarDialogProps {
  jar: Jar;
  trigger: ReactNode;
}

function toDateInput(value: string | null): string {
  if (!value) return "";
  const date = dayjs(value);
  if (!date.isValid()) return "";
  return date.format("YYYY-MM-DD");
}

export function EditJarDialog({ jar, trigger }: EditJarDialogProps) {
  const updateJar = useUpdateSavingsJar(jar.id);
  const [open, setOpen] = useState(false);
  const [icon, setIcon] = useState(jar.icon || DEFAULT_JAR_ICON);
  const [accentColor, setAccentColor] = useState(jar.accentColor || DEFAULT_JAR_COLOR);
  const locked = jar.status === "locked" || !!jar.lockUntil;

  const form = useForm({
    defaultValues: {
      name: jar.name,
      target: jar.targetAmountMinor ? String(Math.round(jar.targetAmountMinor)) : "",
      locked,
      unlockDate: toDateInput(jar.lockUntil),
    },
    onSubmit: async ({ value }) => {
      try {
        const payload = updateSavingsJarSchema.parse({
          name: value.name.trim(),
          icon,
          accentColor,
          targetAmount: jar.canEditAmounts && value.target ? Number(value.target) : undefined,
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

  function syncFromJar() {
    form.reset();
    form.setFieldValue("name", jar.name);
    form.setFieldValue("target", jar.targetAmountMinor ? String(Math.round(jar.targetAmountMinor)) : "");
    form.setFieldValue("locked", jar.status === "locked" || !!jar.lockUntil);
    form.setFieldValue("unlockDate", toDateInput(jar.lockUntil));
    setIcon(jar.icon || DEFAULT_JAR_ICON);
    setAccentColor(jar.accentColor || DEFAULT_JAR_COLOR);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          syncFromJar();
          setOpen(true);
        }}
        className="contents"
      >
        {trigger}
      </button>

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Edit jar"
        description="Update the name, target, style, or lock settings."
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
                    {name.trim() || jar.name}
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

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting] as const}
            children={([canSubmit, isSubmitting]) => (
              <Button
                block
                size="lg"
                type="submit"
                className="mt-1"
                disabled={!canSubmit || isSubmitting}
                loading={updateJar.isPending}
              >
                Save changes
              </Button>
            )}
          />
        </form>
      </BottomSheet>
    </>
  );
}
