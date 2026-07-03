import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { BottomSheet, Button } from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import { Copy01Icon, Download01Icon} from "@benrobo/iconary/core/duotone-rounded";
import { Tick02Icon, Tick04Icon } from "@benrobo/iconary/core/solid-rounded";
import { cn, copyToClipboard } from "@/lib/utils";
import { formatNaira, formatTxDate } from "@/lib/format";
import { RECEIPTS_API } from "@/api/http/v1/receipts/receipts.api";
import type { TransactionRecord } from "@/api/http/v1/transactions/transactions.types";
import {
  kindMeta,
  statusMeta,
  transactionTitle,
  type ChipTone,
  type StatusVariant,
} from "../transaction-meta";
import { Hint } from "@/components/hint";
import { shortenText } from "@/lib/utils";

const KIND_HERO: Record<ChipTone, string> = {
  iris: "bg-iris-soft text-iris-deep",
  emerald: "bg-emerald-soft text-emerald-deep",
  amber: "bg-amber-soft text-amber-deep",
  rose: "bg-rose-soft text-rose-deep",
  neutral: "grad-chip border border-hairline text-content-muted",
};

const STATUS_BADGE: Record<StatusVariant, string> = {
  success: "bg-emerald text-white",
  pending: "bg-amber text-white",
  danger: "bg-rose text-white",
  neutral: "bg-content-faint text-white",
};

export function ReceiptSheet({
  transaction,
  open,
  onOpenChange,
}: {
  transaction: TransactionRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [referenceCopied, setReferenceCopied] = useState(false);

  useEffect(() => {
    if (referenceCopied) {
      setTimeout(() => {
        setReferenceCopied(false);
      }, 1000);
    }
  }, [referenceCopied]);

  async function downloadReceipt() {
    if (!transaction) return;
    setDownloading(true);
    try {
      const blob = await RECEIPTS_API.DOWNLOAD({ reference: transaction.reference });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `receipt-${transaction.reference}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  function copyReference() {
    if (!transaction) return;
    copyToClipboard(transaction.reference);
    setReferenceCopied(true);
  }

  if (!transaction) {
    return (
      <BottomSheet open={open} onOpenChange={onOpenChange} title="Receipt" className="max-w-[440px] pb-7">
        <div />
      </BottomSheet>
    );
  }

  const kind = kindMeta(transaction.kind);
  const status = statusMeta(transaction.status);
  const credit = transaction.direction === "credit";

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Receipt"
      description={`Receipt for ${kind.label}`}
      className="max-w-[440px] pb-7"
    >
      <div className="pt-2">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative mb-4"
          >
            <span
              className={cn(
                "flex size-[68px] items-center justify-center rounded-[22px]",
                KIND_HERO[kind.tone]
              )}
            >
              <Icon icon={kind.icon} size={32} />
            </span>
            <span
              className={cn(
                "absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full ring-4 ring-card",
                STATUS_BADGE[status.variant]
              )}
            >
              <Icon icon={status.icon} size={15} />
            </span>
          </motion.div>

          <div className="text-[13px] font-medium text-content-muted">{transactionTitle(transaction)}</div>
          <div className="tabular font-display text-[34px] font-extrabold leading-none tracking-[-0.03em]">
            {credit ? "+" : "−"}
            {formatNaira(transaction.amount)}
          </div>
          <div
            className={cn(
              "mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold",
              status.variant === "success" && "bg-emerald-soft text-emerald-deep",
              status.variant === "pending" && "bg-amber-soft text-amber-deep",
              status.variant === "danger" && "bg-rose-soft text-rose-deep",
              status.variant === "neutral" && "bg-inset text-content-muted"
            )}
          >
            <Icon icon={status.icon} size={13} />
            {status.label}
          </div>
        </div>

        <div className="mt-6 rounded-[16px] border border-hairline bg-inset/60 p-4">
          <DetailRow label="Type" value={kind.label} />
          {transaction.recipient ? (
            <>
              <div className="my-3 h-px bg-hairline-soft" />
              <DetailRow label="To" value={transaction.recipient.accountName} />
              <div className="my-3 h-px bg-hairline-soft" />
              <DetailRow
                label="Account"
                value={[transaction.recipient.bankName, transaction.recipient.accountNumber]
                  .filter(Boolean)
                  .join(" · ")}
              />
            </>
          ) : null}
          {transaction.narration ? (
            <>
              <div className="my-3 h-px bg-hairline-soft" />
              <DetailRow label="Note" value={transaction.narration} />
            </>
          ) : null}
          <div className="my-3 h-px bg-hairline-soft" />
          <DetailRow label="Date" value={formatTxDate(transaction.createdAt)} />
          <div className="my-3 h-px bg-hairline-soft" />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] text-content-muted">Reference</span>
            <div className="w-auto flex flex-row items-center justify-start gap-2">
              <span className="tabular font-mono text-[12.5px] font-semibold text-foreground">
                {shortenText(transaction.reference)}
              </span>
              <Hint label="Copy reference">
                <Button variant="secondary" size="sm" leadingIcon={
                  referenceCopied ? <Icon icon={Tick04Icon} className="text-emerald-500" strokeWidth={1} size={16} /> : <Icon icon={Copy01Icon} size={16} />
                  } onClick={copyReference} />
              </Hint>
            </div>
          </div>
        </div>

        <Button
          block
          size="lg"
          variant="secondary"
          className="mt-5"
          loading={downloading}
          leadingIcon={<Icon icon={Download01Icon} size={16} />}
          onClick={downloadReceipt}
        >
          Download receipt
        </Button>
      </div>
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
