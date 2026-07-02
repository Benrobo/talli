import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Icon } from "@benrobo/iconary/react";
import { Delete01Icon } from "@benrobo/iconary/core/duotone-rounded";
import { formatNairaShort } from "@/lib/format";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "back"] as const;


export function AmountNumpad({
  value,
  onChange,
  max,
  quickAmounts = [1000, 5000],
  maxDigits = 9,
}: {
  value: string;
  onChange: (next: string) => void;
  max?: number;
  quickAmounts?: number[];
  maxDigits?: number;
}) {
  function press(key: (typeof KEYS)[number]) {
    if (key === "back") {
      onChange(value.slice(0, -1));
      return;
    }
    let next = (value + key).replace(/^0+(?=\d)/, "");
    if (next.length > maxDigits) return;
    if (max != null && Number(next) > max) next = String(max);
    onChange(next);
  }

  // Prefer the fixed suggestions when they fit under the balance; otherwise fall
  // back to proportional ones (¼, ½) so the chips are always relevant, even for a
  // small balance where ₦1k/₦5k wouldn't make sense.
  const fitting = quickAmounts.filter((a) => max == null || a <= max);
  const chips =
    fitting.length > 0
      ? fitting
      : max != null && max > 0
        ? [...new Set([Math.floor(max / 4), Math.floor(max / 2)])].filter((a) => a > 0)
        : [];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        {chips.map((amount) => (
          <Chip key={amount} label={formatNairaShort(amount)} onClick={() => onChange(String(amount))} />
        ))}
        {max != null && max > 0 ? (
          <Chip label="Max" onClick={() => onChange(String(max))} accent />
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <motion.button
            key={key}
            type="button"
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 600, damping: 22 }}
            onClick={() => press(key)}
            className={cn(
              "flex h-14 items-center justify-center rounded-[14px] text-[22px] font-semibold text-foreground transition-colors",
              "bg-inset/60 hover:bg-inset active:bg-inset",
              key === "back" && " text-danger"
            )}
          >
            {key === "back" ? <Icon icon={Delete01Icon} size={22} /> : key}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function Chip({ label, onClick, accent }: { label: string; onClick: () => void; accent?: boolean }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 600, damping: 22 }}
      onClick={onClick}
      className={cn(
        "t-press rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
        accent
          ? "border-iris/40 bg-iris-soft text-iris-deep hover:bg-iris-soft/80"
          : "border-hairline bg-card text-content-muted hover:bg-inset"
      )}
    >
      {label}
    </motion.button>
  );
}
