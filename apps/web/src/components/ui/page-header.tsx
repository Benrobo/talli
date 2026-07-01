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
    <div className={cn("mb-6 flex items-start justify-between gap-4", className)}>
      <div>
        {eyebrow ? (
          <div className="mb-1.5 text-[12px] font-medium uppercase tracking-[0.1em] text-content-faint">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="font-display text-[25px] font-bold tracking-[-0.02em] text-foreground">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-[13.5px] text-content-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}
