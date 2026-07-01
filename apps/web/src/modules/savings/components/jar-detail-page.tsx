import { Link } from "@tanstack/react-router";
import {
  Button,
  EmptyState,
  FadeIn,
  ListRow,
  ProgressBar,
  SectionCard,
  StatCard,
  StatusPill,
} from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import {
  ArrowLeft01Icon,
  PlusSignIcon,
  Tick02Icon,
  SquareLock02Icon,
  Coins01Icon,
  Target01Icon,
} from "@benrobo/iconary/core/duotone-rounded";
import { formatNaira, formatNairaShort, toPercent } from "@/lib/format";
import type { Jar } from "@/modules/savings/types";

interface JarDetailPageProps {
  jar: Jar;
}

export function JarDetailPage({ jar }: JarDetailPageProps) {
  const pct = toPercent(jar.savedMinor, jar.targetMinor);
  const locked = jar.status === "locked";
  const remaining = Math.max(0, jar.targetMinor - jar.savedMinor);
  const unlockDate = locked ? jar.lockText.replace(/^unlocks\s*/i, "") : "—";

  return (
    <div>
      <FadeIn y={8}>
        <Link
          to="/savings"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-content-muted transition-colors hover:text-foreground"
        >
          <Icon icon={ArrowLeft01Icon} size={15} />
          Savings jars
        </Link>

        <div className="mb-5 flex items-center gap-3">
          <h1 className="text-[26px] font-bold tracking-[-0.02em]">{jar.name}</h1>
          {locked ? (
            <StatusPill status="pending">Locked</StatusPill>
          ) : (
            <StatusPill status="success">Active</StatusPill>
          )}
        </div>
      </FadeIn>

      <FadeIn delay={0.05} className="mb-4 grid grid-cols-3 gap-3.5">
        <StatCard
          tone="filled"
          label="Saved in jar"
          value={formatNaira(jar.savedMinor)}
          icon={Coins01Icon}
          sub={remaining === 0 ? "target reached" : `${formatNaira(remaining)} to go`}
        >
          <div className="mt-4">
            <ProgressBar
              value={pct}
              className="h-1.5 bg-white/20"
              barClassName="bg-white"
            />
            <div className="tabular mt-2 text-[11.5px] text-white/70">
              {pct}% of {formatNairaShort(jar.targetMinor)}
            </div>
          </div>
        </StatCard>
        <StatCard
          label="Target"
          value={formatNairaShort(jar.targetMinor)}
          icon={Target01Icon}
          sub="jar goal"
        />
        <StatCard
          label="Unlocks"
          value={unlockDate}
          icon={SquareLock02Icon}
          sub={locked ? "date lock" : "flexible · anytime"}
        />
      </FadeIn>

      {locked ? (
        <FadeIn delay={0.14}>
          <div className="mb-4 flex items-center gap-3 rounded-[16px] border border-hairline bg-card p-4 shadow-card">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-amber-soft text-amber-deep">
              <Icon icon={SquareLock02Icon} size={17} />
            </span>
            <span className="text-[12.5px] text-content-muted">
              This jar is locked — you can keep adding money, but withdrawals wait until{" "}
              <b className="font-semibold text-foreground">{unlockDate}</b>.
            </span>
          </div>
        </FadeIn>
      ) : null}

      <FadeIn delay={0.16}>
        <SectionCard
          title="Recent deposits"
          action={
            jar.deposits.length > 0 ? (
              <span className="tabular text-[12px] text-content-muted">
                {jar.deposits.length} total
              </span>
            ) : null
          }
          flush
          className="mb-4"
        >
          {jar.deposits.length === 0 ? (
            <EmptyState
              icon={Coins01Icon}
              title="No deposits yet"
              description="Money you add — from chat or here — will show up in this ledger."
              className="rounded-none border-0 bg-transparent py-10"
            />
          ) : (
            jar.deposits.map((deposit) => (
              <ListRow
                key={deposit.when}
                leading={
                  <span className="flex size-9 items-center justify-center rounded-[11px] bg-emerald-500/10 text-emerald-600">
                    <Icon icon={Tick02Icon} size={16} />
                  </span>
                }
                title={
                  <span className="tabular font-semibold text-emerald-600">
                    + {formatNaira(deposit.amountMinor)}
                  </span>
                }
                subtitle={deposit.when}
              />
            ))
          )}
        </SectionCard>
      </FadeIn>

      <FadeIn delay={0.2}>
        <Button block size="lg" leadingIcon={<Icon icon={PlusSignIcon} size={16} />}>
          Add money
        </Button>
      </FadeIn>
    </div>
  );
}
