import { useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { motion } from "motion/react";
import { z } from "zod";
import { Button, Input, ProgressBar } from "@/components/ui";
import { MobileScreen } from "@/components/layout";
import { Icon } from "@benrobo/iconary/react";
import {
  AlertCircleIcon,
  ArrowLeft01Icon,
  PiggyBankIcon,
  TickDouble02Icon,
} from "@benrobo/iconary/core/duotone-rounded";
import { formatNaira, formatNairaShort, toPercent } from "@/lib/format";
import { useMe } from "@/api/http/v1/auth/auth.hooks";
import { useDepositToSavingsJar, useSavingsJar } from "@/api/http/v1/savings/savings.hooks";
import { depositToSavingsJarSchema } from "@/api/http/v1/savings/savings.types";
import {
  CheckoutSecureFooter,
  NombaPayDoneContent,
  NombaPayTransferActions,
  NombaPayTransferContent,
  type NombaCheckoutDetails,
} from "@/modules/payments/components/nomba-checkout-ui";
import type { Jar } from "@/modules/savings/types";

type Stage = "amount" | "pay" | "done";

function toJar(source: NonNullable<ReturnType<typeof useSavingsJar>["data"]>["data"]): Jar {
  return {
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
  };
}

export function JarPayPage() {
  const { id } = useParams({ from: "/pay/jar/$id" });
  const navigate = useNavigate();
  const deposit = useDepositToSavingsJar(id);
  const { data: meResponse } = useMe();
  const { data: response, isLoading, isError } = useSavingsJar(id);

  const [stage, setStage] = useState<Stage>("amount");
  const [amountInput, setAmountInput] = useState("");
  const [checkout, setCheckout] = useState<NombaCheckoutDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const firstName = meResponse?.data?.user?.name?.trim().split(/\s+/)[0] ?? "You";

  async function startCheckout() {
    const numericAmount = Number(amountInput);
    if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError("Enter an amount greater than zero");
      return;
    }

    setError(null);
    try {
      const payload = depositToSavingsJarSchema.parse({ amount: numericAmount });
      const result = await deposit.mutateAsync(payload);
      setCheckout({
        amount: result.data.amount,
        flashAccountNumber: result.data.flashAccountNumber,
        flashBankName: result.data.flashBankName,
        flashAccountName: result.data.flashAccountName,
        checkoutUrl: result.data.checkoutUrl,
      });
      setStage("pay");
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.issues[0]?.message ?? "Invalid amount");
        return;
      }
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Couldn't start payment. Try again."
      );
    }
  }

  function copyAccount() {
    if (!checkout) return;
    navigator.clipboard.writeText(checkout.flashAccountNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  if (isLoading) {
    return (
      <MobileScreen>
        <div className="flex flex-1 items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="size-8 rounded-full border-[3px] border-hairline border-t-iris"
          />
        </div>
      </MobileScreen>
    );
  }

  if (isError || !response?.data) {
    return (
      <MobileScreen>
        <div className="flex flex-col items-center rounded-[22px] border border-hairline bg-card px-6 py-12 text-center shadow-card">
          <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-soft text-rose-deep">
            <Icon icon={AlertCircleIcon} size={26} />
          </span>
          <div className="font-display text-[21px] font-bold tracking-[-0.02em]">This jar isn't available</div>
          <p className="mt-2 text-[13.5px] text-content-muted">The jar may have been removed or you don't have access.</p>
        </div>
      </MobileScreen>
    );
  }

  const jar = toJar(response.data);
  const pct = toPercent(jar.savedMinor, jar.targetMinor);
  const remaining = Math.max(0, jar.targetMinor - jar.savedMinor);

  if (stage === "pay" && checkout) {
    return (
      <MobileScreen
        footer={
          <div>
            <NombaPayTransferActions checkoutUrl={checkout.checkoutUrl} onPaid={() => setStage("done")} />
            <CheckoutSecureFooter note="Secured by Nomba · money goes into your jar" />
          </div>
        }
      >
        <NombaPayTransferContent
          transferLabel={`${firstName}, transfer`}
          title={jar.name}
          checkout={checkout}
          copied={copied}
          onCopy={copyAccount}
        />
      </MobileScreen>
    );
  }

  if (stage === "done" && checkout) {
    return (
      <MobileScreen>
        <NombaPayDoneContent
          headline={`You're all set, ${firstName}!`}
          description={`${formatNaira(checkout.amount)} added to ${jar.name}.`}
          backLabel="Back to jar"
          onBack={() => navigate({ to: "/app/savings/$id", params: { id } })}
        />
      </MobileScreen>
    );
  }

  return (
    <MobileScreen
      footer={
        <motion.div initial={false} animate={{ opacity: amountInput ? 1 : 0.55 }}>
          <Button block size="lg" disabled={deposit.isPending || !amountInput} onClick={startCheckout}>
            {deposit.isPending
              ? "Setting up…"
              : amountInput
                ? `Pay ${formatNaira(Number(amountInput))}`
                : "Enter an amount"}
          </Button>
          <CheckoutSecureFooter note="Secured by Nomba · money goes into your jar" />
        </motion.div>
      }
    >
      <div className="overflow-hidden rounded-[22px] border border-hairline bg-card shadow-card">
        <JarPayHeader jar={jar} pct={pct} remaining={remaining} jarId={id} />
        <div className="flex flex-col gap-2.5 p-4">
          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
            <div className="mb-5 text-center">
              <div className="text-[24px] font-extrabold leading-tight tracking-[-0.03em]">How much?</div>
              <div className="mt-2 text-[13px] text-content-muted">
                {jar.targetMinor > 0
                  ? `${formatNaira(remaining)} left to reach ${formatNairaShort(jar.targetMinor)}`
                  : "Add any amount to this jar"}
              </div>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-medium text-content-muted">Amount to add</span>
              <Input
                autoFocus
                inputMode="numeric"
                placeholder="₦0"
                value={amountInput}
                invalid={!!error}
                onChange={(event) => {
                  setError(null);
                  setAmountInput(event.target.value.replace(/[^\d]/g, ""));
                }}
              />
            </label>
            {error ? <p className="mt-2 text-[12.5px] text-destructive">{error}</p> : null}
          </motion.div>
        </div>
      </div>
    </MobileScreen>
  );
}

function JarPayHeader({
  jar,
  pct,
  remaining,
  jarId,
}: {
  jar: Jar;
  pct: number;
  remaining: number;
  jarId: string;
}) {
  return (
    <div className="border-b border-hairline-soft p-5">
      <Link
        to="/app/savings/$id"
        params={{ id: jarId }}
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] text-content-muted transition-colors hover:text-foreground"
      >
        <Icon icon={ArrowLeft01Icon} size={14} />
        Back to jar
      </Link>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-content-muted">Savings jar</div>
          <div className="mt-0.5 truncate font-display text-[23px] font-bold leading-tight tracking-[-0.02em] text-foreground">
            {jar.name}
          </div>
          <div className="mt-1 text-[12.5px] text-content-faint">
            {formatNaira(jar.savedMinor)} saved
            {jar.targetMinor > 0 ? ` · ${formatNaira(remaining)} to go` : ""}
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-iris-soft px-2.5 py-1 text-[11px] font-medium text-iris-deep">
          <Icon icon={TickDouble02Icon} size={12} />
          Choose amount
        </span>
      </div>
      {jar.targetMinor > 0 ? (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-[11.5px] text-content-faint">
            <span className="flex items-center gap-1.5">
              <Icon icon={PiggyBankIcon} size={13} />
              Target {formatNairaShort(jar.targetMinor)}
            </span>
            <span>{pct}%</span>
          </div>
          <ProgressBar value={pct} className="h-1.5" />
        </div>
      ) : null}
    </div>
  );
}
