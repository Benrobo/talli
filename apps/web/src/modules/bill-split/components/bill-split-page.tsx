import { useMemo, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { cn } from "@app/ui";
import { Button, Card, Input, Spotlight } from "@/components/ui";
import { MobileScreen } from "@/components/layout";
import { Icon } from "@benrobo/iconary/react";
import { AlertCircleIcon, ArrowLeft01Icon, BankIcon, Clock01Icon, Copy01Icon, Download01Icon, Invoice01Icon, LockIcon, PlusSignIcon, Tick02Icon, TickDouble02Icon, UserIcon } from "@benrobo/iconary/core/duotone-rounded";
import { CheckmarkCircle02Icon } from "@benrobo/iconary/core/solid-rounded";
import { billSplitApi, type BillItem, type BillCheckoutResult } from "../api";
import { useBillSocket } from "../use-bill-socket";

const naira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

type Stage = "pick" | "pay-name" | "pay" | "done";

export function BillSplitPage() {
  const { token } = useParams({ from: "/bill/$token" });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [payerName, setPayerName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [stage, setStage] = useState<Stage>("pick");
  const [checkout, setCheckout] = useState<BillCheckoutResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [claimed, setClaimed] = useState<Record<string, string>>({});

  const query = useQuery({
    queryKey: ["bill-split", token],
    queryFn: () => billSplitApi.getByToken(token),
  });

  useBillSocket(token, (event) => {
    setClaimed((prev) => {
      const next = { ...prev };
      for (const id of event.itemIds) next[id] = event.payerName;
      return next;
    });
    setSelectedIds((prev) => {
      if (!event.itemIds.some((id) => prev.has(id))) return prev;
      const next = new Set(prev);
      for (const id of event.itemIds) next.delete(id);
      return next;
    });
  });

  const items: BillItem[] = useMemo(() => {
    const base = query.data?.items ?? [];
    return base.map((item) =>
      claimed[item.id]
        ? { ...item, status: "claimed", paidByName: claimed[item.id] }
        : item
    );
  }, [query.data, claimed]);

  const total = useMemo(
    () => items.filter((i) => selectedIds.has(i.id)).reduce((sum, i) => sum + i.unitPrice, 0),
    [items, selectedIds]
  );

  const knownNames = query.data?.knownNames ?? [];

  function toggle(item: BillItem) {
    if (item.status === "claimed") return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(item.id) ? next.delete(item.id) : next.add(item.id);
      return next;
    });
  }

  async function submit(name: string) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await billSplitApi.checkout(token, {
        payerName: name,
        itemIds: [...selectedIds],
      });
      setPayerName(name);
      setCheckout(result);
      setStage("pay");
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Something went wrong. Try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function copyAccount() {
    if (!checkout) return;
    navigator.clipboard.writeText(checkout.flashAccountNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  if (query.isLoading) {
    return (
      <MobileScreen>
        <div className="flex flex-1 items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="size-8 rounded-full border-[3px] border-hairline border-t-iris"
          />
        </div>
      </MobileScreen>
    );
  }

  if (query.isError || !query.data) {
    return (
      <MobileScreen>
        <div className="flex flex-col items-center rounded-[22px] border border-hairline bg-card px-6 py-12 text-center shadow-card">
          <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-soft text-rose-deep">
            <Icon icon={AlertCircleIcon} size={26} />
          </span>
          <div className="font-display text-[21px] font-bold tracking-[-0.02em]">This bill isn't available</div>
          <p className="mt-2 text-[13.5px] text-content-muted">
            The link may have expired or already been closed.
          </p>
        </div>
      </MobileScreen>
    );
  }

  const view = query.data;
  const remaining = items.filter((i) => i.status !== "claimed").length;

  if (stage === "pay" && checkout) {
    return (
      <PayStage
        title={view.title}
        payerName={payerName}
        checkout={checkout}
        copied={copied}
        onCopy={copyAccount}
        onPaid={() => setStage("done")}
      />
    );
  }

  if (stage === "done" && checkout) {
    return (
      <DoneStage
        title={view.title}
        payerName={payerName}
        amount={checkout.amount}
        onBack={() => {
          setCheckout(null);
          setSelectedIds(new Set());
          setStage("pick");
          query.refetch();
        }}
      />
    );
  }

  if (stage === "pay-name") {
    return (
      <MobileScreen>
        <div className="overflow-hidden rounded-[22px] border border-hairline bg-card p-6 shadow-card">
          <NameStep
            knownNames={knownNames}
            value={nameInput}
            onChange={setNameInput}
            onBack={() => setStage("pick")}
            onConfirm={(name) => submit(name)}
            submitting={submitting}
            error={error}
            total={total}
          />
        </div>
      </MobileScreen>
    );
  }

  return (
    <MobileScreen
      footer={
        <motion.div
          initial={false}
          animate={{ opacity: selectedIds.size > 0 ? 1 : 0.55 }}
        >
          <Button block size="lg" onClick={() => setStage("pay-name")} disabled={submitting || selectedIds.size === 0}>
            {selectedIds.size > 0
              ? `Pay ${naira(total)} · ${selectedIds.size} item${selectedIds.size > 1 ? "s" : ""}`
              : "Select your items"}
          </Button>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-content-faint">
            <Icon icon={LockIcon} size={12} />
            Secured by Nomba · pay only for what you had
          </div>
        </motion.div>
      }
    >
      <div className="overflow-hidden rounded-[22px] border border-hairline bg-card shadow-card">
        <SheetHeader title={view.title} remaining={remaining} total={items.length} />
        <div className="flex flex-col gap-2.5 p-4">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              selected={selectedIds.has(item.id)}
              onToggle={() => toggle(item)}
            />
          ))}
        </div>
      </div>
    </MobileScreen>
  );
}

