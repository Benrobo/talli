import { createFileRoute } from "@tanstack/react-router";
import { useSavingsJar } from "@/api/http/v1/savings/savings.hooks";
import { JarDetailPage } from "@/modules/savings/components/jar-detail-page";
import type { Jar } from "@/modules/savings/types";

export const Route = createFileRoute("/app/savings/$id")({
  component: JarDetailRoute,
});

function JarDetailRoute() {
  const { id } = Route.useParams();
  const { data: response, isLoading, isError } = useSavingsJar(id);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-[14px] text-content-muted">
        Loading jar…
      </div>
    );
  }

  const source = response?.data;
  const jar: Jar | null = source
    ? {
        id: source.id,
        name: source.name,
        savedMinor: source.currentAmount,
        targetMinor: source.targetAmount ?? source.currentAmount,
        status: source.status === "locked" ? "locked" : "active",
        lockText: source.lockUntil
          ? `unlocks ${new Date(source.lockUntil).toLocaleDateString("en-NG")}`
          : "no lock",
        deposits: [],
      }
    : null;

  if (isError || !jar) {
    return (
      <div className="py-20 text-center text-[14px] text-content-muted">
        Jar not found
      </div>
    );
  }

  return <JarDetailPage jar={jar} />;
}
