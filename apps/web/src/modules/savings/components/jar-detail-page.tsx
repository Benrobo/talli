import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Button,
  EmptyState,
  FadeIn,
  ListRow,
  PageHeader,
  ProgressBar,
  SectionCard,
  StatCard,
  StatusPill,
} from "@/components/ui";
import { Icon } from "@benrobo/iconary/react";
import {
  ArrowLeft01Icon,
  Delete02Icon,
  Edit02Icon,
  PlusSignIcon,
  SquareLock02Icon,
  Coins01Icon,
  MoneyReceive01Icon,
  Target01Icon,
} from "@benrobo/iconary/core/duotone-rounded";
import { TransactionIcon } from "@/modules/transactions/components/transaction-icon";
import { formatNaira, formatNairaShort, toPercent } from "@/lib/format";
import { EditJarDialog } from "@/modules/savings/components/edit-jar-dialog";
import { DeleteJarDialog } from "@/modules/savings/components/delete-jar-dialog";
import { AddMoneySheet } from "@/modules/savings/components/add-money-sheet";
import { WithdrawJarSheet } from "@/modules/savings/components/withdraw-jar-sheet";
import { jarIconFor } from "@/modules/savings/jar-style";
import type { Jar } from "@/modules/savings/types";

interface JarDetailPageProps {
  jar: Jar;
}

export function JarDetailPage({ jar }: JarDetailPageProps) {
  const pct = toPercent(jar.savedMinor, jar.targetMinor);
  const locked = jar.status === "locked";
  const remaining = Math.max(0, jar.targetMinor - jar.savedMinor);
  const unlockDate = locked ? jar.lockText.replace(/^unlocks\s*/i, "") : "—";
  const [addOpen, setAddOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  return (
    <div>
      <Link
        to="/app/savings"
        className="mb-[18px] inline-flex items-center gap-1.5 text-[13px] text-content-muted transition-colors hover:text-foreground"
      >
        <Icon icon={ArrowLeft01Icon} size={15} />
        Savings jars
      </Link>

      <FadeIn y={8}>
        <PageHeader
          className="mb-6"
          title={
            <span className="inline-flex flex-wrap items-center gap-2.5 sm:gap-3">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-[11px] text-white shadow-chip"
                style={{ backgroundColor: jar.accentColor }}
              >
                <Icon icon={jarIconFor(jar.icon)} size={17} />
              </span>
              {jar.name}
              {locked ? (
                <StatusPill status="pending">Locked</StatusPill>
              ) : (
                <StatusPill status="success">Active</StatusPill>
              )}
            </span>
          }
          subtitle={
            <>
              {formatNaira(jar.savedMinor)} saved
              {jar.targetAmountMinor ? ` · ${formatNairaShort(jar.targetMinor)} target` : ""}
              {locked ? ` · unlocks ${unlockDate}` : ""}
            </>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                leadingIcon={<Icon icon={PlusSignIcon} size={16} />}
                onClick={() => setAddOpen(true)}
              >
                Add money
              </Button>
              {jar.savedMinor > 0 ? (
                <Button
                  variant="secondary"
                  leadingIcon={<Icon icon={MoneyReceive01Icon} size={16} />}
                  onClick={() => setWithdrawOpen(true)}
                >
                  Withdraw
                </Button>
              ) : null}
              <EditJarDialog
                jar={jar}
                trigger={
                  <Button variant="secondary" leadingIcon={<Icon icon={Edit02Icon} size={16} />}>
                    Edit
                  </Button>
                }
              />
              {jar.savedMinor === 0 ? (
                <DeleteJarDialog
                  jar={jar}
                  trigger={
                    <Button variant="secondary" leadingIcon={<Icon icon={Delete02Icon} size={16} />}>
                      Delete
                    </Button>
                  }
                />
              ) : null}
            </div>
          }
        />
      </FadeIn>

      <FadeIn delay={0.05} className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <StatCard
          tone="filled"
          label="Saved in jar"
          value={formatNaira(jar.savedMinor)}
          icon={Coins01Icon}
          sub={remaining === 0 ? "target reached" : `${formatNaira(remaining)} to go`}
        >
          <div className="mt-4">
            <ProgressBar value={pct} className="h-1.5 bg-white/20" barClassName="bg-white" />
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
              <span className="tabular text-[12px] text-content-muted">{jar.deposits.length} total</span>
            ) : null
          }
          flush
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
                leading={<TransactionIcon kind="savings_deposit" />}
                title={
                  <span className="tabular font-semibold text-emerald-deep">
                    + {formatNaira(deposit.amountMinor)}
                  </span>
                }
                subtitle={deposit.when}
              />
            ))
          )}
        </SectionCard>
      </FadeIn>

      <AddMoneySheet open={addOpen} onOpenChange={setAddOpen} jarId={jar.id} jarName={jar.name} />
      <WithdrawJarSheet
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        jarId={jar.id}
        jarName={jar.name}
        available={jar.savedMinor}
      />
    </div>
  );
}
