import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  BottomSheet,
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  BankIcon,
  Clock01Icon,
  MoneySend01Icon,
  Search01Icon,
} from "@benrobo/iconary/core/duotone-rounded";
import { Cancel01Icon, Tick02Icon } from "@benrobo/iconary/core/solid-rounded";
import { formatNaira } from "@/lib/format";
import { AmountOdometer } from "@/components/ui/amount-odometer";
import { AmountNumpad } from "@/components/ui/amount-numpad";
import { useBanks, useLookupAccount } from "@/api/http/v1/transfers/transfers.hooks";
import type { Bank } from "@/api/http/v1/transfers/transfers.types";

export type WithdrawStatus = "sent" | "pending" | "failed";

export interface WithdrawResult {
  status: WithdrawStatus;
  amount: number;
  accountName: string;
  bankName: string;
}

type View = "amount" | "destination" | "result";

export function WithdrawToBankSheet({
  open,
  onOpenChange,
  title,
  available,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  available: number;
  submitting: boolean;
  onSubmit: (input: {
    amount: number;
    accountNumber: string;
    bankName: string;
  }) => Promise<WithdrawResult>;
}) {
  const [view, setView] = useState<View>("amount");
  const [amountInput, setAmountInput] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bank, setBank] = useState<Bank | null>(null);
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WithdrawResult | null>(null);

  const lookup = useLookupAccount();
  const amount = Number(amountInput || "0");

  useEffect(() => {
    if (!open) {
      setView("amount");
      setAmountInput("");
      setAccountNumber("");
      setBank(null);
      setResolvedName(null);
      setError(null);
      setResult(null);
    }
  }, [open]);

  useEffect(() => {
    setResolvedName(null);
    setError(null);
    if (accountNumber.length !== 10 || !bank) return;

    let active = true;
    lookup
      .mutateAsync({ accountNumber, bankName: bank.name })
      .then((res) => {
        if (active) setResolvedName(res.data.accountName);
      })
      .catch(() => {
        if (active) setError("Couldn't verify that account. Check the number and bank.");
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountNumber, bank]);

  const amountValid = amount > 0 && amount <= available;
  const canSubmit = amountValid && !!bank && !!resolvedName;

  async function submit() {
    if (!bank || !resolvedName) return;
    setError(null);
    try {
      const res = await onSubmit({ amount, accountNumber, bankName: bank.name });
      setResult(res);
      setView("result");
    } catch {
      setError("Couldn't process the withdrawal. Try again.");
    }
  }

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title} className="max-w-[440px] pb-7">
      <AnimatePresence mode="wait" initial={false}>
        {view === "amount" ? (
          <motion.div
            key="amount"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="pt-1"
          >
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="text-[12.5px] font-medium text-content-muted">{title}</div>
              <AmountOdometer value={amount} muted={amount === 0} className="mt-2 text-[44px]" />
              <p
                className={cn(
                  "mt-2 text-[12px]",
                  amount > available ? "font-medium text-rose-deep" : "text-content-faint"
                )}
              >
                {amount > available
                  ? `Max ${formatNaira(available)}`
                  : `Available ${formatNaira(available)}`}
              </p>
            </div>

            <AmountNumpad value={amountInput} onChange={setAmountInput} max={available} />

            <Button
              block
              size="lg"
              className="mt-5"
              disabled={!amountValid}
              trailingIcon={<Icon icon={ArrowRight01Icon} size={17} />}
              onClick={() => setView("destination")}
            >
              Continue
            </Button>
          </motion.div>
        ) : view === "destination" ? (
          <motion.div
            key="destination"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="pt-1"
          >
            <button
              type="button"
              onClick={() => setView("amount")}
              className="t-press mb-4 inline-flex items-center gap-1.5 rounded-full bg-inset/70 px-3 py-1.5 text-[12.5px] font-semibold text-foreground hover:bg-inset"
            >
              <Icon icon={ArrowLeft01Icon} size={14} />
              {formatNaira(amount)}
            </button>

            <div className="mb-5 flex flex-col items-center text-center">
              <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-iris-soft text-iris-deep">
                <Icon icon={MoneySend01Icon} size={23} />
              </span>
              <div className="font-display text-[18px] font-bold tracking-[-0.02em]">Where to?</div>
              <p className="mt-1 text-[12.5px] text-content-muted">Pick the bank and account.</p>
            </div>

            <div className="mb-3">
              <span className="mb-1.5 block text-[12.5px] font-medium text-content-muted">Bank</span>
              <BankPicker selected={bank} onSelect={setBank} />
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-medium text-content-muted">Account number</span>
              <Input
                inputMode="numeric"
                maxLength={10}
                placeholder="0123456789"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
              />
            </label>

            <div className="mt-3 min-h-[46px]">
              <AnimatePresence mode="wait">
                {lookup.isPending ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 rounded-[12px] border border-hairline bg-inset/60 px-3.5 py-2.5 text-[12.5px] text-content-muted"
                  >
                    <span className="size-3.5 animate-spin rounded-full border-2 border-hairline border-t-iris" />
                    Checking account…
                  </motion.div>
                ) : resolvedName ? (
                  <motion.div
                    key="name"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 rounded-[12px] bg-emerald-soft px-3.5 py-2.5 text-[13px] font-semibold text-emerald-deep"
                  >
                    <Icon icon={BankIcon} size={16} />
                    {resolvedName}
                  </motion.div>
                ) : error ? (
                  <motion.p
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-1 text-[12.5px] text-rose-deep"
                  >
                    {error}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>

            <Button
              block
              size="lg"
              className="mt-3"
              loading={submitting}
              disabled={!canSubmit}
              leadingIcon={<Icon icon={MoneySend01Icon} size={17} />}
              onClick={submit}
            >
              {`Withdraw ${formatNaira(amount)}`}
            </Button>
          </motion.div>
        ) : (
          <ResultView result={result!} onDone={() => onOpenChange(false)} />
        )}
      </AnimatePresence>
    </BottomSheet>
  );
}

