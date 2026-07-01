import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TallyWatermarkProps {
  className?: string;
  opacity?: number;
}

export function TallyWatermark({ className, opacity = 0.16 }: TallyWatermarkProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 120"
      className={cn("pointer-events-none absolute", className)}
      style={{ opacity }}
      fill="none"
    >
      <g stroke="currentColor" strokeWidth="9" strokeLinecap="round">
        <line x1="24" y1="20" x2="24" y2="100" />
        <line x1="50" y1="20" x2="50" y2="100" />
        <line x1="76" y1="20" x2="76" y2="100" />
        <line x1="102" y1="20" x2="102" y2="100" />
        <line x1="14" y1="86" x2="112" y2="34" />
      </g>
    </svg>
  );
}

interface SpotlightProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  watermark?: boolean;
}

export function Spotlight({ children, className, style, watermark = true }: SpotlightProps) {
  return (
    <div
      className={cn("band-iris relative overflow-hidden rounded-[22px] text-white shadow-hero", className)}
      style={style}
    >
      {watermark ? (
        <TallyWatermark className="-right-4 -top-6 size-40 text-white" opacity={0.14} />
      ) : null}
      <div className="relative">{children}</div>
    </div>
  );
}

type ChipTone = "iris" | "neutral" | "emerald" | "amber" | "rose";

const CHIP_TONE: Record<ChipTone, string> = {
  iris: "bg-iris-soft text-iris-deep",
  neutral: "grad-chip text-content-muted border border-hairline",
  emerald: "bg-emerald-soft text-emerald-deep",
  amber: "bg-amber-soft text-amber-deep",
  rose: "bg-rose-soft text-rose-deep",
};

interface IconChipProps {
  children: ReactNode;
  tone?: ChipTone;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const CHIP_SIZE = {
  sm: "size-8 rounded-[10px]",
  md: "size-10 rounded-[12px]",
  lg: "size-12 rounded-[14px]",
} as const;

export function IconChip({ children, tone = "iris", size = "md", className }: IconChipProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center shadow-chip",
        CHIP_TONE[tone],
        CHIP_SIZE[size],
        className
      )}
    >
      {children}
    </span>
  );
}

type DeltaDirection = "up" | "down";

interface DeltaPillProps {
  value: string;
  direction: DeltaDirection;
  onDark?: boolean;
  className?: string;
}

export function DeltaPill({ value, direction, onDark = false, className }: DeltaPillProps) {
  const up = direction === "up";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold tabular",
        onDark
          ? "bg-white/18 text-white"
          : up
            ? "bg-emerald-soft text-emerald-deep"
            : "bg-rose-soft text-rose-deep",
        className
      )}
    >
      {up ? "↑" : "↓"} {value}
    </span>
  );
}
