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
} from "@/components/ui";
import { cn } from "@/lib/utils";

type Mode = "per_person" | "open";

interface NewCollectionDialogProps {
  trigger: ReactNode;
}

export function NewCollectionDialog({ trigger }: NewCollectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode>("per_person");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");

  const reset = () => {
    setTitle("");
    setMode("per_person");
    setAmount("");
    setDue("");
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
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-bold tracking-[-0.01em]">New collection</DialogTitle>
          <DialogDescription>Gather money from a group — dues, a shared bill, contributions.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium text-content-muted">What's it for?</span>
            <Input autoFocus placeholder="e.g. Saturday football pitch" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <div>
            <span className="mb-1.5 block text-[12.5px] font-medium text-content-muted">How does it work?</span>
            <div className="grid grid-cols-2 gap-2.5">
              <ModeCard
                active={mode === "per_person"}
                onClick={() => setMode("per_person")}
                title="Per person"
                sub="Everyone pays the same"
              />
              <ModeCard
                active={mode === "open"}
                onClick={() => setMode("open")}
                title="Open pot"
                sub="Any amount, up to a goal"
              />
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium text-content-muted">
              {mode === "per_person" ? "Amount per person" : "Target amount"}
            </span>
            <Input
              inputMode="numeric"
              placeholder="₦0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium text-content-muted">Due date (optional)</span>
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!title.trim() || !amount} onClick={() => setOpen(false)}>
            Create collection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModeCard({
  active,
  onClick,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3 text-left transition-colors",
        active ? "border-iris bg-iris-soft" : "border-hairline hover:bg-inset"
      )}
    >
      <div className="text-[13.5px] font-semibold">{title}</div>
      <div className="text-[11.5px] text-content-muted">{sub}</div>
    </button>
  );
}
