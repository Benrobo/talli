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
        "overflow-hidden rounded-[16px] border border-hairline bg-card shadow-card",
        className
      )}
    >
      {title || action ? (
        <div className="flex items-center justify-between gap-3 border-b border-hairline-soft px-5 py-4">
          <div className="text-[15px] font-semibold text-foreground">{title}</div>
          {action ? <div className="flex items-center gap-2">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn(!flush && "p-[18px]", bodyClassName)}>{children}</div>
    </div>
  );
}