function SheetHeader({ title, remaining, total }: { title: string; remaining: number; total: number }) {
  return (
    <div className="border-b border-hairline-soft p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-content-muted">Split the bill</div>
          <div className="mt-0.5 truncate font-display text-[23px] font-bold leading-tight tracking-[-0.02em] text-foreground">
            {title}
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-iris-soft px-2.5 py-1 text-[11px] font-medium text-iris-deep">
          <Icon icon={TickDouble02Icon} size={12} />
          Tap what you had
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-content-faint">Items</span>
        <span className="text-[11.5px] text-content-faint">
          {remaining} of {total} left
        </span>
      </div>
    </div>
  );
}

function ItemRow({
  item,
  selected,
  onToggle,
}: {
  item: BillItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const claimed = item.status === "claimed";
  return (
    <motion.button
      type="button"
      layout
      initial={false}
      animate={{ opacity: claimed ? 0.75 : 1 }}
      onClick={claimed ? undefined : onToggle}
      disabled={claimed}
      className={cn(
        "flex w-full items-center gap-3 rounded-[14px] border bg-card px-4 py-3 text-left shadow-card transition-colors",
        claimed
          ? "cursor-default border-hairline bg-emerald-soft/40"
          : "t-press cursor-pointer",
        selected && !claimed ? "border-iris ring-[3px] ring-iris-soft" : "border-hairline"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-[14px] font-semibold text-foreground", claimed && "text-content-muted line-through")}>
          {item.label}
        </div>
        {claimed && item.paidByName ? (
          <div className="mt-0.5 flex items-center gap-1 text-[11.5px] font-medium text-emerald-deep">
            <Icon icon={TickDouble02Icon} size={12} />
            Paid by {item.paidByName}
          </div>
        ) : null}
      </div>
      <span className={cn("font-display tabular text-[15px] font-bold tracking-[-0.01em]", claimed ? "text-content-faint" : "text-foreground")}>
        {naira(item.unitPrice)}
      </span>
      {claimed ? (
        <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-emerald text-white">
          <Icon icon={CheckmarkCircle02Icon} size={15} />
        </span>
      ) : selected ? (
        <motion.span
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-iris text-white"
        >
          <Icon icon={Tick02Icon} size={14} strokeWidth={3} />
        </motion.span>
      ) : (
        <span className="size-[22px] shrink-0 rounded-full border-[1.5px] border-hairline" />
      )}
    </motion.button>
  );
}

function NameStep({
  knownNames,
  value,
  onChange,
  onBack,
  onConfirm,
  submitting,
  error,
  total,
}: {
  knownNames: string[];
  value: string;
  onChange: (v: string) => void;
  onBack: () => void;
  onConfirm: (name: string) => void;
  submitting: boolean;
  error: string | null;
  total: number;
}) {
  const [typing, setTyping] = useState(knownNames.length === 0);
  return (
    <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}>
      <div className="mb-8 text-center">
        <div className="mb-1.5 text-[13px] text-content-muted">Paying {naira(total)}</div>
        <div className="text-[24px] font-extrabold leading-tight tracking-[-0.03em]">Who's paying?</div>
      </div>

      {!typing && knownNames.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {knownNames.map((name) => (
            <Card
              key={name}
              onClick={() => onConfirm(name)}
              className="flex cursor-pointer items-center gap-3 p-3.5"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-iris-soft text-iris-deep">
                <Icon icon={UserIcon} size={17} />
              </span>
              <span className="flex-1 text-[14.5px] font-medium">{name}</span>
            </Card>
          ))}
          <button
            onClick={() => setTyping(true)}
            className="mt-1 flex items-center justify-center gap-1.5 text-[13px] font-medium text-iris-deep"
          >
            <Icon icon={PlusSignIcon} size={14} />
            Someone else
          </button>
        </div>
      ) : (
        <div>
          <Input
            autoFocus
            placeholder="Your name"
            value={value}
            invalid={!!error}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && value.trim() && onConfirm(value.trim())}
          />
          {error ? <p className="mt-2 text-[12.5px] text-destructive">{error}</p> : null}
          <Button
            block
            size="lg"
            className="mt-4"
            disabled={!value.trim() || submitting}
            onClick={() => onConfirm(value.trim())}
          >
            {submitting ? "Setting up…" : "Continue"}
          </Button>
          {knownNames.length > 0 ? (
            <button
              onClick={() => setTyping(false)}
              className="mt-3 block w-full text-center text-[13px] text-content-muted"
            >
              Back to list
            </button>
          ) : null}
        </div>
      )}

      <button onClick={onBack} className="mt-6 block w-full text-center text-[13px] text-content-faint">
        ← Change items
      </button>
    </motion.div>
  );
}

