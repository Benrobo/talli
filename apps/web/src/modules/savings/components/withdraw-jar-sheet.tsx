import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BottomSheet, Button, Input } from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import { MoneyReceive01Icon } from "@benrobo/iconary/core/duotone-rounded";
import { Tick02Icon } from "@benrobo/iconary/core/solid-rounded";
import { formatNaira } from "@/lib/format";
import { useWithdrawSavings } from "@/api/http/v1/savings/savings.hooks";

type View = "amount" | "done";

export function WithdrawJarSheet({
  open,
  onOpenChange,
  jarId,
  jarName,
  available,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jarId: string;
  jarName: string;
  available: number;
}) {
  const [view, setView] = useState<View>("amount");
  const [amountInput, setAmountInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const withdraw = useWithdrawSavings(jarId);
  const amount = Number(amountInput);

  useEffect(() => {
    if (!open) {
      setView("amount");
      setAmountInput("");
      setError(null);
    }
  }, [open]);

  async function submit() {
    if (!amount || amount <= 0) return setError("Enter an amount greater than zero");
    if (amount > available) return setError(`This jar only has ${formatNaira(available)}.`);
    setError(null);
    try {
      await withdraw.mutateAsync({ amount });
      setView("done");
    } catch {
      setError("Couldn't move the money. Try again.");
    }
  }

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={`Withdraw from ${jarName}`} className="max-w-[440px] pb-7">
      <AnimatePresence mode="wait" initial={false}>
        {view === "amount" ? (
          <motion.div
            key="amount"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="pt-2"
          >
            <div className="mb-5 flex flex-col items-center text-center">
              <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-iris-soft text-iris-deep">
                <Icon icon={MoneyReceive01Icon} size={23} />
              </span>
              <div className="font-display text-[18px] font-bold tracking-[-0.02em]">Move to wallet</div>
              <p className="mt-1 text-[12.5px] text-content-muted">
                Available in {jarName}: <span className="font-semibold text-foreground">{formatNaira(available)}</span>
              </p>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-medium text-content-muted">Amount</span>
              <Input
                autoFocus
                inputMode="numeric"
                placeholder="₦0"
                value={amountInput}
                invalid={!!error}
                onChange={(e) => setAmountInput(e.target.value.replace(/[^\d]/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </label>
            {error ? <p className="mt-2 text-[12.5px] text-rose-deep">{error}</p> : null}

            <Button
              block
              size="lg"
              className="mt-5"
              loading={withdraw.isPending}
              disabled={!amountInput}
              leadingIcon={<Icon icon={MoneyReceive01Icon} size={17} />}
              onClick={submit}
            >
              {amount > 0 ? `Withdraw ${formatNaira(amount)}` : "Enter an amount"}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center py-6 text-center"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="mb-5 flex size-16 items-center justify-center rounded-full bg-emerald text-white"
            >
              <Icon icon={Tick02Icon} size={30} />
            </motion.span>
            <div className="font-display text-[20px] font-bold tracking-[-0.02em]">Moved to wallet</div>
            <p className="mt-1.5 text-[13px] text-content-muted">
              {formatNaira(amount)} from {jarName} is now in your wallet.
            </p>
            <Button block size="lg" className="mt-6" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </BottomSheet>
  );
}
