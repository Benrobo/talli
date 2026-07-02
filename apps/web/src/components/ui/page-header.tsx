import { cn } from "@app/ui";
import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1.5 text-[12px] font-medium uppercase tracking-[0.1em] text-content-faint">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="break-words font-display text-[23px] font-bold leading-tight tracking-[-0.02em] text-foreground sm:text-[25px]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 max-w-[680px] text-[13px] leading-relaxed text-content-muted sm:text-[13.5px]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto sm:shrink-0">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
