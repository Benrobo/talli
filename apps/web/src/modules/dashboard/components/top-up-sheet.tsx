import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@app/ui";
import { BottomSheet, Button, Input } from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import {
  BankIcon,
  Copy01Icon,
  WalletAdd01Icon,
} from "@benrobo/iconary/core/duotone-rounded";
import {
  Tick02Icon,
  Timer02Icon,
} from "@benrobo/iconary/core/solid-rounded";
import { formatNaira } from "@/lib/format";
import { useCopy } from "@/modules/payments/hooks/use-copy";
import { useStartTopUp } from "@/api/http/v1/wallet/wallet.hooks";
import type { TopUpData } from "@/api/http/v1/wallet/wallet.types";

type View = "amount" | "details";

export function TopUpSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [view, setView] = useState<View>("amount");
  const [amountInput, setAmountInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<TopUpData | null>(null);

  const { copied, copy } = useCopy();
  const startTopUp = useStartTopUp();

  useEffect(() => {
    if (!open) {
      setView("amount");
      setAmountInput("");
      setError(null);
      setDetails(null);
    }
  }, [open]);

  function start() {
    const numeric = Number(amountInput);
    if (!numeric || Number.isNaN(numeric) || numeric <= 0) {
      setError("Enter an amount greater than zero");
      return;
    }
    setError(null);
    startTopUp.mutate(
      { amount: numeric },
      {
        onSuccess: (res) => {
          setDetails(res.data);
          setView("details");
        },
        onError: () => setError("Couldn't start top up. Try again."),
      }
    );
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Top up wallet"
      description="Add money to your Talli wallet by bank transfer."
      className="max-w-[440px] pb-7"
    >
      <AnimatePresence mode="wait" initial={false}>
        {view === "amount" ? (
          <motion.div
            key="amount"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="pt-1"
          >
            <div className="mb-6 flex flex-col items-center text-center">
              <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-iris-soft text-iris-deep">
                <Icon icon={WalletAdd01Icon} size={24} />
              </span>
              <div className="font-display text-[19px] font-bold tracking-[-0.02em]">Top up wallet</div>
              <p className="mt-1 text-[13px] text-content-muted">How much do you want to add?</p>
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
                onKeyDown={(e) => e.key === "Enter" && start()}
              />
            </label>
            {error ? <p className="mt-2 text-[12.5px] text-rose-deep">{error}</p> : null}

            <Button
              block
              size="lg"
              className="mt-5"
              loading={startTopUp.isPending}
              disabled={!amountInput}
              onClick={start}
            >
              {amountInput ? `Add ${formatNaira(Number(amountInput))}` : "Enter an amount"}
            </Button>
          </motion.div>
        ) : null}

        {view === "details" && details ? (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="pt-1"
          >
            <div className="mb-5 flex flex-col items-center text-center">
              <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-iris-soft text-iris-deep">
                <Icon icon={BankIcon} size={23} />
              </span>
              <div className="text-[12.5px] text-content-muted">Transfer exactly</div>
              <div className="font-display tabular text-[30px] font-extrabold leading-tight tracking-[-0.03em]">
                {formatNaira(details.amount)}
              </div>
              <p className="mt-1 max-w-[300px] text-[12.5px] text-content-muted">
                Send from any bank app to the account below. Your wallet credits automatically.
              </p>
            </div>

            <div className="rounded-[16px] border border-hairline bg-inset/60 p-4">
              <Row label="Bank" value={details.flashBankName} />
              <div className="my-3 h-px bg-hairline-soft" />
              <button
                type="button"
                onClick={() => copy(details.flashAccountNumber)}
                className="flex w-full items-center justify-between text-left"
              >
                <span>
                  <span className="block text-[11px] uppercase tracking-wide text-content-faint">
                    Account number
                  </span>
                  <span className="tabular text-[22px] font-bold tracking-tight text-foreground">
                    {details.flashAccountNumber}
                  </span>
                </span>
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-[10px] transition-colors",
                    copied ? "bg-emerald-soft text-emerald-deep" : "bg-iris-soft text-iris-deep"
                  )}
                >
                  <Icon icon={copied ? Tick02Icon : Copy01Icon} size={16} />
                </span>
              </button>
              <div className="my-3 h-px bg-hairline-soft" />
              <Row label="Account name" value={details.flashAccountName} />
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 rounded-[12px] bg-amber-soft px-3 py-2.5 text-[12px] font-medium text-amber-deep">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2.4, ease: "linear" }}
                className="flex"
              >
                <Icon icon={Timer02Icon} size={15} />
              </motion.span>
              Waiting for your transfer — your balance updates on its own.
            </div>

            <Button block variant="secondary" size="lg" className="mt-4" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </BottomSheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-content-muted">{label}</span>
      <span className="text-[13.5px] font-semibold text-foreground">{value}</span>
    </div>
  );
}
