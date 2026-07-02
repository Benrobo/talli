import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { BottomSheet, Button } from "@/components/ui";
import { AmountOdometer } from "@/components/ui/amount-odometer";
import { AmountNumpad } from "@/components/ui/amount-numpad";
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
  const amount = Number(amountInput || "0");
  const amountValid = amount > 0 && amount <= available;

  useEffect(() => {
    if (!open) {
      setView("amount");
      setAmountInput("");
      setError(null);
    }
  }, [open]);

  async function submit() {
    if (!amountValid) return;
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
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="text-[12.5px] font-medium text-content-muted">Move to wallet</div>
              <AmountOdometer value={amount} muted={amount === 0} className="mt-2 text-[44px]" />
              <p
                className={cn(
                  "mt-2 text-[12px]",
                  amount > available ? "font-medium text-rose-deep" : "text-content-faint"
                )}
              >
                {amount > available ? `Max ${formatNaira(available)}` : `Available in ${jarName} · ${formatNaira(available)}`}
              </p>
            </div>

            <AmountNumpad value={amountInput} onChange={setAmountInput} max={available} />
            {error ? <p className="mt-2 text-center text-[12.5px] text-rose-deep">{error}</p> : null}

            <Button
              block
              size="lg"
              className="mt-5"
              loading={withdraw.isPending}
              disabled={!amountValid}
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
