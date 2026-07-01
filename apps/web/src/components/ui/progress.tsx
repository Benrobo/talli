import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.ComponentProps<"div"> {
  value?: number;
  trackClassName?: string;
  barClassName?: string;
}

function Progress({
  className,
  value = 0,
  trackClassName,
  barClassName,
  ...props
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn(
        "h-[7px] w-full overflow-hidden rounded-full bg-track",
        trackClassName,
        className
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className={cn(
          "h-full rounded-full bg-primary transition-[width] duration-300 ease-out",
          barClassName
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export { Progress };
