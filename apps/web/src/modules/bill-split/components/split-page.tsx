import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BottomSheet,
  Button,
  EmptyState,
  IconChip,
  PageHeader,
  Pressable,
  Stagger,
  StaggerItem,
  StatusPill,
} from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  Invoice01Icon,
  PlusSignIcon,
  ReceiptDollarIcon,
} from "@benrobo/iconary/core/duotone-rounded";
import { BillUploadWidget } from "@/modules/bill-split/components/bill-upload-widget";
import { BillSplitDetailSheet } from "@/modules/bill-split/components/bill-split-detail-sheet";
import {
  billSplitApi,
  type BillSplitStatus,
  type BillSplitSummary,
} from "@/modules/bill-split/api";

const STATUS: Record<
  BillSplitStatus,
  { status: "info" | "neutral" | "success" | "danger"; label: string }
> = {
  active: { status: "info", label: "Active" },
  closed: { status: "success", label: "Settled" },
  expired: { status: "neutral", label: "Expired" },
  cancelled: { status: "danger", label: "Cancelled" },
};

const naira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

function ageLabel(createdAt: string): string {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function SplitPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSplitId, setSelectedSplitId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["bill-splits"],
    queryFn: billSplitApi.list,
  });
  const splits = query.data ?? [];

  return (
    <div>
      <PageHeader
        title="Bill splits"
        subtitle="Snap a receipt and let everyone pay for what they had."
        actions={
          <Button
            leadingIcon={<Icon icon={PlusSignIcon} size={16} />}
            onClick={() => setCreateOpen(true)}
          >
            New split
          </Button>
        }
      />

      {query.isLoading ? <SplitGridLoading /> : null}

      {query.isError ? (
        <EmptyState
          icon={AlertCircleIcon}
          title="Bill splits couldn't load"
          description="Check your connection and try loading this workspace again."
          action={
            <Button variant="secondary" onClick={() => query.refetch()}>
              Try again
            </Button>
          }
        />
      ) : null}

      {query.isSuccess && splits.length === 0 ? (
        <EmptyState
          icon={ReceiptDollarIcon}
          title="No splits yet"
          description="Start a split — snap the receipt, share the link, everyone pays their share."
          action={
            <Button
              leadingIcon={<Icon icon={PlusSignIcon} size={16} />}
              onClick={() => setCreateOpen(true)}
            >
              New split
            </Button>
          }
        />
      ) : null}

      {query.isSuccess && splits.length > 0 ? (
        <Stagger className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {splits.map((split) => (
            <StaggerItem key={split.id}>
              <SplitCard split={split} onOpen={() => setSelectedSplitId(split.id)} />
            </StaggerItem>
          ))}
        </Stagger>
      ) : null}

      <BottomSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Start a bill split"
        description="Upload a receipt to split a bill."
      >
        <BillUploadWidget compact />
      </BottomSheet>

      <BillSplitDetailSheet
        billSplitId={selectedSplitId}
        onOpenChange={(open) => {
          if (!open) setSelectedSplitId(null);
        }}
      />
    </div>
  );
}

function SplitCard({ split, onOpen }: { split: BillSplitSummary; onOpen: () => void }) {
  const badge = STATUS[split.status];

  return (
    <Pressable className="h-full">
      <button
        type="button"
        onClick={onOpen}
        className="flex h-full w-full flex-col rounded-[18px] border border-hairline bg-card p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-iris/20 hover:shadow-lift focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-iris/20"
      >
        <div className="mb-3.5 flex items-start gap-3">
          <IconChip tone={split.status === "active" ? "iris" : "neutral"} size="md">
            <Icon icon={Invoice01Icon} size={18} />
          </IconChip>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14.5px] font-semibold text-foreground">{split.title}</div>
            <div className="mt-0.5 text-[12px] text-content-muted">
              {split.itemCount} items · {ageLabel(split.createdAt)}
            </div>
          </div>
          <StatusPill status={badge.status} dot={split.status === "active"}>
            {badge.label}
          </StatusPill>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-hairline-soft pt-3">
          <span className="font-display tabular text-[18px] font-bold tracking-[-0.02em] text-foreground">
            {naira(split.total)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-content-faint">
            <span className="tabular">
              {split.paidItemCount}/{split.itemCount} paid
            </span>
            <Icon icon={ArrowRight01Icon} size={13} />
          </span>
        </div>
      </button>
    </Pressable>
  );
}

function SplitGridLoading() {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-[142px] animate-pulse rounded-[18px] border border-hairline bg-card p-4 shadow-card"
        >
          <div className="flex items-center gap-3">
            <span className="size-10 rounded-xl bg-inset" />
            <div className="flex-1">
              <div className="h-3.5 w-2/3 rounded-full bg-inset" />
              <div className="mt-2 h-2.5 w-1/3 rounded-full bg-inset" />
            </div>
          </div>
          <div className="mt-5 h-px bg-hairline-soft" />
          <div className="mt-4 h-4 w-1/4 rounded-full bg-inset" />
        </div>
      ))}
    </div>
  );
}
