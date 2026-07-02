import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@app/ui";
import { BottomSheet, Button, Input } from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import {
  BankIcon,
  Copy01Icon,
  MoneyReceive01Icon,
  MoneySavingJarIcon,
} from "@benrobo/iconary/core/duotone-rounded";
import {
  Tick02Icon,
  Timer02Icon,
} from "@benrobo/iconary/core/solid-rounded";
import { formatNaira } from "@/lib/format";
import { useCopy } from "@/modules/payments/hooks/use-copy";
import {
  useCancelSavingsDeposit,
  useDepositToSavingsJar,
  useVerifySavingsDeposit,
} from "@/api/http/v1/savings/savings.hooks";
import type { SavingsDepositIntent } from "@/api/http/v1/savings/savings.types";

type View = "amount" | "details" | "done";

const VERIFY_INTERVAL_MS = 5000;

export function AddMoneySheet({
  open,
  onOpenChange,
  jarId,
  jarName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jarId: string;
  jarName: string;
}) {
  const [view, setView] = useState<View>("amount");
  const [amountInput, setAmountInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<SavingsDepositIntent | null>(null);

  const { copied, copy } = useCopy();
  const deposit = useDepositToSavingsJar(jarId);
  const verify = useVerifySavingsDeposit(jarId);
  const cancel = useCancelSavingsDeposit(jarId);

  const intentRef = useRef<SavingsDepositIntent | null>(null);
  const viewRef = useRef<View>("amount");
  intentRef.current = intent;
  viewRef.current = view;

  useEffect(() => {
    if (!open) {
      setView("amount");
      setAmountInput("");
      setError(null);
      setIntent(null);
    }
  }, [open]);

  useEffect(() => {
    if (view !== "details" || !intent) return;
    let active = true;
    const id = setInterval(() => {
      verify.mutate(intent.pendingPaymentId, {
        onSuccess: (res) => {
          if (active && res.data.status === "completed") setView("done");
        },
      });
    }, VERIFY_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, intent?.pendingPaymentId]);

  function handleOpenChange(next: boolean) {
    if (!next && viewRef.current === "details" && intentRef.current) {
      cancel.mutate(intentRef.current.pendingPaymentId);
    }
    onOpenChange(next);
  }

  function startFunding() {
    const numeric = Number(amountInput);
    if (!numeric || Number.isNaN(numeric) || numeric <= 0) {
      setError("Enter an amount greater than zero");
      return;
    }
    setError(null);
    deposit.mutate(
      { amount: numeric },
      {
        onSuccess: (res) => {
          setIntent(res.data);
          setView("details");
        },
        onError: () => setError("Couldn't start this deposit. Try again."),
      }
    );
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={`Add money to ${jarName}`}
      className="max-w-[440px] pb-7"
    >
      <AnimatePresence mode="wait" initial={false}>
        {view === "amount" ? (
          <motion.div
            key="amount"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="pt-2"
          >
            <div className="mb-6 flex flex-col items-center text-center">
              <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-iris-soft text-iris-deep">
                <Icon icon={MoneySavingJarIcon} size={24} />
              </span>
              <div className="font-display text-[19px] font-bold tracking-[-0.02em]">
                Add to {jarName}
              </div>
              <p className="mt-1 text-[13px] text-content-muted">
                How much are you adding to this jar?
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
                onChange={(event) => setAmountInput(event.target.value.replace(/[^\d]/g, ""))}
                onKeyDown={(event) => event.key === "Enter" && startFunding()}
              />
            </label>
            {error ? <p className="mt-2 text-[12.5px] text-rose-deep">{error}</p> : null}

            <Button
              block
              size="lg"
              className="mt-5"
              loading={deposit.isPending}
              disabled={!amountInput}
              leadingIcon={<Icon icon={MoneyReceive01Icon} size={17} />}
              onClick={startFunding}
            >
              {amountInput ? `Add ${formatNaira(Number(amountInput))}` : "Enter an amount"}
            </Button>
          </motion.div>
        ) : null}

        {view === "details" && intent ? (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="pt-2"
          >
            <div className="mb-5 flex flex-col items-center text-center">
              <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-iris-soft text-iris-deep">
                <Icon icon={BankIcon} size={23} />
              </span>
              <div className="text-[12.5px] text-content-muted">Transfer exactly</div>
              <div className="font-display tabular text-[30px] font-extrabold leading-tight tracking-[-0.03em]">
                {formatNaira(intent.amount)}
              </div>
              <p className="mt-1 max-w-[300px] text-[12.5px] text-content-muted">
                Send from any bank app to the account below. It lands in {jarName} automatically.
              </p>
            </div>

            <div className="rounded-[16px] border border-hairline bg-inset/60 p-4">
              <DetailRow label="Bank" value={intent.bankName} />
              <div className="my-3 h-px bg-hairline-soft" />
              <button
                type="button"
                onClick={() => copy(intent.virtualAccountNumber)}
                className="flex w-full items-center justify-between text-left"
              >
                <span>
                  <span className="block text-[11px] uppercase tracking-wide text-content-faint">
                    Account number
                  </span>
                  <span className="tabular text-[22px] font-bold tracking-tight text-foreground">
                    {intent.virtualAccountNumber}
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
              <DetailRow label="Account name" value={intent.accountName} />
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 rounded-[12px] bg-amber-soft px-3 py-2.5 text-[12px] font-medium text-amber-deep">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2.4, ease: "linear" }}
                className="flex"
              >
                <Icon icon={Timer02Icon} size={15} />
              </motion.span>
              Waiting for your transfer — this updates on its own.
            </div>
          </motion.div>
        ) : null}

        {view === "done" && intent ? (
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
              <Icon icon={Tick02Icon} size={32} />
            </motion.span>
            <div className="font-display text-[20px] font-bold tracking-[-0.02em]">Money added</div>
            <p className="mt-1.5 text-[13px] text-content-muted">
              {formatNaira(intent.amount)} landed in {jarName}.
            </p>
            <Button block size="lg" className="mt-6" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </BottomSheet>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-content-muted">{label}</span>
      <span className="text-[13.5px] font-semibold text-foreground">{value}</span>
    </div>
  );
}
