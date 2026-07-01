import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import toast from "react-hot-toast";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  FadeIn,
  IconChip,
  Input,
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
import { useDepositToSavingsJar } from "@/api/http/v1/savings/savings.hooks";
import { depositToSavingsJarSchema } from "@/api/http/v1/savings/savings.types";
import type { Jar } from "@/modules/savings/types";
import { z } from "zod";

interface JarDetailPageProps {
  jar: Jar;
}

export function JarDetailPage({ jar }: JarDetailPageProps) {
  const [open, setOpen] = useState(false);
  const [fundingInfo, setFundingInfo] = useState<{
    flashAccountNumber: string;
    flashAccountName: string;
    flashBankName: string;
    amount: number;
  } | null>(null);
  const deposit = useDepositToSavingsJar(jar.id);
  const pct = toPercent(jar.savedMinor, jar.targetMinor);
  const locked = jar.status === "locked";
  const remaining = Math.max(0, jar.targetMinor - jar.savedMinor);
  const unlockDate = locked ? jar.lockText.replace(/^unlocks\s*/i, "") : "—";
  const form = useForm({
    defaultValues: { amount: "" },
    onSubmit: async ({ value }) => {
      try {
        const payload = depositToSavingsJarSchema.parse({ amount: Number(value.amount) * 100 });
        const result = await deposit.mutateAsync(payload);
        setFundingInfo({
          flashAccountNumber: result.data.flashAccountNumber,
          flashAccountName: result.data.flashAccountName,
          flashBankName: result.data.flashBankName,
          amount: result.data.amount,
        });
        toast.success("Transfer to the account shown to fund this jar.");
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast.error(error.issues[0]?.message ?? "Invalid amount");
          return;
        }
        toast.error("Couldn't add money. Check balance and try again.");
      }
    },
  });

  return (
    <div>
      <FadeIn y={8}>
        <Link
          to="/app/savings"
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
                  <IconChip tone="emerald" size="md">
                    <Icon icon={Tick02Icon} size={16} />
                  </IconChip>
                }
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

      <FadeIn delay={0.2}>
        <Button block size="lg" leadingIcon={<Icon icon={PlusSignIcon} size={16} />} onClick={() => setOpen(true)}>
          Add money
        </Button>
      </FadeIn>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setFundingInfo(null);
            form.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Add money to {jar.name}</DialogTitle>
            <DialogDescription>Generate a Nomba payment account and transfer into it to fund this jar.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              form.handleSubmit();
            }}
          >
            <form.Field
              name="amount"
              validators={{
                onChange: ({ value }) => {
                  if (!value) return "Amount is required";
                  return Number(value) > 0 ? undefined : "Amount must be greater than zero";
                },
              }}
              children={(field) => (
                <div>
                  <div className="mb-1.5 block text-[12.5px] font-medium text-content-muted">Amount</div>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value.replace(/[^\d]/g, ""))}
                    onBlur={field.handleBlur}
                  />
                </div>
              )}
            />
          </form>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={deposit.isPending}>
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting] as const}
              children={([canSubmit, isSubmitting]) => (
                <Button onClick={() => form.handleSubmit()} disabled={!canSubmit || isSubmitting || deposit.isPending}>
                  {deposit.isPending ? "Adding…" : "Add money"}
                </Button>
              )}
            />
          </DialogFooter>
          {fundingInfo ? (
            <div className="rounded-[12px] border border-hairline bg-inset px-4 py-3 text-[12.5px]">
              <div className="mb-1 font-medium text-foreground">Pay {formatNaira(fundingInfo.amount)}</div>
              <div className="text-content-muted">{fundingInfo.flashAccountName}</div>
              <div className="tabular text-foreground">{fundingInfo.flashAccountNumber}</div>
              <div className="text-content-muted">{fundingInfo.flashBankName}</div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
