import { useEffect, useMemo, useState } from "react";
import {
  DataTable,
  EmptyState,
  FadeIn,
  PageHeader,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  StatCard,
  StatusPill,
  type Column,
} from "@/components/ui";
import {
  ArrowDownLeft01Icon,
  ArrowUpRight01Icon,
  Invoice03Icon,
} from "@benrobo/iconary/core/duotone-rounded";
import { cn } from "@/lib/utils";
import { formatNaira, formatTxDate } from "@/lib/format";
import { TippyTooltip } from "@/components/ui/tippy-tooltip";
import { SentSkeleton } from "@/components/skeleton-loaders";
import { useTransactions } from "@/api/http/v1/transactions/transactions.hooks";
import type { TransactionRecord } from "@/api/http/v1/transactions/transactions.types";
import { rowSubtitle, statusMeta, transactionTitle } from "../transaction-meta";
import { computeDateBounds } from "./transactions-filters";
import { TransactionsFilterBar, type FilterState } from "./transactions-filter-bar";
import { TransactionIcon } from "./transaction-icon";
import { ReceiptSheet } from "./receipt-sheet";

const PAGE_SIZE = 10;

const DEFAULT_FILTERS: FilterState = { type: "all", dateRange: "all", status: "all" };

function shortenReference(reference: string): string {
  if (reference.length <= 18) return reference;
  return `${reference.slice(0, 12)}…${reference.slice(-4)}`;
}

export function TransactionsPage() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<TransactionRecord | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { type, dateRange, status } = filters;

  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  function patchFilters(patch: Partial<FilterState>) {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  const bounds = useMemo(() => computeDateBounds(dateRange), [dateRange]);

  const { data, isLoading, isError } = useTransactions({
    page,
    pageSize: PAGE_SIZE,
    type: type === "all" ? undefined : type,
    status: status === "all" ? undefined : status,
    search: search || undefined,
    dateFrom: bounds.dateFrom,
    dateTo: bounds.dateTo,
  });

  const columns = useMemo<Column<TransactionRecord>[]>(
    () => [
      {
        key: "transaction",
        header: "Transaction",
        render: (row) => (
          <div className="flex items-center gap-3">
            <TransactionIcon kind={row.kind} />
            <div>
              <div className="text-[13.5px] font-medium text-foreground">{transactionTitle(row)}</div>
              <div className="text-[11px] text-content-faint">{rowSubtitle(row)}</div>
            </div>
          </div>
        ),
      },
      {
        key: "reference",
        header: "Reference",
        render: (row) => (
          <TippyTooltip content={row.reference} placement="top">
            <span className="tabular cursor-default font-mono text-[11.5px] text-content-muted">
              {shortenReference(row.reference)}
            </span>
          </TippyTooltip>
        ),
      },
      {
        key: "date",
        header: "Date",
        render: (row) => (
          <span className="tabular text-[12.5px] text-content-muted">
            {formatTxDate(row.createdAt)}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => {
          const status = statusMeta(row.status);
          return (
            <StatusPill status={status.variant} dot>
              {status.label}
            </StatusPill>
          );
        },
      },
      {
        key: "amount",
        header: "Amount",
        align: "right",
        render: (row) => {
          const credit = row.direction === "credit";
          return (
            <span
              className={cn(
                "tabular text-[14px] font-semibold tracking-tight",
                credit ? "text-emerald-deep" : "text-foreground"
              )}
            >
              {credit ? "+" : "−"}
              {formatNaira(row.amount)}
            </span>
          );
        },
      },
    ],
    []
  );

  if (isLoading && !data) {
    return <SentSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-[13.5px] text-content-muted">
        Couldn&apos;t load transactions. Try again.
      </div>
    );
  }

  const { transactions, summary, counts, pagination } = data.data;

  function openReceipt(row: TransactionRecord) {
    setSelected(row);
    setSheetOpen(true);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Records"
        title="Transactions"
        subtitle="Every money movement — in and out."
      />

      <FadeIn delay={0.05} className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <StatCard
          tone="filled"
          label="Money in"
          value={formatNaira(summary.moneyIn)}
          icon={ArrowDownLeft01Icon}
        />
        <StatCard label="Money out" value={formatNaira(summary.moneyOut)} icon={ArrowUpRight01Icon} />
        <StatCard
          label="Net"
          value={`${summary.net >= 0 ? "+" : "−"}${formatNaira(Math.abs(summary.net))}`}
          icon={Invoice03Icon}
        />
      </FadeIn>

      <FadeIn delay={0.08} className="mb-3.5">
        <TransactionsFilterBar
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          filters={filters}
          counts={counts}
          onChange={patchFilters}
          onReset={resetFilters}
        />
      </FadeIn>

      {transactions.length === 0 ? (
        <FadeIn delay={0.1}>
          <EmptyState
            icon={Invoice03Icon}
            title="No transactions yet"
            description="Every top-up, payment, send, and refund will show up here as it happens."
          />
        </FadeIn>
      ) : (
        <FadeIn delay={0.1}>
          <DataTable
            columns={columns}
            rows={transactions}
            rowKey={(row) => row.id}
            onRowClick={openReceipt}
          />
        </FadeIn>
      )}

      {pagination.totalPages > 1 ? (
        <FadeIn delay={0.12} className="mt-4">
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
                  className={
                    page >= pagination.totalPages ? "pointer-events-none opacity-50" : undefined
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </FadeIn>
      ) : null}

      <ReceiptSheet transaction={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