function PayStage({
  title,
  payerName,
  checkout,
  copied,
  onCopy,
  onPaid,
}: {
  title: string;
  payerName: string;
  checkout: BillCheckoutResult;
  copied: boolean;
  onCopy: () => void;
  onPaid: () => void;
}) {
  return (
    <MobileScreen
      footer={
        <div className="flex flex-col items-center gap-3">
          <a href={checkout.checkoutUrl} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-iris-deep">
            Select another payment method →
          </a>
          <button onClick={onPaid} className="text-[12px] text-content-faint">
            I've sent the transfer
          </button>
        </div>
      }
    >
      <Spotlight className="mb-6 p-6 text-center">
        <div className="mb-1.5 text-[13px] text-white/70">{payerName}, transfer</div>
        <div className="tabular text-[42px] font-extrabold leading-none tracking-[-0.03em]">
          {naira(checkout.amount)}
        </div>
        <div className="mt-2 text-[13px] text-white/70">for {title}</div>
      </Spotlight>

      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2 text-[12px] font-medium text-content-muted">
            <Icon icon={BankIcon} size={15} />
            {checkout.flashBankName}
          </div>
          <div className="mb-1 text-[11px] uppercase tracking-wide text-content-faint">Account number</div>
          <button onClick={onCopy} className="flex w-full items-center justify-between">
            <span className="tabular text-[30px] font-bold tracking-tight">
              {checkout.flashAccountNumber}
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
          {checkout.flashAccountName ? (
            <div className="mt-3 text-[12.5px] text-content-muted">{checkout.flashAccountName}</div>
          ) : null}
        </Card>
      </motion.div>

      <div className="mt-5 flex items-center justify-center gap-1.5 rounded-[12px] bg-amber-soft px-3 py-2.5 text-[12px] text-amber-deep">
        <Icon icon={Clock01Icon} size={13} />
        Waiting for your transfer — this updates automatically.
      </div>
    </MobileScreen>
  );
}

function DoneStage({
  title,
  payerName,
  amount,
  onBack,
}: {
  title: string;
  payerName: string;
  amount: number;
  onBack: () => void;
}) {
  return (
    <MobileScreen>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="mb-6 flex size-20 items-center justify-center rounded-full bg-emerald-soft text-emerald-deep shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_12px_28px_-8px_rgba(47,163,107,0.5)]"
        >
          <Icon icon={CheckmarkCircle02Icon} size={44} />
        </motion.span>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="text-[26px] font-extrabold leading-tight tracking-[-0.03em]">You're all set, {payerName}!</div>
          <p className="mt-2 text-[14px] text-content-muted">
            {naira(amount)} paid for {title}. Your items are now marked as yours.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 w-full"
        >
          <div className="mb-4 flex items-center justify-center gap-1.5 rounded-[12px] bg-emerald-soft px-3 py-2.5 text-[12.5px] text-emerald-deep">
            <Icon icon={Download01Icon} size={13} />
            Your receipt is on its way.
          </div>
          <Button block variant="secondary" size="lg" onClick={onBack}>
            Back to the bill
          </Button>
        </motion.div>
      </div>
    </MobileScreen>
  );
}
