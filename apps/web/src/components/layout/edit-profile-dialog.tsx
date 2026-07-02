import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { authNameFieldSchema } from "@/api/http/v1/auth/auth.types";
import { useUpdateProfile } from "@/api/http/v1/auth/auth.hooks";
import type { User } from "@app/shared";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  UserAvatar,
} from "@/components/ui";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
}

export function EditProfileDialog({ open, onOpenChange, user }: EditProfileDialogProps) {
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const currentName = user?.name?.trim() ?? "";
  const unchanged = trimmedName === currentName;
  const avatarSeed = user?.email || user?.name;

  useEffect(() => {
    if (open) {
      setName(user?.name ?? "");
      setError(null);
    }
  }, [open, user?.name]);

  function validate(value: string): string | null {
    const result = authNameFieldSchema.safeParse(value);
    return result.success ? null : (result.error.issues[0]?.message ?? "Enter a valid name");
  }

  async function handleSave() {
    const validationError = validate(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await updateProfile.mutateAsync({ name: trimmedName });
      toast.success("Profile updated");
      onOpenChange(false);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Couldn't update profile. Try again.";
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-bold tracking-[-0.01em]">Edit profile</DialogTitle>
          <DialogDescription>Update how your name appears across Talli.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-[14px] border border-hairline bg-inset/40 p-3.5">
          <UserAvatar seed={avatarSeed} size={44} />
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold text-foreground">
              {user?.name?.trim() || "Talli user"}
            </div>
            <div className="truncate text-[12px] text-content-faint">{user?.email}</div>
          </div>
        </div>

        <Field label="Name" hint={error}>
          <Input
            autoFocus
            placeholder="Ada Obi"
            invalid={!!error}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError(validate(event.target.value));
            }}
            onBlur={() => setError(validate(name))}
          />
        </Field>

        <Field label="Email">
          <Input value={user?.email ?? ""} disabled className="text-content-faint" />
        </Field>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={updateProfile.isPending}>
            Cancel
          </Button>
          <Button
            loading={updateProfile.isPending}
            disabled={unchanged || !!validate(name)}
            onClick={handleSave}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
