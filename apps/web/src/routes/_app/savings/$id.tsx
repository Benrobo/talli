import { createFileRoute } from "@tanstack/react-router";
import { getJar } from "@/data/mock/savings";
import { JarDetailPage } from "@/modules/savings/components/jar-detail-page";

export const Route = createFileRoute("/_app/savings/$id")({
  component: JarDetailRoute,
});

function JarDetailRoute() {
  const { id } = Route.useParams();
  const jar = getJar(id);

  if (!jar) {
    return (
      <div className="py-20 text-center text-[14px] text-content-muted">
        Jar not found
      </div>
    );
  }

  return <JarDetailPage jar={jar} />;
}
