import { createFileRoute } from "@tanstack/react-router";
import dayjs from "dayjs";
import { MoneySavingJarIcon } from "@benrobo/iconary/core/duotone-rounded";
import { useSavingsJar } from "@/api/http/v1/savings/savings.hooks";
import { JarDetailPage } from "@/modules/savings/components/jar-detail-page";
import { formatTxDate } from "@/lib/format";
import { NotFoundState } from "@/components/empty-states";
import { JarDetailSkeleton } from "@/components/skeleton-loaders";
import type { Jar } from "@/modules/savings/types";

export const Route = createFileRoute("/app/savings/$id")({
  component: JarDetailRoute,
});

function JarDetailRoute() {
  const { id } = Route.useParams();
  const { data: response, isLoading, isError } = useSavingsJar(id);

  if (isLoading) {
    return <JarDetailSkeleton />;
  }

  const source = response?.data;
  const jar: Jar | null = source?.jar
    ? {
        id: source.jar.id,
        name: source.jar.name,
        icon: source.jar.icon,
        accentColor: source.jar.accentColor,
        savedMinor: source.jar.currentAmount,
        targetMinor: source.jar.targetAmount ?? source.jar.currentAmount,
        targetAmountMinor: source.jar.targetAmount,
        lockUntil: source.jar.lockUntil,
        status: source.jar.status === "locked" ? "locked" : "active",
        lockText: source.jar.lockUntil
          ? `unlocks ${dayjs(source.jar.lockUntil).format("DD/MM/YYYY")}`
          : "no lock",
        canEditAmounts: source.jar.currentAmount === 0,
        deposits: source.deposits.map((deposit) => ({
          amountMinor: deposit.amount,
          when: formatTxDate(deposit.createdAt),
        })),
      }
    : null;

  if (isError || !jar) {
    return (
      <NotFoundState
        icon={MoneySavingJarIcon}
        title="Savings jar not found"
        description="This jar may have been closed or deleted, or the link is out of date."
        backTo="/app/savings"
        backLabel="Back to savings"
      />
    );
  }

  return <JarDetailPage jar={jar} />;
}
