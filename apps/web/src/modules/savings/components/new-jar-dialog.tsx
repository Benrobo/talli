import { useState, type ReactNode } from "react";
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

interface NewJarDialogProps {
  trigger: ReactNode;
}

export function NewJarDialog({ trigger }: NewJarDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [locked, setLocked] = useState(false);
  const [unlockDate, setUnlockDate] = useState("");

  const reset = () => {
    setName("");
    setTarget("");
    setLocked(false);
    setUnlockDate("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-bold tracking-[-0.01em]">New savings jar</DialogTitle>
          <DialogDescription>Set money aside — lock it until a date or keep it flexible.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium text-content-muted">Jar name</span>
            <Input autoFocus placeholder="e.g. Rent, Laptop, Emergency" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium text-content-muted">Target amount</span>
            <Input
              inputMode="numeric"
              placeholder="₦0"
              value={target}
              onChange={(e) => setTarget(e.target.value.replace(/[^\d]/g, ""))}
            />
          </label>

          <div className="flex items-center justify-between rounded-xl border border-hairline bg-muted/30 px-4 py-3">
            <div>
              <div className="text-[13.5px] font-medium">Lock this jar</div>
              <div className="text-[12px] text-content-muted">Can't withdraw until the unlock date</div>
            </div>
            <Switch checked={locked} onCheckedChange={setLocked} />
          </div>

          {locked ? (
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-medium text-content-muted">Unlock date</span>
              <Input type="date" value={unlockDate} onChange={(e) => setUnlockDate(e.target.value)} />
            </label>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!name.trim() || !target} onClick={() => setOpen(false)}>
            Create jar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
