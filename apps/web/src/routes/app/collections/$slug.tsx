import { createFileRoute } from "@tanstack/react-router";
import dayjs from "dayjs";
import { CollectionDetailPage } from "@/modules/collections/components/collection-detail-page";
import { useCollection, useCollectionMembers } from "@/api/http/v1/collections/collections.hooks";
import { NotFoundState } from "@/components/empty-states";
import { CollectionDetailSkeleton } from "@/components/skeleton-loaders";
import { UserGroupIcon } from "@benrobo/iconary/core/duotone-rounded";
import type { Collection, MemberStatus } from "@/modules/collections/types";

export const Route = createFileRoute("/app/collections/$slug")({
  component: CollectionDetailRoute,
});

function CollectionDetailRoute() {
  const { slug } = Route.useParams();
  const { data: collectionResponse, isLoading, isError } = useCollection(slug);
  const { data: membersResponse } = useCollectionMembers(slug, { pageSize: 50 });

  if (isLoading) {
    return <CollectionDetailSkeleton />;
  }

  if (isError || !collectionResponse?.data) {
    return (
      <NotFoundState
        icon={UserGroupIcon}
        title="Collection not found"
        description="This collection may have been closed or deleted, or the link is out of date."
        backTo="/app/collections"
        backLabel="Back to collections"
      />
    );
  }

  const source = collectionResponse.data;
  const members = membersResponse?.data.members ?? [];
  const totalCollected = source.totalCollected ?? source.collected ?? 0;
  const collectionType =
    source.collectionType === "fixed_per_person" ||
    source.collectionType === "open_contribution" ||
    source.collectionType === "named_members"
      ? source.collectionType
      : "open_contribution";
  const deadline = source.deadline ?? null;
  const collection: Collection = {
    slug: source.id,
    payReference: source.id,
    title: source.title,
    purpose: source.purpose,
    collectionType,
    status: source.status === "draft" ? "draft" : source.status === "active" || source.status === "partially_paid" ? "live" : "closed",
    perPersonMinor: source.amountPerMember ?? 0,
    targetMinor: source.targetAmount ?? totalCollected,
    collectedMinor: totalCollected,
    paidCount: members.filter((member) => member.status === "paid").length,
    memberCount: members.length,
    due: deadline ? dayjs(deadline).format("DD/MM/YYYY") : "",
    deadline,
    canEditAmounts: totalCollected === 0 && !members.some((member) => member.paidAmount > 0),
    members: members.map((member) => ({
      name: member.displayName,
      status: member.status === "paid" ? "paid" : member.status === "pending" ? "paying" : "unpaid" as MemberStatus,
      note: member.status,
    })),
  };

  return <CollectionDetailPage collection={collection} />;
}
