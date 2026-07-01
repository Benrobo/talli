import { createFileRoute } from "@tanstack/react-router";
import { CollectionDetailPage } from "@/modules/collections/components/collection-detail-page";
import { useCollection, useCollectionMembers } from "@/api/http/v1/collections/collections.hooks";
import type { Collection, MemberStatus } from "@/modules/collections/types";

export const Route = createFileRoute("/app/collections/$slug")({
  component: CollectionDetailRoute,
});

function CollectionDetailRoute() {
  const { slug } = Route.useParams();
  const { data: collectionResponse, isLoading, isError } = useCollection(slug);
  const { data: membersResponse } = useCollectionMembers(slug, { pageSize: 50 });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-[13.5px] text-content-muted">
        Loading collection…
      </div>
    );
  }

  if (isError || !collectionResponse?.data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-[13.5px] text-content-muted">
        Collection not found
      </div>
    );
  }

  const source = collectionResponse.data;
  const members = membersResponse?.data.members ?? [];
  const totalCollected = source.totalCollected ?? source.collected ?? 0;
  const collection: Collection = {
    slug: source.id,
    payReference: source.id,
    title: source.title,
    status: source.status === "draft" ? "draft" : source.status === "active" || source.status === "partially_paid" ? "live" : "closed",
    perPersonMinor: source.amountPerMember ?? 0,
    targetMinor: source.targetAmount ?? totalCollected,
    collectedMinor: totalCollected,
    paidCount: members.filter((member) => member.status === "paid").length,
    memberCount: members.length,
    due: source.updatedAt ? new Date(source.updatedAt).toLocaleDateString("en-NG") : "",
    members: members.map((member) => ({
      name: member.displayName,
      status: member.status === "paid" ? "paid" : member.status === "pending" ? "paying" : "unpaid" as MemberStatus,
      note: member.status,
    })),
  };

  return <CollectionDetailPage collection={collection} />;
}
