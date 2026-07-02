import { motion } from "motion/react";
import { Input } from "@/components/ui";
import { formatNaira } from "@/lib/format";

export function AmountStep({
  payerName,
  title,
  targetAmount,
  value,
  onChange,
  onBack,
  submitting,
  error,
}: {
  payerName: string;
  title: string;
  targetAmount: number | null;
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}>
      <div className="mb-8 text-center">
        <div className="mb-1.5 text-[13px] text-content-muted">{payerName} · {title}</div>
        <div className="text-[24px] font-extrabold leading-tight tracking-[-0.03em]">How much?</div>
        {targetAmount ? (
          <div className="mt-2 text-[13px] text-content-muted">Target {formatNaira(targetAmount)}</div>
        ) : null}
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[12.5px] font-medium text-content-muted">Your contribution</span>
        <Input
          autoFocus
          inputMode="numeric"
          placeholder="₦0"
          value={value}
          invalid={!!error}
          onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ""))}
        />
      </label>
      {error ? <p className="mt-2 text-[12.5px] text-destructive">{error}</p> : null}

      <button
        onClick={onBack}
        disabled={submitting}
        className="mt-6 block w-full text-center text-[13px] text-content-faint"
      >
        ← Back
      </button>
    </motion.div>
  );
}
