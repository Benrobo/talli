import {
  Avatar,
  DataTable,
  EmptyState,
  FadeIn,
  PageHeader,
  StatCard,
  type Column,
} from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import {
  BubbleChatIcon,
  ArrowUpRight01Icon,
  UserMultipleIcon,
  Sent02Icon,
} from "@benrobo/iconary/core/duotone-rounded";
import { formatNaira } from "@/lib/format";
import { transfers, transfersSummary } from "@/data/mock/transfers";
import type { Transfer } from "@/modules/transfers/types";

const columns: Column<Transfer>[] = [
  {
    key: "recipient",
    header: "Recipient",
    render: (t) => (
      <div className="flex items-center gap-[11px]">
        <Avatar name={t.recipient} tone="iris" size="sm" />
        <div>
          <div className="text-[13.5px] font-medium text-foreground">{t.recipient}</div>
          <div className="text-[11px] text-content-faint">{t.meta}</div>
        </div>
      </div>
    ),
  },
  {
    key: "typed",
    header: "Typed in chat",
    render: (t) => (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-2.5 py-1 text-[11.5px] text-content-muted">
        <Icon icon={BubbleChatIcon} size={12} className="text-content-faint" />
        {t.typed}
      </span>
    ),
  },
  {
    key: "date",
    header: "Date",
    render: (t) => <span className="tabular text-[12.5px] text-content-muted">{t.date}</span>,
  },
  {
    key: "amount",
    header: "Amount",
    align: "right",
    render: (t) => (
      <span className="tabular text-[14px] font-semibold tracking-tight text-foreground">
        {formatNaira(t.amountMinor)}
      </span>
    ),
  },
];

export function SentPage() {
  const { sentThisMonthMinor, monthLabel, transferCount, recipientCount } = transfersSummary;

  return (
    <div>
      <PageHeader
        eyebrow="Transfers"
        title="Money sent"
        subtitle="Every send you made — typed in chat, confirmed by you."
      />

      <FadeIn delay={0.05} className="mb-4 grid grid-cols-3 gap-3.5">
        <StatCard
          tone="filled"
          label={`Sent in ${monthLabel}`}
          value={formatNaira(sentThisMonthMinor)}
          icon={Sent02Icon}
          sub="this month"
        />
        <StatCard
          label="Transfers"
          value={transferCount}
          icon={ArrowUpRight01Icon}
          sub={transferCount === 1 ? "send in the ledger" : "sends in the ledger"}
        />
        <StatCard
          label="Recipients"
          value={recipientCount}
          icon={UserMultipleIcon}
          sub={recipientCount === 1 ? "person paid" : "people paid"}
        />
      </FadeIn>

      <FadeIn delay={0.1} className="mb-2.5">
        <span className="text-[13px] font-semibold text-foreground">Transfer ledger</span>
      </FadeIn>

      {transfers.length === 0 ? (
        <FadeIn delay={0.12}>
          <EmptyState
            icon={ArrowUpRight01Icon}
            title="No transfers yet"
            description="When you send money by typing in chat, each transfer lands here with its receipt."
          />
        </FadeIn>
      ) : (
        <FadeIn delay={0.12}>
          <DataTable columns={columns} rows={transfers} rowKey={(t) => t.id} />
        </FadeIn>
      )}

      <FadeIn delay={0.16}>
        <div className="mt-3.5 flex items-center gap-3 rounded-[16px] border border-hairline bg-card p-4 shadow-card">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-iris-soft text-iris-deep">
            <Icon icon={BubbleChatIcon} size={17} />
          </span>
          <span className="text-[12.5px] text-content-muted">
            Every transfer is confirmed by you before it sends — Talli just reads the sentence.
          </span>
        </div>
      </FadeIn>
    </div>
  );
}
