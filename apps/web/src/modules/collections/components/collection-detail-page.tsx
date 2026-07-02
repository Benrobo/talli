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
  Coins01Icon,
  Copy01Icon,
  Delete02Icon,
  Edit02Icon,
  FileEditIcon,
  MoneySend01Icon,
  RocketIcon,
  Target01Icon,
  UserGroupIcon,
  Wallet01Icon,
} from "@benrobo/iconary/core/duotone-rounded";
import { CheckmarkCircle02Icon } from "@benrobo/iconary/core/solid-rounded";
import {
  useUpdateCollectionStatus,
  useCollectionWithdrawable,
  useWithdrawCollection,
} from "@/api/http/v1/collections/collections.hooks";
import { formatNaira, toPercent } from "@/lib/format";
import { MemberRow } from "@/modules/collections/components/member-row";
import { EditCollectionDialog } from "@/modules/collections/components/edit-collection-dialog";
import { DeleteCollectionDialog } from "@/modules/collections/components/delete-collection-dialog";
import { CollectionTypeInfo } from "@/modules/collections/components/collection-type-info";
import { WithdrawToBankSheet } from "@/modules/payments/components/withdraw-to-bank-sheet";
import { MoneyReceive01Icon } from "@benrobo/iconary/core/duotone-rounded";
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
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const updateStatus = useUpdateCollectionStatus(collection.slug);
  const withdrawable = useCollectionWithdrawable(collection.slug);
  const withdrawCollection = useWithdrawCollection(collection.slug);
  const available = withdrawable.data?.data.available ?? 0;

  const paying = collection.members.filter((m) => m.status === "paying").length;
  const hiddenUnpaid = Math.max(0, collection.memberCount - collection.members.length);
  const hiddenAmount = hiddenUnpaid * collection.perPersonMinor;
  const stillToGo = Math.max(0, collection.memberCount - collection.paidCount - paying);

  const isOpen = collection.collectionType === "open_contribution";
  const isPerPerson = collection.collectionType === "fixed_per_person";
  const hasGoal = collection.targetMinor > 0;
  const goalCaption = hasGoal
    ? `${pct}% of ${formatNaira(collection.targetMinor)} goal`
    : isPerPerson && collection.perPersonMinor > 0
      ? `${formatNaira(collection.perPersonMinor)} per person · add members to set a goal`
      : isOpen
        ? "Open goal · every contribution counts"
        : "No goal set yet";

  function copyPayLink() {
    const payUrl = `${window.location.origin}/pay/${collection.payReference}`;
    navigator.clipboard.writeText(payUrl).then(() => {
      setCopiedLink(true);
      toast.success("Pay link copied");
      setTimeout(() => setCopiedLink(false), 1600);
    });
  }

  function changeStatus(status: "active" | "draft") {
    updateStatus.mutate(
      { status },
      {
        onSuccess: () =>
          toast.success(status === "active" ? "Collection launched" : "Moved to draft"),
        onError: () => toast.error("Could not update collection status"),
      }
    );
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
            <span className="inline-flex flex-wrap items-center gap-2 sm:gap-3">
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
              {collection.status === "draft" ? (
                <Button
                  leadingIcon={<Icon icon={RocketIcon} size={16} />}
                  disabled={updateStatus.isPending}
                  onClick={() => changeStatus("active")}
                >
                  Launch collection
                </Button>
              ) : null}
              {collection.status === "live" ? (
                <>
                  <Link to="/pay/$reference" params={{ reference: collection.payReference }}>
                    <Button leadingIcon={<Icon icon={MoneySend01Icon} size={16} />}>Pay</Button>
                  </Link>
                  <Button
                    variant="secondary"
                    leadingIcon={<Icon icon={Copy01Icon} size={16} className="text-iris-deep" />}
                    onClick={copyPayLink}
                  >
                    {copiedLink ? "Copied" : "Copy pay link"}
                  </Button>
                  <Button
                    variant="secondary"
                    leadingIcon={<Icon icon={FileEditIcon} size={16} />}
                    disabled={updateStatus.isPending}
                    onClick={() => changeStatus("draft")}
                  >
                    Move to draft
                  </Button>
                </>
              ) : null}
              {collection.collectedMinor > 0 ? (
                <Button
                  variant="secondary"
                  leadingIcon={<Icon icon={MoneyReceive01Icon} size={16} className="text-iris-deep" />}
                  onClick={() => setWithdrawOpen(true)}
                >
                  Withdraw
                </Button>
              ) : null}
              <EditCollectionDialog
                collection={collection}
                trigger={
                  <Button
                    variant="secondary"
                    leadingIcon={<Icon icon={Edit02Icon} size={16} className="text-iris-deep" />}
                  >
                    Edit
                  </Button>
                }
              />
              <DeleteCollectionDialog
                collection={collection}
                trigger={
                  <Button
                    variant="secondary"
                    leadingIcon={<Icon icon={Delete02Icon} size={16} className="text-rose-deep" />}
                  >
                    Delete
                  </Button>
                }
              />
            </div>
          }
        />
      </FadeIn>

      <FadeIn delay={0.08} className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-[1.3fr_1fr_1fr]">
        <div className="relative">
          <div className="absolute right-16 top-[26px] z-10">
            <CollectionTypeInfo collection={collection} />
          </div>
          <StatCard
            tone="filled"
            label="Collected so far"
            value={formatNaira(collection.collectedMinor)}
            icon={Wallet01Icon}
          >
            {hasGoal ? (
              <>
                <ProgressBar
                  value={pct}
                  className="mt-3.5 h-1.5"
                  trackClassName="bg-white/20"
                  barClassName="bg-white"
                />
                <div className="tabular mt-2 text-[11.5px] text-white/70">{goalCaption}</div>
              </>
            ) : (
              <div className="mt-3 text-[11.5px] text-white/70">{goalCaption}</div>
            )}
          </StatCard>
        </div>
        <StatCard
          label="Paid"
          value={`${collection.paidCount} / ${collection.memberCount}`}
          icon={CheckmarkCircle02Icon}
        />
        {hasGoal ? (
          <StatCard
            label="Target"
            value={formatNaira(collection.targetMinor)}
            icon={Target01Icon}
            sub={owing > 0 ? `${formatNaira(owing)} still owing` : "Fully funded"}
          />
        ) : (
          <StatCard
            label={isPerPerson ? "Per person" : "Still owing"}
            value={isPerPerson ? formatNaira(collection.perPersonMinor) : formatNaira(owing)}
            icon={Coins01Icon}
            sub={isPerPerson ? "each member pays this" : undefined}
          />
        )}
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

      <WithdrawToBankSheet
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        title={`Withdraw from ${collection.title}`}
        available={available}
        submitting={withdrawCollection.isPending}
        onSubmit={async ({ amount, accountNumber, bankName }) => {
          const res = await withdrawCollection.mutateAsync({ amount, accountNumber, bankName });
          return {
            status: res.data.status,
            amount: res.data.amount,
            accountName: res.data.accountName,
            bankName: res.data.bankName,
          };
        }}
      />
    </div>
  );
}
