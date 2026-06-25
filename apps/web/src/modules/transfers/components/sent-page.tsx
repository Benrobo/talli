import { cn } from "@app/ui";
import { Avatar, Card, PageHeader } from "@/components/ui";
import { formatNaira } from "@/lib/format";
import { transfers } from "@/data/mock/transfers";
import type { Transfer } from "@/modules/transfers/types";

/** Money sent — transfers started by typing in chat (screen 2e). */
export function SentPage() {
  return (
    <div>
      <PageHeader
        title="Money sent"
        subtitle="Every transfer started by typing in chat. ₦28,500 this month."
      />

      <Card padded={false} className="overflow-hidden">
        <div className="grid grid-cols-[1.6fr_1fr_0.9fr_0.7fr] border-b border-hairline-soft px-[18px] py-[11px] font-mono text-[10px] tracking-[0.08em] text-content-faint">
          <span>RECIPIENT</span>
          <span>WHAT YOU TYPED</span>
          <span>DATE</span>
          <span className="text-right">AMOUNT</span>
        </div>
        {transfers.map((transfer, index) => (
          <TransferRow
            key={transfer.id}
            transfer={transfer}
            last={index === transfers.length - 1}
          />
        ))}
      </Card>

      <Card tone="night" className="mt-3.5 flex items-center gap-3">
        <span className="font-mono text-[10px] tracking-[0.08em] text-[#c9b7ff]">
          TIP
        </span>
        <span className="text-[13px] text-[#bdbad2]">
          Every transfer is confirmed by you before it sends — Talli just reads
          the sentence.
        </span>
      </Card>
    </div>
  );
}

interface TransferRowProps {
  transfer: Transfer;
  last: boolean;
}

function TransferRow({ transfer, last }: TransferRowProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-[1.6fr_1fr_0.9fr_0.7fr] items-center px-[18px] py-[13px]",
        !last && "border-b border-hairline-soft"
      )}
    >
      <div className="flex items-center gap-[11px]">
        <Avatar name={transfer.recipient} tone="iris" size="sm" />
        <div>
          <div className="text-[13.5px] font-medium">{transfer.recipient}</div>
          <div className="text-[11px] text-content-faint">{transfer.meta}</div>
        </div>
      </div>
      <div className="font-mono text-[11.5px] text-content-muted">
        {transfer.typed}
      </div>
      <div className="tabular text-[12.5px] text-content-muted">
        {transfer.date}
      </div>
      <div className="tabular text-right text-[14px] font-medium">
        {formatNaira(transfer.amountMinor)}
      </div>
    </div>
  );
}
