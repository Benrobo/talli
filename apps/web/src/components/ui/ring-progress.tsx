import { cn } from "@app/ui";
import type { CSSProperties, ReactNode } from "react";

interface RingProgressProps {
  /** 0-100 */
  value: number;
  size?: number;
  thickness?: number;
  className?: string;
  children?: ReactNode;
}

/**
 * Conic progress ring used by savings jars. The conic-gradient stop is the
 * single data-driven value passed through a CSS variable; everything else is
 * expressed with utility classes.
 */
export function RingProgress({
  value,
  size = 104,
  thickness = 12,
  className,
  children,
}: RingProgressProps) {
  const pct = Math.min(100, Math.max(0, value));
  const style = {
    width: size,
    height: size,
    background: `conic-gradient(var(--color-iris) 0 ${pct}%, var(--color-track) ${pct}% 100%)`,
  } as CSSProperties;

  return (
    <div
      className={cn("relative flex items-center justify-center rounded-full", className)}
      style={style}
    >
      <div
        className="flex flex-col items-center justify-center rounded-full bg-card text-center"
        style={{ width: size - thickness * 2, height: size - thickness * 2 }}
      >
        {children}
      </div>
    </div>
  );
}
