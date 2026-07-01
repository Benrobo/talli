import { createFileRoute } from "@tanstack/react-router";
import { CollectionDetailPage } from "@/modules/collections/components/collection-detail-page";
import { getCollection } from "@/data/mock/collections";

export const Route = createFileRoute("/app/collections/$slug")({
  component: CollectionDetailRoute,
});

function CollectionDetailRoute() {
  const { slug } = Route.useParams();
  const collection = getCollection(slug);

  if (!collection) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-[13.5px] text-content-muted">
        Collection not found
      </div>
    );
  }

  return <CollectionDetailPage collection={collection} />;
}
