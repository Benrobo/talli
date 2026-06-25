import { cn } from "@app/ui";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "light" | "night";
  className?: string;
  children?: ReactNode;
}

export function StatCard({
  label,
  value,
  sub,
  tone = "light",
  className,
  children,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[15px] p-5",
        tone === "light" && "border border-hairline bg-card shadow-card",
        tone === "night" && "bg-night text-white",
        className
      )}
    >
      {tone === "night" ? (
        <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-[radial-gradient(circle,oklch(0.52_0.21_285/0.45),transparent_70%)]" />
      ) : null}
      <div className="relative">
        <div
          className={cn(
            "mb-3 text-[12.5px]",
            tone === "night" ? "text-on-night" : "text-content-muted"
          )}
        >
          {label}
        </div>
        <div className="tabular text-[27px] font-bold tracking-[-0.02em]">{value}</div>
        {sub ? (
          <div
            className={cn(
              "mt-2.5 text-[11.5px]",
              tone === "night" ? "text-[#c9b7ff]" : "text-content-muted"
            )}
          >
            {sub}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
