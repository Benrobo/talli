import { useState } from "react";
import {
  Avatar,
  DataTable,
  EmptyState,
  FadeIn,
  IconChip,
  PageHeader,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
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
import { usePayments } from "@/api/http/v1/payments/payments.hooks";
import type { SentPayment } from "@/api/http/v1/payments/payments.types";

const PAGE_SIZE = 10;

const columns: Column<SentPayment>[] = [
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
      <span className="inline-flex items-center gap-1.5 rounded-full bg-inset px-2.5 py-1 text-[11.5px] text-content-muted">
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
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = usePayments({ page, pageSize: PAGE_SIZE });

  const payments = data?.data.payments ?? [];
  const summary = data?.data.summary;
  const pagination = data?.data.pagination;

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-[13.5px] text-content-muted">
        Loading transfers…
      </div>
    );
  }

  if (isError || !summary || !pagination) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-[13.5px] text-content-muted">
        Couldn&apos;t load transfers. Try again.
      </div>
    );
  }

  const transferCount = summary.transferCount;
  const recipientCount = summary.recipientCount;

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
          label={`Sent in ${summary.monthLabel}`}
          value={formatNaira(summary.sentThisMonthMinor)}
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
        <span className="text-[13.5px] font-semibold text-foreground">Transfer ledger</span>
      </FadeIn>

      {payments.length === 0 ? (
        <FadeIn delay={0.12}>
          <EmptyState
            icon={ArrowUpRight01Icon}
            title="No transfers yet"
            description="When you send money by typing in chat, each transfer lands here with its receipt."
          />
        </FadeIn>
      ) : (
        <FadeIn delay={0.12}>
          <DataTable columns={columns} rows={payments} rowKey={(t) => t.id} />
        </FadeIn>
      )}

      {pagination.totalPages > 1 ? (
        <FadeIn delay={0.14} className="mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setPage((current) => Math.max(1, current - 1));
                  }}
                  aria-disabled={page <= 1}
                  className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="tabular px-3 text-[12.5px] text-content-muted">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setPage((current) => Math.min(pagination.totalPages, current + 1));
                  }}
                  aria-disabled={page >= pagination.totalPages}
                  className={page >= pagination.totalPages ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </FadeIn>
      ) : null}

      <FadeIn delay={0.16}>
        <div className="mt-3.5 flex items-center gap-3 rounded-[16px] border border-hairline bg-card p-4 shadow-card">
          <IconChip tone="iris" size="md">
            <Icon icon={BubbleChatIcon} size={17} />
          </IconChip>
          <span className="text-[12.5px] text-content-muted">
            Every transfer is confirmed by you before it sends — Talli just reads the sentence.
          </span>
        </div>
      </FadeIn>
    </div>
  );
}
