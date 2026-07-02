import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  flush?: boolean;
}

export function SectionCard({
  title,
  action,
  children,
  className,
  bodyClassName,
  flush,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[18px] border border-hairline bg-card shadow-card",
        className
      )}
    >
      {title || action ? (
        <div className="flex flex-wrap items-start justify-between gap-2.5 border-b border-hairline-soft px-4 py-3.5 sm:items-center sm:px-5 sm:py-4">
          <div className="min-w-0 text-[15px] font-semibold text-foreground">{title}</div>
          {action ? <div className="flex min-w-0 items-center gap-2">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn(!flush && "p-4 sm:p-[18px]", bodyClassName)}>{children}</div>
    </div>
  );
}
