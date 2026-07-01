import { useNavigate } from "@tanstack/react-router";
import {
  Button,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  FadeIn,
  PageHeader,
  StatCard,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  type Column,
} from "@/components/ui";
import { cn } from "@app/ui";
import { Icon } from "@benrobo/iconary/react";
import type { IconData } from "@benrobo/iconary/core";
import {
  Download01Icon,
  Download04Icon,
  Invoice03Icon,
  Layers01Icon,
  ArrowUpRight01Icon,
  Coins01Icon,
  File02Icon,
} from "@benrobo/iconary/core/duotone-rounded";
import { formatNaira } from "@/lib/format";
import { receipts, receiptsSummary } from "@/data/mock/receipts";
import type { Receipt, ReceiptKind } from "@/modules/receipts/types";

const KIND_ICON: Record<ReceiptKind, IconData> = {
  collection: Layers01Icon,
  send: ArrowUpRight01Icon,
  savings: Coins01Icon,
};

const KIND_TONE: Record<ReceiptKind, string> = {
  collection: "bg-emerald-500/12 text-emerald-600",
  send: "bg-iris-soft text-iris-deep",
  savings: "bg-amber-soft text-amber-deep",
};

const columns: Column<Receipt>[] = [
  {
    key: "details",
    header: "Receipt",
    render: (r) => (
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-[11px]",
            KIND_TONE[r.kind]
          )}
        >
          <Icon icon={KIND_ICON[r.kind]} size={17} />
        </span>
        <div>
          <div className="text-[13.5px] font-medium">{r.title}</div>
          <div className="text-[11px] text-content-faint">{r.detail}</div>
        </div>
      </div>
    ),
  },
  {
    key: "ref",
    header: "Reference",
    render: (r) => (
      <span className="tabular font-mono text-[11.5px] text-content-muted">{r.ref}</span>
    ),
  },
  {
    key: "date",
    header: "Date",
    render: (r) => <span className="tabular text-[12.5px] text-content-muted">{r.date}</span>,
  },
  {
    key: "amount",
    header: "Amount",
    align: "right",
    render: (r) => (
      <span className="tabular text-[14px] font-semibold">{formatNaira(r.amountMinor)}</span>
    ),
  },
  {
    key: "download",
    header: "",
    align: "right",
    render: () => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex size-8 items-center justify-center rounded-lg text-content-muted transition-colors hover:bg-iris-soft hover:text-iris-deep">
              <Icon icon={Download01Icon} size={16} />
            </span>
          </TooltipTrigger>
          <TooltipContent>Download PDF</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
  },
];

export function ReceiptsPage() {
  const navigate = useNavigate();
  const { count, totalMinor } = receiptsSummary;

  const exportMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" leadingIcon={<Icon icon={Download04Icon} size={16} />}>
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Export receipts</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Icon icon={File02Icon} size={15} />
          All as CSV
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Icon icon={Invoice03Icon} size={15} />
          All as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div>
      <PageHeader
        eyebrow="Records"
        title="Receipts"
        subtitle="Every payment and transfer, with a downloadable receipt."
        actions={receipts.length > 0 ? exportMenu : null}
      />

      {receipts.length === 0 ? (
        <FadeIn delay={0.05}>
          <EmptyState
            icon={Invoice03Icon}
            title="No receipts yet"
            description="Payments, transfers, and savings deposits will each get a receipt you can download."
          />
        </FadeIn>
      ) : (
        <>
          <FadeIn delay={0.05} className="mb-4 grid grid-cols-2 gap-3.5">
            <StatCard
              tone="filled"
              label="Total documented"
              value={formatNaira(totalMinor)}
              icon={Invoice03Icon}
              sub={`${count} receipts on record`}
            />
            <StatCard
              label="Receipts"
              value={count}
              icon={File02Icon}
              sub="ready to download"
            />
          </FadeIn>

          <FadeIn delay={0.1} className="mb-2.5">
            <span className="text-[13px] font-semibold text-foreground">All receipts</span>
          </FadeIn>

          <FadeIn delay={0.12}>
            <DataTable
              columns={columns}
              rows={receipts}
              rowKey={(r) => r.ref}
              onRowClick={(r) =>
                navigate({
                  to: r.link.to,
                  params: "params" in r.link ? r.link.params : undefined,
                } as never)
              }
            />
          </FadeIn>
        </>
      )}
    </div>
  );
}
