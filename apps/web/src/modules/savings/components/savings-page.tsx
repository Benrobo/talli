import {
  Button,
  EmptyState,
  FadeIn,
  PageHeader,
  StatCard,
  Stagger,
  StaggerItem,
} from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import {
  MoneySavingJarIcon,
  PlusSignIcon,
  SquareLock02Icon,
  Coins01Icon,
} from "@benrobo/iconary/core/duotone-rounded";
import { formatNaira, toPercent } from "@/lib/format";
import { useSavingsJars } from "@/api/http/v1/savings/savings.hooks";
import { JarCard } from "@/modules/savings/components/jar-card";
import { NewJarDialog } from "@/modules/savings/components/new-jar-dialog";
import type { Jar } from "@/modules/savings/types";

function toJar(record: {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number | null;
  status: string;
  lockUntil: string | null;
}): Jar {
  return {
    id: record.id,
    name: record.name,
    savedMinor: record.currentAmount,
    targetMinor: record.targetAmount ?? record.currentAmount,
    status: record.status === "locked" ? "locked" : "active",
    lockText: record.lockUntil ? `unlocks ${new Date(record.lockUntil).toLocaleDateString("en-NG")}` : "no lock",
    deposits: [],
  };
}

export function SavingsPage() {
  const { data: response, isLoading, isError } = useSavingsJars();
  const jars = (response?.data ?? []).map(toJar);
  const totalSavedMinor = jars.reduce((sum, jar) => sum + jar.savedMinor, 0);
  const totalTargetMinor = jars.reduce((sum, jar) => sum + jar.targetMinor, 0);
  const jarCount = jars.length;
  const lockedCount = jars.filter((jar) => jar.status === "locked").length;
  const overallPct = toPercent(totalSavedMinor, totalTargetMinor);

  const newJar = (
    <NewJarDialog
      trigger={
        <Button leadingIcon={<Icon icon={PlusSignIcon} size={16} />}>New jar</Button>
      }
    />
  );

  return (
    <div>
      <PageHeader
        eyebrow="Savings"
        title="Your jars"
        subtitle="Money set aside, jar by jar — lock it to a date or keep it flexible."
        actions={jars.length > 0 ? newJar : null}
      />

      {isLoading ? (
        <FadeIn delay={0.05}>
          <EmptyState
            icon={MoneySavingJarIcon}
            title="Loading jars…"
            description="Fetching your latest savings jars."
          />
        </FadeIn>
      ) : isError ? (
        <FadeIn delay={0.05}>
          <EmptyState
            icon={MoneySavingJarIcon}
            title="Couldn't load jars"
            description="Please refresh and try again."
          />
        </FadeIn>
      ) : jars.length === 0 ? (
        <FadeIn delay={0.05}>
          <EmptyState
            icon={MoneySavingJarIcon}
            title="No jars yet"
            description="Create a jar to start setting money aside — lock it until a date or keep it flexible."
            action={newJar}
          />
        </FadeIn>
      ) : (
        <>
          <FadeIn delay={0.05} className="mb-5 grid grid-cols-3 gap-3.5">
            <StatCard
              tone="filled"
              label="Saved across jars"
              value={formatNaira(totalSavedMinor)}
              icon={Coins01Icon}
              sub={`${overallPct}% of ${formatNaira(totalTargetMinor)} targeted`}
            />
            <StatCard
              label="Active jars"
              value={jarCount}
              icon={MoneySavingJarIcon}
              sub={jarCount === 1 ? "jar" : "jars in total"}
            />
            <StatCard
              label="Locked"
              value={lockedCount}
              icon={SquareLock02Icon}
              sub={lockedCount === 1 ? "jar on a date lock" : "jars on a date lock"}
            />
          </FadeIn>

          <FadeIn delay={0.1} className="mb-2.5">
            <span className="text-[13px] font-semibold text-foreground">All jars</span>
          </FadeIn>

          <Stagger className="grid grid-cols-3 gap-3.5">
            {jars.map((jar) => (
              <StaggerItem key={jar.id}>
                <JarCard jar={jar} />
              </StaggerItem>
            ))}
          </Stagger>
        </>
      )}
    </div>
  );
}
