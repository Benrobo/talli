import { Link } from "@tanstack/react-router";
import type { MouseEvent } from "react";
import toast from "react-hot-toast";
import { cn } from "@app/ui";
import {
  Button,
  EmptyState,
  IconChip,
  PageHeader,
  ProgressBar,
  StatCard,
  StatusPill,
  Stagger,
  StaggerItem,
  Pressable,
} from "@/components/ui";
import { useCollections, useUpdateCollectionStatus } from "@/api/http/v1/collections/collections.hooks";
import { CollectionsSkeleton } from "@/components/skeleton-loaders";
import { Icon } from "@benrobo/iconary/react";
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Coins01Icon,
  PlusSignIcon,
  UserGroupIcon,
  Wallet01Icon,
} from "@benrobo/iconary/core/duotone-rounded";
import { formatNaira, toPercent } from "@/lib/format";
import { NewCollectionDialog } from "@/modules/collections/components/new-collection-dialog";
import type { CollectionRecord } from "@/api/http/v1/collections/collections.types";

type ViewStatus = "live" | "closed" | "draft";

const STATUS: Record<ViewStatus, { status: "info" | "neutral" | "pending"; label: string }> = {
  live: { status: "info", label: "Live" },
  closed: { status: "neutral", label: "Closed" },
  draft: { status: "pending", label: "Draft" },
};

function toViewStatus(status: string): ViewStatus {
  if (status === "draft") return "draft";
  if (["active", "partially_paid"].includes(status)) return "live";
  return "closed";
}

function collectedOf(collection: CollectionRecord): number {
  return collection.collected ?? collection.totalCollected ?? 0;
}

