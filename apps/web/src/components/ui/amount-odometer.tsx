import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * A ₦ amount whose digits roll vertically into place as the value changes — an
 * odometer feel. Each character position is stable (keyed by its distance from the
 * end), so only the character that actually changed rolls; the rest stay put.
 * Reusable anywhere an amount is entered (withdraw, top-up, save, send).
 */
export function AmountOdometer({
  value,
  className,
  muted,
}: {
  value: number;
  className?: string;
  /** Render dimmed (e.g. when the amount is still 0 / a placeholder). */
  muted?: boolean;
}) {
  const text = `₦${value.toLocaleString("en-NG")}`;
  const chars = text.split("");
  const total = chars.length;

  return (
    <div
      className={cn(
        "tabular flex items-center justify-center font-display font-extrabold leading-none tracking-[-0.03em]",
        muted ? "text-content-faint" : "text-foreground",
        className
      )}
      aria-label={text}
    >
      {chars.map((char, i) => (
        // Key by position from the RIGHT so a digit keeps its cell as the number
        // grows/shrinks — that's what makes only the changed digit roll.
        <OdometerChar key={total - i} char={char} />
      ))}
    </div>
  );
}

function OdometerChar({ char }: { char: string }) {
  if (!/\d/.test(char)) {
    return <span className="inline-block">{char}</span>;
  }

  return (
    <span className="relative inline-flex justify-center overflow-hidden align-baseline" style={{ height: "1em" }}>
      {/* invisible sizer keeps the cell width stable */}
      <span className="invisible">0</span>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={char}
          initial={{ y: "0.9em", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-0.9em", opacity: 0 }}
          transition={{ type: "spring", stiffness: 480, damping: 30, mass: 0.6 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
