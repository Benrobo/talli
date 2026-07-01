import { Link } from "@tanstack/react-router";
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
import { collections } from "@/data/mock/collections";
import { NewCollectionDialog } from "@/modules/collections/components/new-collection-dialog";
import type { Collection, CollectionStatus } from "@/modules/collections/types";

const STATUS: Record<CollectionStatus, { status: "info" | "neutral" | "pending"; label: string }> = {
  live: { status: "info", label: "Live" },
  closed: { status: "neutral", label: "Closed" },
  draft: { status: "pending", label: "Draft" },
};

export function CollectionsPage() {
  const live = collections.filter((c) => c.status === "live").length;
  const closed = collections.filter((c) => c.status === "closed").length;
  const draft = collections.filter((c) => c.status === "draft").length;
  const collectingNow = collections
    .filter((c) => c.status === "live")
    .reduce((sum, c) => sum + c.collectedMinor, 0);
  const totalCollected = collections.reduce((sum, c) => sum + c.collectedMinor, 0);

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

      {collections.length === 0 ? (
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
            <StaggerItem key={collection.slug}>
              <CollectionCard collection={collection} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}

function CollectionCard({ collection }: { collection: Collection }) {
  const badge = STATUS[collection.status];
  const pct = toPercent(collection.collectedMinor, collection.targetMinor);
  const isDraft = collection.status === "draft";

  return (
    <Pressable className="h-full">
      <Link
        to="/app/collections/$slug"
        params={{ slug: collection.slug }}
        className={cn(
          "flex h-full flex-col rounded-[18px] border border-hairline bg-card p-4 shadow-card transition-colors hover:bg-inset/40",
          isDraft && "opacity-[.9]"
        )}
      >
        <div className="mb-3.5 flex items-start gap-3">
          <IconChip
            tone={collection.status === "live" ? "iris" : collection.status === "draft" ? "amber" : "neutral"}
            size="md"
          >
            <Icon icon={Coins01Icon} size={18} />
          </IconChip>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14.5px] font-semibold text-foreground">{collection.title}</div>
            <div className="mt-0.5 truncate text-[12px] text-content-muted">{subLine(collection)}</div>
          </div>
          <StatusPill status={badge.status} dot={collection.status === "live"}>
            {badge.label}
          </StatusPill>
        </div>

        {isDraft ? (
          <div className="mt-auto flex items-center gap-1.5 rounded-[10px] bg-inset px-3 py-2 text-[12px] text-content-faint">
            <Icon icon={ArrowRight01Icon} size={13} />
            Waiting to launch
          </div>
        ) : (
          <div className="mt-auto">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="font-display tabular text-[18px] font-bold tracking-[-0.02em] text-foreground">
                {formatNaira(collection.collectedMinor)}
              </span>
              <span className="tabular text-[11.5px] text-content-muted">{countLabel(collection)}</span>
            </div>
            <div className="flex items-center gap-2">
              <ProgressBar value={pct} className="h-1.5 flex-1" />
              <span className="tabular w-8 text-right text-[11px] font-medium text-content-faint">{pct}%</span>
            </div>
          </div>
        )}
      </Link>
    </Pressable>
  );
}

function subLine(collection: Collection): string {
  switch (collection.status) {
    case "live":
      return `${formatNaira(collection.perPersonMinor)} / person · due ${collection.due}`;
    case "closed":
      return `Open contribution · ${formatNaira(collection.targetMinor)} target`;
    case "draft":
      return `${formatNaira(collection.perPersonMinor)} / person · not sent yet`;
  }
}

function countLabel(collection: Collection): string {
  if (collection.status === "closed") {
    return "Complete";
  }
  return `${collection.paidCount}/${collection.memberCount} paid`;
}
