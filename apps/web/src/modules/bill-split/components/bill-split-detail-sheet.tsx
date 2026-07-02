import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { BottomSheet, Button, StatusPill } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { billSplitApi, type BillSplitStatus } from "@/modules/bill-split/api";
import { Icon } from "@benrobo/iconary/react";
import {
  AlertCircleIcon,
  Clock01Icon,
  Copy01Icon,
  Invoice01Icon,
  Share01Icon,
} from "@benrobo/iconary/core/duotone-rounded";
import {
  Clock01Icon as SolidClock01Icon,
  Tick02Icon as SolidTick02Icon,
} from "@benrobo/iconary/core/solid-rounded";

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

interface BillSplitDetailSheetProps {
  billSplitId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function BillSplitDetailSheet({
  billSplitId,
  onOpenChange,
}: BillSplitDetailSheetProps) {
  const [copied, setCopied] = useState(false);
  const query = useQuery({
    queryKey: ["bill-split-detail", billSplitId],
    queryFn: () => billSplitApi.getDetail(billSplitId!),
    enabled: Boolean(billSplitId),
    retry: false,
  });

  useEffect(() => {
    setCopied(false);
  }, [billSplitId]);

  const copyLink = async () => {
    if (!query.data) return;
    await navigator.clipboard.writeText(query.data.shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const shareLink = async () => {
    if (!query.data) return;
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: query.data.title,
        text: `Choose what you had on ${query.data.title}.`,
        url: query.data.shareUrl,
      });
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") await copyLink();
    }
  };

  return (
    <BottomSheet
      open={Boolean(billSplitId)}
      onOpenChange={onOpenChange}
      title={query.data?.title ?? "Bill split details"}
      description="Review the bill split and share its payment link."
    >
      {query.isLoading ? <DetailLoading /> : null}
      {query.isError ? <DetailUnavailable onClose={() => onOpenChange(false)} /> : null}
      {query.data ? (
        <div className="pb-1">
          <div className="flex items-start gap-3 pr-9">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-iris-soft text-iris-deep">
              <Icon icon={Invoice01Icon} size={21} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="min-w-0 truncate font-display text-[18px] font-bold tracking-[-0.02em] text-foreground">
                  {query.data.title}
                </h3>
                <StatusPill status={STATUS[query.data.status].status} dot>
                  {STATUS[query.data.status].label}
                </StatusPill>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-content-faint">
                <Icon icon={Clock01Icon} size={12} />
                Created {formatDate(query.data.createdAt, true)}
              </div>
            </div>
          </div>

          <div className="band-iris mt-4 rounded-[18px] p-4 text-white shadow-hero">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[11px] font-medium text-white/65">Collected</div>
                <div className="mt-0.5 font-display text-[25px] font-bold tracking-[-0.03em]">
                  {naira(query.data.collected)}
                </div>
              </div>
              <div className="pb-0.5 text-right">
                <div className="text-[10.5px] text-white/60">Bill total</div>
                <div className="font-display text-[14px] font-semibold">
                  {naira(query.data.targetAmount || query.data.total)}
                </div>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(
                    100,
                    ((query.data.collected || 0) /
                      Math.max(1, query.data.targetAmount || query.data.total)) *
                      100
                  )}%`,
                }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full bg-white"
              />
            </div>
            <div className="mt-2 flex justify-between text-[10.5px] text-white/65">
              <span>
                {query.data.paidItemCount} of {query.data.itemCount} items paid
              </span>
              <span>{query.data.selections.length} participants</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              block
              leadingIcon={<Icon icon={copied ? SolidTick02Icon : Copy01Icon} size={14} />}
              onClick={copyLink}
            >
              {copied ? "Link copied" : "Copy link"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              block
              leadingIcon={<Icon icon={Share01Icon} size={14} />}
              onClick={shareLink}
            >
              Share
            </Button>
          </div>

          <div className="mt-5">
            <div className="mb-2.5 flex items-center justify-between">
              <h4 className="text-[12.5px] font-semibold text-foreground">Bill items</h4>
              <span className="text-[11px] text-content-faint">{query.data.itemCount} total</span>
            </div>
            <div className="space-y-2">
              {query.data.items.map((item) => {
                const paid = item.status === "claimed";
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-[13px] border border-hairline bg-inset/55 px-3 py-2.5"
                  >
                    <span
                      className={
                        paid
                          ? "flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-emerald-soft text-emerald-deep"
                          : "flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-card text-content-faint shadow-soft"
                      }
                    >
                      <Icon
                        icon={paid ? SolidTick02Icon : SolidClock01Icon}
                        size={paid ? 15 : 14}
                        strokeWidth={paid ? 3 : undefined}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-medium text-foreground">
                        {item.label}
                      </div>
                      <div className="mt-0.5 text-[10.5px] text-content-faint">
                        {paid && item.paidByName ? `Paid by ${item.paidByName}` : "Still available"}
                      </div>
                    </div>
                    <span className="font-display text-[12.5px] font-semibold tabular-nums text-foreground">
                      {naira(item.unitPrice)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </BottomSheet>
  );
}

function DetailLoading() {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center">
      <motion.span
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
        className="size-8 rounded-full border-[3px] border-iris-soft border-t-iris"
      />
      <div className="mt-3 text-[12.5px] font-medium text-content-muted">Loading bill details…</div>
    </div>
  );
}

function DetailUnavailable({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex min-h-[310px] flex-col items-center justify-center rounded-[18px] bg-inset/70 px-6 py-8 text-center">
      <div className="relative mb-5 flex size-20 items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-dashed border-rose/25" />
        <span className="absolute inset-2 rounded-full bg-card shadow-soft" />
        <span className="relative flex size-12 items-center justify-center rounded-[15px] bg-rose-soft text-rose-deep">
          <Icon icon={AlertCircleIcon} size={23} />
        </span>
      </div>
      <h3 className="font-display text-[19px] font-bold tracking-[-0.02em] text-foreground">
        This split isn&apos;t available
      </h3>
      <p className="mt-2 max-w-[300px] text-[12.5px] leading-relaxed text-content-muted">
        It may have been removed, or it no longer belongs to your account.
      </p>
      <Button variant="secondary" size="sm" className="mt-5" onClick={onClose}>
        Back to bill splits
      </Button>
    </div>
  );
}
