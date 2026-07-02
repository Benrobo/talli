import { motion } from "motion/react";
import { TallyWatermark } from "@/components/ui";
import { MobileScreen } from "@/components/layout";
import { formatNaira } from "@/lib/format";
import { usePaymentVerification } from "@/modules/payments/hooks/use-payment-verification";

export function VerifyStage({
  reference,
  pendingPaymentId,
  amount,
  onConfirmed,
  onFailed,
}: {
  reference: string;
  pendingPaymentId: string | null;
  amount: number;
  onConfirmed: () => void;
  onFailed: () => void;
}) {
  const { secondsLeft } = usePaymentVerification({
    reference,
    pendingPaymentId,
    onConfirmed,
    onFailed,
  });

  return (
    <MobileScreen>
      <div className="relative overflow-hidden rounded-[22px] border border-hairline bg-card px-6 py-12 text-center shadow-card">
        <TallyWatermark className="-right-8 -top-8 size-36 text-iris" opacity={0.06} />
        <div className="relative">
          <span className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-iris-soft">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="size-8 rounded-full border-[3px] border-iris/30 border-t-iris"
            />
          </span>
          <h2 className="font-display text-[21px] font-bold tracking-[-0.02em]">Confirming your transfer</h2>
          <p className="mx-auto mt-2 max-w-[300px] text-[13.5px] leading-relaxed text-content-muted">
            We're checking with the bank. This usually lands in under a minute — keep this page open.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-inset px-4 py-2 text-[12.5px] font-medium text-content-muted">
            <span className="font-display tabular font-bold text-foreground">{formatNaira(amount)}</span>
            · waiting for confirmation
          </div>
          <p className="mt-4 text-[11.5px] text-content-faint">
            {secondsLeft > 0
              ? `Still checking… we'll keep trying for about ${Math.ceil(secondsLeft / 60)} more minute${secondsLeft > 60 ? "s" : ""}.`
              : "Wrapping up…"}
          </p>
        </div>
      </div>
    </MobileScreen>
  );
}
