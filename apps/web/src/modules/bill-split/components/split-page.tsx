import { useState } from "react";
import dayjs from "dayjs";
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
import { SkeletonCard, SkeletonGrid } from "@/components/skeleton-loaders";
import { useBillSplits } from "@/api/http/v1/bill-splits/bill-splits.hooks";
import type { BillSplitSummary } from "@/api/http/v1/bill-splits/bill-splits.types";
import { BillUploadWidget } from "@/modules/bill-split/components/bill-upload-widget";
import { BillSplitDetailSheet } from "@/modules/bill-split/components/bill-split-detail-sheet";

type BillSplitStatus = BillSplitSummary["status"];

const STATUS: Record<
  BillSplitStatus,
  { status: "info" | "neutral" | "success" | "danger"; label: string }
> = {
  active: { status: "info", label: "Active" },
  closed: { status: "success", label: "Settled" },
  expired: { status: "neutral", label: "Expired" },
  cancelled: { status: "danger", label: "Cancelled" },
};

function splitStatusBadge(status: string) {
  return STATUS[status as BillSplitStatus] ?? STATUS.active;
}

const naira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

function ageLabel(createdAt: string): string {
  const mins = dayjs().diff(dayjs(createdAt), "minute");
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function SplitPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSplitId, setSelectedSplitId] = useState<string | null>(null);
  const query = useBillSplits();
  const splits = query.data?.data.billSplits ?? [];

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

      {query.isPending ? (
        <SkeletonGrid count={4} cols="sm:grid-cols-2">
          {() => <SkeletonCard lines={2} />}
        </SkeletonGrid>
      ) : null}

      {query.isError ? (
        <EmptyState
          icon={AlertCircleIcon}
          title="Bill splits couldn't load"
          description="Check your connection and try loading your bill splits again."
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
  const badge = splitStatusBadge(split.status);

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

