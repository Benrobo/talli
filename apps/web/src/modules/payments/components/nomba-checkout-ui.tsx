import { motion } from "motion/react";
import { cn } from "@app/ui";
import { Button, Card, Spotlight } from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import {
  BankIcon,
  Clock01Icon,
  Copy01Icon,
  Download01Icon,
  LockIcon,
  Tick02Icon,
} from "@benrobo/iconary/core/duotone-rounded";
import { formatNaira } from "@/lib/format";

export interface NombaCheckoutDetails {
  amount: number;
  flashAccountNumber: string;
  flashBankName: string;
  flashAccountName?: string;
  checkoutUrl: string;
}

export function CheckoutSecureFooter({ note }: { note: string }) {
  return (
    <div className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-content-faint">
      <Icon icon={LockIcon} size={12} />
      {note}
    </div>
  );
}

export function NombaPayTransferContent({
  transferLabel,
  title,
  checkout,
  copied,
  onCopy,
}: {
  transferLabel: string;
  title: string;
  checkout: NombaCheckoutDetails;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <>
      <Spotlight className="mb-6 p-6 text-center">
        <div className="mb-1.5 text-[13px] text-white/70">{transferLabel}</div>
        <div className="tabular text-[42px] font-extrabold leading-none tracking-[-0.03em]">
          {formatNaira(checkout.amount)}
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
          <button type="button" onClick={onCopy} className="flex w-full items-center justify-between">
            <span className="tabular text-[30px] font-bold tracking-tight">{checkout.flashAccountNumber}</span>
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
    </>
  );
}

export function NombaPayTransferActions({
  checkoutUrl,
  onPaid,
}: {
  checkoutUrl: string;
  onPaid: () => void;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <a href={checkoutUrl} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-iris-deep">
        Select another payment method →
      </a>
      <button type="button" onClick={onPaid} className="text-[12px] text-content-faint">
        I've sent the transfer
      </button>
    </div>
  );
}

export function NombaPayDoneContent({
  headline,
  description,
  backLabel,
  onBack,
}: {
  headline: string;
  description: string;
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="mb-6 flex size-20 items-center justify-center rounded-full bg-emerald-soft text-emerald-deep shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_12px_28px_-8px_rgba(47,163,107,0.5)]"
      >
        <Icon icon={Tick02Icon} size={40} strokeWidth={2.5} />
      </motion.span>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="text-[26px] font-extrabold leading-tight tracking-[-0.03em]">{headline}</div>
        <p className="mt-2 text-[14px] text-content-muted">{description}</p>
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
          {backLabel}
        </Button>
      </motion.div>
    </div>
  );
}
