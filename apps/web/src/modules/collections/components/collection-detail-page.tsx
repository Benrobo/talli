import { useState } from "react";
import { Link } from "@tanstack/react-router";
import toast from "react-hot-toast";
import { cn } from "@app/ui";
import {
  Button,
  EmptyState,
  PageHeader,
  ProgressBar,
  StatCard,
  SectionCard,
  StatusPill,
  FadeIn,
} from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import {
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  Coins01Icon,
  Copy01Icon,
  Delete02Icon,
  Edit02Icon,
  UserGroupIcon,
  Wallet01Icon,
} from "@benrobo/iconary/core/duotone-rounded";
import { formatNaira, toPercent } from "@/lib/format";
import { MemberRow } from "@/modules/collections/components/member-row";
import { EditCollectionDialog } from "@/modules/collections/components/edit-collection-dialog";
import { DeleteCollectionDialog } from "@/modules/collections/components/delete-collection-dialog";
import type { Collection, CollectionStatus } from "@/modules/collections/types";

const STATUS: Record<CollectionStatus, { status: "info" | "neutral" | "pending"; label: string }> = {
  live: { status: "info", label: "Live" },
  closed: { status: "neutral", label: "Closed" },
  draft: { status: "pending", label: "Draft" },
};

export function CollectionDetailPage({ collection }: { collection: Collection }) {
  const badge = STATUS[collection.status];
  const pct = toPercent(collection.collectedMinor, collection.targetMinor);
  const owing = Math.max(0, collection.targetMinor - collection.collectedMinor);
  const [copiedLink, setCopiedLink] = useState(false);

  const paying = collection.members.filter((m) => m.status === "paying").length;
  const hiddenUnpaid = Math.max(0, collection.memberCount - collection.members.length);
  const hiddenAmount = hiddenUnpaid * collection.perPersonMinor;
  const stillToGo = Math.max(0, collection.memberCount - collection.paidCount - paying);

  function copyPayLink() {
    const payUrl = `${window.location.origin}/pay/${collection.payReference}`;
    navigator.clipboard.writeText(payUrl).then(() => {
      setCopiedLink(true);
      toast.success("Pay link copied");
      setTimeout(() => setCopiedLink(false), 1600);
    });
  }

  return (
    <div>
      <Link
        to="/app/collections"
        className="mb-[18px] inline-flex items-center gap-1.5 text-[13px] text-content-muted transition-colors hover:text-foreground"
      >
        <Icon icon={ArrowLeft01Icon} size={15} />
        Collections
      </Link>

      <FadeIn y={8}>
        <PageHeader
          className="mb-6"
          title={
            <span className="inline-flex items-center gap-3">
              {collection.title}
              <StatusPill status={badge.status} dot={collection.status === "live"}>
                {badge.label}
              </StatusPill>
            </span>
          }
          subtitle={
            <>
              {collection.perPersonMinor > 0
                ? `${formatNaira(collection.perPersonMinor)} from each of ${collection.memberCount} members`
                : `${formatNaira(collection.targetMinor)} target`}
              {collection.due ? ` · due ${collection.due}` : ""}
            </>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {collection.status === "live" ? (
                <>
                  <Link to="/pay/$reference" params={{ reference: collection.payReference }}>
                    <Button>Pay</Button>
                  </Link>
                  <Button
                    variant="secondary"
                    leadingIcon={<Icon icon={Copy01Icon} size={16} />}
                    onClick={copyPayLink}
                  >
                    {copiedLink ? "Copied" : "Copy pay link"}
                  </Button>
                </>
              ) : null}
              <EditCollectionDialog
                collection={collection}
                trigger={
                  <Button variant="secondary" leadingIcon={<Icon icon={Edit02Icon} size={16} />}>
                    Edit
                  </Button>
                }
              />
              <DeleteCollectionDialog
                collection={collection}
                trigger={
                  <Button variant="secondary" leadingIcon={<Icon icon={Delete02Icon} size={16} />}>
                    Delete
                  </Button>
                }
              />
            </div>
          }
        />
      </FadeIn>

      <FadeIn delay={0.08} className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-[1.3fr_1fr_1fr]">
        <StatCard
          tone="filled"
          label="Collected so far"
          value={formatNaira(collection.collectedMinor)}
          icon={Wallet01Icon}
        >
          <ProgressBar
            value={pct}
            className="mt-3.5 h-1.5"
            trackClassName="bg-white/20"
            barClassName="bg-white"
          />
          <div className="tabular mt-2 text-[11.5px] text-white/70">
            {pct}% of {formatNaira(collection.targetMinor)}
          </div>
        </StatCard>
        <StatCard
          label="Paid"
          value={`${collection.paidCount} / ${collection.memberCount}`}
          icon={CheckmarkCircle02Icon}
        />
        <StatCard label="Still owing" value={formatNaira(owing)} icon={Coins01Icon} />
      </FadeIn>

      <FadeIn delay={0.14}>
        <SectionCard
          title="Members"
          action={
            collection.members.length > 0 ? (
              <span className="text-[12px] text-content-faint">
                {collection.paidCount} paid · {paying} paying · {stillToGo} to go
              </span>
            ) : null
          }
          flush={collection.members.length > 0}
        >
          {collection.members.length === 0 ? (
            <EmptyState
              icon={UserGroupIcon}
              title="No members yet"
              description={
                collection.status === "draft"
                  ? "Launch this collection to invite people and start tracking who has paid."
                  : "Share the pay link so people can pay and appear here."
              }
              className="border-0 bg-transparent py-8 shadow-none"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2">
              {collection.members.map((member, index) => (
                <MemberRow
                  key={member.name}
                  member={member}
                  className={cn(
                    "border-b border-hairline-soft",
                    index % 2 === 0 && "sm:border-r sm:border-hairline-soft"
                  )}
                />
              ))}
              {hiddenUnpaid > 0 ? (
                <div className="col-span-full flex items-center gap-3 px-[19px] py-[13px]">
                  <span className="flex-1 text-[13px] font-medium text-iris-deep">
                    + {hiddenUnpaid} more unpaid
                  </span>
                  <span className="tabular text-[12px] text-content-faint">
                    {formatNaira(hiddenAmount)}
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </SectionCard>
      </FadeIn>
    </div>
  );
}
