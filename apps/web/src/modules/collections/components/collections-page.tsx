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
  FadeIn,
  Stagger,
  StaggerItem,
  Pressable,
} from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import {
  ArrowRight01Icon,
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
        <FadeIn delay={0.05} className="mb-5">
          <StatCard
            tone="filled"
            className="max-w-sm"
            label="Collecting now"
            value={formatNaira(collectingNow)}
            icon={Wallet01Icon}
            sub={`across ${live} live collection${live === 1 ? "" : "s"}`}
          />
        </FadeIn>
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
        <Stagger className="flex flex-col gap-3.5">
          {collections.map((collection) => (
            <StaggerItem key={collection.slug}>
              <CollectionRow collection={collection} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}

function CollectionRow({ collection }: { collection: Collection }) {
  const badge = STATUS[collection.status];
  const pct = toPercent(collection.collectedMinor, collection.targetMinor);
  const isDraft = collection.status === "draft";

  return (
    <Pressable>
      <Link
        to="/collections/$slug"
        params={{ slug: collection.slug }}
        className={cn(
          "flex items-center gap-4 rounded-[18px] border border-hairline bg-card px-5 py-[18px] shadow-card transition-colors hover:bg-inset/50",
          isDraft && "opacity-[.86]"
        )}
      >
        <IconChip tone={collection.status === "live" ? "iris" : collection.status === "draft" ? "amber" : "neutral"} size="md">
          <Icon icon={Coins01Icon} size={18} />
        </IconChip>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2.5">
            <span className="truncate text-[15.5px] font-medium">{collection.title}</span>
            <StatusPill status={badge.status} dot={collection.status === "live"}>
              {badge.label}
            </StatusPill>
          </div>
          <div className="text-[12.5px] text-content-muted">{subLine(collection)}</div>
        </div>

        <div className="w-[190px] shrink-0">
          {isDraft ? (
            <div className="text-[12px] text-content-faint">Waiting to launch</div>
          ) : (
            <>
              <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
                <span className="tabular font-semibold">
                  {formatNaira(collection.collectedMinor)}
                </span>
                <span className="tabular text-content-muted">{countLabel(collection)}</span>
              </div>
              <div className="flex items-center gap-2">
                <ProgressBar value={pct} className="h-1.5 flex-1" />
                <span className="tabular w-8 text-right text-[11px] font-medium text-content-faint">
                  {pct}%
                </span>
              </div>
            </>
          )}
        </div>

        <Icon icon={ArrowRight01Icon} size={18} className="shrink-0 text-content-faint" />
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
