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
  const jar: Jar | null = source?.jar
    ? {
        id: source.jar.id,
        name: source.jar.name,
        savedMinor: source.jar.currentAmount,
        targetMinor: source.jar.targetAmount ?? source.jar.currentAmount,
        targetAmountMinor: source.jar.targetAmount,
        lockUntil: source.jar.lockUntil,
        status: source.jar.status === "locked" ? "locked" : "active",
        lockText: source.jar.lockUntil
          ? `unlocks ${new Date(source.jar.lockUntil).toLocaleDateString("en-NG")}`
          : "no lock",
        canEditAmounts: source.jar.currentAmount === 0,
        deposits: source.deposits.map((deposit) => ({
          amountMinor: deposit.amount,
          when: new Date(deposit.createdAt).toLocaleString("en-NG"),
        })),
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
