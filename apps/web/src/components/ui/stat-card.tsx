import type { ReactNode } from "react";
import { Icon } from "@benrobo/iconary/react";
import type { IconData } from "@benrobo/iconary/core";
import { cn } from "@/lib/utils";
import { IconChip, Spotlight, DeltaPill } from "./surface";

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: IconData;
  delta?: { value: string; direction: "up" | "down" };
  tone?: "light" | "filled";
  className?: string;
  children?: ReactNode;
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  delta,
  tone = "light",
  className,
  children,
}: StatCardProps) {
  if (tone === "filled") {
    return (
      <Spotlight className={cn("min-w-0 p-4 sm:p-5", className)}>
        <div className="mb-4 flex items-start justify-between">
          <span className="text-[13px] font-medium text-white/75">{label}</span>
          {icon ? (
            <span className="flex size-10 items-center justify-center rounded-[12px] bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
              <Icon icon={icon} size={18} />
            </span>
          ) : null}
        </div>
        <div className="break-words font-display tabular text-[26px] font-bold leading-none tracking-[-0.02em] sm:text-[32px]">
          {value}
        </div>
        {delta || sub ? (
          <div className="mt-3.5 flex items-center gap-2">
            {delta ? <DeltaPill value={delta.value} direction={delta.direction} onDark /> : null}
            {sub ? <span className="text-[12px] text-white/70">{sub}</span> : null}
          </div>
        ) : null}
        {children}
      </Spotlight>
    );
  }

  return (
    <div className={cn("min-w-0 rounded-[18px] border border-hairline bg-card p-4 shadow-card sm:p-5", className)}>
      <div className="mb-4 flex items-start justify-between">
        <span className="text-[13px] font-medium text-content-muted">{label}</span>
        {icon ? (
          <IconChip size="md" tone="iris">
            <Icon icon={icon} size={18} />
          </IconChip>
        ) : null}
      </div>
      <div className="break-words font-display tabular text-[26px] font-bold leading-none tracking-[-0.02em] text-foreground sm:text-[30px]">
        {value}
      </div>
      {delta || sub ? (
        <div className="mt-3.5 flex items-center gap-2">
          {delta ? <DeltaPill value={delta.value} direction={delta.direction} /> : null}
          {sub ? <span className="text-[12px] text-content-muted">{sub}</span> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