export function CollectionsPage() {
  const { data: response, isLoading, isError } = useCollections();
  const collections = response?.data ?? [];
  const live = collections.filter((collection) => toViewStatus(collection.status) === "live").length;
  const closed = collections.filter((collection) => toViewStatus(collection.status) === "closed").length;
  const draft = collections.filter((collection) => toViewStatus(collection.status) === "draft").length;
  const collectingNow = collections
    .filter((collection) => toViewStatus(collection.status) === "live")
    .reduce((sum, collection) => sum + collectedOf(collection), 0);
  const totalCollected = collections.reduce((sum, collection) => sum + collectedOf(collection), 0);

  if (isLoading) {
    return <CollectionsSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="Collections"
        subtitle={`${live} live · ${closed} closed · ${draft} draft`}
        actions={
          <NewCollectionDialog
            trigger={
              <Button leadingIcon={<Icon icon={PlusSignIcon} size={16} />}>New collection</Button>
            }
          />
        }
      />

      {collections.length > 0 ? (
        <Stagger className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <StaggerItem>
            <StatCard
              tone="filled"
              label="Collecting now"
              value={formatNaira(collectingNow)}
              icon={Wallet01Icon}
              sub={`${live} live`}
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              label="Collected"
              value={formatNaira(totalCollected)}
              icon={CheckmarkCircle02Icon}
              sub="all time"
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              label="Collections"
              value={collections.length}
              icon={UserGroupIcon}
              sub={`${closed} closed · ${draft} draft`}
            />
          </StaggerItem>
        </Stagger>
      ) : null}

      {isError ? (
        <EmptyState
          icon={UserGroupIcon}
          title="Couldn't load collections"
          description="Please refresh to try again."
        />
      ) : collections.length === 0 ? (
        <EmptyState
          icon={UserGroupIcon}
          title="No collections yet"
          description="Start a collection to gather money from a group — dues, a shared bill, contributions."
          action={
            <NewCollectionDialog
              trigger={
                <Button leadingIcon={<Icon icon={PlusSignIcon} size={16} />}>New collection</Button>
              }
            />
          }
        />
      ) : (
        <Stagger className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {collections.map((collection) => (
            <StaggerItem key={collection.id}>
              <CollectionCard collection={collection} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}

function CollectionCard({ collection }: { collection: CollectionRecord }) {
  const viewStatus = toViewStatus(collection.status);
  const updateStatus = useUpdateCollectionStatus(collection.id);
  const badge = STATUS[viewStatus];
  const collected = collectedOf(collection);
  const target = collection.targetAmount ?? collected;
  const pct = toPercent(collected, target);
  const isDraft = viewStatus === "draft";
  const canToggleDraft = viewStatus === "draft" || viewStatus === "live";
  const targetStatus = viewStatus === "draft" ? "active" : "draft";

  const handleToggleDraft = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    updateStatus.mutate(
      { status: targetStatus },
      {
        onSuccess: () => {
          toast.success(targetStatus === "active" ? "Collection launched" : "Moved back to draft");
        },
        onError: () => {
          toast.error("Couldn't update collection status");
        },
      }
    );
  };

  return (
    <Pressable className="h-full">
      <Link
        to="/app/collections/$slug"
        params={{ slug: collection.id }}
        className={cn(
          "flex h-full flex-col rounded-[18px] border border-hairline bg-card p-4 shadow-card transition-colors hover:bg-inset/40",
          isDraft && "opacity-[.9]"
        )}
      >
        <div className="mb-3.5 flex items-start gap-3">
          <IconChip
            tone={viewStatus === "live" ? "iris" : viewStatus === "draft" ? "amber" : "neutral"}
            size="md"
          >
            <Icon icon={Coins01Icon} size={18} />
          </IconChip>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14.5px] font-semibold text-foreground">{collection.title}</div>
            <div className="mt-0.5 truncate text-[12px] text-content-muted">{subLine(collection)}</div>
          </div>
          <StatusPill status={badge.status} dot={viewStatus === "live"}>
            {badge.label}
          </StatusPill>
        </div>

        {isDraft ? (
          <div className="mt-auto flex items-center justify-between gap-2 rounded-[10px] bg-inset px-3 py-2 text-[12px] text-content-faint">
            <span className="inline-flex items-center gap-1.5">
              <Icon icon={ArrowRight01Icon} size={13} />
              Waiting to launch
            </span>
            {canToggleDraft ? (
              <Button size="sm" variant="secondary" onClick={handleToggleDraft} disabled={updateStatus.isPending}>
                {updateStatus.isPending ? "..." : "Launch"}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="mt-auto">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="font-display tabular text-[18px] font-bold tracking-[-0.02em] text-foreground">
                {formatNaira(collected)}
              </span>
              <span className="tabular text-[11.5px] text-content-muted">{countLabel(collection)}</span>
            </div>
            <div className="flex items-center gap-2">
              <ProgressBar value={pct} className="h-1.5 flex-1" />
              <span className="tabular w-8 text-right text-[11px] font-medium text-content-faint">{pct}%</span>
            </div>
            {canToggleDraft ? (
              <div className="mt-2 flex justify-end">
                <Button size="sm" variant="ghost" onClick={handleToggleDraft} disabled={updateStatus.isPending}>
                  {updateStatus.isPending ? "Updating..." : "Move to draft"}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </Link>
    </Pressable>
  );
}

function subLine(collection: CollectionRecord): string {
  const viewStatus = toViewStatus(collection.status);
  const due = collection.deadline ? new Date(collection.deadline).toLocaleDateString("en-NG") : null;
  const amountPerMember = collection.amountPerMember ?? 0;
  const targetAmount = collection.targetAmount ?? 0;

  switch (viewStatus) {
    case "live":
      return collection.collectionType === "fixed_per_person" ? `${formatNaira(amountPerMember)} / person${due ? ` · due ${due}` : ""}` : `Open contribution · ${formatNaira(targetAmount)} target`;
    case "closed":
      return `Open contribution · ${formatNaira(targetAmount)} target`;
    case "draft":
      return `${formatNaira(amountPerMember)} / person · not sent yet`;
  }
}

function countLabel(collection: CollectionRecord): string {
  const viewStatus = toViewStatus(collection.status);
  if (viewStatus === "closed") {
    return "Complete";
  }
  const paid = collection.paidCount ?? 0;
  const enrolled = collection.enrolledCount ?? 0;
  return `${paid}/${enrolled} paid`;
}
