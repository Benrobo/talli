import { Link } from "@tanstack/react-router";
import { cn } from "@app/ui";
import { Button, Card, Spotlight } from "@/components/ui";
import { MobileScreen } from "@/components/layout";
import { Icon } from "@benrobo/iconary/react";
import { Download01Icon, Tick02Icon } from "@benrobo/iconary/core/duotone-rounded";
import { formatNaira } from "@/lib/format";
import { paymentReceipt } from "@/data/mock/payments";

export function PaymentReceiptPage() {
  const { reference, amountMinor, purpose, from, to, dateLabel } = paymentReceipt;

  return (
    <MobileScreen
      footer={
        <div className="flex flex-col gap-3">
          <Link to="/app/home">
            <Button block size="lg">
              Back to chat
            </Button>
          </Link>
          <Button
            block
            variant="secondary"
            leadingIcon={<Icon icon={Download01Icon} size={16} />}
          >
            Download receipt
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center pt-6 text-center">
        <span className="mb-6 flex size-[74px] items-center justify-center rounded-full bg-emerald-soft text-emerald-deep shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_10px_24px_-8px_rgba(47,163,107,0.5)]">
          <Icon icon={Tick02Icon} size={34} />
        </span>
        <h1 className="mb-2 text-[28px] font-extrabold leading-none tracking-[-0.03em]">
          Payment confirmed
        </h1>
        <p className="mb-7 text-[14px] text-content-muted">Your group already knows you paid.</p>
      </div>

      <Spotlight className="mb-4 p-5 text-center">
        <div className="mb-1.5 text-[12px] text-white/70">Amount paid</div>
        <div className="tabular text-[34px] font-extrabold leading-none tracking-[-0.03em]">
          {formatNaira(amountMinor)}
        </div>
      </Spotlight>

      <Card>
        <ReceiptRow label="For" value={purpose} />
        <ReceiptRow label="From" value={from} />
        <ReceiptRow label="To" value={to} />
        <ReceiptRow label="Date" value={dateLabel} />
        <ReceiptRow label="Receipt" value={reference} mono last />
      </Card>
    </MobileScreen>
  );
}

interface ReceiptRowProps {
  label: string;
  value: string;
  mono?: boolean;
  last?: boolean;
}

function ReceiptRow({ label, value, mono, last }: ReceiptRowProps) {
  return (
    <div
      className={cn(
        "flex justify-between py-2 text-[13px]",
        !last && "border-b border-hairline-soft"
      )}
    >
      <span className="text-content-muted">{label}</span>
      <span className={cn("font-medium", mono && "font-mono")}>{value}</span>
    </div>
  );
}
