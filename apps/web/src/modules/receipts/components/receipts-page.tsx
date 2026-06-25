import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Button, Card, PageHeader } from "@/components/ui";
import { Download01Icon, Icon } from "@app/icons";
import { formatNaira } from "@/lib/format";
import { receipts } from "@/data/mock/receipts";
import type { Receipt } from "@/modules/receipts/types";

/** Receipts — every payment and transfer with a downloadable receipt (screen 2f). */
export function ReceiptsPage() {
  return (
    <div>
      <PageHeader
        title="Receipts"
        subtitle="Every payment and transfer, with a downloadable receipt."
        actions={
          <Button
            variant="secondary"
            leadingIcon={<Icon data={Download01Icon} size={16} />}
          >
            Export all (CSV)
          </Button>
        }
      />

      <Card padded={false} className="overflow-hidden">
        <div className="grid grid-cols-[0.7fr_1.4fr_0.9fr_0.7fr_0.5fr] border-b border-hairline-soft px-[18px] py-[11px] font-mono text-[10px] tracking-[0.08em] text-content-faint">
          <span>RECEIPT</span>
          <span>DETAILS</span>
          <span>DATE</span>
          <span className="text-right">AMOUNT</span>
          <span />
        </div>
        {receipts.map((receipt, index) => (
          <ReceiptRow
            key={receipt.ref}
            receipt={receipt}
            last={index === receipts.length - 1}
          />
        ))}
      </Card>
    </div>
  );
}

interface ReceiptRowProps {
  receipt: Receipt;
  last: boolean;
}

function ReceiptRow({ receipt, last }: ReceiptRowProps) {
  return (
    <Link
      to={receipt.link.to}
      params={"params" in receipt.link ? receipt.link.params : undefined}
      className={cn(
        "grid grid-cols-[0.7fr_1.4fr_0.9fr_0.7fr_0.5fr] items-center px-[18px] py-[13px] transition-colors hover:bg-muted/30",
        !last && "border-b border-hairline-soft"
      )}
    >
      <span className="tabular font-mono text-[12.5px] font-medium">
        {receipt.ref}
      </span>
      <div>
        <div className="text-[13.5px] font-medium">{receipt.title}</div>
        <div className="text-[11px] text-content-faint">{receipt.detail}</div>
      </div>
      <div className="tabular text-[12.5px] text-content-muted">
        {receipt.date}
      </div>
      <div className="tabular text-right text-[14px] font-medium">
        {formatNaira(receipt.amountMinor)}
      </div>
      <div className="text-right text-iris-deep">
        <Icon data={Download01Icon} size={16} />
      </div>
    </Link>
  );
}
