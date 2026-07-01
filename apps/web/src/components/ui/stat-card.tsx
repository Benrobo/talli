import { cn } from "@app/ui";
import type { ReactNode } from "react";
import { Icon } from "@benrobo/iconary/react";
import type { IconData } from "@benrobo/iconary/core";

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: IconData;
  delta?: { value: string; direction: "up" | "down" };
  tone?: "light" | "filled" | "night";
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
  const filled = tone === "filled";
  const night = tone === "night";
  const dark = filled || night;

  return (
    <div
      className={cn(
        "rounded-[16px] p-5",
        tone === "light" && "border border-hairline bg-card shadow-card",
        filled && "bg-primary text-white",
        night && "bg-night text-white",
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className={cn("text-[13px] font-medium", dark ? "text-white/70" : "text-content-muted")}>
          {label}
        </span>
        {icon ? (
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-[10px]",
              dark ? "bg-white/12 text-white" : "bg-iris-soft text-iris-deep"
            )}
          >
            <Icon icon={icon} size={16} />
          </span>
        ) : null}
      </div>

      <div className="tabular text-[28px] font-bold tracking-[-0.02em]">{value}</div>

      {delta || sub ? (
        <div className="mt-3 flex items-center gap-2">
          {delta ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                dark
                  ? "bg-white/15 text-white"
                  : delta.direction === "up"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-rose-soft/30 text-rose"
              )}
            >
              {delta.value}
              {delta.direction === "up" ? " ↑" : " ↓"}
            </span>
          ) : null}
          {sub ? (
            <span className={cn("text-[12px]", dark ? "text-white/70" : "text-content-muted")}>{sub}</span>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
