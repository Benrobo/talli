import { Link } from "@tanstack/react-router";
import { cn } from "@app/ui";
import { Badge, Button, PageHeader, ProgressBar } from "@/components/ui";
import { ArrowRight01Icon, Icon, PlusSignIcon } from "@app/icons";
import { formatNaira, toPercent } from "@/lib/format";
import { collections } from "@/data/mock/collections";
import type { Collection, CollectionStatus } from "@/modules/collections/types";

const STATUS_BADGE: Record<CollectionStatus, { tone: "iris" | "neutral" | "amber"; label: string }> = {
  live: { tone: "iris", label: "LIVE" },
  closed: { tone: "neutral", label: "CLOSED" },
  draft: { tone: "amber", label: "DRAFT" },
};

/** Collections list — every pot, live, closed, and draft (screen 2c). */
export function CollectionsPage() {
  return (
    <div>
      <PageHeader
        title="Collections"
        subtitle="1 live · 1 closed · 1 draft"
        actions={
          <Button size="default" leadingIcon={<Icon data={PlusSignIcon} size={16} />}>
            New collection
          </Button>
        }
      />
      <div className="flex flex-col gap-3">
        {collections.map((collection) => (
          <CollectionRow key={collection.slug} collection={collection} />
        ))}
      </div>
    </div>
  );
}

interface CollectionRowProps {
  collection: Collection;
}

function CollectionRow({ collection }: CollectionRowProps) {
  const badge = STATUS_BADGE[collection.status];
  return (
    <Link
      to="/collections/$slug"
      params={{ slug: collection.slug }}
      className={cn(
        "flex items-center gap-5 rounded-[14px] border border-hairline bg-card px-5 py-[18px] shadow-card",
        collection.status === "draft" && "opacity-[.84]"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2.5">
          <span className="text-[15px] font-medium">{collection.title}</span>
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>
        <div className="text-[12.5px] text-content-muted">{subLine(collection)}</div>
      </div>
      <div className="w-[180px] shrink-0">
        {collection.status === "draft" ? (
          <div className="text-[12px] text-content-faint">Waiting to launch</div>
        ) : (
          <>
            <div className="mb-1.5 flex items-center justify-between text-[12px]">
              <span className="tabular font-medium">
                {formatNaira(collection.collectedMinor)}
              </span>
              <span className="tabular text-content-muted">{countLabel(collection)}</span>
            </div>
            <ProgressBar
              value={toPercent(collection.collectedMinor, collection.targetMinor)}
              className="h-1.5"
            />
          </>
        )}
      </div>
      <Icon data={ArrowRight01Icon} size={18} className="shrink-0 text-content-faint" />
    </Link>
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
    return `${toPercent(collection.collectedMinor, collection.targetMinor)}%`;
  }
  return `${collection.paidCount}/${collection.memberCount}`;
}