const BANK_PAGE_SIZE = 20;

function BankPicker({ selected, onSelect }: { selected: Bank | null; onSelect: (bank: Bank) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(id);
  }, [query]);

  const { data, isLoading } = useBanks(debounced ? { q: debounced } : undefined);
  const banks = data?.data ?? [];
  // Only mount a slice — the full list (200+ banks with logos) is what lags. Searching
  // narrows it server-side, so the rendered set stays small.
  const shown = debounced ? banks : banks.slice(0, BANK_PAGE_SIZE);
  const hiddenCount = debounced ? 0 : Math.max(0, banks.length - shown.length);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="t-press flex h-11 w-full items-center gap-2.5 rounded-xl border border-hairline bg-card px-3.5 text-left text-[14px] transition-colors hover:bg-inset"
        >
          {selected ? (
            <>
              <BankLogo bank={selected} />
              <span className="flex-1 truncate font-medium text-foreground">{selected.name}</span>
            </>
          ) : (
            <span className="flex-1 text-content-faint">Select bank</span>
          )}
          <Icon icon={ArrowDown01Icon} size={16} className="text-content-faint" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
        <div className="flex items-center gap-2 border-b border-hairline-soft px-3 py-2">
          <Icon icon={Search01Icon} size={15} className="text-content-faint" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search banks"
            className="flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-content-faint"
          />
        </div>
        <div className="max-h-[260px] overflow-y-auto p-1.5">
          {isLoading ? (
            <div className="px-3 py-6 text-center text-[12.5px] text-content-muted">Loading banks…</div>
          ) : shown.length === 0 ? (
            <div className="px-3 py-6 text-center text-[12.5px] text-content-muted">No banks found</div>
          ) : (
            shown.map((bank) => (
              <button
                key={bank.code}
                type="button"
                onClick={() => {
                  onSelect(bank);
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[13.5px] transition-colors hover:bg-inset",
                  selected?.code === bank.code && "bg-iris-soft"
                )}
              >
                <BankLogo bank={bank} />
                <span className="flex-1 truncate font-medium text-foreground">{bank.name}</span>
                {selected?.code === bank.code ? (
                  <Icon icon={Tick02Icon} size={15} className="text-iris-deep" />
                ) : null}
              </button>
            ))
          )}
          {hiddenCount > 0 ? (
            <div className="px-3 py-2 text-center text-[11.5px] text-content-faint">
              Search to see {hiddenCount} more
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function BankLogo({ bank }: { bank: Bank }) {
  if (bank.logo) {
    return <img src={bank.logo} alt="" className="size-7 shrink-0 rounded-[7px] object-cover" />;
  }
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-iris-soft text-iris-deep">
      <Icon icon={BankIcon} size={15} />
    </span>
  );
}

function ResultView({ result, onDone }: { result: WithdrawResult; onDone: () => void }) {
  const meta = RESULT_META[result.status];
  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center py-6 text-center"
    >
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className={cn("mb-5 flex size-16 items-center justify-center rounded-full text-white", meta.bg)}
      >
        <Icon icon={meta.icon} size={30} />
      </motion.span>
      <div className="font-display text-[20px] font-bold tracking-[-0.02em]">{meta.title}</div>
      <p className="mt-1.5 max-w-[300px] text-[13px] text-content-muted">{meta.line(result)}</p>
      <Button block size="lg" className="mt-6" onClick={onDone}>
        Done
      </Button>
    </motion.div>
  );
}

const RESULT_META: Record<
  WithdrawStatus,
  { icon: typeof Tick02Icon; bg: string; title: string; line: (r: WithdrawResult) => string }
> = {
  sent: {
    icon: Tick02Icon,
    bg: "bg-emerald",
    title: "Withdrawal sent",
    line: (r) => `${formatNaira(r.amount)} is on its way to ${r.accountName}.`,
  },
  pending: {
    icon: Clock01Icon,
    bg: "bg-amber",
    title: "Withdrawal processing",
    line: (r) => `${formatNaira(r.amount)} to ${r.accountName} is processing — we'll update it once the bank confirms.`,
  },
  failed: {
    icon: Cancel01Icon,
    bg: "bg-rose",
    title: "Withdrawal failed",
    line: (r) => `We couldn't send ${formatNaira(r.amount)}. Your balance wasn't touched.`,
  },
};
